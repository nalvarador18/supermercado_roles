import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Loading, Alert, SectionHeader } from '../components/ui'

export default function NotificacionesPage({ usuario, onCountChange }) {
  const [notifs,  setNotifs]  = useState([])
  const [loading, setLoading] = useState(true)
  const [form,    setForm]    = useState({ tipo:'alerta', titulo:'', mensaje:'' })

  const load = () => {
    setLoading(true)
    api.notificaciones(usuario)
      .then(d => { setNotifs(d); onCountChange?.(d.length) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [usuario])

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.titulo || !form.mensaje) return
    await api.crearNotif(usuario, form.tipo, form.titulo, form.mensaje)
    setForm(f => ({ ...f, titulo:'', mensaje:'' }))
    load()
  }

  async function handleLimpiar() {
    await api.limpiarNotifs(usuario)
    load()
  }

  const criticas = notifs.filter(n => n.tipo === 'critica').length
  const alertas  = notifs.filter(n => n.tipo === 'alerta').length
  const oks      = notifs.filter(n => n.tipo === 'ok').length

  return (
    <div className="fade-in">
      <SectionHeader
        title='Centro de <em>Notificaciones</em>'
        subtitle="Alertas automáticas · Avisos manuales · Historial"
        action={notifs.length > 0 && (
          <button className="btn btn-outline btn-sm" onClick={handleLimpiar}>
            Limpiar todo
          </button>
        )}
      />

      {/* KPIs */}
      <div className="kpi-grid kpi-grid-3" style={{ marginBottom: 28 }}>
        <div className="kpi red">
          <div className="kpi-label">Críticas</div>
          <div className="kpi-value" style={{ fontSize:28 }}>{criticas}</div>
        </div>
        <div className="kpi amber">
          <div className="kpi-label">Alertas</div>
          <div className="kpi-value" style={{ fontSize:28 }}>{alertas}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Informativas</div>
          <div className="kpi-value" style={{ fontSize:28 }}>{oks}</div>
        </div>
      </div>

      {/* Agregar manual */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ fontFamily:'var(--font-mono)', fontSize:10, textTransform:'uppercase',
                      letterSpacing:'.1em', color:'var(--ink-3)', marginBottom:16 }}>
          ▸ Agregar notificación manual
        </div>
        <form onSubmit={handleAdd}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Título</label>
              <input className="form-input" value={form.titulo}
                     onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Tipo</label>
              <select className="form-input" value={form.tipo}
                      onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                <option value="alerta">Alerta</option>
                <option value="critica">Crítica</option>
                <option value="ok">Informativa</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Mensaje</label>
            <textarea className="form-input" rows={2} value={form.mensaje}
                      onChange={e => setForm(f => ({ ...f, mensaje: e.target.value }))}
                      style={{ resize:'vertical' }} />
          </div>
          <button className="btn btn-primary btn-sm">Guardar Notificación</button>
        </form>
      </div>

      {/* Historial */}
      {loading ? <Loading text="Cargando notificaciones..." /> :
       notifs.length === 0 ? (
         <div style={{ textAlign:'center', padding:'48px 24px',
                       fontFamily:'var(--font-mono)', fontSize:12, color:'var(--ink-4)',
                       border:'1.5px dashed var(--cream-3)', borderRadius:'var(--r-xl)' }}>
           Sin notificaciones registradas
         </div>
       ) : (
         <div>
           <div style={{ fontFamily:'var(--font-mono)', fontSize:10, textTransform:'uppercase',
                         letterSpacing:'.1em', color:'var(--ink-4)', marginBottom:12 }}>
             Historial — {notifs.length} registros
           </div>
           {notifs.map((n, i) => (
             <div key={i} className={`notif-item ${n.tipo} fade-in`}
                  style={{ animationDelay:`${i*0.04}s` }}>
               <div className="notif-header">
                 <span className="notif-title">
                   {n.tipo==='critica' ? '✕' : n.tipo==='ok' ? '✓' : '⚠'} {n.titulo}
                 </span>
                 <span className="notif-hora">{(n.creada||'').substring(11,19)}</span>
               </div>
               <div className="notif-msg">{n.mensaje}</div>
             </div>
           ))}
         </div>
       )}
    </div>
  )
}
