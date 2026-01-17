import React from 'react';
import { motion } from 'framer-motion';

/**
 * SystemStateTimeline Component
 * 
 * Visualizes the HMM (Hidden Markov Model) predicted environmental states
 * as a heat-gradient timeline bar from Green (healthy) to Red (toxic).
 * 
 * States:
 * - 0: Free Flow / Healthy (Green)
 * - 1: Congested / High Exposure (Yellow/Orange)
 * - 2: Gridlock / Toxic (Red)
 */

const STATE_COLORS = {
    0: { bg: '#22c55e', gradient: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', label: 'Free Flow / Healthy', labelEs: 'Flujo Libre / Saludable' },
    1: { bg: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', label: 'Congested / High Exposure', labelEs: 'Congestionado / Alta Exposición' },
    2: { bg: '#ef4444', gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', label: 'Gridlock / Toxic', labelEs: 'Atascado / Tóxico' }
};

const STATE_ICONS = {
    0: '✅',
    1: '⚠️',
    2: '🚨'
};

function SystemStateTimeline({ hmmData, language = 'en' }) {
    if (!hmmData || !hmmData.state_sequence) {
        return (
            <div style={{
                padding: '24px',
                backgroundColor: '#f9fafb',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                textAlign: 'center'
            }}>
                <p style={{ color: '#6b7280', margin: 0 }}>
                    {language === 'en'
                        ? 'Run HMM prediction to view environmental state timeline'
                        : 'Ejecute la predicción HMM para ver la línea de tiempo del estado ambiental'}
                </p>
            </div>
        );
    }

    const { state_sequence, state_labels, state_labels_es, state_percentages, risk_score, transitions } = hmmData;
    const labels = language === 'en' ? state_labels : state_labels_es;

    // Group consecutive states for cleaner visualization
    const groupedStates = [];
    let currentGroup = { state: state_sequence[0], start: 0, count: 1 };

    for (let i = 1; i < state_sequence.length; i++) {
        if (state_sequence[i] === currentGroup.state) {
            currentGroup.count++;
        } else {
            groupedStates.push({ ...currentGroup, end: i - 1 });
            currentGroup = { state: state_sequence[i], start: i, count: 1 };
        }
    }
    groupedStates.push({ ...currentGroup, end: state_sequence.length - 1 });

    // Calculate time labels (assuming 15-min intervals starting from current hour)
    const getTimeLabel = (index) => {
        const intervalMinutes = 15;
        const now = new Date();
        const startHour = now.getHours();
        const totalMinutes = index * intervalMinutes;
        const hour = (startHour + Math.floor(totalMinutes / 60)) % 24;
        const minute = totalMinutes % 60;
        return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                border: '1px solid #e5e7eb'
            }}
        >
            {/* Header */}
            <div style={{ marginBottom: '20px' }}>
                <h3 style={{
                    margin: '0 0 8px 0',
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#111827',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    🌡️ {language === 'en' ? 'Environmental State Timeline' : 'Línea de Tiempo del Estado Ambiental'}
                </h3>
                <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
                    {language === 'en'
                        ? 'Hidden Markov Model (Viterbi Algorithm) prediction of health-risk states'
                        : 'Predicción del Modelo Oculto de Markov (Algoritmo Viterbi) de estados de riesgo para la salud'}
                </p>
            </div>

            {/* Risk Score Indicator */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                marginBottom: '20px',
                padding: '12px 16px',
                backgroundColor: risk_score > 0.6 ? '#fef2f2' : risk_score > 0.3 ? '#fffbeb' : '#f0fdf4',
                borderRadius: '8px',
                border: `1px solid ${risk_score > 0.6 ? '#fecaca' : risk_score > 0.3 ? '#fde68a' : '#bbf7d0'}`
            }}>
                <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: `conic-gradient(
            ${risk_score > 0.6 ? '#ef4444' : risk_score > 0.3 ? '#f59e0b' : '#22c55e'} ${risk_score * 360}deg,
            #e5e7eb ${risk_score * 360}deg
          )`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        backgroundColor: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: risk_score > 0.6 ? '#dc2626' : risk_score > 0.3 ? '#d97706' : '#16a34a'
                    }}>
                        {(risk_score * 100).toFixed(0)}%
                    </div>
                </div>
                <div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                        {language === 'en' ? 'Overall Risk Score' : 'Puntuación de Riesgo General'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        {risk_score > 0.6
                            ? (language === 'en' ? 'High exposure risk predicted' : 'Alto riesgo de exposición predicho')
                            : risk_score > 0.3
                                ? (language === 'en' ? 'Moderate exposure risk' : 'Riesgo de exposición moderado')
                                : (language === 'en' ? 'Low exposure risk' : 'Bajo riesgo de exposición')}
                    </div>
                </div>
            </div>

            {/* Timeline Bar */}
            <div style={{ marginBottom: '16px' }}>
                <div style={{
                    display: 'flex',
                    height: '48px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '1px solid #e5e7eb'
                }}>
                    {groupedStates.map((group, idx) => {
                        const widthPercent = (group.count / state_sequence.length) * 100;
                        const stateConfig = STATE_COLORS[group.state];

                        return (
                            <motion.div
                                key={idx}
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: 1 }}
                                transition={{ delay: idx * 0.1, duration: 0.3 }}
                                style={{
                                    width: `${widthPercent}%`,
                                    background: stateConfig.gradient,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    position: 'relative',
                                    transformOrigin: 'left'
                                }}
                                title={`${stateConfig.label}: ${getTimeLabel(group.start)} - ${getTimeLabel(group.end)}`}
                            >
                                {widthPercent > 8 && (
                                    <span style={{
                                        fontSize: widthPercent > 15 ? '16px' : '12px',
                                        filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.3))'
                                    }}>
                                        {STATE_ICONS[group.state]}
                                    </span>
                                )}
                            </motion.div>
                        );
                    })}
                </div>

                {/* Time Labels */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: '6px',
                    fontSize: '11px',
                    color: '#9ca3af'
                }}>
                    <span>{getTimeLabel(0)}</span>
                    <span>{getTimeLabel(Math.floor(state_sequence.length / 4))}</span>
                    <span>{getTimeLabel(Math.floor(state_sequence.length / 2))}</span>
                    <span>{getTimeLabel(Math.floor(state_sequence.length * 3 / 4))}</span>
                    <span>{getTimeLabel(state_sequence.length - 1)}</span>
                </div>
            </div>

            {/* State Legend */}
            <div style={{
                display: 'flex',
                gap: '16px',
                flexWrap: 'wrap',
                marginBottom: '20px'
            }}>
                {Object.entries(STATE_COLORS).map(([state, config]) => (
                    <div key={state} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '13px'
                    }}>
                        <div style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '4px',
                            background: config.gradient
                        }} />
                        <span style={{ color: '#374151' }}>
                            {language === 'en' ? config.label : config.labelEs}
                        </span>
                        <span style={{
                            color: '#9ca3af',
                            fontSize: '12px'
                        }}>
                            ({(state_percentages[parseInt(state)] || 0).toFixed(1)}%)
                        </span>
                    </div>
                ))}
            </div>

            {/* Transitions */}
            {transitions && transitions.length > 0 && (
                <div style={{
                    padding: '12px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb'
                }}>
                    <div style={{
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '8px'
                    }}>
                        {language === 'en' ? 'State Transitions' : 'Transiciones de Estado'}
                        <span style={{
                            marginLeft: '8px',
                            fontWeight: '400',
                            color: '#6b7280'
                        }}>
                            ({transitions.length} {language === 'en' ? 'detected' : 'detectadas'})
                        </span>
                    </div>
                    <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '8px'
                    }}>
                        {transitions.slice(0, 6).map((t, idx) => (
                            <div key={idx} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 8px',
                                backgroundColor: 'white',
                                borderRadius: '4px',
                                fontSize: '12px',
                                border: '1px solid #e5e7eb'
                            }}>
                                <span style={{ color: STATE_COLORS[t.from_state].bg }}>●</span>
                                <span style={{ color: '#9ca3af' }}>→</span>
                                <span style={{ color: STATE_COLORS[t.to_state].bg }}>●</span>
                                <span style={{ color: '#6b7280', marginLeft: '4px' }}>
                                    @{getTimeLabel(t.time_index)}
                                </span>
                            </div>
                        ))}
                        {transitions.length > 6 && (
                            <span style={{
                                fontSize: '12px',
                                color: '#6b7280',
                                padding: '4px 8px'
                            }}>
                                +{transitions.length - 6} {language === 'en' ? 'more' : 'más'}
                            </span>
                        )}
                    </div>
                </div>
            )}
        </motion.div>
    );
}

export default SystemStateTimeline;
