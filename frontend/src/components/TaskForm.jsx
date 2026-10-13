import { useState } from 'react';

export const STATUSES = ['Pending', 'In Progress', 'Completed'];

// Modal used for both creating and editing a task
export default function TaskForm({ task, onSave, onClose }) {
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'Pending',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return setError('Title is required');
    setBusy(true);
    try {
      await onSave(form);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <form className="card modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2>{task ? 'Edit task' : 'New task'}</h2>
        {error && <div className="alert">{error}</div>}
        <label>Title</label>
        <input name="title" value={form.title} onChange={handleChange} maxLength={100} autoFocus />
        <label>Description</label>
        <textarea name="description" rows={3} value={form.description} onChange={handleChange} maxLength={500} />
        <label>Status</label>
        <select name="status" value={form.status} onChange={handleChange}>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <div className="row end">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={busy}>{busy ? 'Saving...' : 'Save'}</button>
        </div>
      </form>
    </div>
  );
}
