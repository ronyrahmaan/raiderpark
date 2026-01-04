"""
LightGBM model for parking occupancy prediction.

LightGBM excels at:
- Handling tabular features with mixed types
- Fast training and inference
- Built-in feature importance
- Handling missing values gracefully

This model serves as a strong baseline and ensemble component.
"""

import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import joblib
import lightgbm as lgb
import numpy as np
import pandas as pd
from sklearn.model_selection import cross_val_score

from ml.models.base_model import BaseModel, PredictionOutput

logger = logging.getLogger(__name__)


class LightGBMConfig:
    """Configuration for LightGBM model."""

    def __init__(
        self,
        # Core parameters
        objective: str = "regression",
        metric: str = "mae",
        boosting_type: str = "gbdt",
        # Tree structure
        num_leaves: int = 63,
        max_depth: int = -1,
        min_data_in_leaf: int = 20,
        # Learning parameters
        learning_rate: float = 0.05,
        n_estimators: int = 1000,
        early_stopping_rounds: int = 50,
        # Regularization
        lambda_l1: float = 0.0,
        lambda_l2: float = 0.1,
        feature_fraction: float = 0.8,
        bagging_fraction: float = 0.8,
        bagging_freq: int = 5,
        # Quantile parameters for prediction intervals
        quantiles: List[float] = None,
        # Other
        num_threads: int = -1,
        random_state: int = 42,
        verbose: int = -1,
    ):
        self.objective = objective
        self.metric = metric
        self.boosting_type = boosting_type
        self.num_leaves = num_leaves
        self.max_depth = max_depth
        self.min_data_in_leaf = min_data_in_leaf
        self.learning_rate = learning_rate
        self.n_estimators = n_estimators
        self.early_stopping_rounds = early_stopping_rounds
        self.lambda_l1 = lambda_l1
        self.lambda_l2 = lambda_l2
        self.feature_fraction = feature_fraction
        self.bagging_fraction = bagging_fraction
        self.bagging_freq = bagging_freq
        self.quantiles = quantiles or [0.1, 0.5, 0.9]
        self.num_threads = num_threads
        self.random_state = random_state
        self.verbose = verbose

    def to_lgb_params(self) -> Dict[str, Any]:
        """Convert to LightGBM parameter dict."""
        return {
            "objective": self.objective,
            "metric": self.metric,
            "boosting_type": self.boosting_type,
            "num_leaves": self.num_leaves,
            "max_depth": self.max_depth,
            "min_data_in_leaf": self.min_data_in_leaf,
            "learning_rate": self.learning_rate,
            "lambda_l1": self.lambda_l1,
            "lambda_l2": self.lambda_l2,
            "feature_fraction": self.feature_fraction,
            "bagging_fraction": self.bagging_fraction,
            "bagging_freq": self.bagging_freq,
            "num_threads": self.num_threads,
            "seed": self.random_state,
            "verbose": self.verbose,
        }

    def to_dict(self) -> Dict[str, Any]:
        return self.__dict__.copy()

    @classmethod
    def from_dict(cls, config_dict: Dict[str, Any]) -> "LightGBMConfig":
        return cls(**config_dict)


class LightGBMModel(BaseModel):
    """
    LightGBM gradient boosting model for parking occupancy prediction.

    Features:
    - Trains multiple quantile regressors for prediction intervals
    - Provides feature importance analysis
    - Handles both temporal and static features
    """

    # Feature definitions - aligned with TFT for ensemble compatibility
    FEATURE_COLUMNS = [
        # Temporal features
        "day_of_week",
        "hour",
        "minute",
        "semester_week",
        "is_finals",
        # Cyclical encodings
        "hour_sin",
        "hour_cos",
        "day_sin",
        "day_cos",
        # Historical features
        "last_30_same_day_avg",
        "rolling_7day_avg",
        "rolling_24h_avg",
        "lag_1h",
        "lag_24h",
        "lag_168h",  # 1 week ago
        # Weather features
        "temperature",
        "precipitation",
        "wind_speed",
        # Event features
        "is_game_day",
        "is_concert",
        "days_until_event",
        # Real-time features
        "reports_last_hour",
        "geofence_entries",
    ]

    CATEGORICAL_FEATURES = [
        "day_of_week",
        "is_finals",
        "is_game_day",
        "is_concert",
    ]

    def __init__(
        self,
        config: Optional[LightGBMConfig] = None,
        model_version: str = "1.0.0",
    ):
        super().__init__(
            model_name="LightGBM",
            model_version=model_version,
            config=config.to_dict() if config else LightGBMConfig().to_dict(),
        )
        self.lgb_config = config or LightGBMConfig()
        self._models: Dict[float, lgb.Booster] = {}  # Quantile -> model mapping
        self._feature_columns = self.FEATURE_COLUMNS

    def _create_quantile_model(self, quantile: float) -> lgb.LGBMRegressor:
        """Create a LightGBM model for a specific quantile."""
        params = self.lgb_config.to_lgb_params()
        params["objective"] = "quantile"
        params["alpha"] = quantile

        return lgb.LGBMRegressor(
            **params,
            n_estimators=self.lgb_config.n_estimators,
        )

    def fit(
        self,
        X: pd.DataFrame,
        y: pd.Series,
        validation_data: Optional[Tuple[pd.DataFrame, pd.Series]] = None,
        **kwargs,
    ) -> "LightGBMModel":
        """
        Train quantile regression models.

        Args:
            X: Feature DataFrame
            y: Target series (occupancy percentage)
            validation_data: Optional validation set for early stopping
            **kwargs: Additional parameters

        Returns:
            Self for method chaining
        """
        logger.info(f"Training LightGBM with {len(X)} samples")

        # Select available features
        available_features = [col for col in self.FEATURE_COLUMNS if col in X.columns]
        if not available_features:
            raise ValueError("No valid features found in input DataFrame")

        self._feature_columns = available_features
        X_train = X[available_features].copy()

        # Identify categorical columns present in data
        cat_features = [col for col in self.CATEGORICAL_FEATURES if col in available_features]

        # Prepare validation data
        callbacks = []
        eval_set = None
        if validation_data is not None:
            X_val, y_val = validation_data
            X_val = X_val[available_features].copy()
            eval_set = [(X_val, y_val)]
            callbacks.append(
                lgb.early_stopping(
                    stopping_rounds=self.lgb_config.early_stopping_rounds,
                    verbose=False,
                )
            )

        # Train model for each quantile
        for quantile in self.lgb_config.quantiles:
            logger.info(f"Training quantile {quantile} model...")

            model = self._create_quantile_model(quantile)
            model.fit(
                X_train,
                y,
                eval_set=eval_set,
                categorical_feature=cat_features if cat_features else "auto",
                callbacks=callbacks if callbacks else None,
            )

            self._models[quantile] = model.booster_
            logger.info(
                f"Quantile {quantile}: trained with "
                f"{model.best_iteration_ if hasattr(model, 'best_iteration_') else 'N/A'} iterations"
            )

        self._is_fitted = True
        logger.info("LightGBM training completed")
        return self

    def predict(
        self,
        X: pd.DataFrame,
        return_confidence: bool = True,
    ) -> pd.DataFrame:
        """
        Generate predictions with optional confidence intervals.

        Args:
            X: Feature DataFrame
            return_confidence: Whether to include confidence intervals

        Returns:
            DataFrame with predictions and optional intervals
        """
        if not self._is_fitted:
            raise RuntimeError("Model must be fitted before prediction")

        X_pred = X[self._feature_columns].copy()

        # Get predictions from each quantile model
        predictions = {}
        for quantile, model in self._models.items():
            predictions[quantile] = model.predict(X_pred)

        # Extract quantile predictions
        quantiles = sorted(self.lgb_config.quantiles)
        q_low = predictions[quantiles[0]]
        q_mid = predictions[quantiles[1]]  # Median
        q_high = predictions[quantiles[2]]

        # Clip to valid range
        q_low = self._clip_predictions(q_low)
        q_mid = self._clip_predictions(q_mid)
        q_high = self._clip_predictions(q_high)

        # Ensure monotonicity: low <= mid <= high
        q_low = np.minimum(q_low, q_mid)
        q_high = np.maximum(q_high, q_mid)

        # Calculate confidence from interval width
        interval_width = q_high - q_low
        max_width = 100.0
        confidence = 1.0 - (interval_width / max_width)
        confidence = np.clip(confidence, 0, 1)

        result = pd.DataFrame({
            "predicted_occupancy": q_mid,
            "confidence": confidence,
            "lower_bound": q_low,
            "upper_bound": q_high,
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
        Generate a single prediction for real-time inference.

        Args:
            features: Dictionary of feature values
            lot_id: Parking lot identifier
            timestamp: Prediction timestamp

        Returns:
            PredictionOutput with prediction and confidence
        """
        if not self._is_fitted:
            raise RuntimeError("Model must be fitted before prediction")

        # Convert to DataFrame
        df = pd.DataFrame([features])

        # Ensure all required features are present
        for col in self._feature_columns:
            if col not in df.columns:
                df[col] = 0  # Default value for missing features

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
        Get feature importance scores averaged across quantile models.

        Returns:
            Series with feature names as index and importance scores
        """
        if not self._is_fitted:
            return None

        # Average importance across quantile models
        importances = []
        for model in self._models.values():
            importances.append(model.feature_importance(importance_type="gain"))

        avg_importance = np.mean(importances, axis=0)
        return pd.Series(
            avg_importance,
            index=self._feature_columns,
        ).sort_values(ascending=False)

    def cross_validate(
        self,
        X: pd.DataFrame,
        y: pd.Series,
        cv: int = 5,
    ) -> Dict[str, float]:
        """
        Perform cross-validation to estimate model performance.

        Args:
            X: Feature DataFrame
            y: Target series
            cv: Number of folds

        Returns:
            Dictionary with mean and std of CV scores
        """
        X_cv = X[self._feature_columns].copy()
        model = self._create_quantile_model(0.5)

        scores = cross_val_score(
            model, X_cv, y,
            cv=cv,
            scoring="neg_mean_absolute_error",
        )

        return {
            "mae_mean": -scores.mean(),
            "mae_std": scores.std(),
        }

    def save(self, path: Path) -> None:
        """Save model artifacts to disk."""
        path = Path(path)
        path.mkdir(parents=True, exist_ok=True)

        # Save each quantile model
        for quantile, model in self._models.items():
            model_path = path / f"model_q{quantile:.2f}.txt"
            model.save_model(str(model_path))

        # Save metadata
        metadata = {
            "config": self.lgb_config.to_dict(),
            "feature_columns": self._feature_columns,
            "model_version": self.model_version,
            "quantiles": list(self._models.keys()),
        }
        with open(path / "metadata.json", "w") as f:
            json.dump(metadata, f, indent=2)

        logger.info(f"Model saved to {path}")

    def load(self, path: Path) -> "LightGBMModel":
        """Load model artifacts from disk."""
        path = Path(path)

        # Load metadata
        with open(path / "metadata.json", "r") as f:
            metadata = json.load(f)

        self.lgb_config = LightGBMConfig.from_dict(metadata["config"])
        self._feature_columns = metadata["feature_columns"]
        self.model_version = metadata["model_version"]
        self.config = metadata["config"]

        # Load each quantile model
        self._models = {}
        for quantile in metadata["quantiles"]:
            model_path = path / f"model_q{quantile:.2f}.txt"
            self._models[quantile] = lgb.Booster(model_file=str(model_path))

        self._is_fitted = True
        logger.info(f"Model loaded from {path}")
        return self
