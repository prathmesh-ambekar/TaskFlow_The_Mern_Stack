import Icon from './Icon.jsx';

// Shared frame for the login and register pages
export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="auth-wrap">
      <div className="blob b1" aria-hidden="true" />
      <div className="blob b2" aria-hidden="true" />
      <div className="auth-card card">
        <div className="brand auth-brand">
          <span className="brand-mark"><Icon name="check" size={16} strokeWidth={3} /></span>
          TaskFlow
        </div>
        <h1>{title}</h1>
        <p className="muted">{subtitle}</p>
        {children}
      </div>
    </div>
  );
}
