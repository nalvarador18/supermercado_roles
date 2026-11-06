// components/ui/index.jsx — componentes reutilizables

export function Spinner({ size = 20 }) {
  return <div className="spinner" style={{ width: size, height: size }} />
}

export function Loading({ text = 'Cargando...' }) {
  return (
    <div className="loading-state">
      <Spinner size={28} />
      <span>{text}</span>
    </div>
  )
}

export function Alert({ type = 'info', title, children }) {
  const icons = { optimal: '✓', warning: '⚠', critical: '✕', info: 'i' }
  return (
    <div className={`alert ${type}`}>
      <div className="alert-icon">{icons[type]}</div>
      <div>
        {title && <div className="alert-title">{title}</div>}
        <div className="alert-body">{children}</div>
      </div>
    </div>
  )
}

export function Badge({ type = 'indigo', children }) {
  return <span className={`badge ${type}`}>{children}</span>
}

export function Divider() {
  return <div className="divider" />
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="tabs">
      {tabs.map(t => (
        <div
          key={t.id}
          className={`tab ${active === t.id ? 'active' : ''}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </div>
      ))}
    </div>
  )
}

export function KPI({ label, value, unit, color = '', delta, deltaType }) {
  return (
    <div className={`kpi ${color} fade-in`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {unit && <div className="kpi-unit">{unit}</div>}
      {delta != null && (
        <div className={`kpi-delta ${deltaType || 'up'}`}>
          {deltaType === 'up' ? '↑' : '↓'} {Math.abs(delta)} días vs meta
        </div>
      )}
    </div>
  )
}

export function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="section-header">
      <div>
        <h2 className="section-title" dangerouslySetInnerHTML={{ __html: title }} />
        {subtitle && <div className="section-subtitle">{subtitle}</div>}
      </div>
      {action}
    </div>
  )
}
