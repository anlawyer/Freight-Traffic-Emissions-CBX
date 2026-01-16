import React from 'react';
import { motion } from 'framer-motion';

/**
 * Neural Network Architecture Visualization
 * Visual representation of the LSTM model structure
 */
const NeuralNetworkViz = ({ modelInfo }) => {
  // Handle different response structures from the API
  // API returns: {status: 'ready', model: {layers: [...], total_params: ...}}
  // OR: {status: 'not_initialized', message: '...'}
  const model = modelInfo?.model || modelInfo;

  // Check if model is not ready or unavailable
  if (!modelInfo || modelInfo.status === 'not_initialized' || !model || !model.layers || model.available === false) {
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

  const layers = model.layers;
  const totalParams = model.total_params;

  // Define layer visualization properties
  const getLayerColor = (layerType) => {
    switch (layerType) {
      case 'LSTM':
        return { bg: '#3b82f6', text: '#ffffff' };
      case 'Dropout':
        return { bg: '#8b5cf6', text: '#ffffff' };
      case 'Dense':
        return { bg: '#10b981', text: '#ffffff' };
      default:
        return { bg: '#6b7280', text: '#ffffff' };
    }
  };

  const getLayerIcon = (layerType) => {
    switch (layerType) {
      case 'LSTM':
        return '🧠';
      case 'Dropout':
        return '⚡';
      case 'Dense':
        return '🎯';
      default:
        return '🔷';
    }
  };

  return (
    <div style={{
      width: '100%',
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{
          margin: '0 0 8px 0',
          fontSize: '18px',
          fontWeight: '600',
          color: '#111827'
        }}>
          LSTM Model Architecture
        </h3>
        <div style={{
          display: 'flex',
          gap: '16px',
          fontSize: '13px',
          color: '#6b7280'
        }}>
          <span>
            <strong>{layers.length}</strong> layers
          </span>
          <span>•</span>
          <span>
            <strong>{totalParams.toLocaleString()}</strong> parameters
          </span>
          <span>•</span>
          <span>
            {model.is_trained ? (
              <span style={{ color: '#10b981' }}>✓ Trained</span>
            ) : (
              <span style={{ color: '#f59e0b' }}>⚠ Not Trained</span>
            )}
          </span>
        </div>
      </div>

      {/* Layer Visualization */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        position: 'relative'
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
                  alignItems: 'center',
                  gap: '16px',
                  position: 'relative'
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
                  flex: 1,
                  padding: '16px',
                  borderRadius: '8px',
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '4px'
                  }}>
                    <span style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#111827'
                    }}>
                      {layer.type}
                    </span>
                    <span style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: colors.bg,
                      color: colors.text
                    }}>
                      {layer.params.toLocaleString()} params
                    </span>
                  </div>

                  <div style={{
                    fontSize: '12px',
                    color: '#6b7280',
                    display: 'flex',
                    gap: '16px',
                    flexWrap: 'wrap'
                  }}>
                    <span>Output: {layer.output_shape}</span>
                    {layer.units && <span>Units: {layer.units}</span>}
                    {layer.activation && <span>Activation: {layer.activation}</span>}
                    {layer.dropout_rate && <span>Dropout: {(layer.dropout_rate * 100).toFixed(0)}%</span>}
                  </div>
                </div>
              </motion.div>

              {/* Connector Arrow */}
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
