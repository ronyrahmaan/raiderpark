"""
Probability calibration for prediction confidence scores.

Ensures that confidence scores are well-calibrated:
- A 70% confidence prediction should be correct ~70% of the time
- Improves reliability of prediction intervals

Supports multiple calibration methods:
- Isotonic regression
- Platt scaling (sigmoid)
- Temperature scaling
"""

import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from sklearn.isotonic import IsotonicRegression
from sklearn.linear_model import LogisticRegression
import joblib

from ml.models.base_model import PredictionOutput

logger = logging.getLogger(__name__)


class Calibrator:
    """
    Calibrates prediction confidence scores.

    Uses held-out validation data to learn a mapping from
    raw model confidence to calibrated probabilities.
    """

    SUPPORTED_METHODS = ["isotonic", "platt", "temperature"]

    def __init__(
        self,
        method: str = "isotonic",
        n_bins: int = 10,
        error_threshold: float = 10.0,
    ):
        """
        Initialize calibrator.

        Args:
            method: Calibration method ("isotonic", "platt", "temperature")
            n_bins: Number of bins for calibration analysis
            error_threshold: Error threshold for defining "correct" predictions
        """
        if method not in self.SUPPORTED_METHODS:
            raise ValueError(
                f"Unknown method: {method}. Must be one of {self.SUPPORTED_METHODS}"
            )

        self.method = method
        self.n_bins = n_bins
        self.error_threshold = error_threshold
        self._is_fitted = False

        # Calibration models
        self._isotonic: Optional[IsotonicRegression] = None
        self._platt: Optional[LogisticRegression] = None
        self._temperature: float = 1.0

        # Calibration statistics
        self._calibration_error: Optional[float] = None
        self._reliability_data: Optional[Dict[str, Any]] = None

    @property
    def is_fitted(self) -> bool:
        """Check if calibrator has been fitted."""
        return self._is_fitted

    def fit(
        self,
        y_true: np.ndarray,
        y_pred: np.ndarray,
        confidence: np.ndarray,
    ) -> "Calibrator":
        """
        Fit the calibrator on validation data.

        Args:
            y_true: True occupancy values
            y_pred: Predicted occupancy values
            confidence: Raw confidence scores from model

        Returns:
            Self for method chaining
        """
        logger.info(f"Fitting calibrator with method: {self.method}")

        # Compute "correct" predictions (within error threshold)
        errors = np.abs(y_true - y_pred)
        correct = (errors <= self.error_threshold).astype(float)

        if self.method == "isotonic":
            self._isotonic = IsotonicRegression(
                y_min=0.0,
                y_max=1.0,
                out_of_bounds="clip",
            )
            self._isotonic.fit(confidence, correct)

        elif self.method == "platt":
            self._platt = LogisticRegression(solver="lbfgs")
            self._platt.fit(confidence.reshape(-1, 1), correct)

        elif self.method == "temperature":
            self._temperature = self._fit_temperature(confidence, correct)

        # Compute calibration metrics
        self._compute_calibration_metrics(confidence, correct)

        self._is_fitted = True
        logger.info(f"Calibrator fitted. ECE: {self._calibration_error:.4f}")
        return self

    def calibrate(self, predictions: pd.DataFrame) -> pd.DataFrame:
        """
        Calibrate confidence scores in a predictions DataFrame.

        Args:
            predictions: DataFrame with 'confidence' column

        Returns:
            DataFrame with calibrated confidence
        """
        if not self._is_fitted:
            logger.warning("Calibrator not fitted, returning original predictions")
            return predictions

        calibrated = predictions.copy()
        raw_confidence = calibrated["confidence"].values

        calibrated["confidence"] = self._apply_calibration(raw_confidence)

        return calibrated

    def calibrate_single(self, prediction: PredictionOutput) -> PredictionOutput:
        """
        Calibrate confidence for a single prediction.

        Args:
            prediction: Original prediction

        Returns:
            Prediction with calibrated confidence
        """
        if not self._is_fitted:
            return prediction

        calibrated_conf = self._apply_calibration(
            np.array([prediction.confidence])
        )[0]

        return PredictionOutput(
            predicted_occupancy=prediction.predicted_occupancy,
            confidence=calibrated_conf,
            lower_bound=prediction.lower_bound,
            upper_bound=prediction.upper_bound,
            lot_id=prediction.lot_id,
            timestamp=prediction.timestamp,
        )

    def _apply_calibration(self, confidence: np.ndarray) -> np.ndarray:
        """Apply the fitted calibration transformation."""
        if self.method == "isotonic":
            return self._isotonic.predict(confidence)
        elif self.method == "platt":
            return self._platt.predict_proba(confidence.reshape(-1, 1))[:, 1]
        elif self.method == "temperature":
            # Temperature scaling for confidence
            logits = np.log(confidence / (1 - confidence + 1e-10))
            scaled_logits = logits / self._temperature
            return 1 / (1 + np.exp(-scaled_logits))

    def _fit_temperature(
        self,
        confidence: np.ndarray,
        correct: np.ndarray,
    ) -> float:
        """
        Fit temperature parameter using grid search.

        Args:
            confidence: Raw confidence scores
            correct: Binary correctness labels

        Returns:
            Optimal temperature value
        """
        from scipy.optimize import minimize_scalar

        def nll_loss(temperature):
            logits = np.log(confidence / (1 - confidence + 1e-10))
            scaled = 1 / (1 + np.exp(-logits / temperature))
            # Negative log likelihood
            eps = 1e-10
            loss = -np.mean(
                correct * np.log(scaled + eps)
                + (1 - correct) * np.log(1 - scaled + eps)
            )
            return loss

        result = minimize_scalar(nll_loss, bounds=(0.1, 10.0), method="bounded")
        return result.x

    def _compute_calibration_metrics(
        self,
        confidence: np.ndarray,
        correct: np.ndarray,
    ) -> None:
        """Compute calibration metrics and reliability diagram data."""
        # Bin predictions by confidence
        bin_edges = np.linspace(0, 1, self.n_bins + 1)
        bin_indices = np.digitize(confidence, bin_edges[1:-1])

        bin_accuracies = []
        bin_confidences = []
        bin_counts = []

        for i in range(self.n_bins):
            mask = bin_indices == i
            if mask.sum() > 0:
                bin_acc = correct[mask].mean()
                bin_conf = confidence[mask].mean()
                bin_count = mask.sum()
            else:
                bin_acc = 0
                bin_conf = (bin_edges[i] + bin_edges[i + 1]) / 2
                bin_count = 0

            bin_accuracies.append(bin_acc)
            bin_confidences.append(bin_conf)
            bin_counts.append(bin_count)

        # Expected Calibration Error (ECE)
        total_samples = sum(bin_counts)
        ece = sum(
            (bin_counts[i] / total_samples) * abs(bin_accuracies[i] - bin_confidences[i])
            for i in range(self.n_bins)
            if bin_counts[i] > 0
        )

        self._calibration_error = ece
        self._reliability_data = {
            "bin_edges": bin_edges.tolist(),
            "bin_accuracies": bin_accuracies,
            "bin_confidences": bin_confidences,
            "bin_counts": bin_counts,
            "ece": ece,
        }

    def get_calibration_metrics(self) -> Dict[str, Any]:
        """
        Get calibration metrics and reliability diagram data.

        Returns:
            Dictionary with calibration metrics
        """
        if self._reliability_data is None:
            return {"error": "Calibrator not fitted"}

        return {
            "expected_calibration_error": self._calibration_error,
            "method": self.method,
            "n_bins": self.n_bins,
            "error_threshold": self.error_threshold,
            "reliability": self._reliability_data,
        }

    def evaluate_calibration(
        self,
        y_true: np.ndarray,
        y_pred: np.ndarray,
        confidence: np.ndarray,
    ) -> Dict[str, float]:
        """
        Evaluate calibration quality on held-out data.

        Args:
            y_true: True values
            y_pred: Predicted values
            confidence: Confidence scores (calibrated or raw)

        Returns:
            Dictionary with calibration metrics
        """
        errors = np.abs(y_true - y_pred)
        correct = (errors <= self.error_threshold).astype(float)

        # Bin predictions
        bin_edges = np.linspace(0, 1, self.n_bins + 1)
        bin_indices = np.digitize(confidence, bin_edges[1:-1])

        ece = 0.0
        mce = 0.0  # Maximum Calibration Error
        total = len(confidence)

        for i in range(self.n_bins):
            mask = bin_indices == i
            if mask.sum() == 0:
                continue

            bin_acc = correct[mask].mean()
            bin_conf = confidence[mask].mean()
            bin_weight = mask.sum() / total

            gap = abs(bin_acc - bin_conf)
            ece += bin_weight * gap
            mce = max(mce, gap)

        # Brier score for confidence
        brier = np.mean((confidence - correct) ** 2)

        return {
            "ece": ece,
            "mce": mce,
            "brier_score": brier,
            "mean_confidence": confidence.mean(),
            "accuracy": correct.mean(),
        }

    def save(self, path: Path) -> None:
        """Save calibrator to disk."""
        path = Path(path)
        path.mkdir(parents=True, exist_ok=True)

        # Save calibration model
        if self._isotonic is not None:
            joblib.dump(self._isotonic, path / "isotonic.joblib")
        if self._platt is not None:
            joblib.dump(self._platt, path / "platt.joblib")

        # Save metadata
        metadata = {
            "method": self.method,
            "n_bins": self.n_bins,
            "error_threshold": self.error_threshold,
            "temperature": self._temperature,
            "calibration_error": self._calibration_error,
            "reliability_data": self._reliability_data,
            "is_fitted": self._is_fitted,
        }
        with open(path / "calibrator_metadata.json", "w") as f:
            json.dump(metadata, f, indent=2)

        logger.info(f"Calibrator saved to {path}")

    def load(self, path: Path) -> "Calibrator":
        """Load calibrator from disk."""
        path = Path(path)

        # Load metadata
        with open(path / "calibrator_metadata.json", "r") as f:
            metadata = json.load(f)

        self.method = metadata["method"]
        self.n_bins = metadata["n_bins"]
        self.error_threshold = metadata["error_threshold"]
        self._temperature = metadata["temperature"]
        self._calibration_error = metadata["calibration_error"]
        self._reliability_data = metadata["reliability_data"]
        self._is_fitted = metadata["is_fitted"]

        # Load calibration model
        if (path / "isotonic.joblib").exists():
            self._isotonic = joblib.load(path / "isotonic.joblib")
        if (path / "platt.joblib").exists():
            self._platt = joblib.load(path / "platt.joblib")

        logger.info(f"Calibrator loaded from {path}")
        return self


def compute_ece(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    confidence: np.ndarray,
    n_bins: int = 10,
    error_threshold: float = 10.0,
) -> float:
    """
    Compute Expected Calibration Error.

    Args:
        y_true: True values
        y_pred: Predicted values
        confidence: Confidence scores
        n_bins: Number of calibration bins
        error_threshold: Threshold for "correct" predictions

    Returns:
        ECE value (lower is better)
    """
    errors = np.abs(y_true - y_pred)
    correct = (errors <= error_threshold).astype(float)

    bin_edges = np.linspace(0, 1, n_bins + 1)
    bin_indices = np.digitize(confidence, bin_edges[1:-1])

    ece = 0.0
    total = len(confidence)

    for i in range(n_bins):
        mask = bin_indices == i
        if mask.sum() == 0:
            continue

        bin_acc = correct[mask].mean()
        bin_conf = confidence[mask].mean()
        ece += (mask.sum() / total) * abs(bin_acc - bin_conf)

    return ece
