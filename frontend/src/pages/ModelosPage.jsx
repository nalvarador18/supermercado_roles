import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
         ResponsiveContainer, ScatterChart, Scatter, ReferenceLine,
         LineChart, Line, Legend } from 'recharts'
import { api } from '../lib/api'
import { Loading, Alert, SectionHeader, Tabs } from '../components/ui'

export default function ModelosPage({ sessionId }) {
  const [tab,   setTab]   = useState('metricas')
  const [data,  setData]  = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    api.modelos(sessionId)
      .then(d => { setData(p => ({ ...p, metricas: d })); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [sessionId])

  async function loadTab(id) {
    setTab(id)
    if (data[id]) return
    try {
      let d
      if (id === 'scatter')  d = await api.scatter(sessionId)
      if (id === 'cv')       d = await api.crossVal(sessionId)
      if (id === 'hiperp')   d = await api.hiperparametros(sessionId)
      if (id === 'curvas')   d = await api.curvas(sessionId)
      if (id === 'importancia') d = await api.importancia(sessionId)
      setData(p => ({ ...p, [id]: d }))
    } catch (e) { setError(e.message) }
  }

  const tabs = [
    { id: 'metricas',    label: 'Métricas'          },
    { id: 'scatter',     label: 'Real vs Predicho'  },
    { id: 'cv',          label: 'Validación Cruzada'},
    { id: 'curvas',      label: 'Curvas Aprendizaje'},
    { id: 'hiperp',      label: 'Hiperparámetros'   },
    { id: 'importancia', label: 'Feature Importance'},
  ]

  if (loading) return <Loading text="Entrenando modelos..." />
  if (error)   return <Alert type="critical" title="Error">{error}</Alert>

  const resultados = data.metricas?.resultados || []

  return (
    <div className="fade-in">
      <SectionHeader
        title='Comparación de <em>Modelos ML</em>'
        subtitle="4 modelos · Validación cruzada K=5 · Optimización de hiperparámetros"
      />

      <Tabs tabs={tabs} active={tab} onChange={loadTab} />

      {/* ── Métricas ── */}
      {tab === 'metricas' && (
        <div>
          {data.metricas?.advertencia && (
            <Alert type="warning">{data.metricas.advertencia}</Alert>
          )}
          <div style={{ marginBottom: 20 }}>
            {resultados.map((r, i) => {
              const isWinner = r.modelo === 'Random Forest'
              const r2cls = r.r2 >= 0.8 ? 'good' : r.r2 < 0 ? 'bad' : ''
              return (
                <div key={i} className={`model-row fade-in stagger-${i+1} ${isWinner ? 'winner' : ''}`}>
                  <div>
                    <div className="model-row-name">{r.modelo}</div>
                    {isWinner && <div className="model-row-badge">Modelo Seleccionado</div>}
                  </div>
                  <div className="model-row-metrics">
                    {[['MSE', r.mse], ['RMSE', r.rmse], ['MAE', r.mae]].map(([l, v]) => (
                      <div className="metric-col" key={l}>
                        <div className="metric-col-label">{l}</div>
                        <div className="metric-col-value">{v}</div>
                      </div>
                    ))}
                    <div className="metric-col">
                      <div className="metric-col-label">R²</div>
                      <div className={`metric-col-value ${r2cls}`}>{r.r2}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Gráfica R² */}
          <div className="chart-container">
            <div className="chart-title">Comparación R² por Modelo</div>
            <div className="chart-subtitle">Positivo = bueno · Negativo = peor que la media</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={resultados.map(r => ({ name: r.modelo, r2: r.r2 }))}
                        margin={{ top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4ddd3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontFamily:'IBM Plex Mono', fontSize:10 }} stroke="#b0b0b0" />
                <YAxis tick={{ fontFamily:'IBM Plex Mono', fontSize:10 }} stroke="#b0b0b0" />
                <ReferenceLine y={0} stroke="#7a7a7a" strokeDasharray="4 2" />
                <Tooltip contentStyle={{ fontFamily:'IBM Plex Mono', fontSize:11,
                                          background:'#fff', border:'1px solid #e4ddd3', borderRadius:8 }} />
                <Bar dataKey="r2" radius={[4,4,0,0]}
                     fill="#4338ca"
                     label={{ position:'top', fontFamily:'IBM Plex Mono', fontSize:10, fill:'#3a3a3a' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Scatter ── */}
      {tab === 'scatter' && (
        <div>
          {!data.scatter ? <Loading text="Cargando scatter plots..." /> : (
            <div className="grid-2">
              {data.scatter.map((d, i) => (
                <div className="chart-container" key={i}>
                  <div className="chart-title">{d.modelo}</div>
                  <div className="chart-subtitle">Real vs Predicho</div>
                  <ResponsiveContainer width="100%" height={230}>
                    <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e4ddd3" />
                      <XAxis type="number" dataKey="x" name="Real"
                             tick={{ fontFamily:'IBM Plex Mono', fontSize:9 }} stroke="#b0b0b0" />
                      <YAxis type="number" dataKey="y" name="Predicho"
                             tick={{ fontFamily:'IBM Plex Mono', fontSize:9 }} stroke="#b0b0b0" />
                      <Tooltip cursor={{ strokeDasharray:'3 3' }}
                               contentStyle={{ fontFamily:'IBM Plex Mono', fontSize:11,
                                               background:'#fff', border:'1px solid #e4ddd3', borderRadius:8 }}
                               formatter={(v, n) => [v.toFixed(2), n]} />
                      <Scatter data={d.puntos.map(([x,y]) => ({ x, y }))}
                               fill={d.modelo === 'Random Forest' ? '#4338ca' : '#6366f1'}
                               opacity={0.65} />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── CV ── */}
      {tab === 'cv' && (
        <div>
          {!data.cv ? <Loading text="Calculando validación cruzada..." /> : (
            <>
              {data.cv.map((c, i) => (
                <div key={i} className={`cv-card fade-in stagger-${i+1} ${c.modelo==='Random Forest'?'winner':''}`}>
                  <div className="cv-card-title">
                    {c.modelo === 'Random Forest' ? '✓ ' : ''}{c.modelo}
                  </div>
                  <div className="fold-chips">
                    {c.folds.map((v, j) => (
                      <div className="fold-chip" key={j}>
                        Fold {j+1}: <strong>{v}</strong>
                      </div>
                    ))}
                  </div>
                  <div className="cv-avg">
                    R² Promedio: <strong>{c.promedio}</strong>
                    &nbsp;·&nbsp; σ = {c.std}
                  </div>
                </div>
              ))}
              {/* Gráfica folds */}
              <div className="chart-container mt-6" style={{ marginTop: 24 }}>
                <div className="chart-title">R² por Fold</div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={[1,2,3,4,5].map(f => ({
                      fold: `Fold ${f}`,
                      ...Object.fromEntries(data.cv.map(c => [c.modelo, c.folds[f-1]]))
                    }))}
                    margin={{ top: 10, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4ddd3" vertical={false} />
                    <XAxis dataKey="fold" tick={{ fontFamily:'IBM Plex Mono', fontSize:10 }} stroke="#b0b0b0" />
                    <YAxis tick={{ fontFamily:'IBM Plex Mono', fontSize:10 }} stroke="#b0b0b0" />
                    <Tooltip contentStyle={{ fontFamily:'IBM Plex Mono', fontSize:11,
                                             background:'#fff', border:'1px solid #e4ddd3', borderRadius:8 }} />
                    <Legend wrapperStyle={{ fontFamily:'IBM Plex Mono', fontSize:10 }} />
                    <Bar dataKey="Regresión Múltiple" fill="#818cf8" radius={[3,3,0,0]} />
                    <Bar dataKey="Random Forest"      fill="#4338ca" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Curvas ── */}
      {tab === 'curvas' && (
        <div>
          {!data.curvas ? <Loading text="Generando curvas de aprendizaje..." /> : (
            <div className="grid-2">
              {data.curvas.map((c, i) => (
                <div className="chart-container" key={i}>
                  <div className="chart-title">{c.modelo}</div>
                  <div className="chart-subtitle">Error MSE en entrenamiento vs prueba</div>
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart
                      data={c.sizes.map((s, j) => ({
                        muestras: Math.round(s),
                        Entrenamiento: +c.train_errors[j].toFixed(3),
                        Prueba:        +c.test_errors[j].toFixed(3),
                      }))}
                      margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e4ddd3" />
                      <XAxis dataKey="muestras" tick={{ fontFamily:'IBM Plex Mono', fontSize:9 }} stroke="#b0b0b0" />
                      <YAxis tick={{ fontFamily:'IBM Plex Mono', fontSize:9 }} stroke="#b0b0b0" />
                      <Tooltip contentStyle={{ fontFamily:'IBM Plex Mono', fontSize:11,
                                               background:'#fff', border:'1px solid #e4ddd3', borderRadius:8 }} />
                      <Legend wrapperStyle={{ fontFamily:'IBM Plex Mono', fontSize:10 }} />
                      <Line type="monotone" dataKey="Entrenamiento" stroke="#4338ca" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="Prueba"        stroke="#d97706" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Hiperparámetros ── */}
      {tab === 'hiperp' && (
        <div>
          {!data.hiperp ? <Loading text="Buscando hiperparámetros óptimos..." /> : (
            <div className="grid-2">
              <div>
                <div className="chart-container" style={{ marginBottom: 20 }}>
                  <div className="chart-title">Tabla de Resultados</div>
                  <div className="chart-subtitle">n_estimators × max_depth</div>
                  <div style={{ overflowY: 'auto', maxHeight: 380 }}>
                    <table className="data-table">
                      <thead>
                        <tr><th>n_estimators</th><th>max_depth</th><th>R²</th></tr>
                      </thead>
                      <tbody>
                        {data.hiperp.tabla.map((r, i) => (
                          <tr key={i}>
                            <td>{r.n_estimators}</td>
                            <td>{r.max_depth}</td>
                            <td style={{ color: 'var(--indigo)', fontWeight: 600 }}>{r.r2}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div>
                <div className="card" style={{ borderColor:'var(--indigo)', background:'var(--indigo-dim)', marginBottom:20 }}>
                  <div style={{ fontFamily:'var(--font-mono)', fontSize:10, textTransform:'uppercase',
                                letterSpacing:'.12em', color:'var(--indigo)', marginBottom:16 }}>
                    🏆 Mejor Configuración
                  </div>
                  {[
                    ['n_estimators', data.hiperp.mejor.n_estimators],
                    ['max_depth',    data.hiperp.mejor.max_depth],
                    ['R²',           data.hiperp.mejor.r2],
                  ].map(([l, v]) => (
                    <div key={l} style={{ marginBottom: 14 }}>
                      <div style={{ fontFamily:'var(--font-mono)', fontSize:9, textTransform:'uppercase',
                                    letterSpacing:'.1em', color:'var(--ink-3)', marginBottom:4 }}>{l}</div>
                      <div style={{ fontFamily:'var(--font-serif)', fontSize:32, color:'var(--ink)' }}>{v}</div>
                    </div>
                  ))}
                </div>
                {/* Mini chart */}
                <div className="chart-container">
                  <div className="chart-title">R² por combinación</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={data.hiperp.tabla.slice(0,8)}
                              margin={{ top:5, bottom:5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e4ddd3" vertical={false} />
                      <XAxis dataKey="n_estimators" tick={{ fontFamily:'IBM Plex Mono', fontSize:9 }} stroke="#b0b0b0" />
                      <YAxis tick={{ fontFamily:'IBM Plex Mono', fontSize:9 }} stroke="#b0b0b0" />
                      <Tooltip contentStyle={{ fontFamily:'IBM Plex Mono', fontSize:11,
                                               background:'#fff', border:'1px solid #e4ddd3', borderRadius:8 }} />
                      <Bar dataKey="r2" fill="#4338ca" radius={[3,3,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Feature Importance ── */}
      {tab === 'importancia' && (
        <div>
          {!data.importancia ? <Loading text="Calculando importancia..." /> : (
            <div className="chart-container">
              <div className="chart-title">Top 15 Variables más Importantes</div>
              <div className="chart-subtitle">Random Forest — feature importance</div>
              <ResponsiveContainer width="100%" height={420}>
                <BarChart data={[...data.importancia].reverse()} layout="vertical"
                          margin={{ left: 20, right: 30, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4ddd3" horizontal={false} />
                  <XAxis type="number" tick={{ fontFamily:'IBM Plex Mono', fontSize:9 }} stroke="#b0b0b0" />
                  <YAxis type="category" dataKey="variable" width={150}
                         tick={{ fontFamily:'IBM Plex Mono', fontSize:9 }} stroke="#b0b0b0" />
                  <Tooltip contentStyle={{ fontFamily:'IBM Plex Mono', fontSize:11,
                                           background:'#fff', border:'1px solid #e4ddd3', borderRadius:8 }}
                           formatter={v => [v.toFixed(6), 'Importancia']} />
                  <Bar dataKey="importancia" fill="#4338ca" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
