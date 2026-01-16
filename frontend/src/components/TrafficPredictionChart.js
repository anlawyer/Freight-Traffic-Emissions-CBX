import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { motion } from 'framer-motion';

/**
 * Traffic Prediction Chart Component
 * Displays LSTM model predictions with confidence intervals
 */
const TrafficPredictionChart = ({ predictionData, scenario }) => {
  if (!predictionData || !predictionData.predicted_speeds) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        color: '#6b7280',
        fontSize: '14px'
      }}>
        No prediction data available. Run a prediction to see results.
      </div>
    );
  }

  // Prepare data for Recharts
  const chartData = predictionData.predicted_speeds.map((speed, index) => {
    const hour = Math.floor(index / 4);
    const minute = (index % 4) * 15;

    return {
      time: `+${hour}:${minute.toString().padStart(2, '0')}`,
      speed: speed,
      upperBound: predictionData.confidence_interval?.upper[index] || speed * 1.1,
      lowerBound: predictionData.confidence_interval?.lower[index] || speed * 0.9,
      index: index
    };
  });

  // Custom tooltip
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
            Time: {data.time}h
          </p>
          <p style={{ margin: '4px 0', fontSize: '12px', color: '#3b82f6' }}>
            Speed: <strong>{data.speed.toFixed(1)} mph</strong>
          </p>
          <p style={{ margin: '4px 0', fontSize: '11px', color: '#9ca3af' }}>
            Range: {data.lowerBound.toFixed(1)} - {data.upperBound.toFixed(1)} mph
          </p>
        </div>
      );
    }
    return null;
  };

  const scenarioColor = scenario === 'optimized_60mph' ? '#10b981' : '#3b82f6';
  const scenarioLabel = scenario === 'optimized_60mph' ? '60 mph Limit' : '50 mph Limit';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        width: '100%',
        height: '400px',
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
      }}
    >
      {/* Chart Header */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{
          margin: '0 0 8px 0',
          fontSize: '18px',
          fontWeight: '600',
          color: '#111827'
        }}>
          {predictionData.scenario_info?.title || `Traffic Speed Prediction - ${scenarioLabel}`}
        </h3>
        <p style={{
          margin: '0 0 8px 0',
          fontSize: '13px',
          color: '#6b7280'
        }}>
          {predictionData.scenario_info?.description || 'LSTM neural network prediction with 90% confidence interval'}
        </p>
        {predictionData.scenario_info?.key_insight && (
          <div style={{
            padding: '8px 12px',
            backgroundColor: scenario === 'optimized_60mph' ? '#d1fae5' : '#dbeafe',
            borderRadius: '6px',
            fontSize: '12px',
            color: scenario === 'optimized_60mph' ? '#065f46' : '#1e40af',
            fontWeight: '500'
          }}>
            💡 {predictionData.scenario_info.key_insight}
          </div>
        )}
      </div>

      {/* Responsive Chart */}
      <ResponsiveContainer width="100%" height="85%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorSpeed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={scenarioColor} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={scenarioColor} stopOpacity={0}/>
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

          <XAxis
            dataKey="time"
            tick={{ fontSize: 11, fill: '#6b7280' }}
            tickLine={{ stroke: '#d1d5db' }}
            axisLine={{ stroke: '#d1d5db' }}
            label={{ value: 'Hours Ahead', position: 'insideBottom', offset: -5, style: { fontSize: 12, fill: '#6b7280' } }}
          />

          <YAxis
            domain={[15, 70]}
            tick={{ fontSize: 11, fill: '#6b7280' }}
            tickLine={{ stroke: '#d1d5db' }}
            axisLine={{ stroke: '#d1d5db' }}
            label={{ value: 'Speed (mph)', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#6b7280' } }}
          />

          <Tooltip content={<CustomTooltip />} />

          <Legend
            wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
            iconType="line"
          />

          {/* Confidence interval area */}
          <Area
            type="monotone"
            dataKey="upperBound"
            stroke="none"
            fill={scenarioColor}
            fillOpacity={0.1}
            name="Upper Bound"
          />

          <Area
            type="monotone"
            dataKey="lowerBound"
            stroke="none"
            fill={scenarioColor}
            fillOpacity={0.1}
            name="Lower Bound"
          />

          {/* Main prediction line */}
          <Line
            type="monotone"
            dataKey="speed"
            stroke={scenarioColor}
            strokeWidth={2.5}
            dot={false}
            fill="url(#colorSpeed)"
            name="Predicted Speed"
            animationDuration={1500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

export default TrafficPredictionChart;
