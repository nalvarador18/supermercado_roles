import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
         PieChart, Pie, Cell, ScatterChart, Scatter,
         CartesianGrid, Legend } from 'recharts'
import { api } from '../lib/api'
import { Loading, Alert, SectionHeader, Tabs } from '../components/ui'

const COLORS = ['#4338ca','#6366f1','#818cf8','#a5b4fc','#c7d2fe',
                '#d97706','#f59e0b','#059669','#10b981','#34d399']

export default function AnalisisPage({ sessionId }) {
  const [data, setData]   = useState(null)
  const [tab,  setTab]    = useState('stats')
  const [error, setError] = useState('')

  useEffect(() => {
    api.eda(sessionId)
      .then(setData)
      .catch(e => setError(e.message))
  }, [sessionId])

  if (error) return <Alert type="critical" title="Error">{error}</Alert>
  if (!data)  return <Loading text="Analizando datos..." />

  const tabs = [
    { id: 'stats',  label: 'Estadísticas' },
    { id: 'charts', label: 'Gráficas'     },
    { id: 'corr',   label: 'Correlaciones'},
  ]

  const topProductos = data.top_productos || []
  const categorias   = data.ventas_categoria || []

  return (
    <div className="fade-in">
      <SectionHeader
        title='Análisis <em>Exploratorio</em>'
        subtitle={`${data.total_registros?.toLocaleString()} registros · EDA · Feature Engineering`}
      />

      {/* KPIs rápidos */}
      {data.estadisticas?.Salidas && (
        <div className="kpi-grid kpi-grid-4 mb-6" style={{ marginBottom: 28 }}>
          {[
            { label: 'Total Salidas',    val: Math.round(data.estadisticas.Salidas.sum ?? data.estadisticas.Salidas['75%'] * data.total_registros / 100), unit: 'uds' },
            { label: 'Promedio Diario',  val: data.estadisticas.Salidas.mean?.toFixed(1), unit: 'uds/día' },
            { label: 'Máximo',           val: data.estadisticas.Salidas.max, unit: 'uds' },
            { label: 'Desv. Estándar',   val: data.estadisticas.Salidas.std?.toFixed(2), unit: 'σ' },
          ].map((k, i) => (
            <div key={i} className={`kpi fade-in stagger-${i+1}`}>
              <div className="kpi-label">{k.label}</div>
              <div className="kpi-value" style={{ fontSize: 28 }}>{k.val}</div>
              <div className="kpi-unit">{k.unit}</div>
            </div>
          ))}
        </div>
      )}

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === 'stats' && (
        <div>
          {/* Nulos */}
          {Object.values(data.nulos || {}).every(v => v === 0) ? (
            <Alert type="optimal" title="Sin valores nulos">
              El dataset está completo — no se requiere imputación adicional.
            </Alert>
          ) : (
            <Alert type="warning" title="Valores nulos detectados">
              Se encontraron nulos en algunas columnas. Se imputaron con 0.
            </Alert>
          )}

          {/* Tabla de estadísticas */}
          {data.estadisticas && (
            <div className="card card-flush mt-6">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Estadístico</th>
                    {Object.keys(data.estadisticas).map(c => <th key={c}>{c}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {['count','mean','std','min','25%','50%','75%','max'].map(stat => (
                    <tr key={stat}>
                      <td style={{ fontWeight: 600, color: 'var(--indigo)' }}>{stat}</td>
                      {Object.values(data.estadisticas).map((col, i) => (
                        <td key={i}>{col[stat] != null ? Number(col[stat]).toFixed(2) : '—'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'charts' && (
        <div className="grid-2">
          {/* Top 10 productos */}
          <div className="chart-container">
            <div className="chart-title">Top 10 Productos</div>
            <div className="chart-subtitle">Por total de salidas acumuladas</div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topProductos} layout="vertical"
                        margin={{ left: 10, right: 20, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4ddd3" horizontal={false} />
                <XAxis type="number" tick={{ fontFamily: 'IBM Plex Mono', fontSize: 10 }}
                       stroke="#b0b0b0" />
                <YAxis type="category" dataKey="Producto" width={130}
                       tick={{ fontFamily: 'IBM Plex Mono', fontSize: 9 }} stroke="#b0b0b0" />
                <Tooltip
                  contentStyle={{ fontFamily: 'IBM Plex Mono', fontSize: 11,
                                   background: '#fff', border: '1px solid #e4ddd3', borderRadius: 8 }}
                />
                <Bar dataKey="Salidas" fill="#4338ca" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie categorías */}
          <div className="chart-container">
            <div className="chart-title">Ventas por Categoría</div>
            <div className="chart-subtitle">Distribución porcentual</div>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={categorias} dataKey="Salidas" nameKey="Categoría"
                     cx="50%" cy="50%" outerRadius={100} innerRadius={50}
                     paddingAngle={3} label={({ name, percent }) =>
                       `${name} ${(percent*100).toFixed(0)}%`}
                     labelLine={{ stroke: '#b0b0b0' }}>
                  {categorias.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ fontFamily: 'IBM Plex Mono', fontSize: 11,
                                   background: '#fff', border: '1px solid #e4ddd3', borderRadius: 8 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {tab === 'corr' && (
        <div className="chart-container">
          <div className="chart-title">Mapa de Correlaciones</div>
          <div className="chart-subtitle">Variables numéricas del dataset</div>
          {data.correlaciones && Object.keys(data.correlaciones).length > 0 ? (
            <CorrHeatmap corr={data.correlaciones} />
          ) : (
            <Alert type="info">No hay suficientes variables numéricas para calcular correlaciones.</Alert>
          )}
        </div>
      )}
    </div>
  )
}

function CorrHeatmap({ corr }) {
  const cols = Object.keys(corr)
  const vals = cols.map(r => cols.map(c => corr[r]?.[c] ?? 0))
  const color = v => {
    const abs = Math.abs(v)
    if (v > 0) return `rgba(67,56,202,${abs.toFixed(2)})`
    return `rgba(220,38,38,${abs.toFixed(2)})`
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th style={{ padding: '8px 12px' }}></th>
            {cols.map(c => <th key={c} style={{ padding: '8px 12px', fontFamily: 'IBM Plex Mono',
              fontSize: 10, color: 'var(--ink-3)', fontWeight: 500, textAlign: 'center',
              whiteSpace: 'nowrap' }}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {cols.map((row, i) => (
            <tr key={row}>
              <td style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, padding: '4px 12px',
                           color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>{row}</td>
              {vals[i].map((v, j) => (
                <td key={j} style={{ background: color(v), padding: '10px 12px',
                  textAlign: 'center', fontFamily: 'IBM Plex Mono', fontSize: 11,
                  fontWeight: 500, color: Math.abs(v) > 0.5 ? 'white' : 'var(--ink)' }}>
                  {v.toFixed(2)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
