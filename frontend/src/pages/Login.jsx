import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import AuthLayout from '../components/AuthLayout.jsx';

export default function Login() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(form.email, form.password);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to plan your day">
      <form onSubmit={handleSubmit}>
        {error && <div className="alert shake" key={error}>{error}</div>}
        <label htmlFor="email">Email</label>
        <input id="email" type="email" name="email" value={form.email} onChange={handleChange} required autoComplete="email" />
        <label htmlFor="password">Password</label>
        <input id="password" type="password" name="password" value={form.password} onChange={handleChange} required autoComplete="current-password" />
        <button className="btn primary block" disabled={busy}>{busy && <span className="spinner" />}{busy ? 'Logging in' : 'Log in'}</button>
        <p className="muted center">No account? <Link to="/register">Create one</Link></p>
      </form>
    </AuthLayout>
  );
}
