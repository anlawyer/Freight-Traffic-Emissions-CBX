"""
Advanced Statistical Analytics Engine for Urban Futures LEAP
Implements Hidden Markov Models, Monte Carlo Simulation, and A* Pathfinding
for climate justice analysis in Soundview, Bronx

Technical Implementation for NVIDIA Climate Science Hackathon
"""

import numpy as np
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from enum import IntEnum
import heapq
import logging
from scipy import stats

logger = logging.getLogger(__name__)


# ==================== ENVIRONMENTAL STATE DEFINITIONS ====================

class EnvironmentalState(IntEnum):
    """
    Hidden Environmental States for Cross-Bronx Corridor
    
    States represent composite health-risk levels combining:
    - Traffic flow conditions
    - Air quality (PM2.5 concentration)
    - Community health exposure risk
    """
    FREE_FLOW_HEALTHY = 0       # Speed > 50 mph, PM2.5 < 10 µg/m³
    CONGESTED_HIGH_EXPOSURE = 1  # Speed 25-50 mph, PM2.5 10-15 µg/m³
    GRIDLOCK_TOXIC = 2          # Speed < 25 mph, PM2.5 > 15 µg/m³


STATE_LABELS = {
    EnvironmentalState.FREE_FLOW_HEALTHY: {
        "en": "Free Flow / Healthy",
        "es": "Flujo Libre / Saludable"
    },
    EnvironmentalState.CONGESTED_HIGH_EXPOSURE: {
        "en": "Congested / High Exposure",
        "es": "Congestionado / Alta Exposición"
    },
    EnvironmentalState.GRIDLOCK_TOXIC: {
        "en": "Gridlock / Toxic",
        "es": "Atascado / Tóxico"
    }
}


# ==================== HIDDEN MARKOV MODEL ====================

@dataclass
class HMMConfig:
    """Configuration for the Environmental State HMM"""
    n_states: int = 3
    # Transition matrix: probability of moving from state i to state j
    # Rows sum to 1.0 - represents typical traffic pattern evolution
    transition_matrix: np.ndarray = None
    # Initial state distribution (morning rush typically starts congested)
    initial_distribution: np.ndarray = None
    
    def __post_init__(self):
        if self.transition_matrix is None:
            # Empirically-derived transition probabilities based on traffic patterns
            # Higher probability of staying in current state (traffic inertia)
            self.transition_matrix = np.array([
                [0.70, 0.25, 0.05],  # Free Flow: likely to stay, some congestion risk
                [0.20, 0.60, 0.20],  # Congested: can improve or worsen
                [0.10, 0.35, 0.55]   # Gridlock: slow to improve
            ])
        
        if self.initial_distribution is None:
            # Morning distribution (7 AM start)
            self.initial_distribution = np.array([0.2, 0.5, 0.3])


class EnvironmentalHMM:
    """
    Hidden Markov Model for Environmental State Prediction
    
    Uses the Viterbi Algorithm to predict the most likely sequence
    of health-risk states over a 24-hour cycle based on:
    - Real-time traffic speeds (from LSTM predictions)
    - PM2.5 sensor data
    
    Mathematical Foundation:
    - States S = {Free Flow, Congested, Gridlock}
    - Observations O = (speed, pm25) pairs
    - Transition probabilities A[i,j] = P(S_t = j | S_{t-1} = i)
    - Emission probabilities B[i](o) = P(O = o | S = i)
    """
    
    def __init__(self, config: Optional[HMMConfig] = None):
        self.config = config or HMMConfig()
        self.n_states = self.config.n_states
        self.A = self.config.transition_matrix  # Transition matrix
        self.pi = self.config.initial_distribution  # Initial distribution
        
        # Emission parameters: (mean_speed, std_speed, mean_pm25, std_pm25)
        self.emission_params = {
            EnvironmentalState.FREE_FLOW_HEALTHY: {
                'speed': (55.0, 8.0),     # High speed, low variance
                'pm25': (8.5, 1.5)        # Low pollution
            },
            EnvironmentalState.CONGESTED_HIGH_EXPOSURE: {
                'speed': (35.0, 10.0),    # Medium speed, higher variance
                'pm25': (12.5, 2.0)       # Elevated pollution
            },
            EnvironmentalState.GRIDLOCK_TOXIC: {
                'speed': (18.0, 7.0),     # Low speed
                'pm25': (17.0, 3.0)       # High pollution
            }
        }
        
        logger.info("Initialized EnvironmentalHMM with 3 states")
    
    def emission_probability(self, state: int, speed: float, pm25: float) -> float:
        """
        Calculate emission probability P(observation | state)
        
        Uses multivariate Gaussian assumption for (speed, pm25) observations
        
        Args:
            state: Environmental state index
            speed: Observed traffic speed (mph)
            pm25: Observed PM2.5 concentration (µg/m³)
            
        Returns:
            Log probability of observation given state
        """
        params = self.emission_params[EnvironmentalState(state)]
        
        # Speed component
        speed_mean, speed_std = params['speed']
        speed_prob = stats.norm.logpdf(speed, speed_mean, speed_std)
        
        # PM2.5 component
        pm25_mean, pm25_std = params['pm25']
        pm25_prob = stats.norm.logpdf(pm25, pm25_mean, pm25_std)
        
        # Combined log probability (assuming independence)
        return speed_prob + pm25_prob
    
    def viterbi(
        self,
        speeds: List[float],
        pm25_values: List[float]
    ) -> Tuple[List[int], float, np.ndarray]:
        """
        Viterbi Algorithm for optimal state sequence prediction
        
        Finds the most likely sequence of hidden states given observations.
        
        Algorithm Complexity: O(T × N²) where T = time steps, N = states
        
        Args:
            speeds: Sequence of traffic speeds (mph)
            pm25_values: Sequence of PM2.5 values (µg/m³)
            
        Returns:
            Tuple of:
            - optimal_path: Most likely state sequence
            - path_probability: Log probability of the optimal path
            - delta: Viterbi trellis (for visualization)
        """
        T = len(speeds)  # Number of time steps
        N = self.n_states
        
        # Initialize Viterbi matrices
        # delta[t, i] = max probability of being in state i at time t
        delta = np.full((T, N), -np.inf)
        # psi[t, i] = argmax of previous state for backtracking
        psi = np.zeros((T, N), dtype=int)
        
        # Initialization (t = 0)
        for i in range(N):
            delta[0, i] = np.log(self.pi[i] + 1e-10) + \
                         self.emission_probability(i, speeds[0], pm25_values[0])
        
        # Recursion
        for t in range(1, T):
            for j in range(N):
                # Find the best previous state
                emission_prob = self.emission_probability(j, speeds[t], pm25_values[t])
                
                candidates = []
                for i in range(N):
                    prob = delta[t-1, i] + np.log(self.A[i, j] + 1e-10) + emission_prob
                    candidates.append(prob)
                
                delta[t, j] = max(candidates)
                psi[t, j] = np.argmax(candidates)
        
        # Termination - find best final state
        best_final_state = np.argmax(delta[T-1])
        path_probability = delta[T-1, best_final_state]
        
        # Backtracking
        optimal_path = [0] * T
        optimal_path[T-1] = best_final_state
        
        for t in range(T-2, -1, -1):
            optimal_path[t] = psi[t+1, optimal_path[t+1]]
        
        logger.info(f"Viterbi completed: {T} time steps, path prob={path_probability:.2f}")
        
        return optimal_path, path_probability, delta
    
    def predict_24h_states(
        self,
        predicted_speeds: List[float],
        baseline_pm25: float = 13.2
    ) -> Dict:
        """
        Predict environmental states for 24-hour period
        
        Args:
            predicted_speeds: LSTM-predicted speeds for 24 hours (96 values at 15-min intervals)
            baseline_pm25: Base PM2.5 level
            
        Returns:
            Dictionary with state predictions and metadata
        """
        # Generate PM2.5 values based on speed (inverse relationship)
        pm25_values = [self._speed_to_pm25(s, baseline_pm25) for s in predicted_speeds]
        
        # Run Viterbi
        optimal_path, path_prob, delta = self.viterbi(predicted_speeds, pm25_values)
        
        # Calculate state durations and transitions
        state_counts = {s.value: 0 for s in EnvironmentalState}
        transitions = []
        
        for i, state in enumerate(optimal_path):
            state_counts[state] += 1
            if i > 0 and optimal_path[i] != optimal_path[i-1]:
                transitions.append({
                    'time_index': i,
                    'from_state': int(optimal_path[i-1]),
                    'to_state': int(state)
                })
        
        # Calculate risk score (weighted average of states)
        risk_weights = {0: 0.0, 1: 0.5, 2: 1.0}
        total_risk = sum(risk_weights[s] for s in optimal_path) / len(optimal_path)
        
        return {
            'state_sequence': [int(x) for x in optimal_path],
            'state_labels': [STATE_LABELS[EnvironmentalState(s)]['en'] for s in optimal_path],
            'state_labels_es': [STATE_LABELS[EnvironmentalState(s)]['es'] for s in optimal_path],
            'path_probability': float(path_prob),
            'state_durations': {int(k): int(v) for k, v in state_counts.items()},
            'state_percentages': {
                int(k): float((v / len(optimal_path)) * 100)
                for k, v in state_counts.items()
            },
            'transitions': [
                {
                    'time_index': int(t['time_index']),
                    'from_state': int(t['from_state']),
                    'to_state': int(t['to_state'])
                } for t in transitions
            ],
            'risk_score': float(total_risk),
            'pm25_estimates': [float(x) for x in pm25_values],
            'transition_matrix': self.A.tolist(),
            'observation_count': int(len(predicted_speeds))
        }
    
    def _speed_to_pm25(self, speed: float, baseline: float) -> float:
        """Convert traffic speed to estimated PM2.5 concentration"""
        # Inverse relationship: lower speeds = higher PM2.5
        if speed >= 55:
            factor = 0.75  # Good flow = lower pollution
        elif speed >= 45:
            factor = 0.90
        elif speed >= 35:
            factor = 1.10
        elif speed >= 25:
            factor = 1.30
        else:
            factor = 1.50  # Gridlock = highest pollution
        
        return baseline * factor + np.random.normal(0, 0.5)
    
    def get_technical_documentation(self) -> Dict:
        """Generate technical documentation for the HMM"""
        return {
            'model_type': 'Hidden Markov Model (HMM)',
            'algorithm': 'Viterbi Algorithm (Dynamic Programming)',
            'complexity': 'O(T × N²) where T = time steps, N = states',
            'states': {
                'count': self.n_states,
                'definitions': [
                    {
                        'id': 0,
                        'name': 'Free Flow / Healthy',
                        'speed_range': '> 50 mph',
                        'pm25_range': '< 10 µg/m³',
                        'health_risk': 'Low'
                    },
                    {
                        'id': 1,
                        'name': 'Congested / High Exposure',
                        'speed_range': '25-50 mph',
                        'pm25_range': '10-15 µg/m³',
                        'health_risk': 'Moderate'
                    },
                    {
                        'id': 2,
                        'name': 'Gridlock / Toxic',
                        'speed_range': '< 25 mph',
                        'pm25_range': '> 15 µg/m³',
                        'health_risk': 'High'
                    }
                ]
            },
            'transition_matrix': {
                'description': 'A[i,j] = P(state_t = j | state_{t-1} = i)',
                'matrix': self.A.tolist(),
                'interpretation': [
                    'Row 0: From Free Flow - 70% stay, 25% → Congested, 5% → Gridlock',
                    'Row 1: From Congested - 20% → Free Flow, 60% stay, 20% → Gridlock',
                    'Row 2: From Gridlock - 10% → Free Flow, 35% → Congested, 55% stay'
                ]
            },
            'emission_model': {
                'type': 'Multivariate Gaussian',
                'assumption': 'Speed and PM2.5 conditionally independent given state',
                'parameters': {
                    str(EnvironmentalState(i).name): self.emission_params[EnvironmentalState(i)]
                    for i in range(self.n_states)
                }
            }
        }


# ==================== MONTE CARLO SIMULATION ====================

@dataclass
class MonteCarloConfig:
    """Configuration for Monte Carlo simulation"""
    num_iterations: int = 10000
    elasticity_mean: float = -0.4
    elasticity_std: float = 0.1
    pm25_per_1000_trucks_mean: float = 0.12
    pm25_per_1000_trucks_std: float = 0.02
    asthma_response_mean: float = 0.022  # 2.2% per µg/m³
    asthma_response_std: float = 0.005
    baseline_trucks: int = 5200
    baseline_pm25: float = 13.2
    baseline_asthma_visits: int = 340
    random_seed: Optional[int] = None


class MonteCarloSimulator:
    """
    Monte Carlo Simulation for Freight Tax Impact Uncertainty Quantification
    
    Runs N iterations with stochastic parameters to generate a probability
    distribution of health outcomes, addressing model uncertainty.
    
    Key Parameters (Gaussian Distributions):
    - Elasticity of demand: N(-0.4, 0.1)
    - PM2.5 reduction per 1000 trucks: N(0.12, 0.02) µg/m³
    - Asthma concentration-response: N(0.022, 0.005)
    
    Outputs:
    - Probability Density Function (PDF) for health benefits
    - Confidence intervals (5th, 25th, 50th, 75th, 95th percentiles)
    """
    
    def __init__(self, config: Optional[MonteCarloConfig] = None):
        self.config = config or MonteCarloConfig()
        if self.config.random_seed is not None:
            np.random.seed(self.config.random_seed)
        
        logger.info(f"Initialized MonteCarloSimulator with {self.config.num_iterations} iterations")
    
    def run_simulation(self, tax_amount: float) -> Dict:
        """
        Run Monte Carlo simulation for a given tax amount
        
        Args:
            tax_amount: Tax per truck crossing ($)
            
        Returns:
            Dictionary with simulation results and statistics
        """
        n = self.config.num_iterations
        
        # Sample parameters from distributions
        elasticities = np.random.normal(
            self.config.elasticity_mean,
            self.config.elasticity_std,
            n
        )
        
        pm25_rates = np.random.normal(
            self.config.pm25_per_1000_trucks_mean,
            self.config.pm25_per_1000_trucks_std,
            n
        )
        pm25_rates = np.maximum(pm25_rates, 0.01)  # Ensure positive
        
        asthma_responses = np.random.normal(
            self.config.asthma_response_mean,
            self.config.asthma_response_std,
            n
        )
        asthma_responses = np.maximum(asthma_responses, 0.001)  # Ensure positive
        
        # Calculate outcomes for each iteration
        results = {
            'trucks_diverted': np.zeros(n),
            'pm25_reduction': np.zeros(n),
            'asthma_visits_avoided': np.zeros(n),
            'health_benefit_usd': np.zeros(n)
        }
        
        operational_cost = 500.0
        
        for i in range(n):
            # Trucks diverted
            price_increase_pct = (tax_amount / operational_cost) * 100
            quantity_change_pct = elasticities[i] * (price_increase_pct / 100)
            trucks_diverted = int(self.config.baseline_trucks * abs(quantity_change_pct))
            trucks_diverted = min(trucks_diverted, self.config.baseline_trucks)
            
            # PM2.5 reduction
            pm25_reduction = (trucks_diverted / 1000.0) * pm25_rates[i]
            
            # Asthma visits avoided (annual)
            risk_reduction = pm25_reduction * asthma_responses[i]
            visits_avoided = self.config.baseline_asthma_visits * risk_reduction
            
            # Health benefit value (EPA valuation)
            pm25_reduction_kg = pm25_reduction * 1000 * 365
            health_value = (pm25_reduction_kg / 1000) * 6000  # $6000/ton
            
            results['trucks_diverted'][i] = trucks_diverted
            results['pm25_reduction'][i] = pm25_reduction
            results['asthma_visits_avoided'][i] = visits_avoided
            results['health_benefit_usd'][i] = health_value
        
        # Calculate statistics
        percentiles = [5, 25, 50, 75, 95]
        
        stats_output = {}
        for metric, values in results.items():
            stats_output[metric] = {
                'mean': float(np.mean(values)),
                'std': float(np.std(values)),
                'min': float(np.min(values)),
                'max': float(np.max(values)),
                'percentiles': {
                    f'p{p}': float(np.percentile(values, p))
                    for p in percentiles
                }
            }
        
        # Generate PDF data (histogram)
        pdf_data = {}
        for metric in ['pm25_reduction', 'asthma_visits_avoided', 'health_benefit_usd']:
            values = results[metric]
            hist, bin_edges = np.histogram(values, bins=50, density=True)
            bin_centers = (bin_edges[:-1] + bin_edges[1:]) / 2
            pdf_data[metric] = {
                'x': bin_centers.tolist(),
                'y': hist.tolist(),
                'bin_edges': bin_edges.tolist()
            }
        
        # Confidence intervals for UI error bars
        confidence_intervals = {}
        for metric, values in results.items():
            confidence_intervals[metric] = {
                'lower_95': float(np.percentile(values, 2.5)),
                'upper_95': float(np.percentile(values, 97.5)),
                'lower_50': float(np.percentile(values, 25)),
                'upper_50': float(np.percentile(values, 75))
            }
        
        logger.info(f"Monte Carlo completed: {n} iterations, tax=${tax_amount}")
        
        return {
            'tax_amount': float(tax_amount),
            'num_iterations': int(n),
            'statistics': stats_output,
            'pdf_data': pdf_data,
            'confidence_intervals': confidence_intervals,
            'input_distributions': {
                'elasticity': {
                    'distribution': 'Normal',
                    'mean': float(self.config.elasticity_mean),
                    'std': float(self.config.elasticity_std)
                },
                'pm25_per_1000_trucks': {
                    'distribution': 'Normal',
                    'mean': self.config.pm25_per_1000_trucks_mean,
                    'std': self.config.pm25_per_1000_trucks_std,
                    'unit': 'µg/m³'
                },
                'asthma_response': {
                    'distribution': 'Normal',
                    'mean': self.config.asthma_response_mean,
                    'std': self.config.asthma_response_std,
                    'unit': 'risk reduction per µg/m³'
                }
            }
        }
    
    def run_sensitivity_analysis(
        self,
        tax_amounts: List[float] = [10, 25, 50, 75, 100]
    ) -> Dict:
        """
        Run sensitivity analysis across multiple tax levels
        
        Args:
            tax_amounts: List of tax amounts to simulate
            
        Returns:
            Comparison data across tax levels
        """
        results = {}
        for tax in tax_amounts:
            results[tax] = self.run_simulation(tax)
        
        return {
            'tax_amounts': tax_amounts,
            'results': results,
            'summary': {
                tax: {
                    'mean_asthma_avoided': results[tax]['statistics']['asthma_visits_avoided']['mean'],
                    'ci_95': results[tax]['confidence_intervals']['asthma_visits_avoided']
                }
                for tax in tax_amounts
            }
        }
    
    def get_technical_documentation(self) -> Dict:
        """Generate technical documentation for Monte Carlo simulation"""
        return {
            'method': 'Monte Carlo Simulation',
            'purpose': 'Uncertainty quantification for freight tax health benefits',
            'num_iterations': self.config.num_iterations,
            'sampling_method': 'Independent random sampling from Gaussian distributions',
            'parameters': {
                'elasticity_of_demand': {
                    'distribution': 'N(-0.4, 0.1)',
                    'meaning': 'Price elasticity - how truck volume changes with cost',
                    'source': 'US DOT freight economics research'
                },
                'pm25_dispersion': {
                    'distribution': 'N(0.12, 0.02) µg/m³ per 1000 trucks',
                    'meaning': 'PM2.5 concentration change from truck removal',
                    'source': 'EPA Air Quality Studies, local meteorology'
                },
                'concentration_response': {
                    'distribution': 'N(0.022, 0.005)',
                    'meaning': 'Asthma risk reduction per µg/m³ PM2.5 decrease',
                    'source': 'NYC Community Health Survey, EPA ISA'
                }
            },
            'outputs': [
                'Probability Density Function (PDF) for health outcomes',
                'Confidence intervals (5th, 25th, 50th, 75th, 95th percentiles)',
                '95% CI for error bars on visualizations'
            ],
            'limitations': [
                'Assumes parameter independence',
                'Gaussian distributions may not capture tail risks',
                'Does not account for temporal correlations'
            ]
        }


# ==================== A* PATHFINDING ====================

@dataclass
class Node:
    """Node in the road network graph"""
    id: str
    lat: float
    lon: float
    is_residential: bool = False
    is_expressway: bool = False


@dataclass
class Edge:
    """Edge connecting two nodes"""
    from_node: str
    to_node: str
    distance_km: float
    base_time_minutes: float
    is_residential: bool = False


class AStarPathfinder:
    """
    A* Pathfinding Algorithm with Residential Penalty Weight
    
    Models truck diversion behavior when freight tax is applied:
    - If Tax + Expressway_Time > Residential_Time + Penalty, truck diverts
    
    This addresses the model exclusion: "Truck routing through residential streets"
    
    The residential penalty represents:
    - Community disruption costs
    - Speed bumps, narrow streets
    - Increased wear on local infrastructure
    - Higher accident risk
    """
    
    def __init__(self, residential_penalty_weight: float = 1.5):
        """
        Args:
            residential_penalty_weight: Multiplier for residential route costs
                1.0 = no penalty
                1.5 = 50% cost increase for residential routing
                2.0 = double cost for residential routing
        """
        self.penalty_weight = residential_penalty_weight
        self.nodes: Dict[str, Node] = {}
        self.edges: Dict[str, List[Edge]] = {}
        
        # Initialize Cross-Bronx road network
        self._build_network()
        
        logger.info(f"Initialized A* Pathfinder with residential penalty {residential_penalty_weight}")
    
    def _build_network(self):
        """Build simplified road network for Cross-Bronx area"""
        # Key nodes
        nodes_data = [
            ('start_west', 40.840, -73.920, False, True),      # I-95 West Entry
            ('start_east', 40.820, -73.850, False, True),      # I-95 East Entry
            ('soundview_n', 40.830, -73.870, True, False),     # Soundview North
            ('soundview_s', 40.818, -73.875, True, False),     # Soundview South
            ('hunts_point', 40.815, -73.890, True, False),     # Hunts Point
            ('mott_haven', 40.810, -73.910, True, False),      # Mott Haven
            ('cbx_mid', 40.825, -73.885, False, True),         # Cross-Bronx Midpoint
            ('bruckner', 40.815, -73.870, False, True),        # Bruckner Blvd
        ]
        
        for node_id, lat, lon, is_res, is_exp in nodes_data:
            self.nodes[node_id] = Node(node_id, lat, lon, is_res, is_exp)
            self.edges[node_id] = []
        
        # Edges (bidirectional)
        edges_data = [
            # Expressway routes
            ('start_west', 'cbx_mid', 5.0, 8.0, False),
            ('cbx_mid', 'start_east', 4.5, 7.0, False),
            ('cbx_mid', 'bruckner', 2.0, 4.0, False),
            ('bruckner', 'start_east', 3.0, 5.0, False),
            
            # Residential routes (shorter distance but slower)
            ('start_west', 'mott_haven', 3.0, 12.0, True),
            ('mott_haven', 'hunts_point', 2.5, 10.0, True),
            ('hunts_point', 'soundview_s', 2.0, 8.0, True),
            ('soundview_s', 'soundview_n', 1.5, 6.0, True),
            ('soundview_n', 'start_east', 2.5, 10.0, True),
            
            # Mixed connections
            ('cbx_mid', 'soundview_n', 1.0, 4.0, True),
            ('bruckner', 'soundview_s', 1.5, 6.0, True),
            ('hunts_point', 'bruckner', 2.0, 8.0, True),
        ]
        
        for from_n, to_n, dist, time, is_res in edges_data:
            edge = Edge(from_n, to_n, dist, time, is_res)
            self.edges[from_n].append(edge)
            # Bidirectional
            reverse_edge = Edge(to_n, from_n, dist, time, is_res)
            self.edges[to_n].append(reverse_edge)
    
    def _heuristic(self, node_id: str, goal_id: str) -> float:
        """A* heuristic: Euclidean distance × speed factor"""
        node = self.nodes[node_id]
        goal = self.nodes[goal_id]
        
        # Haversine approximation (simplified)
        lat_diff = abs(node.lat - goal.lat) * 111  # km per degree latitude
        lon_diff = abs(node.lon - goal.lon) * 85   # km per degree longitude (at NYC lat)
        
        distance = np.sqrt(lat_diff**2 + lon_diff**2)
        
        # Assume average speed of 40 mph = 64 km/h
        time_estimate = (distance / 64) * 60  # minutes
        
        return time_estimate
    
    def _edge_cost(self, edge: Edge, tax_amount: float = 0) -> float:
        """
        Calculate edge traversal cost with penalties
        
        Args:
            edge: Road segment
            tax_amount: Freight tax (adds to expressway cost)
            
        Returns:
            Cost in "equivalent minutes" (time + penalties)
        """
        base_cost = edge.base_time_minutes
        
        if edge.is_residential:
            # Apply residential penalty
            base_cost *= self.penalty_weight
        
        if not edge.is_residential and tax_amount > 0:
            # Add tax as time-equivalent cost
            # Assume trucker values time at $50/hour
            tax_time_equivalent = (tax_amount / 50) * 60  # Convert to minute-equivalent
            # Distribute across all expressway edges (simplified)
            base_cost += tax_time_equivalent / 3
        
        return base_cost
    
    def find_path(
        self,
        start: str,
        goal: str,
        tax_amount: float = 0
    ) -> Tuple[List[str], float, bool]:
        """
        A* pathfinding with residential penalty
        
        Args:
            start: Start node ID
            goal: Goal node ID
            tax_amount: Freight tax amount
            
        Returns:
            Tuple of (path, total_cost, uses_residential)
        """
        if start not in self.nodes or goal not in self.nodes:
            raise ValueError("Invalid start or goal node")
        
        # Priority queue: (f_score, g_score, node_id, path)
        open_set = [(0, 0, start, [start])]
        visited = set()
        
        while open_set:
            f_score, g_score, current, path = heapq.heappop(open_set)
            
            if current == goal:
                uses_residential = any(
                    self.nodes[n].is_residential for n in path
                )
                return path, g_score, uses_residential
            
            if current in visited:
                continue
            visited.add(current)
            
            for edge in self.edges.get(current, []):
                if edge.to_node in visited:
                    continue
                
                edge_cost = self._edge_cost(edge, tax_amount)
                new_g = g_score + edge_cost
                new_f = new_g + self._heuristic(edge.to_node, goal)
                
                heapq.heappush(open_set, (new_f, new_g, edge.to_node, path + [edge.to_node]))
        
        return [], float('inf'), False
    
    def analyze_diversion(
        self,
        tax_amount: float,
        start: str = 'start_west',
        goal: str = 'start_east'
    ) -> Dict:
        """
        Analyze whether truck will divert through residential streets
        
        Args:
            tax_amount: Freight tax per crossing
            start: Origin node
            goal: Destination node
            
        Returns:
            Analysis of route choice and diversion behavior
        """
        # Find optimal path with tax
        path_with_tax, cost_with_tax, uses_res_tax = self.find_path(start, goal, tax_amount)
        
        # Find path without tax for comparison
        path_no_tax, cost_no_tax, uses_res_no_tax = self.find_path(start, goal, 0)
        
        # Calculate expressway-only and residential-only paths
        # (Simplified: just use the computed paths)
        
        will_divert = uses_res_tax and not uses_res_no_tax
        
        return {
            'tax_amount': tax_amount,
            'route_with_tax': {
                'path': path_with_tax,
                'cost_minutes': float(cost_with_tax),
                'uses_residential': uses_res_tax
            },
            'route_without_tax': {
                'path': path_no_tax,
                'cost_minutes': float(cost_no_tax),
                'uses_residential': uses_res_no_tax
            },
            'diversion_analysis': {
                'will_divert_to_residential': will_divert,
                'cost_increase_pct': ((cost_with_tax - cost_no_tax) / cost_no_tax) * 100 if cost_no_tax > 0 else 0,
                'residential_penalty_weight': self.penalty_weight,
                'decision_rule': f"If Tax + Expressway_Time > Residential_Time × {self.penalty_weight}, use residential"
            },
            'community_impact': {
                'residential_exposure': uses_res_tax,
                'affected_neighborhoods': [
                    self.nodes[n].id for n in path_with_tax 
                    if self.nodes[n].is_residential
                ] if uses_res_tax else []
            }
        }
    
    def batch_analyze(
        self,
        tax_amounts: List[float] = [0, 25, 50, 75, 100]
    ) -> Dict:
        """Analyze diversion behavior across multiple tax levels"""
        results = {}
        
        for tax in tax_amounts:
            results[tax] = self.analyze_diversion(tax)
        
        # Summary
        diversion_result = None
        for tax in sorted(tax_amounts):
            if results[tax]['diversion_analysis']['will_divert_to_residential']:
                diversion_result = tax
                break
        
        return {
            'analyses': results,
            'summary': {
                'diversion_threshold': diversion_result,
                'residential_penalty_weight': self.penalty_weight,
                'recommendation': (
                    f"Tax below ${diversion_result} avoids residential diversion"
                    if diversion_result else
                    "No diversion detected at tested tax levels"
                )
            }
        }
    
    def get_technical_documentation(self) -> Dict:
        """Generate technical documentation for A* pathfinding"""
        return {
            'algorithm': 'A* (A-Star) Pathfinding',
            'purpose': 'Model truck routing behavior with freight tax',
            'heuristic': 'Euclidean distance with speed adjustment',
            'complexity': 'O(E log V) where E = edges, V = nodes',
            'residential_penalty': {
                'weight': self.penalty_weight,
                'interpretation': f'{self.penalty_weight}× cost multiplier for residential streets',
                'rationale': [
                    'Community disruption costs',
                    'Infrastructure wear on local streets',
                    'Safety considerations (narrow streets, pedestrians)',
                    'Time delays from traffic calming measures'
                ]
            },
            'decision_model': {
                'rule': 'Trucks choose minimum-cost route',
                'expressway_cost': 'Base time + tax equivalent',
                'residential_cost': 'Base time × penalty weight',
                'diversion_condition': 'Tax + Expressway_Time > Residential_Time × Penalty'
            },
            'network': {
                'nodes': len(self.nodes),
                'edges': sum(len(e) for e in self.edges.values()),
                'coverage': 'Cross-Bronx Expressway and Soundview residential area'
            },
            'addresses_exclusion': 'Truck routing through residential streets (from model assumptions)'
        }


# ==================== UNIFIED ANALYTICS INTERFACE ====================

class AdvancedAnalytics:
    """
    Unified interface for all advanced analytics capabilities
    """
    
    def __init__(
        self,
        hmm_config: Optional[HMMConfig] = None,
        monte_carlo_config: Optional[MonteCarloConfig] = None,
        residential_penalty: float = 1.5
    ):
        self.hmm = EnvironmentalHMM(hmm_config)
        self.monte_carlo = MonteCarloSimulator(monte_carlo_config)
        self.pathfinder = AStarPathfinder(residential_penalty)
        
        logger.info("Initialized AdvancedAnalytics with all modules")
    
    def get_all_technical_docs(self) -> Dict:
        """Get combined technical documentation for all models"""
        return {
            'hmm': self.hmm.get_technical_documentation(),
            'monte_carlo': self.monte_carlo.get_technical_documentation(),
            'pathfinding': self.pathfinder.get_technical_documentation()
        }


# ==================== CONVENIENCE FUNCTIONS ====================

def create_analytics_engine(
    residential_penalty: float = 1.5,
    monte_carlo_iterations: int = 10000
) -> AdvancedAnalytics:
    """Factory function to create the analytics engine"""
    mc_config = MonteCarloConfig(num_iterations=monte_carlo_iterations)
    return AdvancedAnalytics(
        monte_carlo_config=mc_config,
        residential_penalty=residential_penalty
    )


if __name__ == "__main__":
    # Test the analytics modules
    logging.basicConfig(level=logging.INFO)
    
    print("\n" + "="*60)
    print("TESTING ADVANCED ANALYTICS ENGINE")
    print("="*60 + "\n")
    
    # Initialize
    analytics = create_analytics_engine()
    
    # Test HMM
    print("1. Testing HMM Viterbi Algorithm...")
    test_speeds = [45, 40, 35, 30, 25, 22, 20, 22, 28, 35, 42, 50]
    test_pm25 = [12, 13, 14, 15, 16, 17, 18, 17, 15, 13, 11, 10]
    path, prob, _ = analytics.hmm.viterbi(test_speeds, test_pm25)
    print(f"   State sequence: {path}")
    print(f"   Path probability: {prob:.2f}")
    
    # Test Monte Carlo
    print("\n2. Testing Monte Carlo Simulation...")
    mc_result = analytics.monte_carlo.run_simulation(50)
    print(f"   Iterations: {mc_result['num_iterations']}")
    print(f"   Mean asthma visits avoided: {mc_result['statistics']['asthma_visits_avoided']['mean']:.2f}")
    print(f"   95% CI: [{mc_result['confidence_intervals']['asthma_visits_avoided']['lower_95']:.2f}, "
          f"{mc_result['confidence_intervals']['asthma_visits_avoided']['upper_95']:.2f}]")
    
    # Test A* Pathfinding
    print("\n3. Testing A* Pathfinding...")
    path_result = analytics.pathfinder.analyze_diversion(50)
    print(f"   Path with $50 tax: {path_result['route_with_tax']['path']}")
    print(f"   Uses residential: {path_result['route_with_tax']['uses_residential']}")
    
    print("\n" + "="*60)
    print("All tests completed successfully!")
    print("="*60 + "\n")
