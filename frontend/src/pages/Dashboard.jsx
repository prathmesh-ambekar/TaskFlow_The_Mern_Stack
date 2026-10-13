import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import TaskForm, { STATUSES } from '../components/TaskForm.jsx';

const FILTERS = ['All', ...STATUSES];
const badgeClass = { Pending: 'pending', 'In Progress': 'progress', Completed: 'done' };

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [allTasks, setAllTasks] = useState([]); // used for the counters
  const [filter, setFilter] = useState('All');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null = closed, {} = new, task = edit

  // Fetch everything once; filtering happens in the browser
  const tasks = filter === 'All' ? allTasks : allTasks.filter((t) => t.status === filter);

  const loadTasks = useCallback(async () => {
    try {
      const res = await api('/tasks');
      setAllTasks(res.data.tasks);
      setError('');
    } catch (err) {
      if (err.status === 401) logout();
      else setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleSave = async (form) => {
    if (editing && editing._id) {
      await api(`/tasks/${editing._id}`, { method: 'PUT', body: form });
    } else {
      await api('/tasks', { method: 'POST', body: form });
    }
    setEditing(null);
    loadTasks();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await api(`/tasks/${id}`, { method: 'DELETE' });
      loadTasks();
    } catch (err) {
      setError(err.message);
    }
  };

  const count = (status) => allTasks.filter((t) => t.status === status).length;

  return (
    <div className="container">
      <header className="topbar">
        <h1>TaskFlow</h1>
        <div className="row">
          <span className="muted hide-sm">Hi, {user.name}</span>
          <button className="btn" onClick={logout}>Logout</button>
        </div>
      </header>

      <section className="stats">
        <div className="card stat"><span>{allTasks.length}</span>Total</div>
        <div className="card stat pending"><span>{count('Pending')}</span>Pending</div>
        <div className="card stat progress"><span>{count('In Progress')}</span>In Progress</div>
        <div className="card stat done"><span>{count('Completed')}</span>Completed</div>
      </section>

      <section className="toolbar">
        <div className="filters">
          {FILTERS.map((f) => (
            <button key={f} className={`chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f}
            </button>
          ))}
        </div>
        <button className="btn primary" onClick={() => setEditing({})}>+ New Task</button>
      </section>

      {error && <div className="alert">{error}</div>}
      {loading ? (
        <p className="center-text">Loading tasks...</p>
      ) : tasks.length === 0 ? (
        <p className="center-text muted">No tasks here yet. Create your first one!</p>
      ) : (
        <ul className="task-list">
          {tasks.map((t) => (
            <li key={t._id} className="card task">
              <div className="task-main">
                <h3>{t.title}</h3>
                {t.description && <p className="muted">{t.description}</p>}
                <small className="muted">Updated {new Date(t.updatedAt).toLocaleDateString()}</small>
              </div>
              <div className="task-side">
                <span className={`badge ${badgeClass[t.status]}`}>{t.status}</span>
                <div className="row">
                  <button className="btn small" onClick={() => setEditing(t)}>Edit</button>
                  <button className="btn small danger" onClick={() => handleDelete(t._id)}>Delete</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <TaskForm task={editing._id ? editing : null} onSave={handleSave} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}
