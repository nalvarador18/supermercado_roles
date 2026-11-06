const BASE = import.meta.env.VITE_API_URL || '/api'

async function req(method, path, body, isForm = false) {
  const opts = { method, headers: {} }
  if (body) {
    if (isForm) { opts.body = body }
    else { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body) }
  }
  const res = await fetch(`${BASE}${path}`, opts)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Error del servidor')
  }
  return res.json()
}

export const api = {
  login:    (usuario, password) => req('POST', '/auth/login', { usuario, password }),
  register: (data)              => req('POST', '/auth/register', data),

  upload: (file, sessionId, usuario, diasHistorial) => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('session_id', sessionId)
    fd.append('usuario', usuario)
    fd.append('dias_historial', diasHistorial)
    return req('POST', '/analytics/upload', fd, true)
  },

  eda:             sid => req('GET', `/analytics/eda/${sid}`),
  modelos:         sid => req('GET', `/analytics/modelos/${sid}`),
  scatter:         sid => req('GET', `/analytics/modelos/${sid}/scatter`),
  crossVal:        sid => req('GET', `/analytics/modelos/${sid}/cv`),
  hiperparametros: sid => req('GET', `/analytics/modelos/${sid}/hiperparametros`),
  curvas:          sid => req('GET', `/analytics/modelos/${sid}/curvas`),
  importancia:     sid => req('GET', `/analytics/modelos/${sid}/importancia`),

  productos: sid => req('GET', `/analytics/dashboard/${sid}/productos`),
  predecir:  (sid, producto, diasHist, diasProy) =>
    req('GET', `/analytics/dashboard/${sid}/predecir?producto=${encodeURIComponent(producto)}&dias_historial=${diasHist}&dias_proyectar=${diasProy}`),
  criticos:  (sid, diasHist) =>
    req('GET', `/analytics/dashboard/${sid}/criticos?dias_historial=${diasHist}`),

  // Admin: gestión de empleados
  crearEmpleado:   (data)     => req('POST', '/auth/empleados', data),
  listarEmpleados: ()         => req('GET',  '/auth/empleados'),
  eliminarEmpleado:(usuario)  => req('DELETE', `/auth/empleados/${usuario}`),

  notificaciones: usuario => req('GET', `/analytics/notificaciones/${usuario}`),
  crearNotif:     (usuario, tipo, titulo, mensaje) =>
    req('POST', `/analytics/notificaciones/${usuario}?tipo=${tipo}&titulo=${encodeURIComponent(titulo)}&mensaje=${encodeURIComponent(mensaje)}`),
  limpiarNotifs:  usuario => req('DELETE', `/analytics/notificaciones/${usuario}`),
}
