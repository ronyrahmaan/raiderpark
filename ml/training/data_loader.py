"""
Data loading from Supabase for ML training.

Loads historical parking data, weather data, and events
from the Supabase database for model training.
"""

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd

from ml.utils.supabase_client import get_supabase_client, SupabaseClient
from ml.training.config import DataConfig

logger = logging.getLogger(__name__)


class DataLoader:
    """
    Data loader for parking occupancy ML training.

    Handles:
    - Loading historical occupancy data
    - Loading weather data
    - Loading events calendar
    - Loading user reports
    - Data validation and cleaning
    """

    def __init__(
        self,
        config: Optional[DataConfig] = None,
        supabase_client: Optional[SupabaseClient] = None,
    ):
        """
        Initialize data loader.

        Args:
            config: Data loading configuration
            supabase_client: Optional pre-initialized Supabase client
        """
        self.config = config or DataConfig()
        self._client = supabase_client

    @property
    def client(self) -> SupabaseClient:
        """Get or initialize Supabase client."""
        if self._client is None:
            self._client = get_supabase_client()
        return self._client

    def load_training_data(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        lot_ids: Optional[List[str]] = None,
    ) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
        """
        Load all training data from Supabase.

        Args:
            start_date: Start date for data (default from config)
            end_date: End date for data (default from config)
            lot_ids: Optional list of lot IDs to include

        Returns:
            Tuple of (occupancy_df, weather_df, events_df)
        """
        start = start_date or self.config.train_start_date
        end = end_date or self.config.train_end_date

        logger.info(f"Loading training data from {start} to {end}")

        # Load all data sources
        occupancy_df = self.load_occupancy_data(start, end, lot_ids)
        weather_df = self.load_weather_data(start, end)
        events_df = self.load_events_data(start, end)
        reports_df = self.load_reports_data(start, end, lot_ids)

        logger.info(
            f"Loaded {len(occupancy_df)} occupancy records, "
            f"{len(weather_df)} weather records, "
            f"{len(events_df)} events"
        )

        return occupancy_df, weather_df, events_df, reports_df

    def load_occupancy_data(
        self,
        start_date: str,
        end_date: str,
        lot_ids: Optional[List[str]] = None,
    ) -> pd.DataFrame:
        """
        Load historical occupancy data.

        Args:
            start_date: Start date (YYYY-MM-DD)
            end_date: End date (YYYY-MM-DD)
            lot_ids: Optional list of lot IDs

        Returns:
            DataFrame with occupancy records
        """
        try:
            query = self.client.table("parking_occupancy").select(
                "timestamp, lot_id, occupancy_percent, total_spots, available_spots"
            ).gte("timestamp", start_date).lte("timestamp", end_date)

            if lot_ids:
                query = query.in_("lot_id", lot_ids)
            elif self.config.include_lots:
                query = query.in_("lot_id", self.config.include_lots)
            elif self.config.exclude_lots:
                # Supabase doesn't have not_in, so we filter after
                pass

            response = query.order("timestamp").execute()
            df = pd.DataFrame(response.data)

            if self.config.exclude_lots and not df.empty:
                df = df[~df["lot_id"].isin(self.config.exclude_lots)]

            # Rename for consistency
            df = df.rename(columns={"occupancy_percent": "occupancy"})

            # Ensure datetime
            if "timestamp" in df.columns:
                df["timestamp"] = pd.to_datetime(df["timestamp"])

            logger.info(f"Loaded {len(df)} occupancy records")
            return df

        except Exception as e:
            logger.warning(f"Failed to load occupancy data: {e}")
            return self._generate_sample_occupancy_data(start_date, end_date, lot_ids)

    def load_weather_data(
        self,
        start_date: str,
        end_date: str,
    ) -> pd.DataFrame:
        """
        Load historical weather data.

        Args:
            start_date: Start date
            end_date: End date

        Returns:
            DataFrame with weather records
        """
        try:
            response = self.client.table("weather_data").select(
                "timestamp, temperature, precipitation, wind_speed, humidity, conditions"
            ).gte("timestamp", start_date).lte("timestamp", end_date).execute()

            df = pd.DataFrame(response.data)

            if "timestamp" in df.columns:
                df["timestamp"] = pd.to_datetime(df["timestamp"])

            logger.info(f"Loaded {len(df)} weather records")
            return df

        except Exception as e:
            logger.warning(f"Failed to load weather data: {e}")
            return self._generate_sample_weather_data(start_date, end_date)

    def load_events_data(
        self,
        start_date: str,
        end_date: str,
    ) -> pd.DataFrame:
        """
        Load events calendar data.

        Args:
            start_date: Start date
            end_date: End date

        Returns:
            DataFrame with events
        """
        try:
            response = self.client.table("events").select(
                "date, event_type, name, expected_attendance, venue, start_time, end_time"
            ).gte("date", start_date).lte("date", end_date).execute()

            df = pd.DataFrame(response.data)

            if "date" in df.columns:
                df["date"] = pd.to_datetime(df["date"])

            logger.info(f"Loaded {len(df)} events")
            return df

        except Exception as e:
            logger.warning(f"Failed to load events data: {e}")
            return self._generate_sample_events_data(start_date, end_date)

    def load_reports_data(
        self,
        start_date: str,
        end_date: str,
        lot_ids: Optional[List[str]] = None,
    ) -> pd.DataFrame:
        """
        Load user-submitted parking reports.

        Args:
            start_date: Start date
            end_date: End date
            lot_ids: Optional list of lot IDs

        Returns:
            DataFrame with user reports
        """
        try:
            query = self.client.table("parking_reports").select(
                "timestamp, lot_id, reported_status, user_id"
            ).gte("timestamp", start_date).lte("timestamp", end_date)

            if lot_ids:
                query = query.in_("lot_id", lot_ids)

            response = query.execute()
            df = pd.DataFrame(response.data)

            if "timestamp" in df.columns:
                df["timestamp"] = pd.to_datetime(df["timestamp"])

            logger.info(f"Loaded {len(df)} user reports")
            return df

        except Exception as e:
            logger.warning(f"Failed to load reports data: {e}")
            return pd.DataFrame(columns=["timestamp", "lot_id", "reported_status"])

    def load_lot_metadata(self) -> pd.DataFrame:
        """
        Load parking lot metadata.

        Returns:
            DataFrame with lot information
        """
        try:
            response = self.client.table("parking_lots").select(
                "id, name, total_spots, latitude, longitude, type"
            ).execute()

            df = pd.DataFrame(response.data)
            logger.info(f"Loaded metadata for {len(df)} lots")
            return df

        except Exception as e:
            logger.warning(f"Failed to load lot metadata: {e}")
            return self._generate_sample_lot_metadata()

    def split_data(
        self,
        df: pd.DataFrame,
        validation_split: Optional[float] = None,
        test_split: Optional[float] = None,
    ) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
        """
        Split data into train/validation/test sets.

        Uses temporal split to respect time-series nature of data.

        Args:
            df: Full dataset
            validation_split: Fraction for validation (default from config)
            test_split: Fraction for test (default from config)

        Returns:
            Tuple of (train_df, val_df, test_df)
        """
        val_frac = validation_split or self.config.validation_split
        test_frac = test_split or self.config.test_split
        train_frac = 1.0 - val_frac - test_frac

        # Sort by timestamp
        df = df.sort_values("timestamp")
        n = len(df)

        train_end = int(n * train_frac)
        val_end = int(n * (train_frac + val_frac))

        train_df = df.iloc[:train_end].copy()
        val_df = df.iloc[train_end:val_end].copy()
        test_df = df.iloc[val_end:].copy()

        logger.info(
            f"Split data: train={len(train_df)}, val={len(val_df)}, test={len(test_df)}"
        )

        return train_df, val_df, test_df

    def validate_data(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """
        Validate and clean data quality.

        Args:
            df: Raw DataFrame

        Returns:
            Tuple of (cleaned_df, quality_report)
        """
        quality_report = {
            "original_rows": len(df),
            "issues": [],
        }

        # Check for required columns
        required_cols = ["timestamp", "lot_id", "occupancy"]
        missing_cols = [col for col in required_cols if col not in df.columns]
        if missing_cols:
            quality_report["issues"].append(f"Missing columns: {missing_cols}")
            return df, quality_report

        # Remove duplicates
        n_before = len(df)
        df = df.drop_duplicates(subset=["timestamp", "lot_id"])
        n_dupes = n_before - len(df)
        if n_dupes > 0:
            quality_report["issues"].append(f"Removed {n_dupes} duplicate rows")

        # Check for invalid occupancy values
        invalid_occ = (df["occupancy"] < 0) | (df["occupancy"] > 100)
        n_invalid = invalid_occ.sum()
        if n_invalid > 0:
            quality_report["issues"].append(f"Found {n_invalid} invalid occupancy values")
            df.loc[df["occupancy"] < 0, "occupancy"] = 0
            df.loc[df["occupancy"] > 100, "occupancy"] = 100

        # Check for gaps in time series
        df = df.sort_values(["lot_id", "timestamp"])
        expected_interval = timedelta(minutes=self.config.sample_interval_minutes)

        for lot_id in df["lot_id"].unique():
            lot_data = df[df["lot_id"] == lot_id]
            time_diffs = lot_data["timestamp"].diff()
            large_gaps = time_diffs > expected_interval * 2
            if large_gaps.any():
                n_gaps = large_gaps.sum()
                quality_report["issues"].append(
                    f"Lot {lot_id}: {n_gaps} time gaps > {expected_interval * 2}"
                )

        quality_report["final_rows"] = len(df)
        quality_report["rows_removed"] = quality_report["original_rows"] - len(df)

        return df, quality_report

    def _generate_sample_occupancy_data(
        self,
        start_date: str,
        end_date: str,
        lot_ids: Optional[List[str]] = None,
    ) -> pd.DataFrame:
        """Generate sample occupancy data for testing when DB unavailable."""
        import numpy as np

        logger.info("Generating sample occupancy data")

        start = pd.to_datetime(start_date)
        end = pd.to_datetime(end_date)

        lots = lot_ids or ["lot_a", "lot_b", "lot_c", "lot_d", "lot_e"]
        timestamps = pd.date_range(start, end, freq="15T")

        records = []
        for lot in lots:
            for ts in timestamps:
                # Generate realistic occupancy pattern
                hour = ts.hour
                day_of_week = ts.dayofweek

                # Base pattern: higher during weekday work hours
                if day_of_week < 5:  # Weekday
                    if 8 <= hour <= 17:
                        base = 70 + np.random.normal(0, 10)
                    elif 7 <= hour <= 20:
                        base = 50 + np.random.normal(0, 10)
                    else:
                        base = 20 + np.random.normal(0, 5)
                else:  # Weekend
                    base = 25 + np.random.normal(0, 8)

                occupancy = np.clip(base, 0, 100)

                records.append({
                    "timestamp": ts,
                    "lot_id": lot,
                    "occupancy": occupancy,
                    "total_spots": 100,
                    "available_spots": int(100 * (1 - occupancy / 100)),
                })

        return pd.DataFrame(records)

    def _generate_sample_weather_data(
        self,
        start_date: str,
        end_date: str,
    ) -> pd.DataFrame:
        """Generate sample weather data for testing."""
        import numpy as np

        start = pd.to_datetime(start_date)
        end = pd.to_datetime(end_date)
        timestamps = pd.date_range(start, end, freq="1H")

        records = []
        for ts in timestamps:
            # Seasonal temperature variation
            day_of_year = ts.dayofyear
            seasonal = 20 * np.sin(2 * np.pi * (day_of_year - 80) / 365)
            temp = 65 + seasonal + np.random.normal(0, 5)

            records.append({
                "timestamp": ts,
                "temperature": temp,
                "precipitation": max(0, np.random.exponential(0.05)),
                "wind_speed": max(0, 8 + np.random.normal(0, 3)),
                "humidity": np.clip(50 + np.random.normal(0, 15), 20, 100),
                "conditions": "Clear" if np.random.random() > 0.3 else "Cloudy",
            })

        return pd.DataFrame(records)

    def _generate_sample_events_data(
        self,
        start_date: str,
        end_date: str,
    ) -> pd.DataFrame:
        """Generate sample events data for testing."""
        import numpy as np

        start = pd.to_datetime(start_date)
        end = pd.to_datetime(end_date)

        records = []
        current = start

        while current <= end:
            # Football games on Saturdays during fall
            if current.dayofweek == 5 and 9 <= current.month <= 11:
                if np.random.random() > 0.5:  # ~50% of Saturdays
                    records.append({
                        "date": current,
                        "event_type": "football_game",
                        "name": "Football Game",
                        "expected_attendance": np.random.randint(40000, 65000),
                        "venue": "Stadium",
                        "start_time": "14:00",
                        "end_time": "18:00",
                    })

            # Basketball games
            if current.dayofweek in [2, 5] and (current.month >= 11 or current.month <= 3):
                if np.random.random() > 0.7:
                    records.append({
                        "date": current,
                        "event_type": "basketball_game",
                        "name": "Basketball Game",
                        "expected_attendance": np.random.randint(10000, 16000),
                        "venue": "Arena",
                        "start_time": "19:00",
                        "end_time": "21:30",
                    })

            current += timedelta(days=1)

        return pd.DataFrame(records)

    def _generate_sample_lot_metadata(self) -> pd.DataFrame:
        """Generate sample lot metadata."""
        return pd.DataFrame([
            {"id": "lot_a", "name": "Lot A - Main Campus", "total_spots": 500, "latitude": 33.5843, "longitude": -101.8783, "type": "student"},
            {"id": "lot_b", "name": "Lot B - Engineering", "total_spots": 300, "latitude": 33.5853, "longitude": -101.8773, "type": "student"},
            {"id": "lot_c", "name": "Lot C - Stadium", "total_spots": 1000, "latitude": 33.5833, "longitude": -101.8793, "type": "visitor"},
            {"id": "lot_d", "name": "Lot D - Library", "total_spots": 200, "latitude": 33.5863, "longitude": -101.8763, "type": "faculty"},
            {"id": "lot_e", "name": "Lot E - Recreation", "total_spots": 400, "latitude": 33.5823, "longitude": -101.8803, "type": "student"},
        ])
