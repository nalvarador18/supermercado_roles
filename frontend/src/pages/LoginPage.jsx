import { useState } from 'react'
import { api } from '../lib/api'

export default function LoginPage({ onLogin }) {
  const [tab, setTab]       = useState('login')
  const [error, setError]   = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const [loginForm, setLoginForm]     = useState({ usuario: '', password: '' })
  const [regForm,   setRegForm]       = useState({
    nombres: '', apellidos: '', correo: '', fecha_nac: '', usuario: '', password: ''
  })

  async function handleLogin(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const data = await api.login(loginForm.usuario, loginForm.password)
      onLogin(data)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  async function handleRegister(e) {
    e.preventDefault()
    setError(''); setSuccess(''); setLoading(true)
    try {
      await api.register(regForm)
      setSuccess('Cuenta creada. Ya puedes iniciar sesión.')
      setTab('login')
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="login-page">
      <div className="login-card fade-in">
        <div className="login-card-header">
          <div className="login-eyebrow">■ SYSCOM Analytics</div>
          <h1 className="login-title">
            Panel de<br /><em>Control</em>
          </h1>
          <div className="login-subtitle">
            Sistema predictivo de inventario · v2.0
          </div>
        </div>

        <div className="login-card-body">
          <div className="login-tabs">
            <div className={`login-tab ${tab === 'login' ? 'active' : ''}`}
                 onClick={() => { setTab('login'); setError(''); setSuccess('') }}>
              Ingresar
            </div>
            <div className={`login-tab ${tab === 'register' ? 'active' : ''}`}
                 onClick={() => { setTab('register'); setError(''); setSuccess('') }}>
              Registrarse
            </div>
          </div>

          {tab === 'login' && (
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label">Usuario</label>
                <input className="form-input" placeholder="Admin"
                  value={loginForm.usuario}
                  onChange={e => setLoginForm(f => ({ ...f, usuario: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Contraseña</label>
                <input className="form-input" type="password" placeholder="••••••••"
                  value={loginForm.password}
                  onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))} />
              </div>
              <button className="btn btn-primary btn-full" disabled={loading}>
                {loading ? 'Verificando...' : 'Ingresar al Sistema'}
              </button>
            </form>
          )}

          {tab === 'register' && (
            <form onSubmit={handleRegister}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Nombres *</label>
                  <input className="form-input" value={regForm.nombres}
                    onChange={e => setRegForm(f => ({ ...f, nombres: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Apellidos</label>
                  <input className="form-input" value={regForm.apellidos}
                    onChange={e => setRegForm(f => ({ ...f, apellidos: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Correo corporativo *</label>
                <input className="form-input" type="email" value={regForm.correo}
                  onChange={e => setRegForm(f => ({ ...f, correo: e.target.value }))} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Usuario *</label>
                  <input className="form-input" value={regForm.usuario}
                    onChange={e => setRegForm(f => ({ ...f, usuario: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Contraseña *</label>
                  <input className="form-input" type="password" value={regForm.password}
                    onChange={e => setRegForm(f => ({ ...f, password: e.target.value }))} />
                </div>
              </div>
              <button className="btn btn-primary btn-full" disabled={loading}>
                {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
              </button>
            </form>
          )}

          {error   && <div className="login-error">✕  {error}</div>}
          {success && <div className="login-error" style={{ background:'#d1fae5', borderColor:'#a7f3d0', color:'#065f46' }}>✓  {success}</div>}

          <div style={{ marginTop: 20, textAlign: 'center',
                        fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)' }}>
            Demo: Admin / 1234
          </div>
        </div>
      </div>
    </div>
  )
}
