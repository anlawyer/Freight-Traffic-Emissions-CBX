import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * ZoneDetailPanel Component
 * 
 * Interactive popup panel showing detailed zone information when
 * a user clicks on a map zone. Displays:
 * - Heat Vulnerability Index (HVI)
 * - Monte Carlo-derived probabilistic asthma reduction range
 * - Confidence intervals for health benefits
 */

function ZoneDetailPanel({
    zone,
    monteCarloData,
    taxAmount,
    isVisible,
    onClose,
    language = 'en'
}) {
    if (!isVisible || !zone) return null;

    const t = {
        en: {
            title: 'Zone Details',
            zipCode: 'ZIP Code',
            neighborhood: 'Neighborhood',
            hvi: 'Heat Vulnerability Index',
            hviDescription: 'Measures community sensitivity to heat and air quality impacts',
            baselinePM25: 'Baseline PM2.5',
            projectedImpact: 'Projected Health Impact',
            asthmaReduction: 'Estimated Asthma Reduction',
            confidenceInterval: 'Confidence Interval',
            ci95: '95% CI',
            ci50: '50% CI',
            uncertaintyNote: 'Values derived from Monte Carlo simulation (10,000 iterations)',
            atTaxLevel: 'at tax level',
            perYear: 'cases/year',
            highRisk: 'Highest Risk',
            moderateRisk: 'Moderate Risk',
            lowRisk: 'Low Risk',
            noData: 'Run Monte Carlo simulation to see projected impacts',
            close: 'Close'
        },
        es: {
            title: 'Detalles de la Zona',
            zipCode: 'Código Postal',
            neighborhood: 'Vecindario',
            hvi: 'Índice de Vulnerabilidad de Calor',
            hviDescription: 'Mide la sensibilidad de la comunidad a los impactos del calor y la calidad del aire',
            baselinePM25: 'PM2.5 Base',
            projectedImpact: 'Impacto de Salud Proyectado',
            asthmaReduction: 'Reducción Estimada del Asma',
            confidenceInterval: 'Intervalo de Confianza',
            ci95: 'IC 95%',
            ci50: 'IC 50%',
            uncertaintyNote: 'Valores derivados de simulación Monte Carlo (10,000 iteraciones)',
            atTaxLevel: 'al nivel de impuesto',
            perYear: 'casos/año',
            highRisk: 'Mayor Riesgo',
            moderateRisk: 'Riesgo Moderado',
            lowRisk: 'Bajo Riesgo',
            noData: 'Ejecute la simulación Monte Carlo para ver los impactos proyectados',
            close: 'Cerrar'
        }
    };

    const text = t[language];
    const hvi = zone.hvi || 5;
    const hviColor = hvi >= 4 ? '#ef4444' : hvi >= 2 ? '#f59e0b' : '#22c55e';
    const hviLabel = hvi >= 4 ? text.highRisk : hvi >= 2 ? text.moderateRisk : text.lowRisk;

    // Get asthma reduction data from Monte Carlo results
    const asthmaData = monteCarloData?.statistics?.asthma_visits_avoided;
    const ciData = monteCarloData?.confidence_intervals?.asthma_visits_avoided;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                style={{
                    position: 'fixed',
                    bottom: '24px',
                    right: '24px',
                    width: '360px',
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                    border: '1px solid #e5e7eb',
                    overflow: 'hidden',
                    zIndex: 1000
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid #e5e7eb',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'
                }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                            📍 {text.title}
                        </h3>
                        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                            {zone.area_name || 'Soundview'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: '#f3f4f6',
                            color: '#6b7280',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '16px',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#e5e7eb'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                    >
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: '16px 20px' }}>
                    {/* Basic Info */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '12px',
                        marginBottom: '16px'
                    }}>
                        <div style={{
                            padding: '12px',
                            backgroundColor: '#f9fafb',
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb'
                        }}>
                            <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>
                                {text.zipCode}
                            </div>
                            <div style={{ fontSize: '18px', fontWeight: '600', color: '#111827' }}>
                                {zone.zip_code || '10473'}
                            </div>
                        </div>
                        <div style={{
                            padding: '12px',
                            backgroundColor: '#f9fafb',
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb'
                        }}>
                            <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>
                                {text.baselinePM25}
                            </div>
                            <div style={{ fontSize: '18px', fontWeight: '600', color: '#111827' }}>
                                {zone.baseline_pm25 || 13.2} <span style={{ fontSize: '12px', fontWeight: '400' }}>µg/m³</span>
                            </div>
                        </div>
                    </div>

                    {/* HVI Score */}
                    <div style={{
                        padding: '16px',
                        backgroundColor: `${hviColor}10`,
                        borderRadius: '12px',
                        border: `1px solid ${hviColor}30`,
                        marginBottom: '16px'
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '8px'
                        }}>
                            <span style={{ fontSize: '13px', fontWeight: '500', color: '#374151' }}>
                                {text.hvi}
                            </span>
                            <span style={{
                                padding: '4px 10px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: '600',
                                backgroundColor: hviColor,
                                color: 'white'
                            }}>
                                {hviLabel}
                            </span>
                        </div>

                        {/* HVI Bar */}
                        <div style={{
                            height: '8px',
                            backgroundColor: '#e5e7eb',
                            borderRadius: '4px',
                            overflow: 'hidden',
                            marginBottom: '8px'
                        }}>
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(hvi / 5) * 100}%` }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                                style={{
                                    height: '100%',
                                    backgroundColor: hviColor,
                                    borderRadius: '4px'
                                }}
                            />
                        </div>

                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'baseline',
                            gap: '4px'
                        }}>
                            <span style={{ fontSize: '32px', fontWeight: '700', color: hviColor }}>
                                {hvi}
                            </span>
                            <span style={{ fontSize: '14px', color: '#6b7280' }}>/5</span>
                        </div>

                        <p style={{
                            margin: '8px 0 0 0',
                            fontSize: '11px',
                            color: '#6b7280',
                            textAlign: 'center'
                        }}>
                            {text.hviDescription}
                        </p>
                    </div>

                    {/* Monte Carlo Results */}
                    {asthmaData && ciData ? (
                        <div style={{
                            padding: '16px',
                            backgroundColor: '#f0fdf4',
                            borderRadius: '12px',
                            border: '1px solid #bbf7d0'
                        }}>
                            <div style={{
                                fontSize: '13px',
                                fontWeight: '600',
                                color: '#166534',
                                marginBottom: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}>
                                💚 {text.projectedImpact}
                            </div>

                            <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                                <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>
                                    {text.asthmaReduction}
                                </div>
                                <div style={{
                                    fontSize: '28px',
                                    fontWeight: '700',
                                    color: '#16a34a'
                                }}>
                                    {asthmaData.mean.toFixed(1)}
                                </div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                    {text.perYear} {text.atTaxLevel} ${taxAmount}
                                </div>
                            </div>

                            {/* Confidence Intervals */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '8px',
                                marginBottom: '8px'
                            }}>
                                <div style={{
                                    padding: '8px',
                                    backgroundColor: 'white',
                                    borderRadius: '6px',
                                    textAlign: 'center'
                                }}>
                                    <div style={{ fontSize: '10px', color: '#6b7280' }}>{text.ci95}</div>
                                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                                        {ciData.lower_95.toFixed(1)} – {ciData.upper_95.toFixed(1)}
                                    </div>
                                </div>
                                <div style={{
                                    padding: '8px',
                                    backgroundColor: 'white',
                                    borderRadius: '6px',
                                    textAlign: 'center'
                                }}>
                                    <div style={{ fontSize: '10px', color: '#6b7280' }}>{text.ci50}</div>
                                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                                        {ciData.lower_50.toFixed(1)} – {ciData.upper_50.toFixed(1)}
                                    </div>
                                </div>
                            </div>

                            <p style={{
                                margin: 0,
                                fontSize: '10px',
                                color: '#6b7280',
                                textAlign: 'center',
                                fontStyle: 'italic'
                            }}>
                                {text.uncertaintyNote}
                            </p>
                        </div>
                    ) : (
                        <div style={{
                            padding: '16px',
                            backgroundColor: '#f9fafb',
                            borderRadius: '12px',
                            border: '1px dashed #d1d5db',
                            textAlign: 'center'
                        }}>
                            <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>
                                {text.noData}
                            </p>
                        </div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

export default ZoneDetailPanel;
