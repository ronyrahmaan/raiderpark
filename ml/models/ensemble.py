"""
Stacking ensemble model combining TFT and LightGBM predictions.

The ensemble leverages:
- TFT's strength in capturing temporal dependencies and patterns
- LightGBM's ability to handle tabular features and non-linear relationships

Uses a meta-learner to optimally combine base model predictions.
"""

import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge
from sklearn.model_selection import KFold
import joblib

from ml.models.base_model import BaseModel, PredictionOutput
from ml.models.temporal_fusion_transformer import (
    TemporalFusionTransformerModel,
    TFTConfig,
)
from ml.models.lightgbm_model import LightGBMModel, LightGBMConfig

logger = logging.getLogger(__name__)


class EnsembleConfig:
    """Configuration for ensemble model."""

    def __init__(
        self,
        # Base model configurations
        tft_config: Optional[TFTConfig] = None,
        lgb_config: Optional[LightGBMConfig] = None,
        # Meta-learner settings
        meta_learner_alpha: float = 1.0,  # Ridge regularization
        # Ensemble strategy
        strategy: str = "stacking",  # "stacking", "weighted_avg", "dynamic"
        n_folds: int = 5,  # For stacking cross-validation
        # Weights for weighted average (if strategy="weighted_avg")
        tft_weight: float = 0.5,
        lgb_weight: float = 0.5,
        # Confidence combination
        confidence_method: str = "min",  # "min", "avg", "weighted"
    ):
        self.tft_config = tft_config or TFTConfig()
        self.lgb_config = lgb_config or LightGBMConfig()
        self.meta_learner_alpha = meta_learner_alpha
        self.strategy = strategy
        self.n_folds = n_folds
        self.tft_weight = tft_weight
        self.lgb_weight = lgb_weight
        self.confidence_method = confidence_method

    def to_dict(self) -> Dict[str, Any]:
        return {
            "tft_config": self.tft_config.to_dict(),
            "lgb_config": self.lgb_config.to_dict(),
            "meta_learner_alpha": self.meta_learner_alpha,
            "strategy": self.strategy,
            "n_folds": self.n_folds,
            "tft_weight": self.tft_weight,
            "lgb_weight": self.lgb_weight,
            "confidence_method": self.confidence_method,
        }

    @classmethod
    def from_dict(cls, config_dict: Dict[str, Any]) -> "EnsembleConfig":
        return cls(
            tft_config=TFTConfig.from_dict(config_dict.get("tft_config", {})),
            lgb_config=LightGBMConfig.from_dict(config_dict.get("lgb_config", {})),
            meta_learner_alpha=config_dict.get("meta_learner_alpha", 1.0),
            strategy=config_dict.get("strategy", "stacking"),
            n_folds=config_dict.get("n_folds", 5),
            tft_weight=config_dict.get("tft_weight", 0.5),
            lgb_weight=config_dict.get("lgb_weight", 0.5),
            confidence_method=config_dict.get("confidence_method", "min"),
        )


class EnsembleModel(BaseModel):
    """
    Stacking ensemble combining TFT and LightGBM models.

    Strategies:
    - stacking: Train meta-learner on cross-validated base predictions
    - weighted_avg: Simple weighted average of predictions
    - dynamic: Dynamically weight models based on recent performance

    The ensemble provides improved accuracy and robustness compared
    to individual models.
    """

    def __init__(
        self,
        config: Optional[EnsembleConfig] = None,
        model_version: str = "1.0.0",
    ):
        super().__init__(
            model_name="Ensemble",
            model_version=model_version,
            config=config.to_dict() if config else EnsembleConfig().to_dict(),
        )
        self.ensemble_config = config or EnsembleConfig()

        # Initialize base models
        self._tft_model = TemporalFusionTransformerModel(
            config=self.ensemble_config.tft_config,
            model_version=model_version,
        )
        self._lgb_model = LightGBMModel(
            config=self.ensemble_config.lgb_config,
            model_version=model_version,
        )

        # Meta-learner for stacking
        self._meta_learner: Optional[Ridge] = None
        self._meta_learner_bounds: Optional[Tuple[Ridge, Ridge]] = None

    def _get_stacking_features(
        self,
        X: pd.DataFrame,
        y: pd.Series,
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Generate meta-features using cross-validation on training data.

        This prevents overfitting by ensuring the meta-learner trains
        on out-of-fold predictions from base models.

        Args:
            X: Feature DataFrame
            y: Target series

        Returns:
            meta_features: Array of stacked base predictions
            targets: Aligned target values
        """
        n_samples = len(X)
        kf = KFold(n_splits=self.ensemble_config.n_folds, shuffle=True, random_state=42)

        # Storage for out-of-fold predictions
        tft_oof = np.zeros(n_samples)
        lgb_oof = np.zeros(n_samples)
        tft_lower = np.zeros(n_samples)
        tft_upper = np.zeros(n_samples)
        lgb_lower = np.zeros(n_samples)
        lgb_upper = np.zeros(n_samples)

        for fold, (train_idx, val_idx) in enumerate(kf.split(X)):
            logger.info(f"Training fold {fold + 1}/{self.ensemble_config.n_folds}")

            X_train_fold = X.iloc[train_idx]
            y_train_fold = y.iloc[train_idx]
            X_val_fold = X.iloc[val_idx]

            # Train TFT on fold
            tft_fold = TemporalFusionTransformerModel(
                config=self.ensemble_config.tft_config
            )
            try:
                tft_fold.fit(X_train_fold, y_train_fold)
                tft_preds = tft_fold.predict(X_val_fold)
                tft_oof[val_idx] = tft_preds["predicted_occupancy"].values
                tft_lower[val_idx] = tft_preds["lower_bound"].values
                tft_upper[val_idx] = tft_preds["upper_bound"].values
            except Exception as e:
                logger.warning(f"TFT training failed on fold {fold}: {e}")
                # Use LightGBM predictions as fallback
                tft_oof[val_idx] = np.nan

            # Train LightGBM on fold
            lgb_fold = LightGBMModel(config=self.ensemble_config.lgb_config)
            lgb_fold.fit(X_train_fold, y_train_fold)
            lgb_preds = lgb_fold.predict(X_val_fold)
            lgb_oof[val_idx] = lgb_preds["predicted_occupancy"].values
            lgb_lower[val_idx] = lgb_preds["lower_bound"].values
            lgb_upper[val_idx] = lgb_preds["upper_bound"].values

        # Handle any NaN values from TFT failures
        if np.any(np.isnan(tft_oof)):
            tft_oof = np.where(np.isnan(tft_oof), lgb_oof, tft_oof)
            tft_lower = np.where(np.isnan(tft_lower), lgb_lower, tft_lower)
            tft_upper = np.where(np.isnan(tft_upper), lgb_upper, tft_upper)

        # Stack meta-features: [tft_pred, lgb_pred]
        meta_features = np.column_stack([tft_oof, lgb_oof])
        meta_features_lower = np.column_stack([tft_lower, lgb_lower])
        meta_features_upper = np.column_stack([tft_upper, lgb_upper])

        return meta_features, meta_features_lower, meta_features_upper, y.values

    def fit(
        self,
        X: pd.DataFrame,
        y: pd.Series,
        validation_data: Optional[Tuple[pd.DataFrame, pd.Series]] = None,
        **kwargs,
    ) -> "EnsembleModel":
        """
        Train the ensemble model.

        For stacking strategy:
        1. Generate out-of-fold predictions using cross-validation
        2. Train meta-learner on stacked predictions
        3. Retrain base models on full training data

        Args:
            X: Feature DataFrame
            y: Target series
            validation_data: Optional validation data
            **kwargs: Additional parameters

        Returns:
            Self for method chaining
        """
        logger.info(f"Training ensemble with strategy: {self.ensemble_config.strategy}")

        if self.ensemble_config.strategy == "stacking":
            # Generate stacking features
            meta_features, meta_lower, meta_upper, targets = self._get_stacking_features(X, y)

            # Train meta-learner for point predictions
            self._meta_learner = Ridge(alpha=self.ensemble_config.meta_learner_alpha)
            self._meta_learner.fit(meta_features, targets)

            # Train meta-learners for bounds
            self._meta_learner_lower = Ridge(alpha=self.ensemble_config.meta_learner_alpha)
            self._meta_learner_lower.fit(meta_lower, targets)

            self._meta_learner_upper = Ridge(alpha=self.ensemble_config.meta_learner_alpha)
            self._meta_learner_upper.fit(meta_upper, targets)

            logger.info(
                f"Meta-learner coefficients: TFT={self._meta_learner.coef_[0]:.3f}, "
                f"LGB={self._meta_learner.coef_[1]:.3f}"
            )

        # Train base models on full data for inference
        logger.info("Training TFT on full data...")
        try:
            self._tft_model.fit(X, y, validation_data=validation_data)
        except Exception as e:
            logger.warning(f"TFT training failed: {e}. Using LightGBM only.")

        logger.info("Training LightGBM on full data...")
        self._lgb_model.fit(X, y, validation_data=validation_data)

        self._is_fitted = True
        logger.info("Ensemble training completed")
        return self

    def predict(
        self,
        X: pd.DataFrame,
        return_confidence: bool = True,
    ) -> pd.DataFrame:
        """
        Generate ensemble predictions.

        Args:
            X: Feature DataFrame
            return_confidence: Whether to include confidence intervals

        Returns:
            DataFrame with predictions and confidence
        """
        if not self._is_fitted:
            raise RuntimeError("Model must be fitted before prediction")

        # Get base model predictions
        lgb_preds = self._lgb_model.predict(X, return_confidence=True)

        try:
            tft_preds = self._tft_model.predict(X, return_confidence=True)
            tft_available = True
        except Exception as e:
            logger.warning(f"TFT prediction failed: {e}. Using LightGBM only.")
            tft_preds = lgb_preds
            tft_available = False

        if self.ensemble_config.strategy == "stacking" and self._meta_learner is not None:
            # Stack predictions for meta-learner
            meta_features = np.column_stack([
                tft_preds["predicted_occupancy"].values,
                lgb_preds["predicted_occupancy"].values,
            ])
            meta_lower = np.column_stack([
                tft_preds["lower_bound"].values,
                lgb_preds["lower_bound"].values,
            ])
            meta_upper = np.column_stack([
                tft_preds["upper_bound"].values,
                lgb_preds["upper_bound"].values,
            ])

            # Meta-learner predictions
            predictions = self._meta_learner.predict(meta_features)
            lower_bounds = self._meta_learner_lower.predict(meta_lower)
            upper_bounds = self._meta_learner_upper.predict(meta_upper)

        elif self.ensemble_config.strategy == "weighted_avg":
            # Weighted average
            tft_w = self.ensemble_config.tft_weight if tft_available else 0
            lgb_w = self.ensemble_config.lgb_weight if tft_available else 1

            # Normalize weights
            total_w = tft_w + lgb_w
            tft_w /= total_w
            lgb_w /= total_w

            predictions = (
                tft_w * tft_preds["predicted_occupancy"].values
                + lgb_w * lgb_preds["predicted_occupancy"].values
            )
            lower_bounds = (
                tft_w * tft_preds["lower_bound"].values
                + lgb_w * lgb_preds["lower_bound"].values
            )
            upper_bounds = (
                tft_w * tft_preds["upper_bound"].values
                + lgb_w * lgb_preds["upper_bound"].values
            )

        else:
            # Default to simple average
            predictions = 0.5 * (
                tft_preds["predicted_occupancy"].values
                + lgb_preds["predicted_occupancy"].values
            )
            lower_bounds = 0.5 * (
                tft_preds["lower_bound"].values
                + lgb_preds["lower_bound"].values
            )
            upper_bounds = 0.5 * (
                tft_preds["upper_bound"].values
                + lgb_preds["upper_bound"].values
            )

        # Clip to valid range
        predictions = self._clip_predictions(predictions)
        lower_bounds = self._clip_predictions(lower_bounds)
        upper_bounds = self._clip_predictions(upper_bounds)

        # Ensure monotonicity
        lower_bounds = np.minimum(lower_bounds, predictions)
        upper_bounds = np.maximum(upper_bounds, predictions)

        # Combine confidence scores
        if self.ensemble_config.confidence_method == "min":
            confidence = np.minimum(
                tft_preds["confidence"].values,
                lgb_preds["confidence"].values,
            )
        elif self.ensemble_config.confidence_method == "avg":
            confidence = 0.5 * (
                tft_preds["confidence"].values
                + lgb_preds["confidence"].values
            )
        else:  # weighted
            confidence = (
                self.ensemble_config.tft_weight * tft_preds["confidence"].values
                + self.ensemble_config.lgb_weight * lgb_preds["confidence"].values
            )

        result = pd.DataFrame({
            "predicted_occupancy": predictions,
            "confidence": confidence,
            "lower_bound": lower_bounds,
            "upper_bound": upper_bounds,
        })

        if not return_confidence:
            result = result[["predicted_occupancy"]]

        return result

    def predict_single(
        self,
        features: Dict[str, Any],
        lot_id: str,
        timestamp: pd.Timestamp,
    ) -> PredictionOutput:
        """
        Generate a single ensemble prediction.

        Args:
            features: Dictionary of feature values
            lot_id: Parking lot identifier
            timestamp: Prediction timestamp

        Returns:
            PredictionOutput with prediction and confidence
        """
        df = pd.DataFrame([features])
        predictions = self.predict(df, return_confidence=True)
        row = predictions.iloc[0]

        return PredictionOutput(
            predicted_occupancy=row["predicted_occupancy"],
            confidence=row["confidence"],
            lower_bound=row["lower_bound"],
            upper_bound=row["upper_bound"],
            lot_id=lot_id,
            timestamp=timestamp,
        )

    def get_feature_importance(self) -> Optional[pd.Series]:
        """
        Get combined feature importance from base models.

        Returns:
            Series with feature importance scores
        """
        lgb_importance = self._lgb_model.get_feature_importance()

        if lgb_importance is None:
            return None

        # For now, return LightGBM importance as TFT uses attention
        return lgb_importance

    def get_model_weights(self) -> Dict[str, float]:
        """
        Get the learned weights for each base model.

        Returns:
            Dictionary with model name -> weight mapping
        """
        if self._meta_learner is None:
            return {
                "tft": self.ensemble_config.tft_weight,
                "lgb": self.ensemble_config.lgb_weight,
            }

        coefs = self._meta_learner.coef_
        return {
            "tft": float(coefs[0]),
            "lgb": float(coefs[1]),
        }

    def save(self, path: Path) -> None:
        """Save all ensemble artifacts to disk."""
        path = Path(path)
        path.mkdir(parents=True, exist_ok=True)

        # Save base models
        self._tft_model.save(path / "tft")
        self._lgb_model.save(path / "lgb")

        # Save meta-learner
        if self._meta_learner is not None:
            joblib.dump(self._meta_learner, path / "meta_learner.joblib")
            joblib.dump(self._meta_learner_lower, path / "meta_learner_lower.joblib")
            joblib.dump(self._meta_learner_upper, path / "meta_learner_upper.joblib")

        # Save config
        metadata = {
            "config": self.ensemble_config.to_dict(),
            "model_version": self.model_version,
        }
        with open(path / "metadata.json", "w") as f:
            json.dump(metadata, f, indent=2)

        logger.info(f"Ensemble saved to {path}")

    def load(self, path: Path) -> "EnsembleModel":
        """Load ensemble artifacts from disk."""
        path = Path(path)

        # Load metadata
        with open(path / "metadata.json", "r") as f:
            metadata = json.load(f)

        self.ensemble_config = EnsembleConfig.from_dict(metadata["config"])
        self.model_version = metadata["model_version"]
        self.config = metadata["config"]

        # Load base models
        self._tft_model = TemporalFusionTransformerModel()
        self._tft_model.load(path / "tft")

        self._lgb_model = LightGBMModel()
        self._lgb_model.load(path / "lgb")

        # Load meta-learner if exists
        meta_path = path / "meta_learner.joblib"
        if meta_path.exists():
            self._meta_learner = joblib.load(meta_path)
            self._meta_learner_lower = joblib.load(path / "meta_learner_lower.joblib")
            self._meta_learner_upper = joblib.load(path / "meta_learner_upper.joblib")

        self._is_fitted = True
        logger.info(f"Ensemble loaded from {path}")
        return self
