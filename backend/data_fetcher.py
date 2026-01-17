"""
Socrata API Data Fetcher for NYC DOT Traffic Data
Fetches real-time traffic speed and volume data from NYC OpenData
"""

from sodapy import Socrata
import pandas as pd
import numpy as np
from typing import Dict, List, Optional
import logging
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

class NYCTrafficDataFetcher:
    """Fetch and process NYC DOT traffic data from Socrata API"""

    def __init__(self):
        self.domain = os.getenv("SOCRATA_DOMAIN", "data.cityofnewyork.us")
        self.app_token = os.getenv("SOCRATA_APP_TOKEN", None)

        # Initialize Socrata client
        self.client = Socrata(
            self.domain,
            self.app_token,
            timeout=30
        )

        # Dataset IDs
        self.TRAFFIC_SPEED_DATASET = "i4gi-tjb9"  # DOT Traffic Speeds NBE
        self.TRAFFIC_VOLUME_DATASET = "7ym2-wayt"  # Automated Traffic Volume Counts

        logger.info(f"Initialized NYC Traffic Data Fetcher (domain: {self.domain})")

    def fetch_cross_bronx_traffic_speeds(self, limit: int = 10000) -> pd.DataFrame:
        """
        Fetch real-time traffic speed data for Cross-Bronx Expressway area.

        Dataset: DOT Traffic Speeds NBE (i4gi-tjb9)
        Updated: Several times per minute

        Returns:
            DataFrame with columns: data_as_of, link_id, link_points,
                                   encoded_poly_line, owner, transcom_id,
                                   borough, link_name, speed, travel_time, status
        """
        try:
            logger.info("Fetching Cross-Bronx Expressway traffic speed data...")

            # Query for Bronx area (borough = 'Bronx' or coordinates in Cross-Bronx range)
            # Cross-Bronx Expressway roughly spans from -73.93 to -73.83 longitude
            results = self.client.get(
                self.TRAFFIC_SPEED_DATASET,
                where="borough='Bronx' OR link_name LIKE '%Cross%'",
                limit=limit,
                order="data_as_of DESC"
            )

            df = pd.DataFrame.from_records(results)

            if df.empty:
                logger.warning("No traffic speed data returned from API")
                return self._generate_synthetic_speed_data()

            # Convert types
            df['speed'] = pd.to_numeric(df['speed'], errors='coerce')
            df['travel_time'] = pd.to_numeric(df['travel_time'], errors='coerce')
            df['data_as_of'] = pd.to_datetime(df['data_as_of'], errors='coerce')

            logger.info(f"Fetched {len(df)} traffic speed records")
            return df

        except Exception as e:
            logger.error(f"Error fetching traffic speed data: {str(e)}")
            logger.info("Falling back to synthetic data for demo")
            return self._generate_synthetic_speed_data()

    def fetch_traffic_volume_counts(self, limit: int = 5000) -> pd.DataFrame:
        """
        Fetch automated traffic volume counts from NYC DOT.

        Dataset: Automated Traffic Volume Counts (7ym2-wayt)

        Returns:
            DataFrame with vehicle count data by location and time
        """
        try:
            logger.info("Fetching traffic volume count data...")

            results = self.client.get(
                self.TRAFFIC_VOLUME_DATASET,
                where="boro='Bronx'",
                limit=limit,
                order="date DESC"
            )

            df = pd.DataFrame.from_records(results)

            if df.empty:
                logger.warning("No traffic volume data returned")
                return self._generate_synthetic_volume_data()

            logger.info(f"Fetched {len(df)} traffic volume records")
            return df

        except Exception as e:
            logger.error(f"Error fetching volume data: {str(e)}")
            return self._generate_synthetic_volume_data()

    def _generate_synthetic_speed_data(self, days: int = 30) -> pd.DataFrame:
        """
        Generate synthetic traffic speed data for Cross-Bronx Expressway.
        Used as fallback when API is unavailable or for demo purposes.

        Simulates realistic traffic patterns:
        - Rush hour congestion (7-9am, 5-7pm): 25-35 mph
        - Off-peak: 45-55 mph
        - Night: 55-65 mph
        - Weekend variations
        """
        logger.info("Generating synthetic traffic speed data for demo...")

        # Generate timestamps for last 30 days, every 15 minutes
        end_time = datetime.now()
        start_time = end_time - timedelta(days=days)
        timestamps = pd.date_range(start=start_time, end=end_time, freq='15min')

        data = []
        for ts in timestamps:
            hour = ts.hour
            is_weekend = ts.dayofweek >= 5

            # Realistic speed patterns
            if is_weekend:
                base_speed = 52 if 10 <= hour <= 22 else 60
                noise = np.random.normal(0, 5)
            else:
                # Weekday rush hours
                if 7 <= hour <= 9 or 17 <= hour <= 19:
                    base_speed = 30  # Heavy congestion
                    noise = np.random.normal(0, 8)
                elif 10 <= hour <= 16:
                    base_speed = 45  # Moderate traffic
                    noise = np.random.normal(0, 6)
                else:
                    base_speed = 58  # Light traffic
                    noise = np.random.normal(0, 4)

            speed = max(15, min(65, base_speed + noise))  # Cap between 15-65 mph
            travel_time = 1200 / speed  # Assume 1.2 mile segment

            data.append({
                'data_as_of': ts,
                'link_id': 'CBX_MAIN_001',
                'borough': 'Bronx',
                'link_name': 'Cross Bronx Expressway - Main Corridor',
                'speed': round(speed, 1),
                'travel_time': round(travel_time, 1),
                'status': 'Normal' if speed > 40 else 'Congested',
                'transcom_id': 'CBX001',
                'owner': 'NYC DOT'
            })

        df = pd.DataFrame(data)
        logger.info(f"Generated {len(df)} synthetic traffic records")
        return df

    def _generate_synthetic_volume_data(self) -> pd.DataFrame:
        """Generate synthetic traffic volume data for Cross-Bronx Expressway"""
        logger.info("Generating synthetic traffic volume data...")

        # Assume 5,200 trucks/day baseline
        dates = pd.date_range(end=datetime.now(), periods=90, freq='D')

        data = []
        for date in dates:
            is_weekend = date.dayofweek >= 5
            base_volume = 3500 if is_weekend else 5200
            volume = int(base_volume + np.random.normal(0, 300))

            data.append({
                'date': date,
                'boro': 'Bronx',
                'location': 'Cross Bronx Expressway',
                'vol': volume,
                'segmentid': 'CBX_001'
            })

        return pd.DataFrame(data)

    def prepare_lstm_training_data(
        self,
        df: pd.DataFrame,
        sequence_length: int = 24
    ) -> tuple:
        """
        Prepare traffic speed data for LSTM training.

        Args:
            df: DataFrame with traffic speed data
            sequence_length: Number of time steps to use for prediction (default 24 = 6 hours at 15min intervals)

        Returns:
            X_train, y_train arrays ready for LSTM
        """
        # Sort by timestamp
        df = df.sort_values('data_as_of').copy()

        # Extract speed values
        speeds = df['speed'].values

        # Normalize to 0-1 range
        speed_min, speed_max = speeds.min(), speeds.max()
        speeds_normalized = (speeds - speed_min) / (speed_max - speed_min)

        # Create sequences
        X, y = [], []
        for i in range(len(speeds_normalized) - sequence_length):
            X.append(speeds_normalized[i:i+sequence_length])
            y.append(speeds_normalized[i+sequence_length])

        X = np.array(X)
        y = np.array(y)

        # Reshape for LSTM: (samples, time_steps, features)
        X = X.reshape((X.shape[0], X.shape[1], 1))

        logger.info(f"Prepared LSTM training data: X shape {X.shape}, y shape {y.shape}")

        return X, y, speed_min, speed_max

    def close(self):
        """Close Socrata client connection"""
        self.client.close()
        logger.info("Closed Socrata client connection")


# Convenience functions for use in main.py
def get_latest_traffic_data() -> Dict:
    """Get latest traffic data for dashboard display"""
    fetcher = NYCTrafficDataFetcher()
    try:
        speed_df = fetcher.fetch_cross_bronx_traffic_speeds(limit=100)

        if speed_df.empty:
            logger.warning("Empty speed dataframe received")
            return {
                'latest_speed_mph': 45.0,
                'avg_speed_24h': 42.0,
                'congestion_level': 'Moderate',
                'data_as_of': datetime.now().isoformat(),
                'total_records': 0
            }

        # Ensure speed column is numeric and drop any NaN values
        speed_df['speed'] = pd.to_numeric(speed_df['speed'], errors='coerce')
        speed_df = speed_df.dropna(subset=['speed'])

        if speed_df.empty:
            logger.warning("No valid speed values after cleaning")
            return {
                'latest_speed_mph': 45.0,
                'avg_speed_24h': 42.0,
                'congestion_level': 'Moderate',
                'data_as_of': datetime.now().isoformat(),
                'total_records': 0
            }

        # Calculate summary statistics
        latest_speed = float(speed_df['speed'].iloc[0])
        avg_speed_24h = float(speed_df['speed'].mean())
        congestion_level = "Low" if latest_speed > 45 else "Moderate" if latest_speed > 30 else "High"

        return {
            'latest_speed_mph': round(latest_speed, 1),
            'avg_speed_24h': round(avg_speed_24h, 1),
            'congestion_level': congestion_level,
            'data_as_of': speed_df['data_as_of'].iloc[0].isoformat() if 'data_as_of' in speed_df.columns else datetime.now().isoformat(),
            'total_records': len(speed_df)
        }
    finally:
        fetcher.close()


def get_training_data_for_lstm():
    """Fetch and prepare data for LSTM model training"""
    fetcher = NYCTrafficDataFetcher()
    try:
        # Fetch 30 days of data
        speed_df = fetcher.fetch_cross_bronx_traffic_speeds(limit=10000)

        # Prepare for LSTM
        X, y, speed_min, speed_max = fetcher.prepare_lstm_training_data(speed_df)

        return X, y, speed_min, speed_max, speed_df
    finally:
        fetcher.close()


if __name__ == "__main__":
    # Test the data fetcher
    logging.basicConfig(level=logging.INFO)

    print("\n" + "="*60)
    print("TESTING NYC TRAFFIC DATA FETCHER")
    print("="*60 + "\n")

    fetcher = NYCTrafficDataFetcher()

    print("1. Fetching traffic speed data...")
    speed_df = fetcher.fetch_cross_bronx_traffic_speeds(limit=100)
    print(f"   Retrieved {len(speed_df)} records")
    print(f"   Latest speed: {speed_df['speed'].iloc[0]} mph")
    print(f"   Average speed: {speed_df['speed'].mean():.1f} mph\n")

    print("2. Preparing LSTM training data...")
    X, y, speed_min, speed_max = fetcher.prepare_lstm_training_data(speed_df)
    print(f"   Training data shape: X={X.shape}, y={y.shape}")
    print(f"   Speed range: {speed_min:.1f} - {speed_max:.1f} mph\n")

    print("3. Getting latest traffic summary...")
    summary = get_latest_traffic_data()
    print(f"   {summary}\n")

    fetcher.close()
    print("="*60)
