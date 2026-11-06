import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Loading, Alert, Badge } from '../components/ui'
import { PackageSearch, AlertTriangle, CheckCircle2, Clock } from 'lucide-react'

const estadoBadge = {
  optimo:    ['green',  'Óptimo'],
  alerta:    ['amber',  'Alerta'],
  critico:   ['red',    'Crítico'],
  sin_stock: ['red',    'Sin Stock'],
}

export default function EmpleadoDashboardPage({ sessionId, diasHistorial }) {
  const [productos,  setProductos]  = useState([])
  const [producto,   setProducto]   = useState('')
  const [diasProy,   setDiasProy]   = useState(7)
  const [resultado,  setResultado]  = useState(null)
  const [criticos,   setCriticos]   = useState(null)
  const [loading,    setLoading]    = useState(false)
  const [loadCrit,   setLoadCrit]   = useState(false)
  const [error,      setError]      = useState('')

  useEffect(() => {
    api.productos(sessionId).then(p => {
      setProductos(p)
      if (p.length) setProducto(p[0])
    })
    setLoadCrit(true)
    api.criticos(sessionId, diasHistorial)
      .then(setCriticos)
      .finally(() => setLoadCrit(false))
  }, [sessionId, diasHistorial])

  async function handleConsultar() {
    if (!producto) return
    setLoading(true); setError('')
    try {
      const r = await api.predecir(sessionId, producto, diasHistorial, diasProy)
      setResultado(r)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  // Conteo de alertas
  const totalCriticos  = criticos?.filter(c => c.estado === 'critico' || c.estado === 'sin_stock').length ?? 0
  const totalAlertas   = criticos?.filter(c => c.estado === 'alerta').length ?? 0

  return (
    <div className="fade-in">
      {/* Header operativo */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 28, color: 'var(--ink)', marginBottom: 6 }}>
          Vista <em style={{ fontStyle: 'italic', color: 'var(--indigo)' }}>Operativa</em>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '.1em' }}>
          Consulta de stock · Alertas de reposición
        </div>
      </div>

      {/* Resumen de estado del inventario */}
      {criticos && (
        <div className="kpi-grid kpi-grid-3" style={{ marginBottom: 28 }}>
          <div className={`kpi ${totalCriticos > 0 ? 'red' : ''}`}>
            <div className="kpi-label">Productos Críticos</div>
            <div className="kpi-value" style={{ fontSize: 32 }}>{totalCriticos}</div>
            <div className="kpi-unit" style={{ color: totalCriticos > 0 ? 'var(--red)' : 'var(--ink-4)' }}>
              {totalCriticos > 0 ? '⚠ Requieren reposición urgente' : '✓ Sin críticos'}
            </div>
          </div>
          <div className={`kpi ${totalAlertas > 0 ? 'amber' : ''}`}>
            <div className="kpi-label">En Alerta</div>
            <div className="kpi-value" style={{ fontSize: 32 }}>{totalAlertas}</div>
            <div className="kpi-unit">stock bajo, monitorear</div>
          </div>
          <div className="kpi">
            <div className="kpi-label">Productos Saludables</div>
            <div className="kpi-value" style={{ fontSize: 32 }}>
              {(criticos?.filter(c => c.estado === 'optimo').length) ?? 0}
            </div>
            <div className="kpi-unit" style={{ color: 'var(--green)' }}>✓ Stock suficiente</div>
          </div>
        </div>
      )}

      {/* Consulta de producto */}
      <div className="card" style={{ marginBottom: 24, borderLeft: '3px solid var(--indigo)' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--indigo)', marginBottom: 14 }}>
          ▶ Consultar disponibilidad de producto
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 2, minWidth: 200 }}>
            <label className="form-label">Producto</label>
            <select className="form-input" value={producto}
                    onChange={e => setProducto(e.target.value)}>
              {productos.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 120 }}>
            <label className="form-label">Días a consultar</label>
            <input className="form-input" type="number" min={1} max={60}
                   value={diasProy} onChange={e => setDiasProy(+e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={handleConsultar} disabled={loading}>
            {loading ? 'Consultando...' : <><PackageSearch size={14} /> Consultar</>}
          </button>
        </div>
      </div>

      {error && <Alert type="critical" title="Error">{error}</Alert>}

      {/* Resultado de consulta — vista simplificada */}
      {resultado && (
        <div className="card fade-in" style={{ marginBottom: 28 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--ink-4)', marginBottom: 16 }}>
            Resultado · {producto}
          </div>

          {/* Estado visual prominente */}
          <div style={{
            padding: '20px 24px', borderRadius: 'var(--r)', marginBottom: 20,
            background: resultado.estado === 'optimo' ? 'rgba(16,185,129,.08)'
              : resultado.estado === 'alerta' ? 'rgba(245,158,11,.08)'
              : 'rgba(239,68,68,.08)',
            border: `1px solid ${resultado.estado === 'optimo' ? 'rgba(16,185,129,.3)'
              : resultado.estado === 'alerta' ? 'rgba(245,158,11,.3)'
              : 'rgba(239,68,68,.3)'}`,
            display: 'flex', alignItems: 'center', gap: 16
          }}>
            {resultado.estado === 'optimo'
              ? <CheckCircle2 size={36} strokeWidth={1.5} style={{ color: 'var(--green)', flexShrink: 0 }} />
              : <AlertTriangle size={36} strokeWidth={1.5} style={{ color: resultado.estado === 'alerta' ? 'var(--amber)' : 'var(--red)', flexShrink: 0 }} />
            }
            <div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, marginBottom: 4 }}>
                {resultado.estado === 'sin_stock' ? 'Sin stock — solicitar reposición inmediata'
                  : resultado.estado === 'critico' ? 'Crítico — bajo el punto de reorden'
                  : resultado.estado === 'alerta' ? 'Alerta — stock insuficiente para el período'
                  : 'Óptimo — stock suficiente'}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)' }}>
                {resultado.estado !== 'optimo' && resultado.estado !== 'sin_stock'
                  ? `Días de cobertura: ${resultado.cobertura_dias} · Punto de reorden: ${resultado.punto_reorden} uds`
                  : resultado.estado === 'sin_stock'
                  ? 'Producto completamente agotado'
                  : `Stock cubre los próximos ${diasProy} días sin problemas`}
              </div>
            </div>
          </div>

          {/* Datos clave */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { label: 'Stock Actual',    value: resultado.stock_actual,       unit: 'unidades' },
              { label: 'Ventas / Día',    value: resultado.ventas_diarias,     unit: 'uds/día' },
              { label: 'Días Restantes',  value: resultado.cobertura_dias,     unit: 'días cobertura' },
            ].map((item, i) => (
              <div key={i} style={{
                padding: '14px 16px', background: 'var(--surface)',
                borderRadius: 'var(--r)', textAlign: 'center'
              }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 8 }}>
                  {item.label}
                </div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 26, color: 'var(--ink)', lineHeight: 1 }}>
                  {item.value ?? '—'}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-4)', marginTop: 4 }}>
                  {item.unit}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tablero de alertas */}
      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 20 }}>
            Productos que necesitan <em style={{ fontStyle: 'italic', color: 'var(--red)' }}>Reposición</em>
          </h3>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '.1em', marginTop: 4 }}>
            Revisión automática del inventario
          </div>
        </div>
      </div>

      {loadCrit ? <Loading text="Escaneando inventario..." /> :
       criticos === null ? null :
       criticos.length === 0 ? (
         <Alert type="optimal" title="Inventario en buen estado">
           Ningún producto requiere reposición en este momento.
         </Alert>
       ) : (
         <div className="card card-flush">
           <table className="data-table">
             <thead>
               <tr>
                 <th>Producto</th>
                 <th>Estado</th>
                 <th>Stock Actual</th>
                 <th>Mínimo Seguro</th>
                 <th>Días Restantes</th>
                 <th>Acción sugerida</th>
               </tr>
             </thead>
             <tbody>
               {criticos.map((c, i) => {
                 const [bType, bLabel] = estadoBadge[c.estado] || ['amber', 'Alerta']
                 const accion = c.estado === 'sin_stock'
                   ? '🚨 Solicitar reposición urgente'
                   : c.estado === 'critico'
                   ? '⚠ Notificar a encargado'
                   : '👁 Monitorear'
                 return (
                   <tr key={i}>
                     <td className="td-product">{c.producto}</td>
                     <td><Badge type={bType}>{bLabel}</Badge></td>
                     <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{c.stock_actual}</td>
                     <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-3)' }}>{c.punto_reorden}</td>
                     <td style={{
                       fontFamily: 'var(--font-mono)', fontWeight: 600,
                       color: c.dias_restantes <= 3 ? 'var(--red)' : c.dias_restantes <= 7 ? 'var(--amber)' : 'var(--ink)'
                     }}>
                       {c.dias_restantes}
                     </td>
                     <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>
                       {accion}
                     </td>
                   </tr>
                 )
               })}
             </tbody>
           </table>
         </div>
       )}
    </div>
  )
}
