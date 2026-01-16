# Urban Futures LEAP - API Specification

## Base URL
```
http://localhost:8000
```

## Authentication
Currently no authentication required (open for hackathon). Production should add JWT/API keys.

---

## Endpoints

### 1. Health Check
**GET** `/`

Check if API is operational.

**Response** (200 OK):
```json
{
  "message": "Urban Futures LEAP - Freight Tax Impact Model",
  "version": "1.0.0",
  "status": "operational"
}
```

---

### 2. Get Baseline Metrics
**GET** `/baseline`

Retrieve current environmental and health metrics for UHF District 402 (Hunts Point/Mott Haven).

**Response** (200 OK):
```json
{
  "uhf_district": "402",
  "location": "Hunts Point/Mott Haven",
  "baseline_pm25_ug_m3": 13.2,
  "baseline_asthma_er_visits": 340,
  "nta_code": "Soundview/Mott Haven",
  "hvi_score": 5,
  "data_source": "NYC EPIQUERY, NYC Community Health Survey, EPA Air Quality"
}
```

**Fields**:
- `uhf_district`: UHF District identifier
- `location`: Human-readable location name
- `baseline_pm25_ug_m3`: PM2.5 concentration (micrograms per cubic meter)
- `baseline_asthma_er_visits`: Annual pediatric asthma ER visits
- `nta_code`: Neighborhood Tabulation Area code
- `hvi_score`: Heat Vulnerability Index (1-5, where 5 is highest)
- `data_source`: Data attribution

---

### 3. Simulate Freight Tax Impact
**POST** `/simulate`

Calculate the impact of a freight tax on air pollution and asthma outcomes.

**Request**:
```json
{
  "tax_amount": 25
}
```

**Request Parameters**:
| Field | Type | Range | Description |
|-------|------|-------|-------------|
| `tax_amount` | float | 0-500 | Tax per truck crossing in dollars |

**Response** (200 OK):
```json
{
  "tax_amount": 25.0,
  "trucks_diverted": 652,
  "trucks_diverted_percentage": 12.54,
  "pm25_reduction_ug_m3": 0.0782,
  "pm25_reduction_kg": 28534.3,
  "baseline_pm25_ug_m3": 13.2,
  "new_pm25_ug_m3": 13.1218,
  "baseline_asthma_er_visits": 340,
  "avoided_asthma_er_visits": 6,
  "estimated_asthma_er_visits": 334,
  "cost_benefit_ratio": 0.125,
  "co2_equivalent_reduction_kg": 13871.0
}
```

**Response Fields**:
| Field | Type | Unit | Description |
|-------|------|------|-------------|
| `tax_amount` | float | $ | Input tax amount |
| `trucks_diverted` | int | trucks/day | Daily trucks diverted from expressway |
| `trucks_diverted_percentage` | float | % | Percentage of baseline diverted |
| `pm25_reduction_ug_m3` | float | µg/m³ | PM2.5 concentration reduction |
| `pm25_reduction_kg` | float | kg/year | Annual PM2.5 mass reduction |
| `baseline_pm25_ug_m3` | float | µg/m³ | Current PM2.5 level |
| `new_pm25_ug_m3` | float | µg/m³ | Projected PM2.5 level |
| `baseline_asthma_er_visits` | int | visits/year | Current asthma ER visits |
| `avoided_asthma_er_visits` | int | visits/year | Projected avoided visits |
| `estimated_asthma_er_visits` | int | visits/year | Projected total visits |
| `cost_benefit_ratio` | float | visits/$1000 | Health benefit per tax revenue |
| `co2_equivalent_reduction_kg` | float | kg/year | CO₂ savings (annual) |

**Error Responses**:

400 Bad Request - Invalid tax amount:
```json
{
  "detail": "Tax amount cannot be negative"
}
```

500 Internal Server Error:
```json
{
  "detail": "Error in simulation calculation"
}
```

---

### 4. Get Model Assumptions
**GET** `/assumptions`

Retrieve detailed model assumptions, limitations, and data sources.

**Response** (200 OK):
```json
{
  "title": "Model Assumptions & Limitations",
  "freight_diversion": {
    "elasticity": -0.4,
    "assumption": "Price elasticity of freight demand based on microeconomic literature",
    "limitation": "Assumes rational economic actors; does not account for behavioral factors",
    "operational_cost": "$500/day per truck",
    "confidence": "Medium - based on industry surveys"
  },
  "pollution_impact": {
    "pm25_reduction_rate": "0.12 µg/m³ per 1000 trucks",
    "assumption": "Linear relationship between truck removal and PM2.5 reduction",
    "limitation": "Actual reduction may be non-linear due to atmospheric chemistry",
    "data_source": "EPA Air Quality Studies",
    "confidence": "Medium - local meteorology varies"
  },
  "health_outcomes": {
    "concentration_response_function": "2.2% risk reduction per µg/m³",
    "assumption": "CRF applies uniformly across UHF District 402",
    "limitation": "Population heterogeneity; exposure may vary by microclimate",
    "baseline_visits": 340,
    "confidence": "Medium - based on NYC Community Health Survey"
  },
  "geographic_scope": {
    "location": "UHF District 402 (Hunts Point/Mott Haven, Soundview)",
    "zip_codes": ["10473", "10474"],
    "assumption": "Assumes benefits localized to expressway corridor",
    "limitation": "Pollutant dispersion may affect broader area",
    "hvi_score": 5
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
```

---

### 5. Get Soundview GeoJSON
**GET** `/geojson/soundview`

Retrieve GeoJSON features for Soundview ZIP codes (10473, 10474) with metadata.

**Response** (200 OK):
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "zip_code": "10473",
        "area_name": "Soundview",
        "hvi": 5,
        "baseline_pm25": 13.2
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [-73.88, 40.82],
            [-73.87, 40.82],
            [-73.87, 40.83],
            [-73.88, 40.83],
            [-73.88, 40.82]
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "zip_code": "10474",
        "area_name": "Mott Haven",
        "hvi": 5,
        "baseline_pm25": 13.2
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [-73.87, 40.82],
            [-73.86, 40.82],
            [-73.86, 40.83],
            [-73.87, 40.83],
            [-73.87, 40.82]
          ]
        ]
      }
    }
  ]
}
```

**Properties**:
- `zip_code`: NYC ZIP code
- `area_name`: Neighborhood name
- `hvi`: Heat Vulnerability Index (1-5)
- `baseline_pm25`: Current PM2.5 concentration

---

## Error Handling

All errors follow JSON:API error format:

```json
{
  "detail": "Error description"
}
```

### Status Codes
| Code | Meaning | Common Causes |
|------|---------|---------------|
| 200 | OK | Successful request |
| 400 | Bad Request | Invalid parameters |
| 404 | Not Found | Endpoint doesn't exist |
| 500 | Server Error | Calculation failure |

---

## Rate Limiting

Current: No rate limiting (development mode)

**Production**: Recommend 100 requests/minute per IP

---

## CORS Headers

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

---

## Example Requests

### Using cURL

**Get Baseline**:
```bash
curl http://localhost:8000/baseline
```

**Run Simulation**:
```bash
curl -X POST http://localhost:8000/simulate \
  -H "Content-Type: application/json" \
  -d '{"tax_amount": 50}'
```

**Get Assumptions**:
```bash
curl http://localhost:8000/assumptions
```

**Get GeoJSON**:
```bash
curl http://localhost:8000/geojson/soundview
```

### Using JavaScript/Fetch

```javascript
// Fetch baseline
fetch('http://localhost:8000/baseline')
  .then(r => r.json())
  .then(data => console.log(data));

// Run simulation
fetch('http://localhost:8000/simulate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ tax_amount: 35 })
})
  .then(r => r.json())
  .then(data => console.log(data));
```

### Using Python/Requests

```python
import requests

# Get baseline
response = requests.get('http://localhost:8000/baseline')
print(response.json())

# Run simulation
response = requests.post(
    'http://localhost:8000/simulate',
    json={'tax_amount': 35}
)
print(response.json())
```

---

## Interactive Documentation

Swagger UI: `http://localhost:8000/docs`
ReDoc: `http://localhost:8000/redoc`

---

## Calculation Details

### Freight Diversion Formula
```
Tax % of Cost = (tax_amount / 500) × 100
Quantity Change % = -0.4 × (Tax % / 100)
Trucks Diverted = 5200 × |Quantity Change %|
```

### PM2.5 Reduction Formula
```
PM2.5 Reduction = (Trucks Diverted / 1000) × 0.12 µg/m³
```

### Health Benefits Formula
```
Risk Reduction % = PM2.5 Reduction × 2.2%
Avoided Visits = 340 × Risk Reduction %
```

### CO₂ Equivalent
```
Annual CO₂ = Trucks Diverted × 85 kg × 250 business days
```

---

## Data Sources & References

- **PM2.5 Baseline**: NYC EPIQUERY database
- **Asthma Rates**: NYC Community Health Survey (UHF District 402)
- **Elasticity**: US Department of Transportation research
- **Pollution-Health**: EPA Integrated Science Assessments
- **Geographic Data**: NYC GIS open data
- **HVI**: NYC Climate Health Profile

---

**API Version**: 1.0.0  
**Last Updated**: January 2026  
**Status**: Production Ready
