"""
Feature engineering for parking occupancy prediction.

Transforms raw data into features suitable for ML models:
- Temporal features (cyclic encodings, semester info)
- Historical features (rolling averages, lags)
- Weather features
- Event features
- Real-time features from user reports
"""

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

from ml.training.config import FeatureConfig

logger = logging.getLogger(__name__)


class FeatureEngineer:
    """
    Feature engineering pipeline for parking occupancy prediction.

    Processes raw occupancy data and external signals into
    features suitable for time-series forecasting models.
    """

    def __init__(self, config: Optional[FeatureConfig] = None):
        """
        Initialize feature engineer.

        Args:
            config: Feature engineering configuration
        """
        self.config = config or FeatureConfig()
        self._fitted = False
        self._feature_stats: Dict[str, Dict[str, float]] = {}

    def fit(self, df: pd.DataFrame) -> "FeatureEngineer":
        """
        Fit feature statistics on training data.

        Computes statistics needed for feature normalization
        and historical feature computation.

        Args:
            df: Training DataFrame with occupancy data

        Returns:
            Self for method chaining
        """
        logger.info(f"Fitting feature engineer on {len(df)} samples")

        # Compute statistics for normalization
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        for col in numeric_cols:
            self._feature_stats[col] = {
                "mean": df[col].mean(),
                "std": df[col].std() + 1e-8,
                "min": df[col].min(),
                "max": df[col].max(),
            }

        self._fitted = True
        return self

    def transform(
        self,
        df: pd.DataFrame,
        weather_data: Optional[pd.DataFrame] = None,
        events_data: Optional[pd.DataFrame] = None,
        reports_data: Optional[pd.DataFrame] = None,
    ) -> pd.DataFrame:
        """
        Transform raw data into features.

        Args:
            df: Raw occupancy DataFrame with columns:
                - timestamp: datetime
                - lot_id: parking lot identifier
                - occupancy: occupancy percentage (0-100)
            weather_data: Optional weather forecast data
            events_data: Optional events calendar data
            reports_data: Optional real-time user reports

        Returns:
            DataFrame with engineered features
        """
        logger.info(f"Transforming {len(df)} samples")

        # Ensure datetime index
        df = df.copy()
        if "timestamp" in df.columns:
            df["timestamp"] = pd.to_datetime(df["timestamp"])
            df = df.set_index("timestamp")

        # Add all feature groups
        df = self._add_temporal_features(df)
        df = self._add_cyclical_features(df)
        df = self._add_semester_features(df)
        df = self._add_historical_features(df)
        df = self._add_lag_features(df)

        if weather_data is not None:
            df = self._add_weather_features(df, weather_data)
        else:
            df = self._add_default_weather_features(df)

        if events_data is not None:
            df = self._add_event_features(df, events_data)
        else:
            df = self._add_default_event_features(df)

        if reports_data is not None:
            df = self._add_realtime_features(df, reports_data)
        else:
            df = self._add_default_realtime_features(df)

        # Handle missing values
        df = self._handle_missing_values(df)

        # Reset index
        df = df.reset_index()

        logger.info(f"Generated {len(df.columns)} features")
        return df

    def fit_transform(
        self,
        df: pd.DataFrame,
        weather_data: Optional[pd.DataFrame] = None,
        events_data: Optional[pd.DataFrame] = None,
        reports_data: Optional[pd.DataFrame] = None,
    ) -> pd.DataFrame:
        """Fit and transform in one step."""
        return self.fit(df).transform(df, weather_data, events_data, reports_data)

    def _add_temporal_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add basic temporal features from timestamp index."""
        df["year"] = df.index.year
        df["month"] = df.index.month
        df["day"] = df.index.day
        df["day_of_week"] = df.index.dayofweek
        df["day_of_year"] = df.index.dayofyear
        df["week_of_year"] = df.index.isocalendar().week.astype(int)
        df["hour"] = df.index.hour
        df["minute"] = df.index.minute

        # Time of day categories
        df["is_morning"] = (df["hour"] >= 6) & (df["hour"] < 12)
        df["is_afternoon"] = (df["hour"] >= 12) & (df["hour"] < 18)
        df["is_evening"] = (df["hour"] >= 18) & (df["hour"] < 22)
        df["is_night"] = (df["hour"] >= 22) | (df["hour"] < 6)

        # Weekend indicator
        df["is_weekend"] = df["day_of_week"] >= 5

        return df

    def _add_cyclical_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add cyclical encodings for periodic features."""
        if not self.config.use_cyclical_encoding:
            return df

        # Hour of day (24-hour cycle)
        hour_rad = 2 * np.pi * df["hour"] / 24
        df["hour_sin"] = np.sin(hour_rad)
        df["hour_cos"] = np.cos(hour_rad)

        # Minute within hour (60-minute cycle)
        minute_rad = 2 * np.pi * df["minute"] / 60
        df["minute_sin"] = np.sin(minute_rad)
        df["minute_cos"] = np.cos(minute_rad)

        # Day of week (7-day cycle)
        day_rad = 2 * np.pi * df["day_of_week"] / 7
        df["day_sin"] = np.sin(day_rad)
        df["day_cos"] = np.cos(day_rad)

        # Day of year (365-day cycle)
        year_rad = 2 * np.pi * df["day_of_year"] / 365
        df["year_sin"] = np.sin(year_rad)
        df["year_cos"] = np.cos(year_rad)

        # Month (12-month cycle)
        month_rad = 2 * np.pi * df["month"] / 12
        df["month_sin"] = np.sin(month_rad)
        df["month_cos"] = np.cos(month_rad)

        return df

    def _add_semester_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add academic semester-related features."""
        # Determine if date is during semester
        # Fall: Aug 15 - Dec 15, Spring: Jan 15 - May 15
        month = df["month"]
        day = df["day"]

        df["is_fall_semester"] = (
            ((month == 8) & (day >= 15))
            | (month.isin([9, 10, 11]))
            | ((month == 12) & (day <= 15))
        )

        df["is_spring_semester"] = (
            ((month == 1) & (day >= 15))
            | (month.isin([2, 3, 4]))
            | ((month == 5) & (day <= 15))
        )

        df["is_summer"] = ~(df["is_fall_semester"] | df["is_spring_semester"])

        # Week within semester (approximate)
        def get_semester_week(row):
            if row["is_fall_semester"]:
                # Fall starts around Aug 20
                semester_start = pd.Timestamp(year=row.name.year, month=8, day=20)
            elif row["is_spring_semester"]:
                # Spring starts around Jan 15
                semester_start = pd.Timestamp(year=row.name.year, month=1, day=15)
            else:
                return 0

            days_since_start = (row.name - semester_start).days
            return max(0, min(16, days_since_start // 7 + 1))

        df["semester_week"] = df.apply(get_semester_week, axis=1)

        # Finals week detection (weeks 15-16 of semester)
        df["is_finals"] = df["semester_week"].isin([15, 16])

        # Dead week (week before finals)
        df["is_dead_week"] = df["semester_week"] == 14

        # First week of semester
        df["is_first_week"] = df["semester_week"] == 1

        return df

    def _add_historical_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add rolling historical averages."""
        # Sort by time to ensure correct rolling calculations
        df = df.sort_index()

        if "occupancy" not in df.columns:
            return df

        # Group by lot if multiple lots
        if "lot_id" in df.columns:
            grouped = df.groupby("lot_id")["occupancy"]
        else:
            grouped = df["occupancy"]

        # Rolling averages (window sizes in 15-min intervals)
        for window in self.config.rolling_windows:
            col_name = f"rolling_{window}_avg"
            if "lot_id" in df.columns:
                df[col_name] = grouped.transform(
                    lambda x: x.rolling(window, min_periods=1).mean()
                )
            else:
                df[col_name] = grouped.rolling(window, min_periods=1).mean()

        # Same day of week average (last N weeks)
        df["last_30_same_day_avg"] = self._compute_same_day_avg(df, weeks=4)

        # Rolling standard deviation for uncertainty
        df["rolling_24h_std"] = grouped.transform(
            lambda x: x.rolling(96, min_periods=1).std()  # 24 hours
        ) if "lot_id" in df.columns else df["occupancy"].rolling(96, min_periods=1).std()

        return df

    def _compute_same_day_avg(
        self,
        df: pd.DataFrame,
        weeks: int = 4,
    ) -> pd.Series:
        """
        Compute average occupancy for same day/hour over past weeks.

        Args:
            df: DataFrame with occupancy data
            weeks: Number of weeks to look back

        Returns:
            Series with same-day averages
        """
        result = pd.Series(index=df.index, dtype=float)

        for idx in df.index:
            # Get same day of week at same hour
            mask = (
                (df.index.dayofweek == idx.dayofweek)
                & (df.index.hour == idx.hour)
                & (df.index < idx)
                & (df.index >= idx - timedelta(weeks=weeks))
            )

            if mask.any() and "occupancy" in df.columns:
                result[idx] = df.loc[mask, "occupancy"].mean()
            else:
                result[idx] = np.nan

        return result

    def _add_lag_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add lagged occupancy values as features."""
        if "occupancy" not in df.columns:
            return df

        for lag in self.config.lag_periods:
            col_name = f"lag_{lag}"
            if "lot_id" in df.columns:
                df[col_name] = df.groupby("lot_id")["occupancy"].shift(lag)
            else:
                df[col_name] = df["occupancy"].shift(lag)

        # Name lags more intuitively
        lag_names = {
            4: "lag_1h",    # 4 * 15min = 1 hour
            96: "lag_24h",  # 96 * 15min = 24 hours
            672: "lag_168h", # 672 * 15min = 1 week
        }
        for lag, name in lag_names.items():
            if f"lag_{lag}" in df.columns:
                df[name] = df[f"lag_{lag}"]

        return df

    def _add_weather_features(
        self,
        df: pd.DataFrame,
        weather_data: pd.DataFrame,
    ) -> pd.DataFrame:
        """
        Add weather features from external data.

        Args:
            df: Main DataFrame
            weather_data: Weather DataFrame with columns:
                - timestamp: datetime
                - temperature: degrees Fahrenheit
                - precipitation: inches
                - wind_speed: mph

        Returns:
            DataFrame with weather features
        """
        # Ensure weather data is indexed by timestamp
        weather = weather_data.copy()
        if "timestamp" in weather.columns:
            weather["timestamp"] = pd.to_datetime(weather["timestamp"])
            weather = weather.set_index("timestamp")

        # Resample to 15-min intervals if needed
        weather = weather.resample("15T").ffill()

        # Merge with main data
        for col in ["temperature", "precipitation", "wind_speed"]:
            if col in weather.columns:
                df[col] = weather[col].reindex(df.index, method="nearest")

        # Derived weather features
        if "temperature" in df.columns:
            # Extreme temperature indicators
            df["is_hot"] = df["temperature"] > 90
            df["is_cold"] = df["temperature"] < 40

        if "precipitation" in df.columns:
            df["is_raining"] = df["precipitation"] > 0.01

        return df

    def _add_default_weather_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add placeholder weather features when no data available."""
        df["temperature"] = 70.0  # Default mild temperature
        df["precipitation"] = 0.0
        df["wind_speed"] = 5.0
        df["is_hot"] = False
        df["is_cold"] = False
        df["is_raining"] = False
        return df

    def _add_event_features(
        self,
        df: pd.DataFrame,
        events_data: pd.DataFrame,
    ) -> pd.DataFrame:
        """
        Add event-related features.

        Args:
            df: Main DataFrame
            events_data: Events DataFrame with columns:
                - date: event date
                - event_type: type of event
                - expected_attendance: optional attendance estimate

        Returns:
            DataFrame with event features
        """
        events = events_data.copy()
        if "date" in events.columns:
            events["date"] = pd.to_datetime(events["date"]).dt.date

        df_dates = df.index.date

        # Event type indicators
        for event_type in self.config.event_types:
            col_name = f"is_{event_type.replace('_game', '_day')}"
            event_dates = events[events["event_type"] == event_type]["date"].values
            df[col_name] = np.isin(df_dates, event_dates)

        # Simplified indicators
        df["is_game_day"] = (
            df.get("is_football_day", False) | df.get("is_basketball_day", False)
        )
        df["is_concert"] = df.get("is_concert_day", df.get("is_concert", False))

        # Days until next event
        df["days_until_event"] = self._compute_days_until_event(df, events)

        return df

    def _compute_days_until_event(
        self,
        df: pd.DataFrame,
        events: pd.DataFrame,
    ) -> pd.Series:
        """Compute days until the next major event."""
        result = pd.Series(index=df.index, dtype=float)

        if "date" in events.columns:
            event_dates = pd.to_datetime(events["date"]).sort_values()

            for idx in df.index:
                current_date = idx.date()
                future_events = event_dates[event_dates.dt.date > current_date]

                if len(future_events) > 0:
                    next_event = future_events.iloc[0]
                    result[idx] = (next_event.date() - current_date).days
                else:
                    result[idx] = self.config.event_lookahead_days  # No upcoming events

        return result.fillna(self.config.event_lookahead_days)

    def _add_default_event_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add placeholder event features when no data available."""
        df["is_game_day"] = False
        df["is_concert"] = False
        df["days_until_event"] = 7
        return df

    def _add_realtime_features(
        self,
        df: pd.DataFrame,
        reports_data: pd.DataFrame,
    ) -> pd.DataFrame:
        """
        Add real-time features from user reports.

        Args:
            df: Main DataFrame
            reports_data: User reports DataFrame with columns:
                - timestamp: report time
                - lot_id: parking lot
                - reported_status: user-reported status

        Returns:
            DataFrame with real-time features
        """
        reports = reports_data.copy()
        if "timestamp" in reports.columns:
            reports["timestamp"] = pd.to_datetime(reports["timestamp"])

        # Count reports in last hour
        df["reports_last_hour"] = self._count_reports_in_window(
            df, reports, window_minutes=60
        )

        # Count reports in last 15 minutes
        df["reports_last_15min"] = self._count_reports_in_window(
            df, reports, window_minutes=15
        )

        return df

    def _count_reports_in_window(
        self,
        df: pd.DataFrame,
        reports: pd.DataFrame,
        window_minutes: int,
    ) -> pd.Series:
        """Count reports within a time window before each timestamp."""
        result = pd.Series(index=df.index, dtype=int)

        for idx in df.index:
            window_start = idx - timedelta(minutes=window_minutes)
            mask = (reports["timestamp"] > window_start) & (reports["timestamp"] <= idx)

            if "lot_id" in df.columns and "lot_id" in reports.columns:
                lot_id = df.loc[idx, "lot_id"] if idx in df.index else None
                if lot_id:
                    mask = mask & (reports["lot_id"] == lot_id)

            result[idx] = mask.sum()

        return result

    def _add_default_realtime_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add placeholder real-time features when no data available."""
        df["reports_last_hour"] = 0
        df["reports_last_15min"] = 0
        df["geofence_entries"] = 0
        return df

    def _handle_missing_values(self, df: pd.DataFrame) -> pd.DataFrame:
        """Handle missing values in features."""
        # Forward fill then backward fill for time-series continuity
        df = df.ffill().bfill()

        # Fill any remaining NaNs with column means or defaults
        for col in df.columns:
            if df[col].isna().any():
                if col in self._feature_stats:
                    df[col] = df[col].fillna(self._feature_stats[col]["mean"])
                else:
                    df[col] = df[col].fillna(0)

        return df

    def get_feature_names(self) -> List[str]:
        """Get list of all feature names generated by this engineer."""
        return [
            # Temporal
            "day_of_week", "hour", "minute", "semester_week", "is_finals",
            # Cyclical
            "hour_sin", "hour_cos", "minute_sin", "minute_cos",
            "day_sin", "day_cos", "year_sin", "year_cos",
            # Historical
            "rolling_6_avg", "rolling_24_avg", "rolling_168_avg",
            "last_30_same_day_avg", "rolling_24h_std",
            # Lags
            "lag_1h", "lag_24h", "lag_168h",
            # Weather
            "temperature", "precipitation", "wind_speed",
            "is_hot", "is_cold", "is_raining",
            # Events
            "is_game_day", "is_concert", "days_until_event",
            # Real-time
            "reports_last_hour", "reports_last_15min", "geofence_entries",
            # Semester
            "is_fall_semester", "is_spring_semester", "is_summer",
            "is_weekend", "is_morning", "is_afternoon", "is_evening",
        ]
