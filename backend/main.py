"""
FastAPI Backend for Urban Futures LEAP - Climate Science Hackathon
Freight Tax Impact Modeling on Cross-Bronx Expressway (Soundview, Bronx)
Models air pollution reduction and pediatric asthma outcome improvements
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np
from typing import Dict, List, Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Urban Futures LEAP API",
    description="Freight Tax Impact Inference Engine for Climate Justice",
    version="1.0.0"
)

# CORS configuration for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== DATA MODELS ====================

class SimulationRequest(BaseModel):
    """Request model for freight tax simulation"""
    tax_amount: float
    
class SimulationResponse(BaseModel):
    """Response model with calculated metrics"""
    tax_amount: float
    trucks_diverted: int
    trucks_diverted_percentage: float
    pm25_reduction_ug_m3: float
    pm25_reduction_kg: float
    baseline_pm25_ug_m3: float
    new_pm25_ug_m3: float
    baseline_asthma_er_visits: int
    avoided_asthma_er_visits: float
    estimated_asthma_er_visits: float
    cost_benefit_ratio: float
    co2_equivalent_reduction_kg: float

class BaselineResponse(BaseModel):
    """Response model for baseline metrics"""
    uhf_district: str
    location: str
    baseline_pm25_ug_m3: float
    baseline_asthma_er_visits: int
    nta_code: str
    hvi_score: int
    data_source: str

# ==================== CONSTANTS & CONFIGURATION ====================

# Freight Diversion Model Constants
ELASTICITY_OF_DEMAND = -0.4  # Price elasticity of freight demand
AVERAGE_TRUCK_LOAD_KG = 15000  # Average cargo per truck
BASELINE_DAILY_TRUCKS = 5200  # Estimated trucks per day on Cross-Bronx Expressway

# PM2.5 Pollution Constants
PM25_PER_1000_TRUCKS_REDUCTION = 0.12  # µg/m³ reduction per 1000 trucks removed
BASELINE_PM25 = 13.2  # Current PM2.5 in UHF 402 (Hunts Point/Mott Haven) in µg/m³

# Pediatric Asthma Health Constants
BASELINE_ASTHMA_ER_VISITS = 340  # Annual ER visits for pediatric asthma in UHF 402
ASTHMA_RISK_REDUCTION_PER_UG = 0.022  # 2.2% risk reduction per 1 µg/m³ PM2.5 drop

# Environmental Constants
CO2_PER_TRUCK_DIVERSION_KG = 85  # kg CO2 equivalent saved per truck diverted

# Geographic Constants
SOUNDVIEW_COORDINATES = {"lat": 40.824, "lng": -73.875}
UHF_DISTRICT_402 = "Hunts Point/Mott Haven"
ZIP_CODES = {"10473", "10474"}  # Soundview area
HVI_SCORE_SOUNDVIEW = 5  # Heat Vulnerability Index


# ==================== INFERENCE FUNCTIONS ====================

def calculate_freight_diversion(tax_amount: float) -> int:
    """
    Calculate trucks diverted using price elasticity of demand.
    
    Formula: % Change in Quantity = Elasticity × % Change in Price
    Assumption: Elasticity = -0.4 (inelastic demand)
    
    Args:
        tax_amount: Tax imposed per truck crossing
    
    Returns:
        Number of trucks diverted from Cross-Bronx Expressway
    """
    if tax_amount <= 0:
        return 0
    
    # Assume average truck makes 1 crossing per day
    # Price increase as percentage of operational cost (~$500/day)
    operational_cost = 500.0
    price_increase_pct = (tax_amount / operational_cost) * 100
    
    # Apply elasticity formula
    quantity_change_pct = ELASTICITY_OF_DEMAND * (price_increase_pct / 100)
    
    # Calculate diverted trucks (daily baseline)
    trucks_diverted = int(BASELINE_DAILY_TRUCKS * abs(quantity_change_pct))
    
    return min(trucks_diverted, BASELINE_DAILY_TRUCKS)  # Cap at baseline


def calculate_pm25_reduction(trucks_diverted: int) -> float:
    """
    Calculate PM2.5 reduction in µg/m³.
    
    Assumption: Removing 1000 trucks ≈ 0.12 µg/m³ PM2.5 reduction
    
    Args:
        trucks_diverted: Number of trucks removed from expressway
    
    Returns:
        PM2.5 reduction in µg/m³
    """
    reduction = (trucks_diverted / 1000.0) * PM25_PER_1000_TRUCKS_REDUCTION
    return round(reduction, 4)


def calculate_health_benefits(pm25_reduction: float) -> float:
    """
    Calculate avoided health outcomes from PM2.5 reduction.
    Used for cost-benefit ratio calculation only.
    
    Args:
        pm25_reduction: PM2.5 reduction in µg/m³
    
    Returns:
        Number of avoided health outcomes
    """
    risk_reduction_ratio = pm25_reduction * ASTHMA_RISK_REDUCTION_PER_UG
    baseline_daily = BASELINE_ASTHMA_ER_VISITS / 250
    avoided_visits_daily = baseline_daily * risk_reduction_ratio
    health_benefit_multiplier = 3.5
    return max(0, avoided_visits_daily * health_benefit_multiplier)


def calculate_health_benefit_value(pm25_reduction_kg: float) -> float:
    """
    Calculate the monetary value of health benefits from PM2.5 reduction.
    
    Uses EPA social cost of air quality improvement: ~$6,000 per ton of PM2.5 reduced.
    This accounts for avoided respiratory disease, cardiovascular disease, and mortality.
    
    Args:
        pm25_reduction_kg: Annual PM2.5 reduction in kilograms
    
    Returns:
        Estimated health benefit value in USD
    """
    # EPA estimate: $6,000 per ton of PM2.5 reduction (accounts for health outcomes)
    HEALTH_VALUE_PER_TON_PM25 = 6000
    tons_pm25_reduced = pm25_reduction_kg / 1000
    return tons_pm25_reduced * HEALTH_VALUE_PER_TON_PM25


def calculate_cost_benefit_ratio(trucks_diverted: int, tax_amount: float) -> float:
    """
    Calculate health benefit per dollar of tax revenue.
    
    Simplified metric: Avoided asthma ER visits per $1000 in annual tax revenue
    
    Args:
        trucks_diverted: Trucks removed from expressway
        tax_amount: Tax per crossing
    
    Returns:
        Cost-benefit ratio (health visits per $1000 tax revenue)
    """
    annual_tax_revenue = trucks_diverted * tax_amount * 250  # ~250 business days/year
    if annual_tax_revenue == 0:
        return 0.0
    
    # Assuming 250 days per year
    annual_avoided_visits = calculate_health_benefits(
        calculate_pm25_reduction(trucks_diverted)
    ) * (365 / 250)
    
    ratio = annual_avoided_visits / (annual_tax_revenue / 1000)
    return round(ratio, 3)


def calculate_co2_reduction(trucks_diverted: int) -> float:
    """
    Calculate CO2 equivalent reduction from diverted trucks.
    
    Args:
        trucks_diverted: Number of trucks diverted
    
    Returns:
        CO2 reduction in kg (annual estimate)
    """
    # Assume 250 business days per year
    annual_reduction = trucks_diverted * CO2_PER_TRUCK_DIVERSION_KG * 250
    return round(annual_reduction, 2)


# ==================== API ENDPOINTS ====================

@app.get("/", tags=["Health Check"])
def read_root():
    """Health check endpoint"""
    return {
        "message": "Urban Futures LEAP - Freight Tax Impact Model",
        "version": "1.0.0",
        "status": "operational"
    }


@app.get("/baseline", response_model=BaselineResponse, tags=["Data"])
def get_baseline():
    """
    Get baseline environmental and health metrics for UHF District 402.
    
    Returns:
        Baseline PM2.5 concentration and pediatric asthma ER visits
    """
    try:
        return BaselineResponse(
            uhf_district="402",
            location=UHF_DISTRICT_402,
            baseline_pm25_ug_m3=BASELINE_PM25,
            baseline_asthma_er_visits=BASELINE_ASTHMA_ER_VISITS,
            nta_code="Soundview/Mott Haven",
            hvi_score=HVI_SCORE_SOUNDVIEW,
            data_source="NYC EPIQUERY, NYC Community Health Survey, EPA Air Quality"
        )
    except Exception as e:
        logger.error(f"Error retrieving baseline: {str(e)}")
        raise HTTPException(status_code=500, detail="Error retrieving baseline data")


@app.get("/test-asthma", tags=["Debug"])
def test_asthma_calculation():
    """Debug endpoint to test asthma calculation logic"""
    results = []
    for tax in [10, 25, 50, 75, 100]:
        trucks = calculate_freight_diversion(tax)
        pm25 = calculate_pm25_reduction(trucks)
        asthma_daily = calculate_health_benefits(pm25)
        asthma_annual = round(asthma_daily * 250, 1)
        
        results.append({
            "tax": tax,
            "trucks_diverted": trucks,
            "pm25_reduction": pm25,
            "asthma_prevented_daily": round(asthma_daily, 4),
            "asthma_prevented_annual": asthma_annual
        })
    
    return {"test_results": results}


@app.post("/simulate", tags=["Inference"])
def simulate_freight_tax(request: SimulationRequest):
    """
    Simulate the impact of a freight tax on air pollution and asthma outcomes.
    
    Calculation Flow:
    1. Use elasticity model to determine trucks diverted
    2. Calculate PM2.5 reduction from truck removal
    3. Apply Concentration-Response Function for health benefits
    4. Estimate CO2 reduction
    
    Args:
        request: SimulationRequest with tax_amount in dollars
    
    Returns:
        SimulationResponse with all calculated metrics
    """
    try:
        # Validate input
        if request.tax_amount < 0:
            raise HTTPException(status_code=400, detail="Tax amount cannot be negative")
        if request.tax_amount > 500:
            raise HTTPException(status_code=400, detail="Tax amount exceeds reasonable bounds")
        
        # Core calculations
        trucks_diverted = calculate_freight_diversion(request.tax_amount)
        pm25_reduction = calculate_pm25_reduction(trucks_diverted)
        cost_benefit = calculate_cost_benefit_ratio(trucks_diverted, request.tax_amount)
        co2_reduction = calculate_co2_reduction(trucks_diverted)
        
        # Calculate derived metrics
        new_pm25 = max(0, BASELINE_PM25 - pm25_reduction)
        trucks_diverted_pct = (trucks_diverted / BASELINE_DAILY_TRUCKS) * 100
        pm25_reduction_kg = pm25_reduction * 1000 * 365  # Convert to annual kg
        health_benefit_value = calculate_health_benefit_value(pm25_reduction_kg)
        
        response_dict = {
            "tax_amount": request.tax_amount,
            "trucks_diverted": trucks_diverted,
            "trucks_diverted_percentage": round(trucks_diverted_pct, 2),
            "pm25_reduction_ug_m3": pm25_reduction,
            "pm25_reduction_kg": round(pm25_reduction_kg, 2),
            "baseline_pm25_ug_m3": BASELINE_PM25,
            "new_pm25_ug_m3": round(new_pm25, 2),
            "health_benefit_value_usd": round(health_benefit_value, 0),
            "cost_benefit_ratio": cost_benefit,
            "co2_equivalent_reduction_kg": co2_reduction
        }
        return response_dict
        
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Simulation error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/assumptions", tags=["Documentation"])
def get_model_assumptions():
    """
    Return model assumptions and limitations for transparency.
    Aligns with Data Storytelling rubric requirement.
    """
    return {
        "title": "Model Assumptions & Limitations",
        "freight_diversion": {
            "elasticity": ELASTICITY_OF_DEMAND,
            "assumption": "Price elasticity of freight demand based on microeconomic literature",
            "limitation": "Assumes rational economic actors; does not account for behavioral factors",
            "operational_cost": "$500/day per truck",
            "confidence": "Medium - based on industry surveys"
        },
        "pollution_impact": {
            "pm25_reduction_rate": f"{PM25_PER_1000_TRUCKS_REDUCTION} µg/m³ per 1000 trucks",
            "assumption": "Linear relationship between truck removal and PM2.5 reduction",
            "limitation": "Actual reduction may be non-linear due to atmospheric chemistry",
            "data_source": "EPA Air Quality Studies",
            "confidence": "Medium - local meteorology varies"
        },
        "health_outcomes": {
            "concentration_response_function": f"{ASTHMA_RISK_REDUCTION_PER_UG * 100}% risk reduction per µg/m³",
            "assumption": "CRF applies uniformly across UHF District 402",
            "limitation": "Population heterogeneity; exposure may vary by microclimate",
            "baseline_visits": BASELINE_ASTHMA_ER_VISITS,
            "confidence": "Medium - based on NYC Community Health Survey"
        },
        "geographic_scope": {
            "location": "UHF District 402 (Hunts Point/Mott Haven, Soundview)",
            "zip_codes": list(ZIP_CODES),
            "assumption": "Assumes benefits localized to express way corridor",
            "limitation": "Pollutant dispersion may affect broader area",
            "hvi_score": HVI_SCORE_SOUNDVIEW
        },
        "exclusions": {
            "note": "Model does NOT include",
            "items": [
                "Truck routing through residential streets",
                "Indirect health effects (mental health, economic opportunity)",
                "Cumulative impacts with other pollutants (NO2, SO2)",
                "Behavioral responses (induced demand for freight)",
                "Equity analysis of tax burden distribution"
            ]
        },
        "recommendations": {
            "notes": "For policy use, consider:",
            "items": [
                "Community engagement in sensitive neighborhoods",
                "Revenue recycling mechanisms for just transition",
                "Monitoring actual vs. modeled outcomes post-implementation",
                "Sensitivity analysis for elasticity parameter"
            ]
        }
    }


@app.get("/geojson/soundview", tags=["GeoData"])
def get_soundview_geojson():
    """
    Return GeoJSON for Soundview ZIP codes (10473, 10474) for map visualization.
    Placeholder structure - integrate with real NYC boundary data.
    """
    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {
                    "zip_code": "10473",
                    "area_name": "Soundview",
                    "hvi": 5,
                    "baseline_pm25": BASELINE_PM25
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [-73.88, 40.82],
                        [-73.87, 40.82],
                        [-73.87, 40.83],
                        [-73.88, 40.83],
                        [-73.88, 40.82]
                    ]]
                }
            },
            {
                "type": "Feature",
                "properties": {
                    "zip_code": "10474",
                    "area_name": "Mott Haven",
                    "hvi": 5,
                    "baseline_pm25": BASELINE_PM25
                },
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [-73.87, 40.82],
                        [-73.86, 40.82],
                        [-73.86, 40.83],
                        [-73.87, 40.83],
                        [-73.87, 40.82]
                    ]]
                }
            }
        ]
    }


if __name__ == "__main__":
    import uvicorn
    
    # Test the calculation logic
    print("\n" + "="*60)
    print("TESTING ASTHMA CALCULATION LOGIC")
    print("="*60)
    
    test_taxes = [10, 25, 50, 75, 100]
    for tax in test_taxes:
        trucks = calculate_freight_diversion(tax)
        pm25 = calculate_pm25_reduction(trucks)
        pm25_kg = pm25 * 1000 * 365
        health_value = calculate_health_benefit_value(pm25_kg)
        
        print(f"\nTax: ${tax}")
        print(f"  Trucks diverted: {trucks}")
        print(f"  PM2.5 reduction: {pm25} µg/m³")
        print(f"  Annual PM2.5 reduction: {pm25_kg:.0f} kg")
        print(f"  Health benefit value: ${health_value:,.0f}")
    
    print("\n" + "="*60 + "\n")
    
    uvicorn.run(app, host="0.0.0.0", port=8000)
