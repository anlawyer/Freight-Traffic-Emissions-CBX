"""
LSTM Neural Network for Traffic Flow Prediction
Predicts Cross-Bronx Expressway traffic speeds and congestion patterns
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional
import logging
import json
from datetime import datetime, timedelta
import os

# Try to import TensorFlow/Keras, fall back to simplified model if unavailable
try:
    import tensorflow as tf
    from tensorflow import keras
    from tensorflow.keras.models import Sequential, load_model
    from tensorflow.keras.layers import LSTM, Dense, Dropout
    from tensorflow.keras.callbacks import EarlyStopping
    TF_AVAILABLE = True
except ImportError:
    TF_AVAILABLE = False
    logging.warning("TensorFlow not available. Using simplified prediction model.")

logger = logging.getLogger(__name__)


class TrafficFlowLSTM:
    """
    LSTM neural network for traffic speed prediction on Cross-Bronx Expressway.

    Architecture:
    - Input: Sequence of 24 time steps (6 hours of 15-min intervals)
    - Layer 1: LSTM(128 units) with dropout
    - Layer 2: LSTM(64 units) with dropout
    - Layer 3: Dense(32 units, ReLU)
    - Output: Dense(1 unit) - predicted speed

    Trained on NYC DOT real-time traffic data via Socrata API.
    """

    def __init__(self, sequence_length: int = 24):
        self.sequence_length = sequence_length
        self.model = None
        self.speed_min = 0
        self.speed_max = 100
        self.is_trained = False
        self.model_path = "models/traffic_lstm_model.h5"
        self.metadata_path = "models/model_metadata.json"

        # Create models directory if it doesn't exist
        os.makedirs("models", exist_ok=True)

        logger.info(f"Initialized TrafficFlowLSTM (sequence_length={sequence_length})")

    def build_model(self) -> bool:
        """Build the LSTM neural network architecture"""
        if not TF_AVAILABLE:
            logger.warning("TensorFlow not available. Cannot build model.")
            return False

        try:
            model = Sequential([
                # First LSTM layer
                LSTM(128, activation='relu', return_sequences=True,
                     input_shape=(self.sequence_length, 1)),
                Dropout(0.2),

                # Second LSTM layer
                LSTM(64, activation='relu', return_sequences=False),
                Dropout(0.2),

                # Dense layers
                Dense(32, activation='relu'),
                Dropout(0.1),

                # Output layer
                Dense(1)
            ])

            model.compile(
                optimizer='adam',
                loss='mse',
                metrics=['mae']
            )

            self.model = model
            logger.info("LSTM model architecture built successfully")
            logger.info(f"Total parameters: {model.count_params()}")

            return True

        except Exception as e:
            logger.error(f"Error building model: {str(e)}")
            return False

    def train(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        epochs: int = 50,
        batch_size: int = 32,
        validation_split: float = 0.2
    ) -> Dict:
        """
        Train the LSTM model on traffic speed data.

        Args:
            X_train: Training sequences (samples, time_steps, features)
            y_train: Target values (samples,)
            epochs: Number of training epochs
            batch_size: Batch size for training
            validation_split: Fraction of data to use for validation

        Returns:
            Training history with loss and metrics
        """
        if not TF_AVAILABLE or self.model is None:
            logger.error("Cannot train: TensorFlow unavailable or model not built")
            return {}

        try:
            logger.info(f"Training LSTM model on {len(X_train)} samples...")

            # Early stopping to prevent overfitting
            early_stop = EarlyStopping(
                monitor='val_loss',
                patience=10,
                restore_best_weights=True
            )

            # Train the model
            history = self.model.fit(
                X_train, y_train,
                epochs=epochs,
                batch_size=batch_size,
                validation_split=validation_split,
                callbacks=[early_stop],
                verbose=1
            )

            self.is_trained = True

            # Extract training metrics
            training_history = {
                'loss': [float(x) for x in history.history['loss']],
                'val_loss': [float(x) for x in history.history['val_loss']],
                'mae': [float(x) for x in history.history['mae']],
                'val_mae': [float(x) for x in history.history['val_mae']],
                'epochs_trained': len(history.history['loss']),
                'final_loss': float(history.history['loss'][-1]),
                'final_val_loss': float(history.history['val_loss'][-1])
            }

            logger.info(f"Training complete. Final loss: {training_history['final_loss']:.4f}")

            return training_history

        except Exception as e:
            logger.error(f"Error during training: {str(e)}")
            return {}

    def predict(self, X: np.ndarray) -> np.ndarray:
        """
        Predict traffic speeds from input sequences.

        Args:
            X: Input sequences (samples, time_steps, features)

        Returns:
            Predicted speeds (normalized 0-1)
        """
        if not TF_AVAILABLE or self.model is None:
            # Fallback: simple moving average
            logger.warning("Using fallback prediction (moving average)")
            return np.mean(X, axis=1).flatten()

        try:
            predictions = self.model.predict(X, verbose=0)
            return predictions.flatten()

        except Exception as e:
            logger.error(f"Error during prediction: {str(e)}")
            return np.zeros(len(X))

    def predict_future(
        self,
        initial_sequence: np.ndarray,
        steps_ahead: int = 24
    ) -> np.ndarray:
        """
        Predict future traffic speeds using recursive prediction.

        Args:
            initial_sequence: Starting sequence (time_steps, features)
            steps_ahead: Number of future time steps to predict

        Returns:
            Array of predicted speeds (steps_ahead,)
        """
        if not TF_AVAILABLE or self.model is None:
            # Fallback: repeat last value with small noise
            last_value = initial_sequence[-1, 0]
            return np.array([last_value + np.random.normal(0, 0.02) for _ in range(steps_ahead)])

        try:
            predictions = []
            current_sequence = initial_sequence.copy()

            for _ in range(steps_ahead):
                # Predict next value
                X_input = current_sequence.reshape(1, self.sequence_length, 1)
                next_pred = self.model.predict(X_input, verbose=0)[0, 0]
                predictions.append(next_pred)

                # Update sequence (roll forward and add prediction)
                current_sequence = np.roll(current_sequence, -1, axis=0)
                current_sequence[-1, 0] = next_pred

            return np.array(predictions)

        except Exception as e:
            logger.error(f"Error during future prediction: {str(e)}")
            return np.zeros(steps_ahead)

    def save_model(self, speed_min: float, speed_max: float):
        """Save trained model and metadata to disk"""
        if not TF_AVAILABLE or self.model is None:
            logger.warning("Cannot save model: TensorFlow unavailable or model not built")
            return

        try:
            # Save Keras model
            self.model.save(self.model_path)

            # Save metadata
            metadata = {
                'sequence_length': self.sequence_length,
                'speed_min': float(speed_min),
                'speed_max': float(speed_max),
                'trained_at': datetime.now().isoformat(),
                'is_trained': self.is_trained
            }

            with open(self.metadata_path, 'w') as f:
                json.dump(metadata, f, indent=2)

            self.speed_min = speed_min
            self.speed_max = speed_max

            logger.info(f"Model saved to {self.model_path}")

        except Exception as e:
            logger.error(f"Error saving model: {str(e)}")

    def load_model(self) -> bool:
        """Load trained model and metadata from disk"""
        if not TF_AVAILABLE:
            logger.warning("Cannot load model: TensorFlow unavailable")
            return False

        try:
            if not os.path.exists(self.model_path):
                logger.info("No saved model found")
                return False

            # Load Keras model
            self.model = load_model(self.model_path)

            # Load metadata
            with open(self.metadata_path, 'r') as f:
                metadata = json.load(f)

            self.sequence_length = metadata['sequence_length']
            self.speed_min = metadata['speed_min']
            self.speed_max = metadata['speed_max']
            self.is_trained = metadata['is_trained']

            logger.info(f"Model loaded from {self.model_path}")
            return True

        except Exception as e:
            logger.error(f"Error loading model: {str(e)}")
            return False

    def get_model_summary(self) -> Dict:
        """Get model architecture summary for visualization"""
        if not TF_AVAILABLE or self.model is None:
            return {
                'available': False,
                'message': 'TensorFlow not available or model not built'
            }

        try:
            # Get layer information
            layers_info = []
            for i, layer in enumerate(self.model.layers):
                layer_config = layer.get_config()
                layer_info = {
                    'index': i,
                    'name': layer.name,
                    'type': layer.__class__.__name__,
                    'output_shape': str(layer.output_shape),
                    'params': layer.count_params()
                }

                # Add layer-specific details
                if 'units' in layer_config:
                    layer_info['units'] = layer_config['units']
                if 'activation' in layer_config:
                    layer_info['activation'] = layer_config['activation']
                if 'rate' in layer_config:
                    layer_info['dropout_rate'] = layer_config['rate']

                layers_info.append(layer_info)

            return {
                'available': True,
                'total_params': self.model.count_params(),
                'sequence_length': self.sequence_length,
                'layers': layers_info,
                'is_trained': self.is_trained
            }

        except Exception as e:
            logger.error(f"Error getting model summary: {str(e)}")
            return {'available': False, 'error': str(e)}

    def denormalize_prediction(self, normalized_speed: float) -> float:
        """Convert normalized prediction (0-1) back to actual speed (mph)"""
        return normalized_speed * (self.speed_max - self.speed_min) + self.speed_min


class SimplifiedPredictor:
    """
    Simplified predictor for when TensorFlow is unavailable.
    Uses moving average and pattern recognition.
    """

    def __init__(self, historical_data: pd.DataFrame):
        self.historical_data = historical_data
        logger.info("Initialized SimplifiedPredictor (fallback mode)")

    def predict_speed(self, hour: int, day_of_week: int) -> float:
        """Predict speed based on time patterns"""
        # Filter historical data for similar time
        similar_times = self.historical_data[
            (self.historical_data['data_as_of'].dt.hour == hour) &
            (self.historical_data['data_as_of'].dt.dayofweek == day_of_week)
        ]

        if not similar_times.empty:
            return similar_times['speed'].mean()
        else:
            # Default pattern
            is_weekend = day_of_week >= 5
            if is_weekend:
                return 52.0
            elif 7 <= hour <= 9 or 17 <= hour <= 19:
                return 30.0  # Rush hour
            else:
                return 45.0  # Off-peak


def get_model_or_fallback():
    """Get LSTM model or fallback predictor"""
    model = TrafficFlowLSTM()

    if TF_AVAILABLE:
        # Try to load existing model
        if model.load_model():
            logger.info("Loaded pre-trained LSTM model")
            return model
        else:
            # Build new model
            if model.build_model():
                logger.info("Built new LSTM model (not trained yet)")
                return model

    logger.warning("Using simplified predictor (TensorFlow unavailable)")
    return None


if __name__ == "__main__":
    # Test the LSTM model
    logging.basicConfig(level=logging.INFO)

    print("\n" + "="*60)
    print("TESTING LSTM TRAFFIC FLOW MODEL")
    print("="*60 + "\n")

    # Create dummy training data
    print("1. Building model architecture...")
    model = TrafficFlowLSTM(sequence_length=24)
    if model.build_model():
        print("   ✓ Model built successfully")
        print(f"   Total parameters: {model.model.count_params()}")
    else:
        print("   ✗ Model build failed (TensorFlow may not be installed)")

    print("\n2. Getting model summary...")
    summary = model.get_model_summary()
    print(f"   Layers: {len(summary.get('layers', []))}")
    print(f"   Total parameters: {summary.get('total_params', 'N/A')}")

    print("\n" + "="*60)
