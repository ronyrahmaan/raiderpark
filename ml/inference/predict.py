"""
Prediction service for parking occupancy forecasting.

Provides the main interface for generating predictions:
- Batch predictions for multiple lots/times
- Single predictions for real-time queries
- Integration with calibration and real-time adjustments
"""

import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd
import numpy as np

from ml.models.base_model import BaseModel, PredictionOutput
from ml.models.ensemble import EnsembleModel
from ml.models.lightgbm_model import LightGBMModel
from ml.models.temporal_fusion_transformer import TemporalFusionTransformerModel
from ml.inference.calibration import Calibrator
from ml.inference.realtime_adjuster import RealtimeAdjuster
from ml.training.features import FeatureEngineer
from ml.training.config import InferenceConfig

logger = logging.getLogger(__name__)


class PredictionService:
    """
    Main prediction service for parking occupancy.

    Orchestrates:
    - Model loading and inference
    - Feature preparation for prediction
    - Calibration of confidence scores
    - Real-time adjustments from user reports
    - Caching of predictions
    """

    def __init__(
        self,
        model_path: Optional[Path] = None,
        config: Optional[InferenceConfig] = None,
        enable_calibration: bool = True,
        enable_realtime_adjustment: bool = True,
    ):
        """
        Initialize prediction service.

        Args:
            model_path: Path to trained model artifacts
            config: Inference configuration
            enable_calibration: Whether to apply calibration
            enable_realtime_adjustment: Whether to apply real-time adjustments
        """
        self.config = config or InferenceConfig()
        self.model_path = model_path
        self._model: Optional[BaseModel] = None
        self._feature_engineer = FeatureEngineer()

        # Optional components
        self._calibrator: Optional[Calibrator] = None
        self._realtime_adjuster: Optional[RealtimeAdjuster] = None

        if enable_calibration:
            self._calibrator = Calibrator(method=self.config.calibration_method)

        if enable_realtime_adjustment:
            self._realtime_adjuster = RealtimeAdjuster(
                adjustment_weight=self.config.adjustment_weight,
                decay_minutes=self.config.adjustment_decay_minutes,
            )

        # Prediction cache
        self._cache: Dict[str, Tuple[datetime, pd.DataFrame]] = {}

    @property
    def model(self) -> BaseModel:
        """Get or load the prediction model."""
        if self._model is None:
            self._model = self._load_model()
        return self._model

    def _load_model(self) -> BaseModel:
        """Load model from disk."""
        if self.model_path is None:
            # Try default location
            self.model_path = Path("models/latest")

        if not self.model_path.exists():
            raise FileNotFoundError(f"Model not found at {self.model_path}")

        # Determine model type from metadata
        metadata_path = self.model_path / "metadata.json"
        if metadata_path.exists():
            import json
            with open(metadata_path, "r") as f:
                metadata = json.load(f)

            model_name = metadata.get("model_name", "").lower()

            if "ensemble" in model_name or (self.model_path / "lgb").exists():
                model = EnsembleModel()
            elif "tft" in model_name or "transformer" in model_name:
                model = TemporalFusionTransformerModel()
            else:
                model = LightGBMModel()
        else:
            # Default to LightGBM for simplicity
            model = LightGBMModel()

        model.load(self.model_path)
        logger.info(f"Loaded model from {self.model_path}")
        return model

    def predict_batch(
        self,
        lot_ids: List[str],
        start_time: datetime,
        end_time: Optional[datetime] = None,
        interval_minutes: int = 15,
        weather_forecast: Optional[pd.DataFrame] = None,
        events: Optional[pd.DataFrame] = None,
    ) -> pd.DataFrame:
        """
        Generate batch predictions for multiple lots over a time range.

        Args:
            lot_ids: List of parking lot IDs
            start_time: Start of prediction window
            end_time: End of prediction window (default: start + 24 hours)
            interval_minutes: Prediction interval in minutes
            weather_forecast: Optional weather forecast data
            events: Optional events data

        Returns:
            DataFrame with predictions for each lot/time combination
        """
        if end_time is None:
            end_time = start_time + timedelta(hours=self.config.prediction_horizon_hours)

        logger.info(
            f"Generating predictions for {len(lot_ids)} lots from {start_time} to {end_time}"
        )

        # Check cache
        cache_key = self._get_cache_key(lot_ids, start_time, end_time)
        if self.config.cache_predictions and cache_key in self._cache:
            cached_time, cached_predictions = self._cache[cache_key]
            cache_age = (datetime.now() - cached_time).total_seconds() / 60
            if cache_age < self.config.cache_ttl_minutes:
                logger.info("Returning cached predictions")
                return cached_predictions

        # Generate timestamps
        timestamps = pd.date_range(
            start_time,
            end_time,
            freq=f"{interval_minutes}T",
        )

        # Prepare features for each lot/time combination
        records = []
        for lot_id in lot_ids:
            for ts in timestamps:
                records.append({
                    "timestamp": ts,
                    "lot_id": lot_id,
                    "occupancy": 0,  # Placeholder
                })

        df = pd.DataFrame(records)

        # Engineer features
        features_df = self._feature_engineer.transform(
            df,
            weather_data=weather_forecast,
            events_data=events,
        )

        # Remove target column
        if "occupancy" in features_df.columns:
            features_df = features_df.drop(columns=["occupancy"])

        # Generate predictions
        predictions = self.model.predict(features_df, return_confidence=True)

        # Add metadata columns
        predictions["lot_id"] = df["lot_id"].values
        predictions["timestamp"] = df["timestamp"].values

        # Apply calibration
        if self._calibrator is not None and self._calibrator.is_fitted:
            predictions = self._calibrator.calibrate(predictions)

        # Apply real-time adjustments
        if self._realtime_adjuster is not None:
            predictions = self._realtime_adjuster.adjust(predictions)

        # Reorder columns
        predictions = predictions[[
            "lot_id",
            "timestamp",
            "predicted_occupancy",
            "confidence",
            "lower_bound",
            "upper_bound",
        ]]

        # Cache results
        if self.config.cache_predictions:
            self._cache[cache_key] = (datetime.now(), predictions)

        return predictions

    def predict_single(
        self,
        lot_id: str,
        timestamp: datetime,
        features: Optional[Dict[str, Any]] = None,
        recent_reports: Optional[List[Dict[str, Any]]] = None,
    ) -> PredictionOutput:
        """
        Generate a single prediction for real-time queries.

        Args:
            lot_id: Parking lot ID
            timestamp: Prediction timestamp
            features: Optional pre-computed features
            recent_reports: Optional recent user reports for adjustment

        Returns:
            PredictionOutput with prediction and confidence
        """
        if features is None:
            # Generate features for this timestamp
            df = pd.DataFrame([{
                "timestamp": timestamp,
                "lot_id": lot_id,
                "occupancy": 0,
            }])
            features_df = self._feature_engineer.transform(df)
            features = features_df.iloc[0].to_dict()

        # Remove non-feature columns
        for col in ["timestamp", "lot_id", "occupancy"]:
            features.pop(col, None)

        # Get prediction
        prediction = self.model.predict_single(
            features=features,
            lot_id=lot_id,
            timestamp=pd.Timestamp(timestamp),
        )

        # Apply calibration
        if self._calibrator is not None and self._calibrator.is_fitted:
            prediction = self._calibrator.calibrate_single(prediction)

        # Apply real-time adjustment
        if self._realtime_adjuster is not None and recent_reports:
            prediction = self._realtime_adjuster.adjust_single(
                prediction=prediction,
                recent_reports=recent_reports,
            )

        return prediction

    def predict_next_hours(
        self,
        lot_id: str,
        hours: int = 6,
    ) -> pd.DataFrame:
        """
        Generate predictions for the next N hours.

        Convenience method for common use case.

        Args:
            lot_id: Parking lot ID
            hours: Number of hours to predict

        Returns:
            DataFrame with predictions
        """
        start_time = datetime.now()
        end_time = start_time + timedelta(hours=hours)

        return self.predict_batch(
            lot_ids=[lot_id],
            start_time=start_time,
            end_time=end_time,
        )

    def predict_day(
        self,
        lot_id: str,
        date: Optional[datetime] = None,
    ) -> pd.DataFrame:
        """
        Generate predictions for a full day.

        Args:
            lot_id: Parking lot ID
            date: Date to predict (default: today)

        Returns:
            DataFrame with predictions
        """
        if date is None:
            date = datetime.now()

        start_time = datetime(date.year, date.month, date.day, 0, 0)
        end_time = start_time + timedelta(days=1)

        return self.predict_batch(
            lot_ids=[lot_id],
            start_time=start_time,
            end_time=end_time,
        )

    def update_realtime_reports(
        self,
        lot_id: str,
        reports: List[Dict[str, Any]],
    ) -> None:
        """
        Update the real-time adjuster with new user reports.

        Args:
            lot_id: Parking lot ID
            reports: List of report dictionaries with keys:
                - timestamp: Report time
                - reported_status: User-reported status
        """
        if self._realtime_adjuster is not None:
            self._realtime_adjuster.update_reports(lot_id, reports)
            # Invalidate cache for this lot
            self._invalidate_lot_cache(lot_id)

    def fit_calibrator(
        self,
        y_true: np.ndarray,
        y_pred: np.ndarray,
        confidence: np.ndarray,
    ) -> None:
        """
        Fit the calibrator on validation data.

        Args:
            y_true: True occupancy values
            y_pred: Predicted occupancy values
            confidence: Predicted confidence scores
        """
        if self._calibrator is not None:
            self._calibrator.fit(y_true, y_pred, confidence)
            logger.info("Calibrator fitted")

    def get_model_info(self) -> Dict[str, Any]:
        """Get information about the loaded model."""
        return {
            "model_name": self.model.model_name,
            "model_version": self.model.model_version,
            "is_fitted": self.model.is_fitted,
            "model_path": str(self.model_path),
            "calibration_enabled": self._calibrator is not None,
            "realtime_adjustment_enabled": self._realtime_adjuster is not None,
        }

    def _get_cache_key(
        self,
        lot_ids: List[str],
        start_time: datetime,
        end_time: datetime,
    ) -> str:
        """Generate cache key for predictions."""
        lots_key = "_".join(sorted(lot_ids))
        time_key = f"{start_time.isoformat()}_{end_time.isoformat()}"
        return f"{lots_key}_{time_key}"

    def _invalidate_lot_cache(self, lot_id: str) -> None:
        """Invalidate cache entries for a specific lot."""
        keys_to_remove = [
            key for key in self._cache.keys()
            if lot_id in key
        ]
        for key in keys_to_remove:
            del self._cache[key]

    def clear_cache(self) -> None:
        """Clear all cached predictions."""
        self._cache.clear()
        logger.info("Prediction cache cleared")


def get_prediction_service(
    model_path: Optional[str] = None,
) -> PredictionService:
    """
    Factory function to get a configured prediction service.

    Args:
        model_path: Optional path to model artifacts

    Returns:
        Configured PredictionService instance
    """
    path = Path(model_path) if model_path else None
    return PredictionService(model_path=path)


def predict(
    lot_ids: List[str],
    start_time: datetime,
    end_time: Optional[datetime] = None,
    model_path: Optional[str] = None,
) -> pd.DataFrame:
    """
    Convenience function for batch predictions.

    Args:
        lot_ids: List of parking lot IDs
        start_time: Start of prediction window
        end_time: Optional end of prediction window
        model_path: Optional path to model

    Returns:
        DataFrame with predictions
    """
    service = get_prediction_service(model_path)
    return service.predict_batch(lot_ids, start_time, end_time)
