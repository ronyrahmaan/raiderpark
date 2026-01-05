"""
Real-time prediction adjustment from live user reports.

Adjusts model predictions based on recent crowdsourced data:
- User reports of lot fullness
- Geofence entry/exit events
- Time-decayed weighting for recency

This enables predictions to adapt to unexpected changes
faster than the base model can capture.
"""

import logging
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

from ml.models.base_model import PredictionOutput

logger = logging.getLogger(__name__)


class ReportBuffer:
    """
    Circular buffer for storing recent reports with time decay.

    Maintains a fixed-size window of recent reports and provides
    weighted averages based on report age.
    """

    def __init__(
        self,
        max_size: int = 100,
        decay_minutes: float = 30.0,
    ):
        """
        Initialize report buffer.

        Args:
            max_size: Maximum number of reports to store
            decay_minutes: Half-life for exponential decay
        """
        self.max_size = max_size
        self.decay_minutes = decay_minutes
        self._reports: List[Tuple[datetime, float, float]] = []  # (timestamp, value, confidence)

    def add(
        self,
        timestamp: datetime,
        value: float,
        confidence: float = 1.0,
    ) -> None:
        """
        Add a report to the buffer.

        Args:
            timestamp: Report timestamp
            value: Reported occupancy value (0-100)
            confidence: Report confidence (0-1)
        """
        self._reports.append((timestamp, value, confidence))

        # Remove old reports if over capacity
        if len(self._reports) > self.max_size:
            self._reports = self._reports[-self.max_size:]

    def get_weighted_average(
        self,
        reference_time: Optional[datetime] = None,
        window_minutes: Optional[float] = None,
    ) -> Tuple[Optional[float], float]:
        """
        Compute time-weighted average of recent reports.

        Args:
            reference_time: Time to compute weights relative to
            window_minutes: Only include reports within this window

        Returns:
            Tuple of (weighted_average, total_weight)
            Returns (None, 0) if no valid reports
        """
        if not self._reports:
            return None, 0.0

        reference_time = reference_time or datetime.now()
        window_minutes = window_minutes or self.decay_minutes * 3

        total_weight = 0.0
        weighted_sum = 0.0

        for ts, value, confidence in self._reports:
            age_minutes = (reference_time - ts).total_seconds() / 60

            # Skip reports outside window
            if age_minutes > window_minutes or age_minutes < 0:
                continue

            # Exponential decay weight
            decay_weight = np.exp(-age_minutes / self.decay_minutes)
            weight = decay_weight * confidence

            weighted_sum += weight * value
            total_weight += weight

        if total_weight > 0:
            return weighted_sum / total_weight, total_weight
        return None, 0.0

    def get_report_count(self, window_minutes: float = 60.0) -> int:
        """Get count of reports within time window."""
        cutoff = datetime.now() - timedelta(minutes=window_minutes)
        return sum(1 for ts, _, _ in self._reports if ts >= cutoff)

    def clear_old(self, max_age_minutes: float = 120.0) -> int:
        """Remove reports older than max_age_minutes."""
        cutoff = datetime.now() - timedelta(minutes=max_age_minutes)
        old_count = len(self._reports)
        self._reports = [(ts, v, c) for ts, v, c in self._reports if ts >= cutoff]
        return old_count - len(self._reports)


class RealtimeAdjuster:
    """
    Adjusts predictions based on real-time user reports.

    Uses a Bayesian-inspired approach to blend model predictions
    with crowdsourced observations, giving more weight to recent
    reports while respecting model uncertainty.
    """

    # Mapping from categorical status to occupancy percentage
    STATUS_TO_OCCUPANCY = {
        "empty": 10.0,
        "low": 30.0,
        "moderate": 50.0,
        "high": 75.0,
        "full": 95.0,
        "packed": 100.0,
    }

    def __init__(
        self,
        adjustment_weight: float = 0.3,
        decay_minutes: float = 30.0,
        min_reports: int = 2,
        max_adjustment: float = 25.0,
    ):
        """
        Initialize real-time adjuster.

        Args:
            adjustment_weight: Base weight for adjustments (0-1)
            decay_minutes: Half-life for report decay
            min_reports: Minimum reports needed for adjustment
            max_adjustment: Maximum adjustment in percentage points
        """
        self.adjustment_weight = adjustment_weight
        self.decay_minutes = decay_minutes
        self.min_reports = min_reports
        self.max_adjustment = max_adjustment

        # Per-lot report buffers
        self._buffers: Dict[str, ReportBuffer] = defaultdict(
            lambda: ReportBuffer(decay_minutes=decay_minutes)
        )

    def update_reports(
        self,
        lot_id: str,
        reports: List[Dict[str, Any]],
    ) -> None:
        """
        Add new reports to the buffer.

        Args:
            lot_id: Parking lot ID
            reports: List of report dictionaries with keys:
                - timestamp: Report time
                - reported_status: Status string or occupancy value
                - confidence: Optional confidence (default 1.0)
        """
        buffer = self._buffers[lot_id]

        for report in reports:
            timestamp = report.get("timestamp")
            if isinstance(timestamp, str):
                timestamp = pd.to_datetime(timestamp)
            elif timestamp is None:
                timestamp = datetime.now()

            # Convert status to occupancy value
            status = report.get("reported_status", report.get("status", "moderate"))
            if isinstance(status, str):
                value = self.STATUS_TO_OCCUPANCY.get(status.lower(), 50.0)
            else:
                value = float(status)

            confidence = report.get("confidence", 1.0)
            buffer.add(timestamp, value, confidence)

        logger.debug(f"Added {len(reports)} reports for lot {lot_id}")

    def adjust(self, predictions: pd.DataFrame) -> pd.DataFrame:
        """
        Adjust batch predictions based on recent reports.

        Args:
            predictions: DataFrame with predictions

        Returns:
            DataFrame with adjusted predictions
        """
        if "lot_id" not in predictions.columns:
            return predictions

        adjusted = predictions.copy()

        for lot_id in predictions["lot_id"].unique():
            lot_mask = adjusted["lot_id"] == lot_id
            buffer = self._buffers.get(lot_id)

            if buffer is None:
                continue

            report_count = buffer.get_report_count(window_minutes=60)
            if report_count < self.min_reports:
                continue

            # Get weighted average from reports
            avg_reported, total_weight = buffer.get_weighted_average()
            if avg_reported is None:
                continue

            # Adjust predictions for this lot
            for idx in adjusted[lot_mask].index:
                pred_time = adjusted.loc[idx, "timestamp"]
                if isinstance(pred_time, pd.Timestamp):
                    pred_time = pred_time.to_pydatetime()

                # Get time-specific weighted average
                avg_at_time, weight = buffer.get_weighted_average(
                    reference_time=pred_time,
                    window_minutes=self.decay_minutes * 2,
                )

                if avg_at_time is None or weight < 0.1:
                    continue

                # Compute adjustment
                current_pred = adjusted.loc[idx, "predicted_occupancy"]
                adjustment = self._compute_adjustment(
                    model_prediction=current_pred,
                    reported_value=avg_at_time,
                    report_weight=weight,
                    model_confidence=adjusted.loc[idx, "confidence"],
                )

                # Apply adjustment
                adjusted.loc[idx, "predicted_occupancy"] = np.clip(
                    current_pred + adjustment, 0, 100
                )

                # Adjust bounds proportionally
                if "lower_bound" in adjusted.columns:
                    adjusted.loc[idx, "lower_bound"] = np.clip(
                        adjusted.loc[idx, "lower_bound"] + adjustment * 0.8, 0, 100
                    )
                if "upper_bound" in adjusted.columns:
                    adjusted.loc[idx, "upper_bound"] = np.clip(
                        adjusted.loc[idx, "upper_bound"] + adjustment * 0.8, 0, 100
                    )

        return adjusted

    def adjust_single(
        self,
        prediction: PredictionOutput,
        recent_reports: Optional[List[Dict[str, Any]]] = None,
    ) -> PredictionOutput:
        """
        Adjust a single prediction based on recent reports.

        Args:
            prediction: Original prediction
            recent_reports: Optional list of recent reports

        Returns:
            Adjusted prediction
        """
        lot_id = prediction.lot_id

        # Add any new reports
        if recent_reports:
            self.update_reports(lot_id, recent_reports)

        buffer = self._buffers.get(lot_id)
        if buffer is None:
            return prediction

        report_count = buffer.get_report_count(window_minutes=60)
        if report_count < self.min_reports:
            return prediction

        # Get weighted average
        avg_reported, weight = buffer.get_weighted_average(
            reference_time=prediction.timestamp.to_pydatetime()
            if hasattr(prediction.timestamp, "to_pydatetime")
            else prediction.timestamp,
        )

        if avg_reported is None or weight < 0.1:
            return prediction

        # Compute adjustment
        adjustment = self._compute_adjustment(
            model_prediction=prediction.predicted_occupancy,
            reported_value=avg_reported,
            report_weight=weight,
            model_confidence=prediction.confidence,
        )

        # Create adjusted prediction
        return PredictionOutput(
            predicted_occupancy=np.clip(
                prediction.predicted_occupancy + adjustment, 0, 100
            ),
            confidence=prediction.confidence,
            lower_bound=np.clip(prediction.lower_bound + adjustment * 0.8, 0, 100),
            upper_bound=np.clip(prediction.upper_bound + adjustment * 0.8, 0, 100),
            lot_id=prediction.lot_id,
            timestamp=prediction.timestamp,
        )

    def _compute_adjustment(
        self,
        model_prediction: float,
        reported_value: float,
        report_weight: float,
        model_confidence: float,
    ) -> float:
        """
        Compute adjustment value using Bayesian-inspired blending.

        The adjustment is weighted by:
        - Report weight (based on recency and confidence)
        - Inverse of model confidence (adjust more when model is uncertain)
        - Base adjustment weight
        """
        # Difference between reported and predicted
        diff = reported_value - model_prediction

        # Scale by report weight (normalized to 0-1 range)
        normalized_weight = min(1.0, report_weight)

        # Scale by inverse model confidence (adjust more when uncertain)
        uncertainty_factor = 1.0 - model_confidence

        # Compute final adjustment
        adjustment = (
            diff
            * self.adjustment_weight
            * normalized_weight
            * (0.5 + 0.5 * uncertainty_factor)  # Range: 0.5-1.0
        )

        # Clip to maximum adjustment
        adjustment = np.clip(adjustment, -self.max_adjustment, self.max_adjustment)

        return adjustment

    def get_lot_report_summary(
        self,
        lot_id: str,
        window_minutes: float = 60.0,
    ) -> Dict[str, Any]:
        """
        Get summary of recent reports for a lot.

        Args:
            lot_id: Parking lot ID
            window_minutes: Time window for summary

        Returns:
            Dictionary with report summary
        """
        buffer = self._buffers.get(lot_id)
        if buffer is None:
            return {
                "lot_id": lot_id,
                "report_count": 0,
                "weighted_average": None,
                "total_weight": 0.0,
            }

        avg, weight = buffer.get_weighted_average(window_minutes=window_minutes)
        count = buffer.get_report_count(window_minutes=window_minutes)

        return {
            "lot_id": lot_id,
            "report_count": count,
            "weighted_average": round(avg, 2) if avg else None,
            "total_weight": round(weight, 3),
        }

    def cleanup(self, max_age_minutes: float = 120.0) -> Dict[str, int]:
        """
        Remove old reports from all buffers.

        Args:
            max_age_minutes: Maximum age of reports to keep

        Returns:
            Dictionary with lot_id -> count of removed reports
        """
        removed = {}
        for lot_id, buffer in self._buffers.items():
            count = buffer.clear_old(max_age_minutes)
            if count > 0:
                removed[lot_id] = count

        if removed:
            logger.info(f"Cleaned up {sum(removed.values())} old reports")

        return removed

    def clear_lot(self, lot_id: str) -> None:
        """Clear all reports for a specific lot."""
        if lot_id in self._buffers:
            del self._buffers[lot_id]

    def clear_all(self) -> None:
        """Clear all report buffers."""
        self._buffers.clear()
        logger.info("Cleared all report buffers")
