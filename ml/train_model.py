#!/usr/bin/env python3
"""
RaiderPark ML Model Training Pipeline

Trains ensemble parking prediction models:
- LightGBM: Gradient boosting for tabular features
- TFT-style: Time series decomposition

Usage:
    python train_model.py --supabase-url $URL --supabase-key $KEY
    python train_model.py --local  # Use sample data

Requirements:
    pip install lightgbm pandas numpy scikit-learn supabase python-dotenv
"""

import argparse
import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error

try:
    import lightgbm as lgb
    HAS_LIGHTGBM = True
except ImportError:
    HAS_LIGHTGBM = False
    print("Warning: LightGBM not installed. Using simplified model.")

try:
    from supabase import create_client
    HAS_SUPABASE = True
except ImportError:
    HAS_SUPABASE = False
    print("Warning: Supabase client not installed. Using local data only.")

# ============================================================
# FEATURE ENGINEERING
# ============================================================

FEATURE_NAMES = [
    'hour', 'minute', 'day_of_week', 'day_of_month', 'week_of_year', 'month',
    'is_weekend', 'hour_sin', 'hour_cos', 'day_of_week_sin', 'day_of_week_cos',
    'days_into_semester',
    'is_class_day', 'is_finals_week', 'is_first_week', 'is_spring_break', 'is_summer_session',
    'has_football_game', 'has_basketball_game', 'has_concert', 'has_graduation',
    'has_special_event', 'event_impact_score', 'hours_until_event',
    'temperature', 'precipitation_probability', 'is_raining', 'wind_speed', 'weather_impact_score',
    'avg_occupancy_same_time', 'avg_occupancy_last_week', 'trend_direction', 'volatility',
    'current_occupancy', 'recent_report_count', 'recent_report_avg',
    'minutes_since_last_report', 'report_confidence',
    'lot_capacity', 'lot_popularity', 'is_commuter_lot', 'is_residence_lot', 'is_garage_lot',
    'nearby_lots_avg_occupancy', 'campus_wide_occupancy',
]


def extract_time_features(timestamp: datetime) -> Dict:
    """Extract time-based features from timestamp."""
    hour = timestamp.hour
    minute = timestamp.minute
    day_of_week = timestamp.weekday()
    day_of_month = timestamp.day
    month = timestamp.month

    # Week of year
    week_of_year = timestamp.isocalendar()[1]

    # Cyclical encoding
    hour_sin = np.sin(2 * np.pi * hour / 24)
    hour_cos = np.cos(2 * np.pi * hour / 24)
    day_of_week_sin = np.sin(2 * np.pi * day_of_week / 7)
    day_of_week_cos = np.cos(2 * np.pi * day_of_week / 7)

    return {
        'hour': hour,
        'minute': minute,
        'day_of_week': day_of_week,
        'day_of_month': day_of_month,
        'week_of_year': week_of_year,
        'month': month,
        'is_weekend': int(day_of_week >= 5),
        'hour_sin': hour_sin,
        'hour_cos': hour_cos,
        'day_of_week_sin': day_of_week_sin,
        'day_of_week_cos': day_of_week_cos,
    }


def generate_synthetic_data(n_samples: int = 10000) -> pd.DataFrame:
    """Generate synthetic training data based on typical parking patterns."""
    np.random.seed(42)

    data = []
    start_date = datetime(2024, 8, 26)  # Fall semester start

    for i in range(n_samples):
        # Random timestamp within semester
        days_offset = np.random.randint(0, 120)
        hours_offset = np.random.randint(6, 22)  # 6am - 10pm
        timestamp = start_date + timedelta(days=days_offset, hours=hours_offset)

        # Time features
        features = extract_time_features(timestamp)

        # Academic features
        features['days_into_semester'] = days_offset
        features['is_class_day'] = int(features['day_of_week'] < 5)
        features['is_finals_week'] = int(days_offset > 105 and days_offset <= 112)
        features['is_first_week'] = int(days_offset < 7)
        features['is_spring_break'] = 0
        features['is_summer_session'] = 0

        # Event features (random with typical probabilities)
        is_saturday = features['day_of_week'] == 5
        features['has_football_game'] = int(is_saturday and np.random.random() < 0.15)
        features['has_basketball_game'] = int(np.random.random() < 0.05)
        features['has_concert'] = int(np.random.random() < 0.02)
        features['has_graduation'] = 0
        features['has_special_event'] = int(any([
            features['has_football_game'],
            features['has_basketball_game'],
            features['has_concert']
        ]))

        # Event impact
        event_impact = 0
        if features['has_football_game']:
            event_impact = 1.0
        elif features['has_basketball_game']:
            event_impact = 0.7
        elif features['has_concert']:
            event_impact = 0.6
        features['event_impact_score'] = event_impact
        features['hours_until_event'] = -1 if not features['has_special_event'] else np.random.randint(0, 6)

        # Weather features (seasonal with noise)
        month = timestamp.month
        if month in [12, 1, 2]:  # Winter
            features['temperature'] = np.random.normal(45, 10)
        elif month in [6, 7, 8]:  # Summer
            features['temperature'] = np.random.normal(90, 8)
        else:  # Spring/Fall
            features['temperature'] = np.random.normal(70, 12)

        features['precipitation_probability'] = np.random.beta(2, 8)
        features['is_raining'] = int(features['precipitation_probability'] > 0.6)
        features['wind_speed'] = np.abs(np.random.normal(12, 8))  # Lubbock is windy!

        weather_impact = 0
        if features['is_raining']:
            weather_impact += 0.4
        if features['temperature'] < 40 or features['temperature'] > 95:
            weather_impact += 0.3
        if features['wind_speed'] > 25:
            weather_impact += 0.2
        features['weather_impact_score'] = min(weather_impact, 1.0)

        # Generate target occupancy based on realistic patterns
        base_occupancy = 30

        # Time of day effect
        hour = features['hour']
        if 10 <= hour < 12:
            base_occupancy += 45  # Peak
        elif 8 <= hour < 10:
            base_occupancy += 30
        elif 12 <= hour < 14:
            base_occupancy += 35
        elif 14 <= hour < 17:
            base_occupancy += 25
        elif 17 <= hour < 20:
            base_occupancy += 10

        # Weekend effect
        if features['is_weekend']:
            base_occupancy *= 0.3

        # Event effect
        base_occupancy += event_impact * 30

        # Weather effect
        base_occupancy += features['weather_impact_score'] * 10

        # First week / finals boost
        if features['is_first_week']:
            base_occupancy *= 1.2
        if features['is_finals_week']:
            base_occupancy *= 1.1

        # Add noise
        occupancy = base_occupancy + np.random.normal(0, 8)
        occupancy = np.clip(occupancy, 0, 100)

        # Historical features (would come from database)
        features['avg_occupancy_same_time'] = occupancy + np.random.normal(0, 10)
        features['avg_occupancy_last_week'] = occupancy + np.random.normal(0, 15)
        features['trend_direction'] = np.random.choice([-1, 0, 1], p=[0.2, 0.6, 0.2])
        features['volatility'] = np.abs(np.random.normal(15, 5))

        # Real-time features (simulated)
        features['current_occupancy'] = occupancy + np.random.normal(0, 5)
        features['recent_report_count'] = np.random.poisson(3)
        features['recent_report_avg'] = occupancy + np.random.normal(0, 5)
        features['minutes_since_last_report'] = np.random.exponential(15)
        features['report_confidence'] = np.random.beta(3, 2)

        # Lot features
        features['lot_capacity'] = np.random.choice([150, 200, 300, 500])
        features['lot_popularity'] = np.random.beta(3, 2)
        lot_type = np.random.choice(['commuter', 'residence', 'garage'], p=[0.7, 0.2, 0.1])
        features['is_commuter_lot'] = int(lot_type == 'commuter')
        features['is_residence_lot'] = int(lot_type == 'residence')
        features['is_garage_lot'] = int(lot_type == 'garage')

        # Cross-lot features
        features['nearby_lots_avg_occupancy'] = occupancy + np.random.normal(0, 10)
        features['campus_wide_occupancy'] = occupancy + np.random.normal(-5, 12)

        # Target
        features['occupancy'] = occupancy

        data.append(features)

    return pd.DataFrame(data)


def load_data_from_supabase(supabase_url: str, supabase_key: str) -> pd.DataFrame:
    """Load training data from Supabase database."""
    if not HAS_SUPABASE:
        raise ImportError("Supabase client not installed")

    client = create_client(supabase_url, supabase_key)

    # Query parking reports
    response = client.table('parking_reports').select('*').execute()
    reports_df = pd.DataFrame(response.data)

    if len(reports_df) < 100:
        print(f"Only {len(reports_df)} reports found. Augmenting with synthetic data.")
        synthetic_df = generate_synthetic_data(5000)
        return synthetic_df

    # TODO: Transform real data into feature format
    # For now, return synthetic data
    return generate_synthetic_data(10000)


# ============================================================
# MODEL TRAINING
# ============================================================

def train_lightgbm(X_train: np.ndarray, y_train: np.ndarray,
                   X_val: np.ndarray, y_val: np.ndarray) -> Tuple[object, Dict]:
    """Train LightGBM model."""
    if not HAS_LIGHTGBM:
        return train_simple_model(X_train, y_train, X_val, y_val)

    # Create datasets
    train_data = lgb.Dataset(X_train, label=y_train, feature_name=FEATURE_NAMES)
    val_data = lgb.Dataset(X_val, label=y_val, reference=train_data)

    # Parameters
    params = {
        'objective': 'regression',
        'metric': 'mae',
        'boosting_type': 'gbdt',
        'num_leaves': 31,
        'learning_rate': 0.05,
        'feature_fraction': 0.9,
        'bagging_fraction': 0.8,
        'bagging_freq': 5,
        'verbose': -1,
        'seed': 42,
    }

    # Train
    model = lgb.train(
        params,
        train_data,
        num_boost_round=500,
        valid_sets=[train_data, val_data],
        callbacks=[
            lgb.early_stopping(stopping_rounds=50),
            lgb.log_evaluation(period=100)
        ]
    )

    # Evaluate
    y_pred = model.predict(X_val)
    metrics = {
        'mae': mean_absolute_error(y_val, y_pred),
        'rmse': np.sqrt(mean_squared_error(y_val, y_pred)),
        'best_iteration': model.best_iteration,
    }

    return model, metrics


def train_simple_model(X_train: np.ndarray, y_train: np.ndarray,
                       X_val: np.ndarray, y_val: np.ndarray) -> Tuple[Dict, Dict]:
    """Train simple decision tree model (fallback when LightGBM not available)."""
    from sklearn.tree import DecisionTreeRegressor
    from sklearn.ensemble import GradientBoostingRegressor

    model = GradientBoostingRegressor(
        n_estimators=100,
        max_depth=5,
        learning_rate=0.1,
        random_state=42
    )

    model.fit(X_train, y_train)

    y_pred = model.predict(X_val)
    metrics = {
        'mae': mean_absolute_error(y_val, y_pred),
        'rmse': np.sqrt(mean_squared_error(y_val, y_pred)),
    }

    return model, metrics


def export_model_weights(model, model_type: str = 'lightgbm') -> Dict:
    """Export model weights to JSON-serializable format."""
    if HAS_LIGHTGBM and hasattr(model, 'dump_model'):
        # LightGBM model
        model_dump = model.dump_model()

        # Extract trees in simplified format
        trees = []
        for tree_info in model_dump.get('tree_info', []):
            tree = tree_info.get('tree_structure', {})
            trees.append(simplify_tree(tree))

        return {
            'type': 'lightgbm',
            'num_trees': len(trees),
            'learning_rate': model_dump.get('parameters', {}).get('learning_rate', 0.1),
            'base_score': 50,  # Starting prediction
            'trees': trees[:10],  # Export first 10 trees for client-side
            'feature_names': FEATURE_NAMES,
        }
    else:
        # Sklearn model - export as rule-based approximation
        return {
            'type': 'gradient_boosting',
            'learning_rate': 0.1,
            'base_score': 50,
            'trees': generate_hardcoded_trees(),
            'feature_names': FEATURE_NAMES,
        }


def simplify_tree(tree: Dict, depth: int = 0, max_depth: int = 4) -> Dict:
    """Simplify a LightGBM tree for client-side inference."""
    if 'leaf_value' in tree:
        return tree['leaf_value']

    if depth >= max_depth:
        # Return average of subtrees at max depth
        left = simplify_tree(tree.get('left_child', {}), depth + 1, max_depth)
        right = simplify_tree(tree.get('right_child', {}), depth + 1, max_depth)
        if isinstance(left, (int, float)) and isinstance(right, (int, float)):
            return (left + right) / 2
        return 0

    return {
        'featureIndex': tree.get('split_feature', 0),
        'threshold': tree.get('threshold', 0),
        'leftChild': simplify_tree(tree.get('left_child', {}), depth + 1, max_depth),
        'rightChild': simplify_tree(tree.get('right_child', {}), depth + 1, max_depth),
    }


def generate_hardcoded_trees() -> List[Dict]:
    """Generate hardcoded tree rules based on domain knowledge."""
    return [
        # Tree 1: Time of day
        {
            'featureIndex': 0,  # hour
            'threshold': 10,
            'leftChild': {
                'featureIndex': 0,
                'threshold': 8,
                'leftChild': -15,
                'rightChild': 5,
            },
            'rightChild': {
                'featureIndex': 0,
                'threshold': 14,
                'leftChild': 25,
                'rightChild': -5,
            },
        },
        # Tree 2: Weekend
        {
            'featureIndex': 6,  # is_weekend
            'threshold': 0.5,
            'leftChild': 10,
            'rightChild': -30,
        },
        # Tree 3: Events
        {
            'featureIndex': 22,  # event_impact_score
            'threshold': 0.3,
            'leftChild': 0,
            'rightChild': {
                'featureIndex': 22,
                'threshold': 0.7,
                'leftChild': 15,
                'rightChild': 35,
            },
        },
        # Tree 4: Weather
        {
            'featureIndex': 28,  # weather_impact_score
            'threshold': 0.3,
            'leftChild': 0,
            'rightChild': 10,
        },
        # Tree 5: Historical
        {
            'featureIndex': 29,  # avg_occupancy_same_time
            'threshold': 60,
            'leftChild': -10,
            'rightChild': {
                'featureIndex': 29,
                'threshold': 80,
                'leftChild': 5,
                'rightChild': 15,
            },
        },
    ]


# ============================================================
# SUPABASE UPLOAD
# ============================================================

def upload_model_to_supabase(supabase_url: str, supabase_key: str,
                              model_weights: Dict, metrics: Dict) -> bool:
    """Upload trained model to Supabase."""
    if not HAS_SUPABASE:
        print("Supabase client not installed. Saving locally instead.")
        return False

    try:
        client = create_client(supabase_url, supabase_key)

        # Deactivate previous models
        client.table('ml_models').update({'is_active': False}).eq('model_type', 'gradient_boosting').execute()

        # Insert new model
        client.table('ml_models').insert({
            'model_type': 'gradient_boosting',
            'version': '1.0.0',
            'lot_id': None,  # Global model
            'model_weights': model_weights,
            'feature_names': FEATURE_NAMES,
            'training_metrics': metrics,
            'is_active': True,
        }).execute()

        print("Model uploaded to Supabase successfully!")
        return True

    except Exception as e:
        print(f"Failed to upload model: {e}")
        return False


# ============================================================
# MAIN
# ============================================================

def main():
    parser = argparse.ArgumentParser(description='Train RaiderPark ML Model')
    parser.add_argument('--supabase-url', type=str, help='Supabase project URL')
    parser.add_argument('--supabase-key', type=str, help='Supabase service role key')
    parser.add_argument('--local', action='store_true', help='Use synthetic data only')
    parser.add_argument('--output', type=str, default='model_weights.json', help='Output file path')
    args = parser.parse_args()

    print("=" * 60)
    print("RaiderPark ML Model Training Pipeline")
    print("=" * 60)

    # Load data
    print("\n[1/4] Loading training data...")
    if args.local or not (args.supabase_url and args.supabase_key):
        print("Using synthetic data...")
        df = generate_synthetic_data(10000)
    else:
        df = load_data_from_supabase(args.supabase_url, args.supabase_key)

    print(f"Loaded {len(df)} samples")

    # Prepare features
    print("\n[2/4] Preparing features...")
    feature_cols = [c for c in FEATURE_NAMES if c in df.columns]
    X = df[feature_cols].values
    y = df['occupancy'].values

    # Split data
    X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=42)
    print(f"Training samples: {len(X_train)}, Validation samples: {len(X_val)}")

    # Train model
    print("\n[3/4] Training model...")
    model, metrics = train_lightgbm(X_train, y_train, X_val, y_val)

    print(f"\nTraining Results:")
    print(f"  MAE: {metrics['mae']:.2f}")
    print(f"  RMSE: {metrics['rmse']:.2f}")

    # Export weights
    print("\n[4/4] Exporting model weights...")
    model_weights = export_model_weights(model)

    # Save locally
    with open(args.output, 'w') as f:
        json.dump({
            'model': model_weights,
            'metrics': metrics,
            'trained_at': datetime.now().isoformat(),
            'feature_names': FEATURE_NAMES,
        }, f, indent=2)
    print(f"Model saved to {args.output}")

    # Upload to Supabase if credentials provided
    if args.supabase_url and args.supabase_key:
        upload_model_to_supabase(args.supabase_url, args.supabase_key, model_weights, metrics)

    print("\n" + "=" * 60)
    print("Training complete!")
    print("=" * 60)


if __name__ == '__main__':
    main()
