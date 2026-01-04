"""
RaiderPark ML Models Package

Contains model definitions for parking occupancy prediction:
- BaseModel: Abstract base class for all models
- TemporalFusionTransformer: Time-series model using TFT architecture
- LightGBMModel: Gradient boosting model for tabular features
- EnsembleModel: Stacking ensemble combining multiple models
"""

from ml.models.base_model import BaseModel, PredictionOutput
from ml.models.temporal_fusion_transformer import TemporalFusionTransformerModel
from ml.models.lightgbm_model import LightGBMModel
from ml.models.ensemble import EnsembleModel

__all__ = [
    "BaseModel",
    "PredictionOutput",
    "TemporalFusionTransformerModel",
    "LightGBMModel",
    "EnsembleModel",
]
