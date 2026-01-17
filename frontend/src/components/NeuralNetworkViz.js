import React from 'react';
import { motion } from 'framer-motion';

// Default model architecture to use if none is provided
const DEFAULT_MODEL = {
  layers: [
    { type: 'input', units: 24, activation: 'tanh' },
    { type: 'lstm', units: 128, activation: 'tanh' },
    { type: 'dropout', rate: 0.2 },
    { type: 'dense', units: 64, activation: 'relu' },
    { type: 'output', units: 1, activation: 'linear' }
  ],
  optimizer: 'adam',
  loss: 'mse',
  metrics: ['mae'],
  total_params: 0
};

/**
 * Neural Network Architecture Visualization
 * Visual representation of the LSTM model structure
 */
const NeuralNetworkViz = ({ modelInfo }) => {
  // Use the provided model or fall back to default
  const model = modelInfo?.model?.layers ? modelInfo.model : DEFAULT_MODEL;
  const layers = model.layers || [];
  const totalParams = model.total_params || 0;

  // Define layer visualization properties
  const getLayerColor = (layerType) => {
    const type = layerType?.toLowerCase();
    switch (type) {
      case 'lstm':
        return { bg: '#3b82f6', text: '#ffffff' };  // Blue
      case 'dropout':
        return { bg: '#8b5cf6', text: '#ffffff' };  // Purple
      case 'dense':
        return { bg: '#10b981', text: '#ffffff' };  // Green
      case 'input':
        return { bg: '#f59e0b', text: '#ffffff' };  // Amber
      case 'output':
        return { bg: '#ef4444', text: '#ffffff' };  // Red
      default:
        return { bg: '#6b7280', text: '#ffffff' };  // Gray
    }
  };

  const getLayerIcon = (layerType) => {
    const type = layerType?.toLowerCase();
    switch (type) {
      case 'lstm':
        return '🧠';
      case 'dropout':
        return '⚡';
      case 'dense':
        return '🎯';
      case 'input':
        return '🔢';
      case 'output':
        return '📊';
      default:
        return '🔘';
    }
  };

  // If no model info is available or model is not ready
  if (!modelInfo || !modelInfo.model) {
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
        <div style={{ fontSize: '32px', marginBottom: '16px' }}>🔄</div>
        <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: '#111827' }}>
          {modelInfo?.status === 'not_initialized' ? 'Model Loading...' : 'Model Information Not Available'}
        </p>
        <p style={{ margin: 0, fontSize: '12px' }}>
          {modelInfo?.message || 'Please run a prediction first or wait for the model to initialize.'}
        </p>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      marginBottom: '20px',
      minHeight: '300px',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <h3 style={{
          margin: 0,
          color: '#111827',
          fontSize: '16px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>Model Architecture</span>
        </h3>

        <div style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          justifyContent: 'flex-end',
          alignItems: 'center'
        }}>
          {model.optimizer && (
            <div style={{
              backgroundColor: '#f3f4f6',
              color: '#4b5563',
              fontSize: '12px',
              padding: '4px 10px',
              borderRadius: '12px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span>Optimizer:</span>
              <span style={{ fontWeight: '600' }}>{model.optimizer}</span>
            </div>
          )}

          {model.loss && (
            <div style={{
              backgroundColor: '#f3f4f6',
              color: '#4b5563',
              fontSize: '12px',
              padding: '4px 10px',
              borderRadius: '12px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span>Loss:</span>
              <span style={{ fontWeight: '600' }}>{model.loss}</span>
            </div>
          )}

          {totalParams > 0 && (
            <div style={{
              backgroundColor: '#f3f4f6',
              color: '#4b5563',
              fontSize: '12px',
              padding: '4px 10px',
              borderRadius: '12px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span>Parameters:</span>
              <span style={{ fontWeight: '600' }}>{totalParams.toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Layer Visualization */}
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
        flexWrap: 'wrap',
        marginTop: '10px',
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '200px',
        padding: '20px 0'
      }}>
        {layers.map((layer, index) => {
          const colors = getLayerColor(layer.type);
          const icon = getLayerIcon(layer.type);

          return (
            <React.Fragment key={index}>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '16px',
                  borderRadius: '8px',
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb'
                }}
              >
                {/* Layer Badge */}
                <div style={{
                  minWidth: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: colors.bg,
                  color: colors.text,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  flexShrink: 0
                }}>
                  {icon}
                </div>

                {/* Layer Card */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <div style={{
                    fontSize: '12px',
                    color: colors.text,
                    textAlign: 'center',
                    marginTop: '8px',
                    fontWeight: '500',
                    textTransform: 'capitalize'
                  }}>
                    {layer.type}
                    {layer.units && ` (${layer.units})`}
                    {layer.rate && ` ${Math.round(layer.rate * 100)}%`}
                    {layer.activation && `\n${layer.activation}`}
                  </div>

                  <div style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: colors.bg,
                    color: colors.text
                  }}>
                    {layer.units ? `${layer.units} units` : 'layer'}
                  </div>
                </div>
              </motion.div>
              {index < layers.length - 1 && (
                <div style={{
                  width: '2px',
                  height: '12px',
                  backgroundColor: '#d1d5db',
                  marginLeft: '17px',
                  position: 'relative'
                }}>
                  <div style={{
                    position: 'absolute',
                    bottom: '-3px',
                    left: '-3px',
                    width: 0,
                    height: 0,
                    borderLeft: '4px solid transparent',
                    borderRight: '4px solid transparent',
                    borderTop: '6px solid #d1d5db'
                  }} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Model Info Footer */}
      <div style={{
        marginTop: '24px',
        padding: '16px',
        backgroundColor: '#eff6ff',
        borderRadius: '8px',
        border: '1px solid #bfdbfe'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ fontSize: '16px' }}>ℹ️</span>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#1e40af' }}>
            Model Information
          </span>
        </div>
        <p style={{
          margin: 0,
          fontSize: '12px',
          color: '#1e40af',
          lineHeight: '1.5'
        }}>
          This LSTM (Long Short-Term Memory) neural network learns temporal patterns in traffic flow
          to predict future speeds. The model processes sequences of 24 time steps (6 hours) and
          uses dropout layers to prevent overfitting.
        </p>
      </div>
    </div>
  );
};

export default NeuralNetworkViz;
