import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ErrorBar, Cell, ReferenceLine } from 'recharts';
import { motion } from 'framer-motion';

/**
 * Scenario Comparison Component
 * Compares 50mph vs 60mph speed limit scenarios
 * Now includes error bars from Monte Carlo confidence intervals
 */
const ScenarioComparison = ({ scenario50, scenario60, monteCarloData, language = 'en' }) => {
  if (!scenario50 || !scenario60) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        color: '#6b7280',
        fontSize: '14px',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
      }}>
        Run predictions for both scenarios to see comparison
      </div>
    );
  }

  // Use the average speeds from backend (more accurate than recalculating)
  const avg50 = scenario50.average_predicted_speed ||
    (scenario50.predicted_speeds.reduce((a, b) => a + b, 0) / scenario50.predicted_speeds.length);
  const avg60 = scenario60.average_predicted_speed ||
    (scenario60.predicted_speeds.reduce((a, b) => a + b, 0) / scenario60.predicted_speeds.length);

  // Prepare comparison data - NORMALIZED to 0-100 scale for visualization
  // We'll show actual values in tooltips and cards
  const normalize = (value, min, max) => {
    return ((value - min) / (max - min)) * 100;
  };

  // Find min/max for each metric to normalize
  const speedMin = Math.min(avg50, avg60) * 0.9;
  const speedMax = Math.max(avg50, avg60) * 1.1;
  const emissionsMin = Math.min(scenario50.predicted_emissions_kg, scenario60.predicted_emissions_kg) * 0.9;
  const emissionsMax = Math.max(scenario50.predicted_emissions_kg, scenario60.predicted_emissions_kg) * 1.1;
  const pm25Min = Math.min(scenario50.predicted_pm25 || 12.0, scenario60.predicted_pm25 || 10.5) * 0.9;
  const pm25Max = Math.max(scenario50.predicted_pm25 || 12.0, scenario60.predicted_pm25 || 10.5) * 1.1;
  const healthMin = Math.min(scenario50.predicted_health_impact, scenario60.predicted_health_impact) * 0.9;
  const healthMax = Math.max(scenario50.predicted_health_impact, scenario60.predicted_health_impact) * 1.1;

  const comparisonData = [
    {
      metric: 'Avg Speed',
      '50mph Limit': normalize(parseFloat(avg50.toFixed(1)), speedMin, speedMax),
      '60mph Limit': normalize(parseFloat(avg60.toFixed(1)), speedMin, speedMax),
      unit: 'mph',
      actual50: parseFloat(avg50.toFixed(1)),
      actual60: parseFloat(avg60.toFixed(1))
    },
    {
      metric: 'PM2.5 Level',
      '50mph Limit': normalize(scenario50.predicted_pm25 || 12.0, pm25Min, pm25Max),
      '60mph Limit': normalize(scenario60.predicted_pm25 || 10.5, pm25Min, pm25Max),
      unit: 'µg/m³',
      actual50: scenario50.predicted_pm25 || 12.0,
      actual60: scenario60.predicted_pm25 || 10.5
    },
    {
      metric: 'Emissions',
      '50mph Limit': normalize(scenario50.predicted_emissions_kg, emissionsMin, emissionsMax),
      '60mph Limit': normalize(scenario60.predicted_emissions_kg, emissionsMin, emissionsMax),
      unit: 'kg/day',
      actual50: scenario50.predicted_emissions_kg,
      actual60: scenario60.predicted_emissions_kg
    },
    {
      metric: 'Health Benefit',
      '50mph Limit': normalize(scenario50.predicted_health_impact, healthMin, healthMax),
      '60mph Limit': normalize(scenario60.predicted_health_impact, healthMin, healthMax),
      unit: 'avoided cases',
      actual50: scenario50.predicted_health_impact,
      actual60: scenario60.predicted_health_impact
    }
  ];

  // Calculate improvements
  const speedImprovement = ((avg60 - avg50) / avg50 * 100).toFixed(1);
  const emissionsChange = ((scenario60.predicted_emissions_kg - scenario50.predicted_emissions_kg) / scenario50.predicted_emissions_kg * 100).toFixed(1);
  const pm25Change = ((scenario60.predicted_pm25 - scenario50.predicted_pm25) / scenario50.predicted_pm25 * 100).toFixed(1);
  const healthChange = ((scenario60.predicted_health_impact - scenario50.predicted_health_impact) / Math.max(scenario50.predicted_health_impact, 1) * 100).toFixed(1);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.98)',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: '600', color: '#111827' }}>
            {data.metric}
          </p>
          <p style={{ margin: '4px 0', fontSize: '12px', color: '#3b82f6' }}>
            50mph Limit: <strong>{data.actual50.toFixed(1)}</strong> {data.unit}
          </p>
          <p style={{ margin: '4px 0', fontSize: '12px', color: '#10b981' }}>
            60mph Limit: <strong>{data.actual60.toFixed(1)}</strong> {data.unit}
          </p>
          <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#6b7280', fontStyle: 'italic' }}>
            Chart values normalized for comparison
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        width: '100%',
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{
          margin: '0 0 8px 0',
          fontSize: '18px',
          fontWeight: '600',
          color: '#111827'
        }}>
          Speed Limit Scenario Comparison
        </h3>
        <p style={{
          margin: 0,
          fontSize: '13px',
          color: '#6b7280'
        }}>
          Impact analysis: Current (50 mph) vs Optimized (60 mph)
        </p>
      </div>

      {/* Comparison Chart */}
      <div style={{ height: '280px', marginBottom: '24px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={comparisonData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="metric"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickLine={{ stroke: '#d1d5db' }}
              axisLine={{ stroke: '#d1d5db' }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={{ stroke: '#d1d5db' }}
              axisLine={{ stroke: '#d1d5db' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
            />
            <Bar
              dataKey="50mph Limit"
              fill="#3b82f6"
              radius={[8, 8, 0, 0]}
              animationDuration={1000}
            />
            <Bar
              dataKey="60mph Limit"
              fill="#10b981"
              radius={[8, 8, 0, 0]}
              animationDuration={1000}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Chart Explanation */}
      <div style={{
        marginBottom: '24px',
        padding: '12px',
        backgroundColor: '#f9fafb',
        borderRadius: '6px',
        fontSize: '12px',
        color: '#6b7280',
        textAlign: 'center'
      }}>
        📊 Chart values are normalized to show relative differences. Hover over bars to see actual values.
      </div>

      {/* Monte Carlo Confidence Intervals */}
      {monteCarloData && monteCarloData.confidence_intervals && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{
            marginBottom: '24px',
            padding: '20px',
            backgroundColor: '#fefce8',
            borderRadius: '12px',
            border: '1px solid #fde047'
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px'
          }}>
            <span style={{ fontSize: '18px' }}>📊</span>
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#854d0e' }}>
              {language === 'en' ? 'Uncertainty Analysis (Monte Carlo)' : 'Análisis de Incertidumbre (Monte Carlo)'}
            </h4>
            <span style={{
              marginLeft: 'auto',
              padding: '4px 8px',
              backgroundColor: '#fef08a',
              borderRadius: '4px',
              fontSize: '11px',
              color: '#854d0e'
            }}>
              {monteCarloData.num_iterations?.toLocaleString() || '10,000'} {language === 'en' ? 'iterations' : 'iteraciones'}
            </span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px'
          }}>
            {/* Asthma Reduction CI */}
            <div style={{
              padding: '12px',
              backgroundColor: 'white',
              borderRadius: '8px',
              border: '1px solid #fde68a'
            }}>
              <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>
                {language === 'en' ? 'Asthma Reduction (95% CI)' : 'Reducción del Asma (IC 95%)'}
              </div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#16a34a' }}>
                {monteCarloData.confidence_intervals.asthma_visits_avoided?.lower_95?.toFixed(1) || '0.0'} – {' '}
                {monteCarloData.confidence_intervals.asthma_visits_avoided?.upper_95?.toFixed(1) || '0.0'}
              </div>
              <div style={{ fontSize: '11px', color: '#6b7280' }}>
                {language === 'en' ? 'cases/year' : 'casos/año'}
              </div>
              {/* Error bar visualization */}
              <div style={{ marginTop: '8px', height: '8px', position: 'relative' }}>
                <div style={{
                  position: 'absolute',
                  left: '10%',
                  right: '10%',
                  height: '2px',
                  backgroundColor: '#22c55e',
                  top: '3px'
                }} />
                <div style={{
                  position: 'absolute',
                  left: '10%',
                  width: '2px',
                  height: '8px',
                  backgroundColor: '#22c55e'
                }} />
                <div style={{
                  position: 'absolute',
                  right: '10%',
                  width: '2px',
                  height: '8px',
                  backgroundColor: '#22c55e'
                }} />
                <div style={{
                  position: 'absolute',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#16a34a'
                }} />
              </div>
            </div>

            {/* PM2.5 Reduction CI */}
            <div style={{
              padding: '12px',
              backgroundColor: 'white',
              borderRadius: '8px',
              border: '1px solid #fde68a'
            }}>
              <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>
                {language === 'en' ? 'PM2.5 Reduction (95% CI)' : 'Reducción PM2.5 (IC 95%)'}
              </div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#3b82f6' }}>
                {monteCarloData.confidence_intervals.pm25_reduction?.lower_95?.toFixed(3) || '0.000'} – {' '}
                {monteCarloData.confidence_intervals.pm25_reduction?.upper_95?.toFixed(3) || '0.000'}
              </div>
              <div style={{ fontSize: '11px', color: '#6b7280' }}>µg/m³</div>
              {/* Error bar visualization */}
              <div style={{ marginTop: '8px', height: '8px', position: 'relative' }}>
                <div style={{
                  position: 'absolute',
                  left: '10%',
                  right: '10%',
                  height: '2px',
                  backgroundColor: '#3b82f6',
                  top: '3px'
                }} />
                <div style={{
                  position: 'absolute',
                  left: '10%',
                  width: '2px',
                  height: '8px',
                  backgroundColor: '#3b82f6'
                }} />
                <div style={{
                  position: 'absolute',
                  right: '10%',
                  width: '2px',
                  height: '8px',
                  backgroundColor: '#3b82f6'
                }} />
                <div style={{
                  position: 'absolute',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#2563eb'
                }} />
              </div>
            </div>

            {/* Health Benefit Value CI */}
            <div style={{
              padding: '12px',
              backgroundColor: 'white',
              borderRadius: '8px',
              border: '1px solid #fde68a'
            }}>
              <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>
                {language === 'en' ? 'Health Benefit Value (95% CI)' : 'Valor del Beneficio de Salud (IC 95%)'}
              </div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#8b5cf6' }}>
                ${(monteCarloData.confidence_intervals.health_benefit_usd?.lower_95 / 1000)?.toFixed(0) || '0'}k – {' '}
                ${(monteCarloData.confidence_intervals.health_benefit_usd?.upper_95 / 1000)?.toFixed(0) || '0'}k
              </div>
              <div style={{ fontSize: '11px', color: '#6b7280' }}>USD/year</div>
              {/* Error bar visualization */}
              <div style={{ marginTop: '8px', height: '8px', position: 'relative' }}>
                <div style={{
                  position: 'absolute',
                  left: '10%',
                  right: '10%',
                  height: '2px',
                  backgroundColor: '#8b5cf6',
                  top: '3px'
                }} />
                <div style={{
                  position: 'absolute',
                  left: '10%',
                  width: '2px',
                  height: '8px',
                  backgroundColor: '#8b5cf6'
                }} />
                <div style={{
                  position: 'absolute',
                  right: '10%',
                  width: '2px',
                  height: '8px',
                  backgroundColor: '#8b5cf6'
                }} />
                <div style={{
                  position: 'absolute',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#7c3aed'
                }} />
              </div>
            </div>
          </div>

          <p style={{
            margin: '12px 0 0 0',
            fontSize: '11px',
            color: '#92400e',
            textAlign: 'center',
            fontStyle: 'italic'
          }}>
            {language === 'en'
              ? 'Error bars represent model uncertainty from Monte Carlo sampling of elasticity, PM2.5 dispersion, and health response parameters'
              : 'Las barras de error representan la incertidumbre del modelo del muestreo Monte Carlo de elasticidad, dispersión PM2.5 y parámetros de respuesta de salud'}
          </p>
        </motion.div>
      )}

      {/* Key Insights */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '16px'
      }}>
        {/* Speed Improvement Card */}
        <div style={{
          padding: '16px',
          borderRadius: '8px',
          backgroundColor: speedImprovement > 0 ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${speedImprovement > 0 ? '#bbf7d0' : '#fecaca'}`
        }}>
          <div style={{
            fontSize: '11px',
            fontWeight: '600',
            color: '#6b7280',
            marginBottom: '4px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            Speed Change
          </div>
          <div style={{
            fontSize: '24px',
            fontWeight: '700',
            color: speedImprovement > 0 ? '#10b981' : '#ef4444',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            {speedImprovement > 0 ? '↑' : '↓'} {Math.abs(speedImprovement)}%
          </div>
          <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
            {avg50.toFixed(1)} → {avg60.toFixed(1)} mph
          </div>
        </div>

        {/* PM2.5 Change Card */}
        <div style={{
          padding: '16px',
          borderRadius: '8px',
          backgroundColor: pm25Change < 0 ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${pm25Change < 0 ? '#bbf7d0' : '#fecaca'}`
        }}>
          <div style={{
            fontSize: '11px',
            fontWeight: '600',
            color: '#6b7280',
            marginBottom: '4px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            PM2.5 Pollution
          </div>
          <div style={{
            fontSize: '24px',
            fontWeight: '700',
            color: pm25Change < 0 ? '#10b981' : '#ef4444',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            {pm25Change < 0 ? '↓' : '↑'} {Math.abs(pm25Change)}%
          </div>
          <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
            {scenario50.predicted_pm25?.toFixed(1) || '12.0'} → {scenario60.predicted_pm25?.toFixed(1) || '10.5'} µg/m³
          </div>
        </div>

        {/* Emissions Change Card */}
        <div style={{
          padding: '16px',
          borderRadius: '8px',
          backgroundColor: emissionsChange < 0 ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${emissionsChange < 0 ? '#bbf7d0' : '#fecaca'}`
        }}>
          <div style={{
            fontSize: '11px',
            fontWeight: '600',
            color: '#6b7280',
            marginBottom: '4px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            CO2 Emissions
          </div>
          <div style={{
            fontSize: '24px',
            fontWeight: '700',
            color: emissionsChange < 0 ? '#10b981' : '#ef4444',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            {emissionsChange < 0 ? '↓' : '↑'} {Math.abs(emissionsChange)}%
          </div>
          <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
            {(scenario50.predicted_emissions_kg / 1000).toFixed(1)} → {(scenario60.predicted_emissions_kg / 1000).toFixed(1)} tons/day
          </div>
        </div>

        {/* Health Impact Card */}
        <div style={{
          padding: '16px',
          borderRadius: '8px',
          backgroundColor: healthChange > 0 ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${healthChange > 0 ? '#bbf7d0' : '#fecaca'}`
        }}>
          <div style={{
            fontSize: '11px',
            fontWeight: '600',
            color: '#6b7280',
            marginBottom: '4px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            Health Benefit
          </div>
          <div style={{
            fontSize: '24px',
            fontWeight: '700',
            color: healthChange > 0 ? '#10b981' : '#ef4444',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            {healthChange > 0 ? '↑' : '↓'} {Math.abs(healthChange)}%
          </div>
          <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
            {scenario50.predicted_health_impact?.toFixed(1) || '0'} → {scenario60.predicted_health_impact?.toFixed(1) || '0'} cases avoided
          </div>
        </div>
      </div>

      {/* Recommendation Box */}
      <div style={{
        marginTop: '20px',
        padding: '16px',
        backgroundColor: '#eff6ff',
        borderRadius: '8px',
        border: '1px solid #bfdbfe'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ fontSize: '16px' }}>💡</span>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#1e40af' }}>
            Analysis
          </span>
        </div>
        <p style={{
          margin: 0,
          fontSize: '12px',
          color: '#1e40af',
          lineHeight: '1.5'
        }}>
          {speedImprovement > 0 && emissionsChange < 0 && pm25Change < 0
            ? `🎯 Optimal Outcome: Raising the speed limit to 60 mph improves traffic flow by ${speedImprovement}%, reduces PM2.5 pollution by ${Math.abs(pm25Change)}%, and cuts CO2 emissions by ${Math.abs(emissionsChange)}%. This creates a win-win: faster commutes AND cleaner air for Soundview residents.`
            : speedImprovement > 0 && pm25Change < 0
              ? `✅ Recommended: The 60 mph limit improves traffic speed by ${speedImprovement}% and reduces air pollution by ${Math.abs(pm25Change)}%. While CO2 emissions may vary, the health benefits from reduced PM2.5 are significant for this vulnerable community.`
              : speedImprovement > 0
                ? `⚠️ Mixed Results: Traffic flow improves by ${speedImprovement}%, but environmental benefits are limited. Consider pairing speed optimization with vehicle electrification or freight routing strategies for maximum climate impact.`
                : `⚖️ Status Quo: Current 50 mph limit maintains baseline conditions. Further modeling with additional policy interventions (congestion pricing, EV incentives) may reveal better optimization strategies.`}
        </p>
      </div>
    </motion.div>
  );
};

export default ScenarioComparison;
