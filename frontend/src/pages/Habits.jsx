import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Modal from '../components/Modal.jsx';
import Icon from '../components/Icon.jsx';
import { formatDay } from '../dates.js';
import { prefersReducedMotion } from '../hooks.js';

const IDEAS = ['Exercise', 'Read 20 pages', 'Drink 8 glasses of water', 'Meditate 10 min', 'Plan tomorrow'];

// Modal for creating / editing a habit
function HabitForm({ habit, onSave, onClose }) {
  const [form, setForm] = useState({ title: habit?.title || '', description: habit?.description || '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e, close) => {
    e.preventDefault();
    if (!form.title.trim()) return setError('Title is required');
    setBusy(true);
    try {
      await onSave(form);
      close();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <Modal title={habit ? 'Edit habit' : 'New daily habit'} onClose={onClose}>
      {(close) => (
        <form onSubmit={(e) => handleSubmit(e, close)}>
          {error && <div className="alert">{error}</div>}
          <label htmlFor="h-title">Title</label>
          <input id="h-title" name="title" value={form.title} onChange={handleChange} maxLength={100} autoFocus placeholder="e.g. Morning walk" />
          {!habit && (
            <div className="ideas">
              {IDEAS.map((idea) => (
                <button type="button" key={idea} className="chip small" onClick={() => setForm({ ...form, title: idea })}>{idea}</button>
              ))}
            </div>
          )}
          <label htmlFor="h-desc">Description</label>
          <textarea id="h-desc" name="description" rows={3} value={form.description} onChange={handleChange} maxLength={500} placeholder="Optional details" />
          <p className="hint">
            <Icon name="repeat" size={15} />
            {habit ? 'Changes apply from today. Past days keep their old title.' : 'Added to your task list every day, starting today.'}
          </p>
          <div className="row end">
            <button type="button" className="btn ghost" onClick={close}>Cancel</button>
            <button className="btn primary" disabled={busy}>{busy ? <span className="spinner" /> : null}{busy ? 'Saving' : 'Save habit'}</button>
          </div>
        </form>
      )}
    </Modal>
  );
}

export default function Habits() {
  const { logout } = useAuth();
  const toast = useToast();
  const [habits, setHabits] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null = closed, {} = new, habit = edit
  const [leaving, setLeaving] = useState([]);

  const loadHabits = useCallback(async () => {
    try {
      const res = await api('/habits');
      setHabits(res.data.habits);
      setError('');
    } catch (err) {
      if (err.status === 401) logout();
      else setError(err.message);
    } finally {
      setLoading(false);
      setLeaving([]);
    }
  }, [logout]);

  useEffect(() => {
    loadHabits();
  }, [loadHabits]);

  const handleSave = async (form) => {
    if (editing && editing._id) {
      await api(`/habits/${editing._id}`, { method: 'PUT', body: form });
      toast('Habit updated');
    } else {
      await api('/habits', { method: 'POST', body: form });
      toast('Habit added to every day');
    }
    loadHabits();
  };

  const togglePause = async (h) => {
    try {
      await api(`/habits/${h._id}`, { method: 'PUT', body: { active: !h.active } });
      toast(h.active ? `"${h.title}" paused` : `"${h.title}" resumed`);
      loadHabits();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const handleDelete = async (h) => {
    if (!window.confirm(`Delete "${h.title}"? Past days stay in your analytics.`)) return;
    try {
      await api(`/habits/${h._id}`, { method: 'DELETE' });
      setLeaving((ids) => [...ids, h._id]);
      setTimeout(loadHabits, prefersReducedMotion() ? 0 : 280);
      toast('Habit deleted');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const activeCount = habits.filter((h) => h.active).length;

  return (
    <>
      <section className="page-head">
        <div>
          <p className="eyebrow">Your routine</p>
          <h2>Daily habits</h2>
          <p className="muted">
            Added to every day automatically. Unfinished ones count as missed.
            {habits.length > 0 && ` ${activeCount} active${habits.length > activeCount ? `, ${habits.length - activeCount} paused` : ''}.`}
          </p>
        </div>
        <button className="btn primary" onClick={() => setEditing({})}><Icon name="plus" size={16} strokeWidth={2.5} /> New habit</button>
      </section>

      {error && <div className="alert">{error}</div>}
      {loading ? (
        <ul className="habit-grid">
          {[0, 1, 2].map((i) => <li key={i} className="card skeleton-card"><span className="skeleton line w60" /><span className="skeleton line w40" /></li>)}
        </ul>
      ) : habits.length === 0 ? (
        <div className="empty card">
          <div className="empty-icon"><Icon name="repeat" size={28} /></div>
          <h3>No habits yet</h3>
          <p className="muted">Add the things you want to do every day, like "Exercise" or "Read 20 pages".</p>
          <button className="btn primary" onClick={() => setEditing({})}><Icon name="plus" size={16} strokeWidth={2.5} /> Add a habit</button>
        </div>
      ) : (
        <ul className="habit-grid">
          {habits.map((h, i) => (
            <li key={h._id} className={`card habit ${h.active ? '' : 'paused'} ${leaving.includes(h._id) ? 'leaving' : ''}`} style={{ '--i': i }}>
              <div className="habit-top">
                <span className="habit-icon"><Icon name="repeat" size={18} /></span>
                <span className={`badge ${h.active ? 'done' : 'paused'}`}>{h.active ? 'Active' : 'Paused'}</span>
              </div>
              <h3>{h.title}</h3>
              {h.description && <p className="muted">{h.description}</p>}
              <small className="muted">Every day since {formatDay(h.startDate)}</small>
              <div className="habit-actions">
                <button className="btn small" onClick={() => togglePause(h)}>
                  <Icon name={h.active ? 'pause' : 'play'} size={14} /> {h.active ? 'Pause' : 'Resume'}
                </button>
                <button className="icon-btn" onClick={() => setEditing(h)} aria-label={`Edit "${h.title}"`} title="Edit"><Icon name="edit" /></button>
                <button className="icon-btn danger" onClick={() => handleDelete(h)} aria-label={`Delete "${h.title}"`} title="Delete"><Icon name="trash" /></button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && <HabitForm habit={editing._id ? editing : null} onSave={handleSave} onClose={() => setEditing(null)} />}
    </>
  );
}
