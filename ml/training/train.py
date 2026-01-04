"""
Main training script for RaiderPark ML pipeline.

Orchestrates the complete training workflow:
1. Data loading from Supabase
2. Feature engineering
3. Model training
4. Evaluation and validation
5. Model artifact saving
6. MLflow experiment tracking
"""

import argparse
import logging
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

import mlflow
import pandas as pd

from ml.models.ensemble import EnsembleModel, EnsembleConfig
from ml.models.temporal_fusion_transformer import TemporalFusionTransformerModel, TFTConfig
from ml.models.lightgbm_model import LightGBMModel, LightGBMConfig
from ml.training.config import TrainingConfig, load_config
from ml.training.data_loader import DataLoader
from ml.training.features import FeatureEngineer
from ml.utils.metrics import evaluate_predictions, MetricsCalculator

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


class Trainer:
    """
    Main trainer class for parking occupancy prediction.

    Handles the complete training pipeline from data loading
    to model evaluation and artifact saving.
    """

    def __init__(self, config: Optional[TrainingConfig] = None):
        """
        Initialize trainer.

        Args:
            config: Training configuration
        """
        self.config = config or load_config()
        self.data_loader = DataLoader(config=self.config.data)
        self.feature_engineer = FeatureEngineer(config=self.config.features)
        self.metrics_calculator = MetricsCalculator()

        # Create directories
        self.config.model_dir.mkdir(parents=True, exist_ok=True)
        self.config.logs_dir.mkdir(parents=True, exist_ok=True)

        # Initialize MLflow
        mlflow.set_tracking_uri(self.config.mlflow_tracking_uri)

    def run(self) -> Dict[str, Any]:
        """
        Execute the complete training pipeline.

        Returns:
            Dictionary with training results and metrics
        """
        logger.info("Starting training pipeline")
        logger.info(f"Model type: {self.config.model.model_type}")

        # Start MLflow run
        with mlflow.start_run(run_name=self.config.training.run_name):
            # Log configuration
            mlflow.log_params(self._flatten_config())

            # 1. Load data
            logger.info("Loading training data...")
            train_df, val_df, test_df = self._load_and_prepare_data()

            # 2. Engineer features
            logger.info("Engineering features...")
            X_train, y_train = self._prepare_features(train_df)
            X_val, y_val = self._prepare_features(val_df)
            X_test, y_test = self._prepare_features(test_df)

            # 3. Train model
            logger.info("Training model...")
            model = self._train_model(X_train, y_train, (X_val, y_val))

            # 4. Evaluate model
            logger.info("Evaluating model...")
            metrics = self._evaluate_model(model, X_test, y_test)
            mlflow.log_metrics(metrics)

            # 5. Save model
            logger.info("Saving model artifacts...")
            model_path = self._save_model(model)
            mlflow.log_artifact(str(model_path))

            # 6. Log feature importance
            if hasattr(model, "get_feature_importance"):
                importance = model.get_feature_importance()
                if importance is not None:
                    self._log_feature_importance(importance)

            logger.info("Training pipeline completed successfully")

            return {
                "model_path": str(model_path),
                "metrics": metrics,
                "config": self.config.to_dict(),
            }

    def _load_and_prepare_data(
        self,
    ) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
        """Load data and split into train/val/test."""
        # Load all data sources
        occupancy_df, weather_df, events_df, reports_df = self.data_loader.load_training_data()

        # Validate data
        occupancy_df, quality_report = self.data_loader.validate_data(occupancy_df)
        logger.info(f"Data quality report: {quality_report}")

        # Split data
        train_df, val_df, test_df = self.data_loader.split_data(occupancy_df)

        # Store external data for feature engineering
        self._weather_df = weather_df
        self._events_df = events_df
        self._reports_df = reports_df

        return train_df, val_df, test_df

    def _prepare_features(
        self,
        df: pd.DataFrame,
    ) -> Tuple[pd.DataFrame, pd.Series]:
        """Transform raw data into features."""
        # Apply feature engineering
        df_features = self.feature_engineer.transform(
            df,
            weather_data=self._weather_df,
            events_data=self._events_df,
            reports_data=self._reports_df,
        )

        # Separate features and target
        target_col = "occupancy"
        feature_cols = [col for col in df_features.columns if col != target_col]

        X = df_features[feature_cols]
        y = df_features[target_col]

        return X, y

    def _train_model(
        self,
        X_train: pd.DataFrame,
        y_train: pd.Series,
        validation_data: Tuple[pd.DataFrame, pd.Series],
    ):
        """Train the selected model type."""
        model_type = self.config.model.model_type

        if model_type == "ensemble":
            model = self._create_ensemble_model()
        elif model_type == "tft":
            model = self._create_tft_model()
        elif model_type == "lightgbm":
            model = self._create_lgb_model()
        else:
            raise ValueError(f"Unknown model type: {model_type}")

        model.fit(X_train, y_train, validation_data=validation_data)
        return model

    def _create_ensemble_model(self) -> EnsembleModel:
        """Create ensemble model with configuration."""
        tft_config = TFTConfig(
            hidden_size=self.config.model.tft_hidden_size,
            lstm_layers=self.config.model.tft_lstm_layers,
            attention_heads=self.config.model.tft_attention_heads,
            dropout=self.config.model.tft_dropout,
            encoder_length=self.config.model.tft_encoder_length,
            decoder_length=self.config.model.tft_decoder_length,
            learning_rate=self.config.model.tft_learning_rate,
            max_epochs=self.config.model.tft_max_epochs,
            quantiles=self.config.model.quantiles,
        )

        lgb_config = LightGBMConfig(
            num_leaves=self.config.model.lgb_num_leaves,
            learning_rate=self.config.model.lgb_learning_rate,
            n_estimators=self.config.model.lgb_n_estimators,
            early_stopping_rounds=self.config.model.lgb_early_stopping_rounds,
            feature_fraction=self.config.model.lgb_feature_fraction,
            quantiles=self.config.model.quantiles,
        )

        ensemble_config = EnsembleConfig(
            tft_config=tft_config,
            lgb_config=lgb_config,
            strategy=self.config.model.ensemble_strategy,
            n_folds=self.config.model.ensemble_n_folds,
        )

        return EnsembleModel(config=ensemble_config)

    def _create_tft_model(self) -> TemporalFusionTransformerModel:
        """Create TFT model with configuration."""
        config = TFTConfig(
            hidden_size=self.config.model.tft_hidden_size,
            lstm_layers=self.config.model.tft_lstm_layers,
            attention_heads=self.config.model.tft_attention_heads,
            dropout=self.config.model.tft_dropout,
            encoder_length=self.config.model.tft_encoder_length,
            decoder_length=self.config.model.tft_decoder_length,
            learning_rate=self.config.model.tft_learning_rate,
            max_epochs=self.config.model.tft_max_epochs,
            quantiles=self.config.model.quantiles,
        )
        return TemporalFusionTransformerModel(config=config)

    def _create_lgb_model(self) -> LightGBMModel:
        """Create LightGBM model with configuration."""
        config = LightGBMConfig(
            num_leaves=self.config.model.lgb_num_leaves,
            learning_rate=self.config.model.lgb_learning_rate,
            n_estimators=self.config.model.lgb_n_estimators,
            early_stopping_rounds=self.config.model.lgb_early_stopping_rounds,
            feature_fraction=self.config.model.lgb_feature_fraction,
            quantiles=self.config.model.quantiles,
        )
        return LightGBMModel(config=config)

    def _evaluate_model(
        self,
        model,
        X_test: pd.DataFrame,
        y_test: pd.Series,
    ) -> Dict[str, float]:
        """Evaluate model on test set."""
        predictions = model.predict(X_test, return_confidence=True)

        metrics = self.metrics_calculator.compute_all(
            y_true=y_test.values,
            y_pred=predictions["predicted_occupancy"].values,
            y_lower=predictions["lower_bound"].values,
            y_upper=predictions["upper_bound"].values,
            confidence=predictions["confidence"].values,
        )

        logger.info(f"Test metrics: {metrics}")
        return metrics

    def _save_model(self, model) -> Path:
        """Save model artifacts to disk."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        model_name = f"{self.config.model.model_type}_{timestamp}"
        model_path = self.config.model_dir / model_name

        model.save(model_path)

        # Also save as "latest" for easy access
        latest_path = self.config.model_dir / "latest"
        if latest_path.exists():
            import shutil
            shutil.rmtree(latest_path)
        model.save(latest_path)

        return model_path

    def _log_feature_importance(self, importance: pd.Series) -> None:
        """Log feature importance to MLflow."""
        # Save as artifact
        importance_path = self.config.logs_dir / "feature_importance.csv"
        importance.to_csv(importance_path)
        mlflow.log_artifact(str(importance_path))

        # Log top features as metrics
        for i, (feature, score) in enumerate(importance.head(10).items()):
            mlflow.log_metric(f"feature_importance_{i}_{feature}", score)

    def _flatten_config(self) -> Dict[str, Any]:
        """Flatten config for MLflow logging."""
        config_dict = self.config.to_dict()
        flat = {}

        def _flatten(d, prefix=""):
            for k, v in d.items():
                key = f"{prefix}{k}" if prefix else k
                if isinstance(v, dict):
                    _flatten(v, f"{key}_")
                elif isinstance(v, list):
                    flat[key] = str(v)
                else:
                    flat[key] = v

        _flatten(config_dict)
        return flat


def train_model(
    config_path: Optional[str] = None,
    model_type: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Train a model with the specified configuration.

    Args:
        config_path: Path to YAML config file
        model_type: Override model type (tft, lightgbm, ensemble)

    Returns:
        Training results dictionary
    """
    config = load_config(config_path)

    if model_type:
        config.model.model_type = model_type

    trainer = Trainer(config)
    return trainer.run()


def main():
    """Command-line interface for training."""
    parser = argparse.ArgumentParser(
        description="Train RaiderPark parking occupancy prediction model"
    )
    parser.add_argument(
        "--config",
        type=str,
        help="Path to YAML configuration file",
    )
    parser.add_argument(
        "--model",
        type=str,
        choices=["tft", "lightgbm", "ensemble"],
        help="Model type to train",
    )
    parser.add_argument(
        "--experiment",
        type=str,
        default="raiderpark_occupancy",
        help="MLflow experiment name",
    )
    parser.add_argument(
        "--run-name",
        type=str,
        help="MLflow run name",
    )

    args = parser.parse_args()

    # Load and update config
    config = load_config(args.config)

    if args.model:
        config.model.model_type = args.model
    if args.experiment:
        config.training.experiment_name = args.experiment
    if args.run_name:
        config.training.run_name = args.run_name

    # Validate config
    errors = config.validate()
    if errors:
        logger.error(f"Configuration errors: {errors}")
        sys.exit(1)

    # Run training
    try:
        results = Trainer(config).run()
        logger.info(f"Training completed. Model saved to: {results['model_path']}")
        logger.info(f"Final metrics: {results['metrics']}")
    except Exception as e:
        logger.exception(f"Training failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
