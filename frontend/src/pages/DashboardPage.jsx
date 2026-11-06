import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Loading, Alert, SectionHeader, KPI, Badge } from '../components/ui'

const estadoBadge = { optimo: ['green','Óptimo'], alerta: ['amber','Alerta'],
                      critico: ['red','Crítico'], sin_stock: ['red','Sin Stock'] }

export default function DashboardPage({ sessionId, diasHistorial }) {
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

  async function handleAnalizar() {
    if (!producto) return
    setLoading(true); setError('')
    try {
      const r = await api.predecir(sessionId, producto, diasHistorial, diasProy)
      setResultado(r)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const alertProps = resultado ? (
    resultado.estado === 'sin_stock' ? { type:'critical', title:'SIN STOCK',
      body:`${producto} está completamente agotado. Solicita reposición de inmediato.` }
    : resultado.estado === 'critico' ? { type:'critical', title:'ALERTA CRÍTICA — Punto de Reorden superado',
      body:`Stock actual (${resultado.stock_actual} uds) ≤ ROP (${resultado.punto_reorden} uds). Días restantes: ${resultado.cobertura_dias}.` }
    : resultado.estado === 'alerta' ? { type:'warning', title:'PRECAUCIÓN — Inventario insuficiente',
      body:`El stock no cubrirá la demanda proyectada de ${diasProy} días.` }
    : { type:'optimal', title:'ÓPTIMO — Inventario suficiente',
      body:`Tienes stock suficiente para operar con normalidad los próximos ${diasProy} días.` }
  ) : null

  return (
    <div className="fade-in">
      <SectionHeader
        title='Dashboard <em>Predictivo</em>'
        subtitle="Análisis de demanda · Punto de reorden · Inventario crítico"
      />

      {/* Selector */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 2, minWidth: 200 }}>
            <label className="form-label">Producto</label>
            <select className="form-input" value={producto}
                    onChange={e => setProducto(e.target.value)}>
              {productos.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 120 }}>
            <label className="form-label">Días a proyectar</label>
            <input className="form-input" type="number" min={1} max={365}
                   value={diasProy} onChange={e => setDiasProy(+e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={handleAnalizar} disabled={loading}>
            {loading ? 'Analizando...' : 'Ejecutar Análisis'}
          </button>
        </div>
      </div>

      {error && <Alert type="critical" title="Error">{error}</Alert>}

      {/* Resultado */}
      {resultado && (
        <div className="fade-in">
          <div className="kpi-grid kpi-grid-3" style={{ marginBottom: 16 }}>
            <KPI label="Stock Actual"         value={resultado.stock_actual}    unit="unidades" />
            <KPI label="Ventas Diarias"        value={resultado.ventas_diarias}  unit="uds/día"  color="amber" />
            <KPI label={`Demanda ${diasProy}d`} value={resultado.demanda_proyectada} unit="uds proyectados" color={resultado.estado==='optimo'?'':'red'} />
          </div>
          <div className="kpi-grid kpi-grid-3" style={{ marginBottom: 20 }}>
            <div className="kpi">
              <div className="kpi-label">Días de Cobertura</div>
              <div className="kpi-value" style={{ fontSize:28 }}>{resultado.cobertura_dias}</div>
              <div className="kpi-unit">días restantes</div>
              {resultado.cobertura_dias != null && (
                <div className={`kpi-delta ${resultado.cobertura_dias >= diasProy ? 'up' : 'down'}`}>
                  {resultado.cobertura_dias >= diasProy ? '↑' : '↓'} {Math.abs(resultado.cobertura_dias - diasProy)} días vs meta
                </div>
              )}
            </div>
            <div className="kpi amber">
              <div className="kpi-label">Punto de Reorden (ROP)</div>
              <div className="kpi-value" style={{ fontSize:28 }}>{resultado.punto_reorden}</div>
              <div className="kpi-unit">umbral mínimo de seguridad</div>
            </div>
            <div className="kpi" style={{ display:'flex', alignItems:'center', justifyContent:'center' }}>
              <div className="speed-indicator">
                <div className={`speed-dot ${resultado.velocidad==='rapido'?'fast':'slow'}`}>
                  {resultado.velocidad === 'rapido' ? '🚀' : '🐢'}
                </div>
                <div className="speed-label">
                  {resultado.velocidad === 'rapido' ? 'Venta Rápida' : 'Venta Lenta'}
                </div>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--ink-4)' }}>
                  {resultado.velocidad === 'rapido' ? '> 2 uds/día' : '≤ 2 uds/día'}
                </div>
              </div>
            </div>
          </div>

          {alertProps && (
            <Alert type={alertProps.type} title={alertProps.title}>
              {alertProps.body}
            </Alert>
          )}
        </div>
      )}

      <div className="divider" />

      {/* Tablero global crítico */}
      <div style={{ marginBottom: 16, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <h3 style={{ fontFamily:'var(--font-serif)', fontSize:22 }}>
            Tablero Global de <em style={{ fontStyle:'italic', color:'var(--indigo)' }}>Inventario Crítico</em>
          </h3>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--ink-4)',
                        textTransform:'uppercase', letterSpacing:'.1em', marginTop:4 }}>
            Escaneo automático · Productos bajo punto de reorden
          </div>
        </div>
        {criticos && (
          <div style={{ fontFamily:'var(--font-mono)', fontSize:12,
                        color: criticos.length ? 'var(--red)' : 'var(--green)' }}>
            {criticos.length ? `⚠ ${criticos.length} productos requieren atención` : '✓ Bodega saludable'}
          </div>
        )}
      </div>

      {loadCrit ? <Loading text="Escaneando inventario..." /> :
       criticos === null ? null :
       criticos.length === 0 ? (
         <Alert type="optimal" title="Bodega saludable">
           Ningún producto está por debajo de su punto de seguridad.
         </Alert>
       ) : (
         <div className="card card-flush">
           <table className="data-table">
             <thead>
               <tr>
                 <th>Producto</th>
                 <th>Estado</th>
                 <th>Stock Actual</th>
                 <th>ROP</th>
                 <th>Días Restantes</th>
                 <th>Velocidad</th>
               </tr>
             </thead>
             <tbody>
               {criticos.map((c, i) => {
                 const [bType, bLabel] = estadoBadge[c.estado] || ['amber','Alerta']
                 return (
                   <tr key={i}>
                     <td className="td-product">{c.producto}</td>
                     <td><Badge type={bType}>{bLabel}</Badge></td>
                     <td>{c.stock_actual}</td>
                     <td>{c.punto_reorden}</td>
                     <td style={{ fontFamily:'var(--font-mono)', fontWeight:600,
                                  color: c.dias_restantes <= 3 ? 'var(--red)' : 'var(--ink)' }}>
                       {c.dias_restantes}
                     </td>
                     <td>
                       <Badge type={c.velocidad==='rapido'?'indigo':'amber'}>
                         {c.velocidad === 'rapido' ? '🚀 Rápido' : '🐢 Lento'}
                       </Badge>
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
