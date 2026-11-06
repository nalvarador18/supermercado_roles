import { useState, useCallback } from 'react'
import LoginPage              from './pages/LoginPage'
import AnalisisPage           from './pages/AnalisisPage'
import ModelosPage            from './pages/ModelosPage'
import DashboardPage          from './pages/DashboardPage'
import NotificacionesPage     from './pages/NotificacionesPage'
import EmpleadosPage          from './pages/EmpleadosPage'
import EmpleadoDashboardPage  from './pages/EmpleadoDashboardPage'
import { api } from './lib/api'
import {
  BarChart2, FlaskConical, LayoutDashboard,
  Bell, LogOut, Upload, Users, ShieldCheck
} from 'lucide-react'

// Navegación según rol
const NAV_ADMIN = [
  { id: 'dashboard', label: 'Dashboard',       icon: LayoutDashboard },
  { id: 'analisis',  label: 'Análisis EDA',    icon: BarChart2 },
  { id: 'modelos',   label: 'Modelos ML',      icon: FlaskConical },
  { id: 'notif',     label: 'Notificaciones',  icon: Bell },
  { id: 'empleados', label: 'Empleados',       icon: Users },
]

const NAV_EMPLEADO = [
  { id: 'dashboard', label: 'Mi Dashboard',    icon: LayoutDashboard },
  { id: 'notif',     label: 'Notificaciones',  icon: Bell },
]

export default function App() {
  const [user,       setUser]       = useState(null)
  const [page,       setPage]       = useState('dashboard')
  const [session,    setSession]    = useState(null)
  const [dias,       setDias]       = useState(30)
  const [notifCount, setNotifCount] = useState(0)
  const [sid,        setSid]        = useState(null)

  const isAdmin    = user?.rol === 'admin'
  const NAV        = isAdmin ? NAV_ADMIN : NAV_EMPLEADO

  function handleLogin(data) {
    setUser(data)
    setSid(`${data.usuario}_${Date.now()}`)
    setPage('dashboard')
  }

  function handleLogout() {
    setUser(null); setSession(null); setSid(null); setPage('dashboard')
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file || !sid) return
    try {
      const res = await api.upload(file, sid, user.usuario, dias)
      setSession({ id: sid, filename: file.name, registros: res.registros, alertas: res.alertas_generadas })
      setNotifCount(res.alertas_generadas)
      setPage('dashboard')
    } catch (err) {
      alert('Error al cargar el archivo: ' + err.message)
    }
  }

  if (!user) return <LoginPage onLogin={handleLogin} />

  return (
    <div className="app-shell">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">■ SYSCOM</div>
          <div className="sidebar-logo-name">
            Plataforma<br /><em>Analítica</em>
          </div>
        </div>

        <div className="sidebar-user">
          <div className="sidebar-user-name">@{user.usuario}</div>
          <div className="sidebar-user-role" style={{
            display: 'flex', alignItems: 'center', gap: 5,
            color: isAdmin ? 'var(--indigo)' : 'var(--amber)'
          }}>
            {isAdmin
              ? <><ShieldCheck size={11} /> Administrador</>
              : <><Users size={11} /> Empleado</>
            }
          </div>
        </div>

        <div className="sidebar-section-label">Módulos</div>

        {NAV.map(n => {
          const Icon = n.icon
          const isNotif = n.id === 'notif'
          return (
            <div key={n.id}
                 className={`nav-item ${page === n.id ? 'active' : ''}`}
                 onClick={() => setPage(n.id)}>
              <Icon className="nav-item-icon" size={18} />
              <span className="nav-item-label">{n.label}</span>
              {isNotif && notifCount > 0 && (
                <span className="nav-badge">{notifCount}</span>
              )}
            </div>
          )
        })}

        <div className="sidebar-section-label">Datos</div>

        {/* Upload — visible para ambos roles */}
        <div style={{ padding: '4px 16px 12px' }}>
          <label style={{ cursor: 'pointer' }}>
            <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }}
                   onChange={handleFileChange} />
            <div className="btn btn-outline btn-sm btn-full"
                 style={{ justifyContent: 'flex-start', gap: 8, cursor: 'pointer' }}>
              <Upload size={14} /> Subir Excel
            </div>
          </label>
          {session && (
            <div style={{ marginTop: 10, padding: '8px 12px',
                          background: '#1a1f25', borderRadius: 'var(--r)',
                          fontFamily: 'var(--font-mono)' }}>
              <div style={{ fontSize: 10, color: '#4f5a66', marginBottom: 3 }}>ARCHIVO ACTIVO</div>
              <div style={{ fontSize: 11, color: '#c8d0da', wordBreak: 'break-all' }}>
                {session.filename}
              </div>
              <div style={{ fontSize: 10, color: '#4f5a66', marginTop: 3 }}>
                {session.registros?.toLocaleString()} registros
              </div>
              {session.alertas > 0 && (
                <div style={{ fontSize: 10, color: '#f59e0b', marginTop: 3 }}>
                  ⚠ {session.alertas} alertas generadas
                </div>
              )}
            </div>
          )}

          {/* Días historial — solo admin lo ve (el empleado no necesita ajustarlo) */}
          {isAdmin && (
            <div style={{ marginTop: 10 }}>
              <label style={{ fontFamily: 'var(--font-mono)', fontSize: 9, textTransform: 'uppercase',
                              letterSpacing: '.1em', color: '#4f5a66', display: 'block', marginBottom: 6 }}>
                Días de historial
              </label>
              <input type="number" min={1} max={365} value={dias}
                     onChange={e => setDias(+e.target.value)}
                     style={{ width: '100%', background: '#1a1f25', border: '1px solid #242b33',
                              borderRadius: 4, padding: '6px 10px', color: '#c8d0da',
                              fontFamily: 'IBM Plex Mono', fontSize: 12, outline: 'none' }} />
            </div>
          )}
        </div>

        <div className="sidebar-bottom">
          <button className="btn btn-ghost btn-sm btn-full"
                  style={{ color: '#4f5a66', justifyContent: 'flex-start', gap: 8 }}
                  onClick={handleLogout}>
            <LogOut size={14} /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="main-content">
        <div className="top-bar">
          <div>
            <div className="top-bar-title">
              {NAV.find(n => n.id === page)?.label || 'Panel'}
            </div>
          </div>
          <div className="top-bar-meta">Universidad Central · 2026</div>
        </div>

        <div className="page-body">
          {!session ? (
            <div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 32,
                            marginBottom: 12, color: 'var(--ink)' }}>
                Bienvenido, <em style={{ fontStyle: 'italic', color: 'var(--indigo)' }}>
                  {user.nombres || user.usuario}
                </em>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12,
                            color: 'var(--ink-4)', marginBottom: 32,
                            textTransform: 'uppercase', letterSpacing: '.1em' }}>
                {isAdmin
                  ? 'Sube tu archivo Excel para comenzar el análisis'
                  : 'Solicita al administrador que cargue el inventario, o sube el archivo Excel'}
              </div>
              <label style={{ cursor: 'pointer' }}>
                <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }}
                       onChange={handleFileChange} />
                <div className="upload-zone">
                  <div className="upload-zone-icon">
                    <Upload size={40} strokeWidth={1} />
                  </div>
                  <div className="upload-zone-title">Arrastra tu inventario aquí</div>
                  <div className="upload-zone-sub">.xlsx · .xls · Máx. 200 MB</div>
                </div>
              </label>
            </div>
          ) : (
            <>
              {/* ── Vistas ADMIN ── */}
              {isAdmin && page === 'dashboard'  && <DashboardPage sessionId={session.id} diasHistorial={dias} />}
              {isAdmin && page === 'analisis'   && <AnalisisPage  sessionId={session.id} />}
              {isAdmin && page === 'modelos'    && <ModelosPage   sessionId={session.id} />}
              {isAdmin && page === 'empleados'  && <EmpleadosPage adminUsuario={user.usuario} />}

              {/* ── Vistas EMPLEADO ── */}
              {!isAdmin && page === 'dashboard' && <EmpleadoDashboardPage sessionId={session.id} diasHistorial={dias} />}

              {/* Notificaciones — ambos roles */}
              {page === 'notif' && (
                <NotificacionesPage usuario={user.usuario} onCountChange={setNotifCount} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
