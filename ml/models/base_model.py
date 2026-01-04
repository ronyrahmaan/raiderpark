"""
Abstract base class for all RaiderPark prediction models.

This module defines the interface that all prediction models must implement,
ensuring consistent behavior across different model architectures.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

import numpy as np
import pandas as pd


@dataclass
class PredictionOutput:
    """
    Standardized prediction output from all models.

    Attributes:
        predicted_occupancy: Predicted occupancy percentage (0-100)
        confidence: Model confidence in the prediction (0-1)
        lower_bound: Lower bound of prediction interval
        upper_bound: Upper bound of prediction interval
        lot_id: Parking lot identifier
        timestamp: Prediction timestamp
    """
    predicted_occupancy: float
    confidence: float
    lower_bound: float
    upper_bound: float
    lot_id: str
    timestamp: pd.Timestamp

    def to_dict(self) -> Dict[str, Any]:
        """Convert prediction to dictionary for JSON serialization."""
        return {
            "predicted_occupancy": round(self.predicted_occupancy, 2),
            "confidence": round(self.confidence, 3),
            "lower_bound": round(self.lower_bound, 2),
            "upper_bound": round(self.upper_bound, 2),
            "lot_id": self.lot_id,
            "timestamp": self.timestamp.isoformat(),
        }

    def validate(self) -> bool:
        """Validate prediction values are within expected ranges."""
        return (
            0 <= self.predicted_occupancy <= 100
            and 0 <= self.confidence <= 1
            and 0 <= self.lower_bound <= self.upper_bound <= 100
        )


class BaseModel(ABC):
    """
    Abstract base class for parking occupancy prediction models.

    All prediction models must inherit from this class and implement
    the required abstract methods to ensure consistent interfaces.
    """

    def __init__(
        self,
        model_name: str,
        model_version: str = "1.0.0",
        config: Optional[Dict[str, Any]] = None,
    ):
        """
        Initialize the base model.

        Args:
            model_name: Human-readable name for the model
            model_version: Semantic version string
            config: Model-specific configuration parameters
        """
        self.model_name = model_name
        self.model_version = model_version
        self.config = config or {}
        self._is_fitted = False
        self._model = None
        self._feature_columns: Optional[list] = None

    @property
    def is_fitted(self) -> bool:
        """Check if the model has been trained."""
        return self._is_fitted

    @abstractmethod
    def fit(
        self,
        X: pd.DataFrame,
        y: pd.Series,
        validation_data: Optional[Tuple[pd.DataFrame, pd.Series]] = None,
        **kwargs,
    ) -> "BaseModel":
        """
        Train the model on the provided data.

        Args:
            X: Feature DataFrame with temporal and contextual features
            y: Target series with occupancy percentages
            validation_data: Optional validation set for early stopping
            **kwargs: Additional training parameters

        Returns:
            Self for method chaining
        """
        pass

    @abstractmethod
    def predict(
        self,
        X: pd.DataFrame,
        return_confidence: bool = True,
    ) -> pd.DataFrame:
        """
        Generate predictions for the input features.

        Args:
            X: Feature DataFrame with the same structure as training data
            return_confidence: Whether to return confidence intervals

        Returns:
            DataFrame with predictions, confidence scores, and intervals
        """
        pass

    @abstractmethod
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
        pass

    @abstractmethod
    def save(self, path: Path) -> None:
        """
        Save the trained model to disk.

        Args:
            path: Directory path to save model artifacts
        """
        pass

    @abstractmethod
    def load(self, path: Path) -> "BaseModel":
        """
        Load a trained model from disk.

        Args:
            path: Directory path containing model artifacts

        Returns:
            Self with loaded model weights
        """
        pass

    def get_feature_importance(self) -> Optional[pd.Series]:
        """
        Get feature importance scores if available.

        Returns:
            Series with feature names as index and importance scores,
            or None if the model doesn't support feature importance.
        """
        return None

    def _validate_input(self, X: pd.DataFrame) -> None:
        """
        Validate input features match expected schema.

        Args:
            X: Input feature DataFrame

        Raises:
            ValueError: If required features are missing
        """
        if self._feature_columns is None:
            return

        missing_cols = set(self._feature_columns) - set(X.columns)
        if missing_cols:
            raise ValueError(
                f"Missing required features: {missing_cols}. "
                f"Expected columns: {self._feature_columns}"
            )

    def _clip_predictions(
        self,
        predictions: np.ndarray,
        lower: float = 0.0,
        upper: float = 100.0,
    ) -> np.ndarray:
        """
        Clip predictions to valid occupancy range.

        Args:
            predictions: Raw model predictions
            lower: Minimum valid value (default 0)
            upper: Maximum valid value (default 100)

        Returns:
            Clipped predictions
        """
        return np.clip(predictions, lower, upper)

    def __repr__(self) -> str:
        """String representation of the model."""
        status = "fitted" if self._is_fitted else "not fitted"
        return f"{self.__class__.__name__}(name='{self.model_name}', version='{self.model_version}', status={status})"
