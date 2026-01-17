import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, Popup, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './App.css';

// Import new ML visualization components
import TrafficPredictionChart from './components/TrafficPredictionChart';
import NeuralNetworkViz from './components/NeuralNetworkViz';
import ScenarioComparison from './components/ScenarioComparison';
import SystemStateTimeline from './components/SystemStateTimeline';
import ZoneDetailPanel from './components/ZoneDetailPanel';

// ==================== INTERNATIONALIZATION ====================
const translations = {
  en: {
    title: "Urban Futures LEAP",
    subtitle: "Freight Tax Impact on Air Quality & Public Health",
    location: "Soundview, The Bronx (UHF District 402)",
    sidebar: {
      title: "Policy Simulator",
      taxLabel: "Freight Tax Amount",
      taxHint: "Drag to adjust tax per truck crossing ($0 - $100)",
      assumptions: "Model Assumptions",
      language: "Language / Idioma"
    },
    cards: {
      trucksDiverted: "Trucks Diverted",
      trucksPerDay: "trucks/day",
      pm25Saved: "PM2.5 Reduced",
      kg: "kg/year",
      asthmaAttacks: "Health Outcomes Improved",
      perYear: "per year",
      co2Reduction: "CO₂ Equivalent Saved",
      tons: "kg/year"
    },
    map: {
      title: "Heat Vulnerability Index (HVI) by Zone",
      hvi: "Heat Vulnerability Index",
      zipCode: "ZIP Code",
      baselinePM25: "Baseline PM2.5"
    },
    assumptions_section: {
      title: "Model Assumptions & Uncertainties",
      close: "Close",
      elasticity: "Elasticity of Freight Demand",
      elasticityValue: "-0.4 (inelastic)",
      pm25Impact: "PM2.5 Impact per 1,000 Trucks",
      pm25Value: "0.12 µg/m³ reduction",
      asthmaFunction: "Pediatric Asthma Concentration-Response",
      asthmaValue: "2.2% risk reduction per µg/m³",
      exclusions: "Model Exclusions",
      exclusionsList: [
        "Truck routing through residential streets",
        "Indirect economic/social effects",
        "Cumulative impacts with other pollutants (NO₂, SO₂)",
        "Behavioral responses to tax",
        "Equity analysis of tax burden"
      ],
      dataSource: "Data Sources: NYC EPIQUERY, NYC Community Health Survey, EPA Air Quality",
      disclaimer: "⚠️ This model is designed for planning discussions. Real-world outcomes depend on implementation details, community engagement, and policy design."
    },
    footer: "A climate justice tool for Soundview. Supporting equitable transition strategies."
  },
  es: {
    title: "Futuros Urbanos LEAP",
    subtitle: "Impacto de Impuesto a Fletes en Calidad del Aire y Salud Pública",
    location: "Soundview, El Bronx (Distrito UHF 402)",
    sidebar: {
      title: "Simulador de Política",
      taxLabel: "Impuesto a Fletes",
      taxHint: "Arrastra para ajustar el impuesto por camión ($0 - $100)",
      assumptions: "Supuestos del Modelo",
      language: "Language / Idioma"
    },
    cards: {
      trucksDiverted: "Camiones Desviados",
      trucksPerDay: "camiones/día",
      pm25Saved: "PM2.5 Reducido",
      kg: "kg/año",
      asthmaAttacks: "Mejora de Resultados de Salud",
      perYear: "por año",
      co2Reduction: "Equivalente de CO₂ Ahorrado",
      tons: "kg/año"
    },
    map: {
      title: "Índice de Vulnerabilidad de Calor (HVI) por Zona",
      hvi: "Índice de Vulnerabilidad de Calor",
      zipCode: "Código Postal",
      baselinePM25: "PM2.5 Base"
    },
    assumptions_section: {
      title: "Supuestos del Modelo e Incertidumbres",
      close: "Cerrar",
      elasticity: "Elasticidad de la Demanda de Fletes",
      elasticityValue: "-0.4 (inelástico)",
      pm25Impact: "Impacto de PM2.5 por 1,000 Camiones",
      pm25Value: "reducción de 0.12 µg/m³",
      asthmaFunction: "Función de Concentración-Respuesta del Asma Pediátrico",
      asthmaValue: "reducción de riesgo del 2.2% por µg/m³",
      exclusions: "Exclusiones del Modelo",
      exclusionsList: [
        "Rutas de camiones a través de calles residenciales",
        "Efectos económicos/sociales indirectos",
        "Impactos acumulativos con otros contaminantes (NO₂, SO₂)",
        "Respuestas de comportamiento al impuesto",
        "Análisis de equidad de la distribución de la carga fiscal"
      ],
      dataSource: "Fuentes de Datos: NYC EPIQUERY, Encuesta de Salud Comunitaria de NYC, Calidad del Aire de la EPA",
      disclaimer: "⚠️ Este modelo está diseñado para discusiones de planificación. Los resultados del mundo real dependen de detalles de implementación, participación comunitaria y diseño de política."
    },
    footer: "Una herramienta de justicia climática para Soundview. Apoyando estrategias de transición equitativa."
  }
};

// ==================== CONSTANTS ====================
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const SOUNDVIEW_CENTER = [40.824, -73.875];
const MAX_TAX = 100;

// ==================== MAIN APP COMPONENT ====================
function App() {
  // State Management
  const [taxAmount, setTaxAmount] = useState(44);
  const [simulationData, setSimulationData] = useState(null);
  const [baselineData, setBaselineData] = useState(null);
  const [geojsonData, setGeojsonData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState('en');
  const [showAssumptions, setShowAssumptions] = useState(false);

  // New ML Prediction State
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'prediction', 'comparison', 'model'
  const [prediction50, setPrediction50] = useState(null);
  const [prediction60, setPrediction60] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);
  const [trafficData, setTrafficData] = useState({});

  // Advanced Analytics State
  const [hmmData, setHmmData] = useState(null);
  const [monteCarloData, setMonteCarloData] = useState(null);
  const [technicalDocs, setTechnicalDocs] = useState(null);
  const [selectedZone, setSelectedZone] = useState(null);
  const [showZonePanel, setShowZonePanel] = useState(false);

  // Helper function to determine congestion level based on speed
  const getCongestionLevel = (speed) => {
    if (speed >= 0) {
      if (speed < 25) return { level: 'Severe', color: '#dc2626', bgColor: '#fecaca' }; // Red
      if (speed < 45) return { level: 'High', color: '#ea580c', bgColor: '#fed7aa' };   // Orange
      if (speed < 55) return { level: 'Moderate', color: '#d97706', bgColor: '#fde68a' }; // Yellow
      return { level: 'Optimal', color: '#16a34a', bgColor: '#d1fae5' }; // Green
    }
    return { level: 'Unknown', color: '#6b7280', bgColor: '#f3f4f6' }; // Gray for unknown/loading
  };

  const [predictionLoading, setPredictionLoading] = useState(false);

  const t = translations[language];

  // Fetch baseline data and ML model info on mount
  useEffect(() => {
    fetchBaseline();
    fetchGeojson();
    fetchModelInfo();
    fetchTrafficData();
    fetchTechnicalDocs();
  }, []);

  // Simulate on tax amount change
  useEffect(() => {
    simulate(taxAmount);
  }, [taxAmount]);

  // API Calls
  const fetchBaseline = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/baseline`);
      if (response.ok) {
        const data = await response.json();
        setBaselineData(data);
      }
    } catch (error) {
      console.error('Error fetching baseline:', error);
    }
  };

  const fetchGeojson = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/geojson/soundview`);
      if (response.ok) {
        const data = await response.json();
        setGeojsonData(data);
      }
    } catch (error) {
      console.error('Error fetching GeoJSON:', error);
    }
  };

  const simulate = async (tax) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tax_amount: tax })
      });
      if (response.ok) {
        const data = await response.json();
        console.log('API Response:', data);
        setSimulationData(data);
      } else {
        console.error('Response not ok:', response.status);
      }
    } catch (error) {
      console.error('Error in simulation:', error);
    } finally {
      setLoading(false);
    }
  };

  // New ML API Calls
  const fetchTrafficData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/traffic/current`);
      if (response.ok) {
        const data = await response.json();
        setTrafficData(data);
      }
    } catch (error) {
      console.error('Error fetching traffic data:', error);
    }
  };

  const fetchModelInfo = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/model/info`);
      if (response.ok) {
        const data = await response.json();
        setModelInfo(data);
      }
    } catch (error) {
      console.error('Error fetching model info:', error);
    }
  };

  const predictTraffic = async (scenario) => {
    setPredictionLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/traffic/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          speed_limit_scenario: scenario,
          prediction_hours: 24
        })
      });
      if (response.ok) {
        const data = await response.json();
        if (scenario === 'current_50mph') {
          setPrediction50(data);
        } else {
          setPrediction60(data);
        }
        return data;
      }
    } catch (error) {
      console.error(`Error predicting ${scenario}:`, error);
    } finally {
      setPredictionLoading(false);
    }
  };

  const runBothPredictions = async () => {
    setPredictionLoading(true);
    try {
      await Promise.all([
        predictTraffic('current_50mph'),
        predictTraffic('optimized_60mph')
      ]);
    } finally {
      setPredictionLoading(false);
    }
  };

  // Advanced Analytics API Calls
  const fetchTechnicalDocs = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/analytics/technical-docs`);
      if (response.ok) {
        const data = await response.json();
        setTechnicalDocs(data);
      }
    } catch (error) {
      console.error('Error fetching technical docs:', error);
    }
  };

  const fetchMonteCarlo = async (tax = taxAmount) => {
    try {
      const response = await fetch(`${API_BASE_URL}/analytics/monte-carlo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tax_amount: tax,
          num_iterations: 10000
        })
      });
      if (response.ok) {
        const data = await response.json();
        setMonteCarloData(data);
        return data;
      }
    } catch (error) {
      console.error('Error in Monte Carlo simulation:', error);
    }
  };

  const fetchHMMPrediction = async (speeds = null) => {
    try {
      const response = await fetch(`${API_BASE_URL}/analytics/hmm/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          predicted_speeds: speeds,
          prediction_hours: 24,
          baseline_pm25: 13.2
        })
      });
      if (response.ok) {
        const data = await response.json();
        setHmmData(data);
        return data;
      }
    } catch (error) {
      console.error('Error in HMM prediction:', error);
    }
  };

  // Zone click handler for interactive map
  const handleZoneClick = (zone) => {
    setSelectedZone(zone);
    setShowZonePanel(true);
    // Trigger Monte Carlo if not already run
    if (!monteCarloData) {
      fetchMonteCarlo(taxAmount);
    }
  };

  // Run full prediction including HMM and Monte Carlo
  const runFullPrediction = async () => {
    setPredictionLoading(true);
    console.log('🚀 Starting Full Analysis...');

    try {
      // Step 1: Run both traffic predictions
      console.log('📊 Running traffic predictions...');
      const [response50, response60] = await Promise.all([
        fetch(`${API_BASE_URL}/traffic/predict`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ speed_limit_scenario: 'current_50mph', prediction_hours: 24 })
        }),
        fetch(`${API_BASE_URL}/traffic/predict`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ speed_limit_scenario: 'optimized_60mph', prediction_hours: 24 })
        })
      ]);

      let pred50Data = null;
      let pred60Data = null;

      if (response50.ok) {
        pred50Data = await response50.json();
        setPrediction50(pred50Data);
        console.log('✅ 50mph prediction complete');
      }

      if (response60.ok) {
        pred60Data = await response60.json();
        setPrediction60(pred60Data);
        console.log('✅ 60mph prediction complete');
      }

      // Step 2: Run HMM with predicted speeds
      console.log('🌡️ Running HMM prediction...');
      if (pred50Data && pred50Data.predicted_speeds && pred50Data.predicted_speeds.length > 0) {
        const hmmResponse = await fetch(`${API_BASE_URL}/analytics/hmm/predict`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            predicted_speeds: pred50Data.predicted_speeds,
            prediction_hours: 24,
            baseline_pm25: 13.2
          })
        });

        if (hmmResponse.ok) {
          const hmmResult = await hmmResponse.json();
          setHmmData(hmmResult);
          console.log('✅ HMM prediction complete:', hmmResult.state_sequence?.slice(0, 5));
        } else {
          console.error('❌ HMM prediction failed:', hmmResponse.status);
        }
      } else {
        console.warn('⚠️ No predicted speeds available for HMM');
      }

      // Step 3: Run Monte Carlo simulation
      console.log('🎲 Running Monte Carlo simulation...');
      const mcResponse = await fetch(`${API_BASE_URL}/analytics/monte-carlo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tax_amount: taxAmount,
          num_iterations: 10000
        })
      });

      if (mcResponse.ok) {
        const mcResult = await mcResponse.json();
        setMonteCarloData(mcResult);
        console.log('✅ Monte Carlo complete:', mcResult.statistics?.asthma_visits_avoided?.mean);
      } else {
        console.error('❌ Monte Carlo failed:', mcResponse.status);
      }

      console.log('🎉 Full Analysis Complete!');

    } catch (error) {
      console.error('❌ Error in full analysis:', error);
    } finally {
      setPredictionLoading(false);
    }
  };

  // Dynamic styling for map based on PM2.5 improvement
  const mapOpacity = simulationData
    ? 0.7 + (simulationData.pm25_reduction_ug_m3 / 5) * 0.3
    : 0.8;

  // Handle GeoJSON layer styling
  const onEachFeature = (feature, layer) => {
    const props = feature.properties;
    const popupContent = `
      <div style="font-family: Arial, sans-serif; width: 200px;">
        <h3 style="margin: 0 0 8px 0; color: #1f2937;">${props.area_name}</h3>
        <p style="margin: 4px 0;"><strong>${t.map.zipCode}:</strong> ${props.zip_code}</p>
        <p style="margin: 4px 0;"><strong>${t.map.hvi}:</strong> ${props.hvi} / 5</p>
        <p style="margin: 4px 0;"><strong>${t.map.baselinePM25}:</strong> ${props.baseline_pm25} µg/m³</p>
        <p style="margin: 8px 0 0 0; font-size: 12px; color: #666;">
          ${language === 'en'
        ? '⚠️ Heat Vulnerability Index 5 = Highest Risk'
        : '⚠️ Índice 5 = Mayor Riesgo'}
        </p>
        <p style="margin: 8px 0 0 0; font-size: 11px; color: #3b82f6;">
          ${language === 'en'
        ? '👆 Click for detailed analysis'
        : '👆 Haga clic para análisis detallado'}
        </p>
      </div>
    `;
    layer.bindPopup(popupContent);

    // Add click handler for zone details panel
    layer.on('click', () => {
      handleZoneClick({
        area_name: props.area_name,
        zip_code: props.zip_code,
        hvi: props.hvi,
        baseline_pm25: props.baseline_pm25
      });
    });
  };

  // ==================== RENDER ====================
  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div>
            <h1 className="title">{t.title}</h1>
            <p className="subtitle">{t.subtitle}</p>
            <p className="location">📍 {t.location}</p>
          </div>
          <div className="language-toggle">
            <button
              onClick={() => setLanguage('en')}
              className={`lang-btn ${language === 'en' ? 'active' : ''}`}
            >
              EN
            </button>
            <span className="lang-separator">/</span>
            <button
              onClick={() => setLanguage('es')}
              className={`lang-btn ${language === 'es' ? 'active' : ''}`}
            >
              ES
            </button>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '0 32px'
      }}>
        <div style={{
          display: 'flex',
          gap: '8px',
          maxWidth: '1400px',
          margin: '0 auto'
        }}>
          {[
            { id: 'overview', label: '📊 Overview', icon: '📊' },
            { id: 'prediction', label: '🧠 ML Prediction', icon: '🧠' },
            { id: 'comparison', label: '⚖️ Comparison', icon: '⚖️' },
            { id: 'model', label: '🔬 Model Info', icon: '🔬' },
            { id: 'scroll_hack', label: '📜 Scroll Hack', icon: '📜' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 20px',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
                backgroundColor: 'transparent',
                color: activeTab === tab.id ? '#3b82f6' : '#6b7280',
                fontSize: '14px',
                fontWeight: activeTab === tab.id ? '600' : '500',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Overview Tab - Original Content */}
        {activeTab === 'overview' && (
          <>
            {/* Sidebar */}
            <aside className="sidebar">
              <div className="sidebar-card">
                <h2>{t.sidebar.title}</h2>

                {/* Tax Slider */}
                <div className="slider-container">
                  <label className="slider-label">{t.sidebar.taxLabel}</label>
                  <div className="slider-value-display">${taxAmount}</div>
                  <input
                    type="range"
                    min="0"
                    max={MAX_TAX}
                    value={taxAmount}
                    onChange={(e) => setTaxAmount(parseFloat(e.target.value))}
                    className="slider"
                  />
                  <p className="slider-hint">{t.sidebar.taxHint}</p>
                </div>

                {/* Metric Cards */}
                {simulationData && (
                  <div className="metrics-cards">
                    {/* Trucks Diverted Card */}
                    <div className="metric-card">
                      <div className="metric-icon trucks">🚚</div>
                      <div className="metric-content">
                        <p className="metric-label">{t.cards.trucksDiverted}</p>
                        <p className="metric-value">{simulationData.trucks_diverted?.toLocaleString() || 0}</p>
                        <p className="metric-subtext">{t.cards.trucksPerDay}</p>
                        <p className="metric-percentage">({simulationData.trucks_diverted_percentage?.toFixed(1) || 0}%)</p>
                      </div>
                    </div>

                    {/* PM2.5 Reduction Card */}
                    <div className="metric-card">
                      <div className="metric-icon pm25">💨</div>
                      <div className="metric-content">
                        <p className="metric-label">{t.cards.pm25Saved}</p>
                        <p className="metric-value">{simulationData.pm25_reduction_kg?.toLocaleString() || 0}</p>
                        <p className="metric-subtext">{t.cards.kg}</p>
                        <p className="metric-detail">
                          {simulationData.pm25_reduction_ug_m3?.toFixed(3) || 0} µg/m³
                        </p>
                      </div>
                    </div>

                    {/* Health Benefits Value Card */}
                    <div className="metric-card">
                      <div className="metric-icon health">💚</div>
                      <div className="metric-content">
                        <p className="metric-label">{t.cards.asthmaAttacks}</p>
                        <p className="metric-value">${(simulationData.health_benefit_value_usd || 0).toLocaleString()}</p>
                        <p className="metric-subtext">in health benefits</p>
                        <p className="metric-detail">
                          annual value of cleaner air
                        </p>
                      </div>
                    </div>

                    {/* CO2 Reduction Card */}
                    <div className="metric-card">
                      <div className="metric-icon co2">🌍</div>
                      <div className="metric-content">
                        <p className="metric-label">{t.cards.co2Reduction}</p>
                        <p className="metric-value">{((simulationData.co2_equivalent_reduction_kg || 0) / 1000).toFixed(0)}</p>
                        <p className="metric-subtext">metric tons/year</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Assumptions Button */}
                <button
                  onClick={() => setShowAssumptions(!showAssumptions)}
                  className="assumptions-btn"
                >
                  📋 {t.sidebar.assumptions}
                </button>

                {/* Assumptions Modal */}
                {showAssumptions && (
                  <div className="assumptions-modal">
                    <div className="assumptions-content">
                      <div className="assumptions-header">
                        <h3>{t.assumptions_section.title}</h3>
                        <button
                          onClick={() => setShowAssumptions(false)}
                          className="close-btn"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="assumptions-body">
                        <div className="assumption-item">
                          <h4>{t.assumptions_section.elasticity}</h4>
                          <p>{t.assumptions_section.elasticityValue}</p>
                        </div>

                        <div className="assumption-item">
                          <h4>{t.assumptions_section.pm25Impact}</h4>
                          <p>{t.assumptions_section.pm25Value}</p>
                        </div>

                        <div className="assumption-item">
                          <h4>{t.assumptions_section.asthmaFunction}</h4>
                          <p>{t.assumptions_section.asthmaValue}</p>
                        </div>

                        <div className="assumption-item">
                          <h4>{t.assumptions_section.exclusions}</h4>
                          <ul>
                            {t.assumptions_section.exclusionsList.map((item, idx) => (
                              <li key={idx}>{item}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="assumption-disclaimer">
                          {t.assumptions_section.disclaimer}
                        </div>

                        <p className="assumptions-footer">
                          {t.assumptions_section.dataSource}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </aside>

            {/* Map Section */}
            <section className="map-section">
              <h2 className="map-title">{t.map.title}</h2>

              <MapContainer
                center={SOUNDVIEW_CENTER}
                zoom={13}
                style={{
                  height: '100%',
                  width: '100%',
                  filter: `opacity(${mapOpacity})`
                }}
                className="leaflet-map"
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; OpenStreetMap contributors'
                />

                {/* GeoJSON Layers */}
                {geojsonData && (
                  <GeoJSON
                    data={geojsonData}
                    onEachFeature={onEachFeature}
                    style={() => ({
                      color: '#ef4444',
                      weight: 2,
                      opacity: 0.7,
                      fillOpacity: 0.3,
                      fillColor: '#fca5a5'
                    })}
                  />
                )}

                {/* Soundview Center Marker */}
                <CircleMarker
                  center={SOUNDVIEW_CENTER}
                  radius={8}
                  fillColor="#3b82f6"
                  color="#1e40af"
                  weight={2}
                  opacity={1}
                  fillOpacity={0.8}
                >
                  <Popup>
                    <div style={{ fontFamily: 'Arial, sans-serif' }}>
                      <h4>Soundview</h4>
                      <p>{language === 'en' ? 'Cross-Bronx Expressway' : 'Autopista Cross-Bronx'}</p>
                    </div>
                  </Popup>
                </CircleMarker>
              </MapContainer>

              {/* Map Legend */}
              <div className="map-legend">
                <div className="legend-item">
                  <div className="legend-color" style={{ backgroundColor: '#fca5a5' }}></div>
                  <span>{language === 'en' ? 'Soundview ZIP Codes' : 'Códigos Postales'}</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color" style={{ backgroundColor: '#3b82f6' }}></div>
                  <span>{language === 'en' ? 'Cross-Bronx Expressway' : 'Autopista'}</span>
                </div>
              </div>
            </section>
          </>
        )}

        {/* ML Prediction Tab */}
        {activeTab === 'prediction' && (
          <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '600', color: '#111827' }}>
                Traffic Flow Prediction
              </h2>
              <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#6b7280' }}>
                LSTM neural network predicts traffic speeds and emissions for the next 24 hours
              </p>

              {/* Current Traffic Status */}
              {trafficData && (
                <div style={{
                  display: 'flex',
                  gap: '16px',
                  marginBottom: '24px',
                  padding: '16px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>Current Speed:</span>
                    <strong style={{ fontSize: '18px', color: '#111827', marginLeft: '8px' }}>
                      {trafficData.latest_speed_mph} mph
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>Congestion:</span>
                    <span style={{
                      fontSize: '14px',
                      marginLeft: '8px',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontWeight: '500',
                      backgroundColor: getCongestionLevel(trafficData.latest_speed_mph).bgColor,
                      color: getCongestionLevel(trafficData.latest_speed_mph).color,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      {getCongestionLevel(trafficData.latest_speed_mph).level}
                      {getCongestionLevel(trafficData.latest_speed_mph).level === 'Severe' && ' 🚨'}
                      {getCongestionLevel(trafficData.latest_speed_mph).level === 'High' && ' ⚠️'}
                      {getCongestionLevel(trafficData.latest_speed_mph).level === 'Moderate' && ' ⚠️'}
                      {getCongestionLevel(trafficData.latest_speed_mph).level === 'Optimal' && ' ✅'}
                    </span>
                  </div>
                </div>
              )}

              {/* Prediction Controls */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => predictTraffic('current_50mph')}
                  disabled={predictionLoading}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: predictionLoading ? 'not-allowed' : 'pointer',
                    opacity: predictionLoading ? 0.6 : 1
                  }}
                >
                  Predict 50 mph Scenario
                </button>
                <button
                  onClick={() => predictTraffic('optimized_60mph')}
                  disabled={predictionLoading}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: predictionLoading ? 'not-allowed' : 'pointer',
                    opacity: predictionLoading ? 0.6 : 1
                  }}
                >
                  Predict 60 mph Scenario
                </button>
                <button
                  onClick={runFullPrediction}
                  disabled={predictionLoading}
                  style={{
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: predictionLoading ? 'not-allowed' : 'pointer',
                    opacity: predictionLoading ? 0.6 : 1,
                    boxShadow: '0 4px 6px -1px rgba(139, 92, 246, 0.3)'
                  }}
                >
                  🚀 Run Full Analysis (LSTM + HMM + Monte Carlo)
                </button>
              </div>

              {predictionLoading && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  <div style={{ fontSize: '32px', marginBottom: '16px' }}>🔄</div>
                  <p>Running LSTM prediction...</p>
                </div>
              )}
            </div>

            {/* Prediction Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
              {prediction50 && (
                <TrafficPredictionChart predictionData={prediction50} scenario="current_50mph" />
              )}
              {prediction60 && (
                <TrafficPredictionChart predictionData={prediction60} scenario="optimized_60mph" />
              )}
            </div>

            {/* HMM Environmental State Timeline */}
            {(hmmData || prediction50) && (
              <div style={{ marginBottom: '24px' }}>
                <SystemStateTimeline hmmData={hmmData} language={language} />
              </div>
            )}
          </div>
        )}

        {/* Comparison Tab */}
        {activeTab === 'comparison' && (
          <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
            <ScenarioComparison
              scenario50={prediction50}
              scenario60={prediction60}
              monteCarloData={monteCarloData}
              language={language}
            />
          </div>
        )}

        {/* Model Info Tab */}
        {activeTab === 'model' && (
          <div style={{ padding: '32px', maxWidth: '1000px', margin: '0 auto' }}>
            <NeuralNetworkViz
              modelInfo={modelInfo}
              technicalDocs={technicalDocs}
              language={language}
            />
          </div>
        )}

        {/* Scroll Hack Tab */}
        {activeTab === 'scroll_hack' && (
          <div style={{ width: '100%', height: 'calc(100vh - 180px)', border: 'none', overflow: 'auto' }}>
            <iframe
              src="/scroll_hack/index.html"
              title="Scroll Hack Map"
              style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
            />
          </div>
        )}
      </div>

      {/* Zone Detail Panel (Interactive Map Zone Click) */}
      <ZoneDetailPanel
        zone={selectedZone}
        monteCarloData={monteCarloData}
        taxAmount={taxAmount}
        isVisible={showZonePanel}
        onClose={() => setShowZonePanel(false)}
        language={language}
      />

      {/* Footer */}
      <footer className="footer">
        {t.footer}
      </footer>
    </div>
  );
}

export default App;
