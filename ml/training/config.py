"""
Training configuration for RaiderPark ML pipeline.

Centralized configuration management with:
- Model hyperparameters
- Feature engineering settings
- Training parameters
- Validation and evaluation settings
"""

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml


@dataclass
class DataConfig:
    """Data loading and preprocessing configuration."""

    # Time range for training data
    train_start_date: str = "2023-01-01"
    train_end_date: str = "2024-12-31"

    # Validation split
    validation_split: float = 0.15
    test_split: float = 0.10

    # Data quality filters
    min_reports_per_day: int = 10
    max_missing_hours: int = 4

    # Sampling
    sample_interval_minutes: int = 15

    # Lot filtering
    include_lots: Optional[List[str]] = None
    exclude_lots: Optional[List[str]] = None


@dataclass
class FeatureConfig:
    """Feature engineering configuration."""

    # Temporal features
    use_cyclical_encoding: bool = True
    semester_start_month: int = 8  # August
    semester_end_month: int = 5  # May

    # Historical features
    historical_window_days: int = 30
    rolling_windows: List[int] = field(default_factory=lambda: [6, 24, 168])  # 1.5h, 6h, 1 week

    # Lag features
    lag_periods: List[int] = field(default_factory=lambda: [4, 96, 672])  # 1h, 24h, 1 week

    # Weather API settings
    weather_forecast_hours: int = 48
    weather_cache_ttl_seconds: int = 3600

    # Event features
    event_lookahead_days: int = 7
    event_types: List[str] = field(default_factory=lambda: [
        "football_game",
        "basketball_game",
        "concert",
        "graduation",
        "orientation",
    ])


@dataclass
class ModelConfig:
    """Model-specific configuration."""

    # Model selection
    model_type: str = "ensemble"  # "tft", "lightgbm", "ensemble"

    # TFT hyperparameters
    tft_hidden_size: int = 64
    tft_lstm_layers: int = 2
    tft_attention_heads: int = 4
    tft_dropout: float = 0.1
    tft_encoder_length: int = 96
    tft_decoder_length: int = 24
    tft_learning_rate: float = 1e-3
    tft_max_epochs: int = 100

    # LightGBM hyperparameters
    lgb_num_leaves: int = 63
    lgb_learning_rate: float = 0.05
    lgb_n_estimators: int = 1000
    lgb_early_stopping_rounds: int = 50
    lgb_feature_fraction: float = 0.8

    # Ensemble settings
    ensemble_strategy: str = "stacking"  # "stacking", "weighted_avg"
    ensemble_n_folds: int = 5

    # Quantiles for prediction intervals
    quantiles: List[float] = field(default_factory=lambda: [0.1, 0.5, 0.9])


@dataclass
class TrainingRunConfig:
    """Training run configuration."""

    # Experiment tracking
    experiment_name: str = "raiderpark_occupancy"
    run_name: Optional[str] = None

    # Training settings
    batch_size: int = 64
    num_workers: int = 4
    random_seed: int = 42

    # Early stopping
    early_stopping_patience: int = 10
    early_stopping_min_delta: float = 0.001

    # Checkpointing
    save_best_only: bool = True
    checkpoint_metric: str = "val_mae"

    # Logging
    log_every_n_steps: int = 100
    verbose: bool = True


@dataclass
class InferenceConfig:
    """Inference and serving configuration."""

    # Batch inference
    prediction_horizon_hours: int = 24
    prediction_interval_minutes: int = 15
    batch_size: int = 256

    # Real-time adjustments
    enable_realtime_adjustment: bool = True
    adjustment_weight: float = 0.3
    adjustment_decay_minutes: int = 30

    # Confidence calibration
    enable_calibration: bool = True
    calibration_method: str = "isotonic"

    # Caching
    cache_predictions: bool = True
    cache_ttl_minutes: int = 5


@dataclass
class TrainingConfig:
    """
    Master configuration for the ML training pipeline.

    Combines all component configurations into a single object
    that can be loaded from YAML or environment variables.
    """

    data: DataConfig = field(default_factory=DataConfig)
    features: FeatureConfig = field(default_factory=FeatureConfig)
    model: ModelConfig = field(default_factory=ModelConfig)
    training: TrainingRunConfig = field(default_factory=TrainingRunConfig)
    inference: InferenceConfig = field(default_factory=InferenceConfig)

    # Paths
    data_dir: Path = Path("data")
    model_dir: Path = Path("models")
    logs_dir: Path = Path("logs")

    # MLflow settings
    mlflow_tracking_uri: str = "mlruns"
    mlflow_artifact_location: Optional[str] = None

    def __post_init__(self):
        """Convert string paths to Path objects."""
        if isinstance(self.data_dir, str):
            self.data_dir = Path(self.data_dir)
        if isinstance(self.model_dir, str):
            self.model_dir = Path(self.model_dir)
        if isinstance(self.logs_dir, str):
            self.logs_dir = Path(self.logs_dir)

    @classmethod
    def from_yaml(cls, path: str) -> "TrainingConfig":
        """
        Load configuration from a YAML file.

        Args:
            path: Path to YAML configuration file

        Returns:
            TrainingConfig instance
        """
        with open(path, "r") as f:
            config_dict = yaml.safe_load(f)

        return cls._from_dict(config_dict)

    @classmethod
    def _from_dict(cls, config_dict: Dict[str, Any]) -> "TrainingConfig":
        """Create config from dictionary."""
        return cls(
            data=DataConfig(**config_dict.get("data", {})),
            features=FeatureConfig(**config_dict.get("features", {})),
            model=ModelConfig(**config_dict.get("model", {})),
            training=TrainingRunConfig(**config_dict.get("training", {})),
            inference=InferenceConfig(**config_dict.get("inference", {})),
            data_dir=Path(config_dict.get("data_dir", "data")),
            model_dir=Path(config_dict.get("model_dir", "models")),
            logs_dir=Path(config_dict.get("logs_dir", "logs")),
            mlflow_tracking_uri=config_dict.get("mlflow_tracking_uri", "mlruns"),
            mlflow_artifact_location=config_dict.get("mlflow_artifact_location"),
        )

    @classmethod
    def from_env(cls) -> "TrainingConfig":
        """
        Load configuration from environment variables.

        Environment variables are prefixed with RAIDERPARK_ML_
        Example: RAIDERPARK_ML_MODEL_TYPE=ensemble

        Returns:
            TrainingConfig instance
        """
        config = cls()

        # Model type
        if model_type := os.getenv("RAIDERPARK_ML_MODEL_TYPE"):
            config.model.model_type = model_type

        # Paths
        if data_dir := os.getenv("RAIDERPARK_ML_DATA_DIR"):
            config.data_dir = Path(data_dir)
        if model_dir := os.getenv("RAIDERPARK_ML_MODEL_DIR"):
            config.model_dir = Path(model_dir)

        # MLflow
        if tracking_uri := os.getenv("MLFLOW_TRACKING_URI"):
            config.mlflow_tracking_uri = tracking_uri

        # Training parameters
        if batch_size := os.getenv("RAIDERPARK_ML_BATCH_SIZE"):
            config.training.batch_size = int(batch_size)
        if epochs := os.getenv("RAIDERPARK_ML_MAX_EPOCHS"):
            config.model.tft_max_epochs = int(epochs)

        return config

    def to_dict(self) -> Dict[str, Any]:
        """Convert configuration to dictionary."""
        return {
            "data": self.data.__dict__,
            "features": {
                **self.features.__dict__,
                "rolling_windows": self.features.rolling_windows,
                "lag_periods": self.features.lag_periods,
                "event_types": self.features.event_types,
            },
            "model": {
                **self.model.__dict__,
                "quantiles": self.model.quantiles,
            },
            "training": self.training.__dict__,
            "inference": self.inference.__dict__,
            "data_dir": str(self.data_dir),
            "model_dir": str(self.model_dir),
            "logs_dir": str(self.logs_dir),
            "mlflow_tracking_uri": self.mlflow_tracking_uri,
            "mlflow_artifact_location": self.mlflow_artifact_location,
        }

    def save_yaml(self, path: str) -> None:
        """
        Save configuration to a YAML file.

        Args:
            path: Path to save YAML file
        """
        with open(path, "w") as f:
            yaml.dump(self.to_dict(), f, default_flow_style=False)

    def validate(self) -> List[str]:
        """
        Validate configuration values.

        Returns:
            List of validation error messages (empty if valid)
        """
        errors = []

        # Validate split ratios
        total_split = self.data.validation_split + self.data.test_split
        if total_split >= 1.0:
            errors.append(
                f"Validation + test split ({total_split}) must be less than 1.0"
            )

        # Validate model type
        valid_models = ["tft", "lightgbm", "ensemble"]
        if self.model.model_type not in valid_models:
            errors.append(
                f"Invalid model_type '{self.model.model_type}'. "
                f"Must be one of: {valid_models}"
            )

        # Validate quantiles
        for q in self.model.quantiles:
            if not 0 < q < 1:
                errors.append(f"Quantile {q} must be between 0 and 1")

        # Validate paths
        if not self.data_dir.parent.exists():
            errors.append(f"Parent directory for data_dir does not exist: {self.data_dir}")

        return errors


def get_default_config() -> TrainingConfig:
    """Get default training configuration."""
    return TrainingConfig()


def load_config(config_path: Optional[str] = None) -> TrainingConfig:
    """
    Load configuration from file or environment.

    Priority:
    1. Explicit config file path
    2. RAIDERPARK_ML_CONFIG environment variable
    3. Default configuration

    Args:
        config_path: Optional path to config YAML file

    Returns:
        TrainingConfig instance
    """
    if config_path:
        return TrainingConfig.from_yaml(config_path)

    if env_config_path := os.getenv("RAIDERPARK_ML_CONFIG"):
        return TrainingConfig.from_yaml(env_config_path)

    # Use defaults with environment overrides
    return TrainingConfig.from_env()
