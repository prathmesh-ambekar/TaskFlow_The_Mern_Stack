import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import AuthLayout from '../components/AuthLayout.jsx';

export default function Register() {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) return setError('Password must be at least 6 characters');
    setBusy(true);
    try {
      await register(form.name, form.email, form.password);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Create your account" subtitle="Plan every day, and see how you're doing">
      <form onSubmit={handleSubmit}>
        {error && <div className="alert shake" key={error}>{error}</div>}
        <label htmlFor="name">Name</label>
        <input id="name" name="name" value={form.name} onChange={handleChange} required minLength={2} autoComplete="name" />
        <label htmlFor="email">Email</label>
        <input id="email" type="email" name="email" value={form.email} onChange={handleChange} required autoComplete="email" />
        <label htmlFor="password">Password <span className="muted">(min 6 characters)</span></label>
        <input id="password" type="password" name="password" value={form.password} onChange={handleChange} required autoComplete="new-password" />
        <button className="btn primary block" disabled={busy}>{busy && <span className="spinner" />}{busy ? 'Creating account' : 'Create account'}</button>
        <p className="muted center">Already registered? <Link to="/login">Log in</Link></p>
      </form>
    </AuthLayout>
  );
}
