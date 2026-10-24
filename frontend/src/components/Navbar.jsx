import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../hooks.js';
import Icon from './Icon.jsx';

const LINKS = [
  { to: '/', label: 'Today', icon: 'today' },
  { to: '/habits', label: 'Habits', icon: 'repeat' },
  { to: '/analytics', label: 'Analytics', icon: 'chart' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand">
          <span className="brand-mark"><Icon name="check" size={16} strokeWidth={3} /></span>
          TaskFlow
        </div>
        <nav className="nav">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end>
              <Icon name={l.icon} size={17} />
              <span>{l.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="row">
          <button
            className="icon-btn"
            onClick={toggle}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            <Icon key={theme} name={theme === 'dark' ? 'sun' : 'moon'} className="spin-in" />
          </button>
          <span className="avatar hide-sm" title={user.email}>{user.name.trim().charAt(0).toUpperCase()}</span>
          <button className="icon-btn" onClick={logout} aria-label="Log out" title="Log out">
            <Icon name="logout" />
          </button>
        </div>
      </div>
    </header>
  );
}
