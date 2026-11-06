import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import { Loading, Alert, SectionHeader } from '../components/ui'
import { UserPlus, Trash2, Users, ShieldCheck, RefreshCw } from 'lucide-react'

export default function EmpleadosPage({ adminUsuario }) {
  const [empleados, setEmpleados] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [success,   setSuccess]   = useState('')
  const [deleting,  setDeleting]  = useState(null)

  const [form, setForm] = useState({
    nombres: '', apellidos: '', correo: '', usuario: '', password: ''
  })
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const data = await api.listarEmpleados()
      setEmpleados(data)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  async function handleCrear(e) {
    e.preventDefault()
    if (!form.nombres || !form.correo || !form.usuario || !form.password) {
      setError('Completa todos los campos obligatorios.'); return
    }
    setCreating(true); setError(''); setSuccess('')
    try {
      await api.crearEmpleado({ ...form, admin_usuario: adminUsuario })
      setSuccess(`Empleado "${form.usuario}" creado exitosamente.`)
      setForm({ nombres: '', apellidos: '', correo: '', usuario: '', password: '' })
      setShowForm(false)
      cargar()
    } catch (e) { setError(e.message) }
    finally { setCreating(false) }
  }

  async function handleEliminar(usuario) {
    if (!confirm(`¿Eliminar al empleado "${usuario}"? Esta acción no se puede deshacer.`)) return
    setDeleting(usuario); setError(''); setSuccess('')
    try {
      await api.eliminarEmpleado(usuario)
      setSuccess(`Empleado "${usuario}" eliminado.`)
      cargar()
    } catch (e) { setError(e.message) }
    finally { setDeleting(null) }
  }

  return (
    <div className="fade-in">
      <SectionHeader
        title='Gestión de <em>Empleados</em>'
        subtitle="Panel administrativo · Creación y administración de cuentas de empleados"
      />

      {/* Stats rápidos */}
      <div className="kpi-grid kpi-grid-3" style={{ marginBottom: 28 }}>
        <div className="kpi">
          <div className="kpi-label">Total Empleados</div>
          <div className="kpi-value" style={{ fontSize: 32 }}>{empleados.length}</div>
          <div className="kpi-unit">cuentas activas</div>
        </div>
        <div className="kpi amber">
          <div className="kpi-label">Rol Empleado</div>
          <div className="kpi-value" style={{ fontSize: 32 }}>{empleados.filter(e => e.rol === 'empleado').length}</div>
          <div className="kpi-unit">usuarios operativos</div>
        </div>
        <div className="kpi" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
          <ShieldCheck size={32} strokeWidth={1.5} style={{ color: 'var(--indigo)' }} />
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '.1em' }}>
            Rol Admin · <span style={{ color: 'var(--green)' }}>Activo</span>
          </div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 13, color: 'var(--ink-2)' }}>
            @{adminUsuario}
          </div>
        </div>
      </div>

      {/* Mensajes */}
      {error   && <Alert type="critical" title="Error">{error}</Alert>}
      {success && <Alert type="optimal" title="Éxito">{success}</Alert>}

      {/* Acciones */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 20 }}>
          Cuentas de <em style={{ fontStyle: 'italic', color: 'var(--indigo)' }}>Empleados</em>
        </h3>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline btn-sm" onClick={cargar}>
            <RefreshCw size={14} /> Actualizar
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => { setShowForm(v => !v); setError(''); setSuccess('') }}
          >
            <UserPlus size={14} /> Nuevo Empleado
          </button>
        </div>
      </div>

      {/* Formulario crear empleado */}
      {showForm && (
        <div className="card fade-in" style={{ marginBottom: 24, borderLeft: '3px solid var(--indigo)' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--indigo)', marginBottom: 16 }}>
            ▶ Crear nueva cuenta de empleado
          </div>
          <form onSubmit={handleCrear}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Nombres *</label>
                <input className="form-input" placeholder="Juan"
                  value={form.nombres}
                  onChange={e => setForm(f => ({ ...f, nombres: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Apellidos</label>
                <input className="form-input" placeholder="Pérez"
                  value={form.apellidos}
                  onChange={e => setForm(f => ({ ...f, apellidos: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Correo *</label>
              <input className="form-input" type="email" placeholder="juan@empresa.com"
                value={form.correo}
                onChange={e => setForm(f => ({ ...f, correo: e.target.value }))} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Usuario *</label>
                <input className="form-input" placeholder="jperez"
                  value={form.usuario}
                  onChange={e => setForm(f => ({ ...f, usuario: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Contraseña *</label>
                <input className="form-input" type="password" placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button className="btn btn-primary" disabled={creating}>
                {creating ? 'Creando...' : 'Crear Empleado'}
              </button>
              <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabla empleados */}
      {loading ? (
        <Loading text="Cargando empleados..." />
      ) : empleados.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <Users size={48} strokeWidth={1} style={{ color: 'var(--ink-4)', marginBottom: 16 }} />
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--ink-2)', marginBottom: 8 }}>
            Sin empleados registrados
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)' }}>
            Crea la primera cuenta con el botón "Nuevo Empleado"
          </div>
        </div>
      ) : (
        <div className="card card-flush">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Usuario</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Creado</th>
                <th style={{ textAlign: 'center' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {empleados.map((emp, i) => (
                <tr key={i}>
                  <td className="td-product">
                    {emp.nombres} {emp.apellidos}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    @{emp.usuario}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-3)' }}>
                    {emp.correo}
                  </td>
                  <td>
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: 10,
                      padding: '3px 8px', borderRadius: 4,
                      background: '#1a1f25', color: 'var(--amber)',
                      textTransform: 'uppercase', letterSpacing: '.08em'
                    }}>
                      {emp.rol}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)' }}>
                    {emp.creado_en?.slice(0, 10)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--red)', padding: '4px 10px' }}
                      disabled={deleting === emp.usuario}
                      onClick={() => handleEliminar(emp.usuario)}
                    >
                      {deleting === emp.usuario
                        ? '...'
                        : <><Trash2 size={13} /> Eliminar</>
                      }
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Nota sobre permisos */}
      <div style={{
        marginTop: 32, padding: '14px 18px',
        background: '#1a1f25', borderRadius: 'var(--r)',
        borderLeft: '3px solid var(--indigo)',
        fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)',
        lineHeight: 1.6
      }}>
        <span style={{ color: 'var(--indigo)' }}>ℹ PERMISOS —</span>{' '}
        Los empleados solo acceden al <strong style={{ color: 'var(--ink-2)' }}>Dashboard Operativo</strong> y{' '}
        <strong style={{ color: 'var(--ink-2)' }}>Notificaciones</strong>. No tienen acceso a análisis EDA,
        modelos ML ni a este panel de administración.
      </div>
    </div>
  )
}
