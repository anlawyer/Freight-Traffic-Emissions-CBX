try:
    print("Attempting to import tensorflow...")
    import tensorflow as tf
    print(f"TensorFlow imported. Object: {tf}")
    
    print("Attempting to import keras from tensorflow...")
    from tensorflow import keras
    print("keras imported")
    
    print("Attempting to import Sequential, load_model...")
    from tensorflow.keras.models import Sequential, load_model
    print("models imported")
    
    print("Attempting to import layers...")
    from tensorflow.keras.layers import LSTM, Dense, Dropout
    print("layers imported")
    
except ImportError as e:
    print(f"ImportError caught: {e}")
except Exception as e:
    print(f"Exception caught: {e}")
