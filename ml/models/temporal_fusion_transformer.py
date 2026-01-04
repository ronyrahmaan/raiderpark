"""
Temporal Fusion Transformer model for parking occupancy prediction.

TFT is well-suited for time-series forecasting with multiple inputs:
- Static covariates (lot characteristics)
- Known future inputs (scheduled events, time features)
- Observed historical inputs (past occupancy, weather)

Reference: Lim et al., "Temporal Fusion Transformers for Interpretable
Multi-horizon Time Series Forecasting" (2021)
"""

import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
import torch
from torch import nn

from ml.models.base_model import BaseModel, PredictionOutput

logger = logging.getLogger(__name__)


class TFTConfig:
    """Configuration for Temporal Fusion Transformer."""

    def __init__(
        self,
        hidden_size: int = 64,
        lstm_layers: int = 2,
        attention_heads: int = 4,
        dropout: float = 0.1,
        encoder_length: int = 96,  # 24 hours of 15-min intervals
        decoder_length: int = 24,  # 6 hours ahead
        learning_rate: float = 1e-3,
        batch_size: int = 64,
        max_epochs: int = 100,
        early_stopping_patience: int = 10,
        quantiles: List[float] = None,
    ):
        self.hidden_size = hidden_size
        self.lstm_layers = lstm_layers
        self.attention_heads = attention_heads
        self.dropout = dropout
        self.encoder_length = encoder_length
        self.decoder_length = decoder_length
        self.learning_rate = learning_rate
        self.batch_size = batch_size
        self.max_epochs = max_epochs
        self.early_stopping_patience = early_stopping_patience
        self.quantiles = quantiles or [0.1, 0.5, 0.9]

    def to_dict(self) -> Dict[str, Any]:
        return self.__dict__.copy()

    @classmethod
    def from_dict(cls, config_dict: Dict[str, Any]) -> "TFTConfig":
        return cls(**config_dict)


class GatedLinearUnit(nn.Module):
    """Gated Linear Unit for feature selection."""

    def __init__(self, input_size: int, hidden_size: int, dropout: float = 0.1):
        super().__init__()
        self.fc = nn.Linear(input_size, hidden_size)
        self.gate = nn.Linear(input_size, hidden_size)
        self.dropout = nn.Dropout(dropout)
        self.layer_norm = nn.LayerNorm(hidden_size)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        activation = self.fc(x)
        gate = torch.sigmoid(self.gate(x))
        return self.layer_norm(self.dropout(activation * gate))


class VariableSelectionNetwork(nn.Module):
    """Variable selection for dynamic feature importance."""

    def __init__(
        self,
        input_size: int,
        num_inputs: int,
        hidden_size: int,
        dropout: float = 0.1,
    ):
        super().__init__()
        self.hidden_size = hidden_size
        self.num_inputs = num_inputs

        # Individual variable processing
        self.var_grns = nn.ModuleList([
            GatedLinearUnit(input_size, hidden_size, dropout)
            for _ in range(num_inputs)
        ])

        # Variable selection weights
        self.selection_weights = nn.Sequential(
            nn.Linear(num_inputs * hidden_size, num_inputs),
            nn.Softmax(dim=-1),
        )

    def forward(self, inputs: List[torch.Tensor]) -> Tuple[torch.Tensor, torch.Tensor]:
        # Process each variable
        var_outputs = []
        for i, inp in enumerate(inputs):
            var_outputs.append(self.var_grns[i](inp))

        # Stack and compute selection weights
        stacked = torch.stack(var_outputs, dim=-2)  # (batch, seq, num_vars, hidden)
        flat = stacked.reshape(stacked.shape[0], stacked.shape[1], -1)
        weights = self.selection_weights(flat)  # (batch, seq, num_vars)

        # Weighted combination
        weighted = (stacked * weights.unsqueeze(-1)).sum(dim=-2)
        return weighted, weights


class TemporalSelfAttention(nn.Module):
    """Multi-head temporal self-attention layer."""

    def __init__(self, hidden_size: int, num_heads: int, dropout: float = 0.1):
        super().__init__()
        self.attention = nn.MultiheadAttention(
            embed_dim=hidden_size,
            num_heads=num_heads,
            dropout=dropout,
            batch_first=True,
        )
        self.layer_norm = nn.LayerNorm(hidden_size)
        self.dropout = nn.Dropout(dropout)

    def forward(
        self,
        x: torch.Tensor,
        mask: Optional[torch.Tensor] = None,
    ) -> Tuple[torch.Tensor, torch.Tensor]:
        attn_out, attn_weights = self.attention(x, x, x, attn_mask=mask)
        return self.layer_norm(x + self.dropout(attn_out)), attn_weights


class TFTModel(nn.Module):
    """
    Temporal Fusion Transformer neural network.

    Architecture:
    1. Input embeddings for categorical and continuous features
    2. Variable selection networks for static, encoder, and decoder inputs
    3. LSTM encoder-decoder for sequence modeling
    4. Temporal self-attention for long-range dependencies
    5. Quantile output for prediction intervals
    """

    def __init__(self, config: TFTConfig, num_continuous: int, num_categorical: int):
        super().__init__()
        self.config = config
        self.num_continuous = num_continuous
        self.num_categorical = num_categorical

        # Feature embeddings
        self.continuous_embedding = nn.Linear(1, config.hidden_size)
        self.categorical_embeddings = nn.ModuleList([
            nn.Embedding(100, config.hidden_size)  # Assuming max 100 categories
            for _ in range(num_categorical)
        ])

        # Variable selection
        num_vars = num_continuous + num_categorical
        self.encoder_vsn = VariableSelectionNetwork(
            config.hidden_size, num_vars, config.hidden_size, config.dropout
        )
        self.decoder_vsn = VariableSelectionNetwork(
            config.hidden_size, num_vars, config.hidden_size, config.dropout
        )

        # LSTM encoder-decoder
        self.encoder_lstm = nn.LSTM(
            input_size=config.hidden_size,
            hidden_size=config.hidden_size,
            num_layers=config.lstm_layers,
            dropout=config.dropout if config.lstm_layers > 1 else 0,
            batch_first=True,
        )
        self.decoder_lstm = nn.LSTM(
            input_size=config.hidden_size,
            hidden_size=config.hidden_size,
            num_layers=config.lstm_layers,
            dropout=config.dropout if config.lstm_layers > 1 else 0,
            batch_first=True,
        )

        # Temporal attention
        self.temporal_attention = TemporalSelfAttention(
            config.hidden_size, config.attention_heads, config.dropout
        )

        # Output layers - one per quantile
        self.output_layers = nn.ModuleList([
            nn.Linear(config.hidden_size, 1)
            for _ in config.quantiles
        ])

        # GLU for gated residual connections
        self.glu = GatedLinearUnit(config.hidden_size, config.hidden_size, config.dropout)

    def forward(
        self,
        continuous_encoder: torch.Tensor,
        categorical_encoder: torch.Tensor,
        continuous_decoder: torch.Tensor,
        categorical_decoder: torch.Tensor,
    ) -> Tuple[torch.Tensor, Dict[str, torch.Tensor]]:
        """
        Forward pass through TFT.

        Args:
            continuous_encoder: (batch, encoder_len, num_continuous)
            categorical_encoder: (batch, encoder_len, num_categorical) as indices
            continuous_decoder: (batch, decoder_len, num_continuous)
            categorical_decoder: (batch, decoder_len, num_categorical) as indices

        Returns:
            predictions: (batch, decoder_len, num_quantiles)
            interpretability: Dictionary of attention weights
        """
        batch_size = continuous_encoder.shape[0]

        # Embed encoder inputs
        enc_cont_emb = [
            self.continuous_embedding(continuous_encoder[:, :, i:i+1])
            for i in range(self.num_continuous)
        ]
        enc_cat_emb = [
            self.categorical_embeddings[i](categorical_encoder[:, :, i])
            for i in range(self.num_categorical)
        ]
        encoder_inputs = enc_cont_emb + enc_cat_emb

        # Embed decoder inputs
        dec_cont_emb = [
            self.continuous_embedding(continuous_decoder[:, :, i:i+1])
            for i in range(self.num_continuous)
        ]
        dec_cat_emb = [
            self.categorical_embeddings[i](categorical_decoder[:, :, i])
            for i in range(self.num_categorical)
        ]
        decoder_inputs = dec_cont_emb + dec_cat_emb

        # Variable selection
        encoder_selected, enc_var_weights = self.encoder_vsn(encoder_inputs)
        decoder_selected, dec_var_weights = self.decoder_vsn(decoder_inputs)

        # LSTM encoding
        encoder_output, (hidden, cell) = self.encoder_lstm(encoder_selected)

        # LSTM decoding
        decoder_output, _ = self.decoder_lstm(decoder_selected, (hidden, cell))

        # Combine encoder and decoder outputs
        combined = torch.cat([encoder_output, decoder_output], dim=1)

        # Temporal self-attention
        attended, attn_weights = self.temporal_attention(combined)

        # Get decoder portion with gated residual
        decoder_attended = attended[:, -self.config.decoder_length:, :]
        gated = self.glu(decoder_attended)

        # Output quantile predictions
        quantile_outputs = []
        for output_layer in self.output_layers:
            quantile_outputs.append(output_layer(gated))
        predictions = torch.cat(quantile_outputs, dim=-1)

        interpretability = {
            "encoder_variable_weights": enc_var_weights,
            "decoder_variable_weights": dec_var_weights,
            "attention_weights": attn_weights,
        }

        return predictions, interpretability


class QuantileLoss(nn.Module):
    """Quantile loss for prediction intervals."""

    def __init__(self, quantiles: List[float]):
        super().__init__()
        self.quantiles = quantiles

    def forward(self, predictions: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
        """
        Compute quantile loss.

        Args:
            predictions: (batch, seq, num_quantiles)
            targets: (batch, seq)

        Returns:
            Scalar loss value
        """
        losses = []
        for i, q in enumerate(self.quantiles):
            errors = targets - predictions[:, :, i]
            losses.append(torch.max((q - 1) * errors, q * errors))
        return torch.stack(losses, dim=-1).mean()


class TemporalFusionTransformerModel(BaseModel):
    """
    TFT model wrapper for parking occupancy prediction.

    This class provides the interface for training and inference
    using the Temporal Fusion Transformer architecture.
    """

    # Feature definitions
    CONTINUOUS_FEATURES = [
        "hour_sin", "hour_cos", "day_sin", "day_cos",
        "temperature", "precipitation", "wind_speed",
        "last_30_same_day_avg", "rolling_7day_avg",
        "reports_last_hour", "geofence_entries",
    ]

    CATEGORICAL_FEATURES = [
        "day_of_week", "semester_week", "is_finals",
        "is_game_day", "is_concert",
    ]

    def __init__(
        self,
        config: Optional[TFTConfig] = None,
        model_version: str = "1.0.0",
    ):
        super().__init__(
            model_name="TemporalFusionTransformer",
            model_version=model_version,
            config=config.to_dict() if config else TFTConfig().to_dict(),
        )
        self.tft_config = config or TFTConfig()
        self._model: Optional[TFTModel] = None
        self._device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self._scaler_params: Optional[Dict[str, Any]] = None
        self._feature_columns = self.CONTINUOUS_FEATURES + self.CATEGORICAL_FEATURES

    def _build_model(self) -> TFTModel:
        """Initialize the TFT neural network."""
        return TFTModel(
            config=self.tft_config,
            num_continuous=len(self.CONTINUOUS_FEATURES),
            num_categorical=len(self.CATEGORICAL_FEATURES),
        ).to(self._device)

    def _prepare_sequences(
        self,
        df: pd.DataFrame,
        target_col: str = "occupancy",
    ) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor, torch.Tensor, torch.Tensor]:
        """
        Prepare sliding window sequences for training.

        Args:
            df: DataFrame with features and target
            target_col: Name of target column

        Returns:
            Tuple of tensors for encoder/decoder continuous/categorical inputs and targets
        """
        encoder_len = self.tft_config.encoder_length
        decoder_len = self.tft_config.decoder_length
        total_len = encoder_len + decoder_len

        # Extract feature matrices
        continuous = df[self.CONTINUOUS_FEATURES].values
        categorical = df[self.CATEGORICAL_FEATURES].values.astype(np.int64)
        target = df[target_col].values

        # Create sequences
        n_samples = len(df) - total_len + 1
        cont_enc, cont_dec = [], []
        cat_enc, cat_dec = [], []
        targets = []

        for i in range(n_samples):
            cont_enc.append(continuous[i:i + encoder_len])
            cont_dec.append(continuous[i + encoder_len:i + total_len])
            cat_enc.append(categorical[i:i + encoder_len])
            cat_dec.append(categorical[i + encoder_len:i + total_len])
            targets.append(target[i + encoder_len:i + total_len])

        return (
            torch.tensor(np.array(cont_enc), dtype=torch.float32),
            torch.tensor(np.array(cat_enc), dtype=torch.long),
            torch.tensor(np.array(cont_dec), dtype=torch.float32),
            torch.tensor(np.array(cat_dec), dtype=torch.long),
            torch.tensor(np.array(targets), dtype=torch.float32),
        )

    def fit(
        self,
        X: pd.DataFrame,
        y: pd.Series,
        validation_data: Optional[Tuple[pd.DataFrame, pd.Series]] = None,
        **kwargs,
    ) -> "TemporalFusionTransformerModel":
        """
        Train the TFT model.

        Args:
            X: Feature DataFrame
            y: Target series
            validation_data: Optional validation set
            **kwargs: Additional training parameters

        Returns:
            Self for method chaining
        """
        logger.info(f"Training TFT with config: {self.tft_config.to_dict()}")

        # Validate and prepare data
        self._validate_input(X)
        train_df = X.copy()
        train_df["occupancy"] = y.values

        # Normalize continuous features
        self._scaler_params = {}
        for col in self.CONTINUOUS_FEATURES:
            mean = train_df[col].mean()
            std = train_df[col].std() + 1e-8
            self._scaler_params[col] = {"mean": mean, "std": std}
            train_df[col] = (train_df[col] - mean) / std

        # Prepare sequences
        cont_enc, cat_enc, cont_dec, cat_dec, targets = self._prepare_sequences(train_df)

        # Create data loader
        dataset = torch.utils.data.TensorDataset(
            cont_enc, cat_enc, cont_dec, cat_dec, targets
        )
        loader = torch.utils.data.DataLoader(
            dataset,
            batch_size=self.tft_config.batch_size,
            shuffle=True,
        )

        # Initialize model and training components
        self._model = self._build_model()
        optimizer = torch.optim.Adam(
            self._model.parameters(),
            lr=self.tft_config.learning_rate,
        )
        scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
            optimizer, mode="min", factor=0.5, patience=5
        )
        criterion = QuantileLoss(self.tft_config.quantiles)

        # Prepare validation if provided
        val_loader = None
        if validation_data is not None:
            val_X, val_y = validation_data
            val_df = val_X.copy()
            val_df["occupancy"] = val_y.values
            for col in self.CONTINUOUS_FEATURES:
                params = self._scaler_params[col]
                val_df[col] = (val_df[col] - params["mean"]) / params["std"]
            val_tensors = self._prepare_sequences(val_df)
            val_dataset = torch.utils.data.TensorDataset(*val_tensors)
            val_loader = torch.utils.data.DataLoader(
                val_dataset, batch_size=self.tft_config.batch_size
            )

        # Training loop
        best_val_loss = float("inf")
        patience_counter = 0

        for epoch in range(self.tft_config.max_epochs):
            self._model.train()
            train_loss = 0.0

            for batch in loader:
                cont_enc_b, cat_enc_b, cont_dec_b, cat_dec_b, target_b = [
                    t.to(self._device) for t in batch
                ]

                optimizer.zero_grad()
                predictions, _ = self._model(
                    cont_enc_b, cat_enc_b, cont_dec_b, cat_dec_b
                )
                loss = criterion(predictions, target_b)
                loss.backward()
                torch.nn.utils.clip_grad_norm_(self._model.parameters(), 1.0)
                optimizer.step()

                train_loss += loss.item()

            avg_train_loss = train_loss / len(loader)

            # Validation
            if val_loader is not None:
                self._model.eval()
                val_loss = 0.0
                with torch.no_grad():
                    for batch in val_loader:
                        cont_enc_b, cat_enc_b, cont_dec_b, cat_dec_b, target_b = [
                            t.to(self._device) for t in batch
                        ]
                        predictions, _ = self._model(
                            cont_enc_b, cat_enc_b, cont_dec_b, cat_dec_b
                        )
                        val_loss += criterion(predictions, target_b).item()

                avg_val_loss = val_loss / len(val_loader)
                scheduler.step(avg_val_loss)

                if avg_val_loss < best_val_loss:
                    best_val_loss = avg_val_loss
                    patience_counter = 0
                else:
                    patience_counter += 1

                if patience_counter >= self.tft_config.early_stopping_patience:
                    logger.info(f"Early stopping at epoch {epoch}")
                    break

                if epoch % 10 == 0:
                    logger.info(
                        f"Epoch {epoch}: train_loss={avg_train_loss:.4f}, "
                        f"val_loss={avg_val_loss:.4f}"
                    )
            else:
                if epoch % 10 == 0:
                    logger.info(f"Epoch {epoch}: train_loss={avg_train_loss:.4f}")

        self._is_fitted = True
        logger.info("TFT training completed")
        return self

    def predict(
        self,
        X: pd.DataFrame,
        return_confidence: bool = True,
    ) -> pd.DataFrame:
        """
        Generate predictions for input features.

        Args:
            X: Feature DataFrame
            return_confidence: Whether to include confidence intervals

        Returns:
            DataFrame with predictions
        """
        if not self._is_fitted:
            raise RuntimeError("Model must be fitted before prediction")

        self._validate_input(X)
        self._model.eval()

        # Normalize features
        df = X.copy()
        for col in self.CONTINUOUS_FEATURES:
            params = self._scaler_params[col]
            df[col] = (df[col] - params["mean"]) / params["std"]

        # Add dummy target for sequence creation
        df["occupancy"] = 0

        # Prepare sequences
        cont_enc, cat_enc, cont_dec, cat_dec, _ = self._prepare_sequences(df)

        # Run inference
        with torch.no_grad():
            cont_enc = cont_enc.to(self._device)
            cat_enc = cat_enc.to(self._device)
            cont_dec = cont_dec.to(self._device)
            cat_dec = cat_dec.to(self._device)

            predictions, interpretability = self._model(
                cont_enc, cat_enc, cont_dec, cat_dec
            )
            predictions = predictions.cpu().numpy()

        # Extract quantile predictions
        q_low = predictions[:, :, 0]  # 10th percentile
        q_mid = predictions[:, :, 1]  # 50th percentile (median)
        q_high = predictions[:, :, 2]  # 90th percentile

        # Flatten and clip predictions
        q_low = self._clip_predictions(q_low.flatten())
        q_mid = self._clip_predictions(q_mid.flatten())
        q_high = self._clip_predictions(q_high.flatten())

        # Calculate confidence from prediction interval width
        interval_width = q_high - q_low
        max_width = 100.0  # Maximum possible interval
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
            features: Dictionary of feature values including historical context
            lot_id: Parking lot identifier
            timestamp: Prediction timestamp

        Returns:
            PredictionOutput with prediction and confidence
        """
        # For single prediction, we need historical context in features
        # This should be a flattened version of encoder + decoder features
        if not self._is_fitted:
            raise RuntimeError("Model must be fitted before prediction")

        # Convert features dict to DataFrame row
        df = pd.DataFrame([features])
        for col in self._feature_columns:
            if col not in df.columns:
                raise ValueError(f"Missing required feature: {col}")

        # For TFT, we need sequence context - using the last known values
        # In production, this would come from a feature store
        predictions = self.predict(df, return_confidence=True)

        if len(predictions) == 0:
            raise ValueError("Insufficient data for prediction")

        row = predictions.iloc[-1]
        return PredictionOutput(
            predicted_occupancy=row["predicted_occupancy"],
            confidence=row["confidence"],
            lower_bound=row["lower_bound"],
            upper_bound=row["upper_bound"],
            lot_id=lot_id,
            timestamp=timestamp,
        )

    def save(self, path: Path) -> None:
        """Save model artifacts to disk."""
        path = Path(path)
        path.mkdir(parents=True, exist_ok=True)

        # Save model weights
        torch.save(self._model.state_dict(), path / "model.pt")

        # Save config and scaler params
        metadata = {
            "config": self.tft_config.to_dict(),
            "scaler_params": self._scaler_params,
            "model_version": self.model_version,
        }
        with open(path / "metadata.json", "w") as f:
            json.dump(metadata, f, indent=2)

        logger.info(f"Model saved to {path}")

    def load(self, path: Path) -> "TemporalFusionTransformerModel":
        """Load model artifacts from disk."""
        path = Path(path)

        # Load metadata
        with open(path / "metadata.json", "r") as f:
            metadata = json.load(f)

        self.tft_config = TFTConfig.from_dict(metadata["config"])
        self._scaler_params = metadata["scaler_params"]
        self.model_version = metadata["model_version"]
        self.config = metadata["config"]

        # Load model weights
        self._model = self._build_model()
        self._model.load_state_dict(torch.load(path / "model.pt", map_location=self._device))
        self._model.eval()
        self._is_fitted = True

        logger.info(f"Model loaded from {path}")
        return self

    def get_attention_weights(self) -> Optional[torch.Tensor]:
        """Get attention weights from last forward pass for interpretability."""
        # This would be implemented with proper caching in production
        return None
