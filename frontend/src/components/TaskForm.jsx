import { useState } from 'react';
import Modal from './Modal.jsx';
import Icon from './Icon.jsx';

export const STATUSES = ['Pending', 'In Progress', 'Completed'];

// Modal used for both creating and editing a task
export default function TaskForm({ task, defaultDate, onSave, onClose }) {
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'Pending',
    date: task?.date || defaultDate,
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isHabitTask = Boolean(task?.habit);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e, close) => {
    e.preventDefault();
    if (!form.title.trim()) return setError('Title is required');
    if (!form.date) return setError('Date is required');
    setBusy(true);
    try {
      // Habit tasks stay on their day, so don't send a date for them
      const { date, ...rest } = form;
      await onSave(isHabitTask ? rest : form);
      close();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <Modal title={task ? 'Edit task' : 'New task'} onClose={onClose}>
      {(close) => (
        <form onSubmit={(e) => handleSubmit(e, close)}>
          {error && <div className="alert">{error}</div>}
          <label htmlFor="t-title">Title</label>
          <input id="t-title" name="title" value={form.title} onChange={handleChange} maxLength={100} autoFocus placeholder="What needs doing?" />
          <label htmlFor="t-desc">Description</label>
          <textarea id="t-desc" name="description" rows={3} value={form.description} onChange={handleChange} maxLength={500} placeholder="Optional details" />
          <label>Status</label>
          <div className="segmented" role="radiogroup" aria-label="Status">
            {STATUSES.map((s) => (
              <button
                type="button"
                key={s}
                role="radio"
                aria-checked={form.status === s}
                className={form.status === s ? `on ${s === 'Completed' ? 'done' : s === 'In Progress' ? 'progress' : 'pending'}` : ''}
                onClick={() => setForm({ ...form, status: s })}
              >
                {s}
              </button>
            ))}
          </div>
          {!isHabitTask && (
            <>
              <label htmlFor="t-date">Date</label>
              <input id="t-date" type="date" name="date" value={form.date} onChange={handleChange} />
            </>
          )}
          {isHabitTask && (
            <p className="hint"><Icon name="repeat" size={15} /> Daily habit task. Rename the habit itself on the Habits page.</p>
          )}
          <div className="row end">
            <button type="button" className="btn ghost" onClick={close}>Cancel</button>
            <button className="btn primary" disabled={busy}>{busy ? <span className="spinner" /> : null}{busy ? 'Saving' : 'Save task'}</button>
          </div>
        </form>
      )}
    </Modal>
  );
}
