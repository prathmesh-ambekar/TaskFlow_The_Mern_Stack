import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import TaskForm, { STATUSES } from '../components/TaskForm.jsx';
import ProgressRing from '../components/ProgressRing.jsx';
import CountUp from '../components/CountUp.jsx';
import Icon from '../components/Icon.jsx';
import { addDays, formatDay, isDateStr, localToday } from '../dates.js';
import { prefersReducedMotion } from '../hooks.js';

const FILTERS = ['All', ...STATUSES];
const statusKey = { Pending: 'pending', 'In Progress': 'progress', Completed: 'done', Missed: 'missed' };

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

// Placeholder cards while tasks load
const Skeleton = () => (
  <ul className="task-list">
    {[0, 1, 2].map((i) => (
      <li key={i} className="card task skeleton-card">
        <span className="skeleton circle" />
        <div className="task-main"><span className="skeleton line w60" /><span className="skeleton line w40" /></div>
      </li>
    ))}
  </ul>
);

// A few CSS confetti pieces for a completed day
const Confetti = () => (
  <div className="confetti" aria-hidden="true">
    {Array.from({ length: 14 }, (_, i) => <i key={i} style={{ '--i': i }} />)}
  </div>
);

export default function Dashboard() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [today, setToday] = useState(localToday());
  const date = isDateStr(params.get('date')) ? params.get('date') : today;

  const [allTasks, setAllTasks] = useState([]); // all tasks of the selected day
  const [filter, setFilter] = useState('All');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null = closed, {} = new, task = edit
  const [leaving, setLeaving] = useState([]); // ids animating out after delete
  const [slide, setSlide] = useState(''); // direction the day header slides in from

  const isPast = date < today;
  const isToday = date === today;
  // On a past day, anything not completed was missed
  const shownStatus = (t) => (isPast && t.status !== 'Completed' ? 'Missed' : t.status);
  const tasks = filter === 'All' ? allTasks : allTasks.filter((t) => t.status === filter);

  const loadTasks = useCallback(async () => {
    try {
      const res = await api(`/tasks?date=${date}`);
      setAllTasks(res.data.tasks);
      setToday(res.today); // the server decides what "today" is
      setError('');
    } catch (err) {
      if (err.status === 401) logout();
      else setError(err.message);
    } finally {
      setLoading(false);
      setLeaving([]);
    }
  }, [date, logout]);

  useEffect(() => {
    setLoading(true);
    loadTasks();
  }, [loadTasks]);

  const goTo = (d) => {
    setSlide(d > date ? 'from-right' : 'from-left');
    setParams(d === today ? {} : { date: d });
  };

  const handleSave = async (form) => {
    if (editing && editing._id) {
      await api(`/tasks/${editing._id}`, { method: 'PUT', body: form });
      toast('Task updated');
    } else {
      await api('/tasks', { method: 'POST', body: form });
      toast(form.date === date ? 'Task added' : `Task added to ${formatDay(form.date)}`);
    }
    loadTasks();
  };

  // Update the screen first so the tick feels instant, then save
  const toggleDone = async (t) => {
    const status = t.status === 'Completed' ? 'Pending' : 'Completed';
    setAllTasks((list) => list.map((x) => (x._id === t._id ? { ...x, status } : x)));
    try {
      await api(`/tasks/${t._id}`, { method: 'PUT', body: { status } });
    } catch (err) {
      setAllTasks((list) => list.map((x) => (x._id === t._id ? t : x)));
      toast(err.message, 'error');
    }
  };

  const handleDelete = async (t) => {
    const msg = t.habit ? 'Remove this daily habit task for this day only?' : 'Delete this task?';
    if (!window.confirm(msg)) return;
    try {
      await api(`/tasks/${t._id}`, { method: 'DELETE' });
      setLeaving((ids) => [...ids, t._id]);
      setTimeout(loadTasks, prefersReducedMotion() ? 0 : 280);
      toast(t.habit ? 'Removed for this day' : 'Task deleted');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const count = (status) => allTasks.filter((t) => t.status === status).length;
  const done = count('Completed');
  const total = allTasks.length;
  const percent = total ? Math.round((done / total) * 100) : 0;
  const allDone = total > 0 && done === total;

  return (
    <>
      <section className={`hero card ${allDone ? 'hero-done' : ''}`}>
        {allDone && !loading && <Confetti />}
        <div className="hero-main">
          <p className="eyebrow">{isToday ? `${greeting()}, ${user.name.split(' ')[0]}` : isPast ? 'Looking back' : 'Planning ahead'}</p>
          <div className="day-switch">
            <button className="icon-btn" onClick={() => goTo(addDays(date, -1))} aria-label="Previous day"><Icon name="left" /></button>
            <h2 key={date} className={`day-heading ${slide}`}>{isToday ? 'Today' : formatDay(date)}</h2>
            <button className="icon-btn" onClick={() => goTo(addDays(date, 1))} aria-label="Next day"><Icon name="right" /></button>
          </div>
          <div className="row wrap">
            {isToday && <span className="muted">{formatDay(date)}</span>}
            <input className="date-input" type="date" value={date} onChange={(e) => e.target.value && goTo(e.target.value)} aria-label="Pick a date" />
            {!isToday && <button className="btn small" onClick={() => goTo(today)}>Back to today</button>}
          </div>

          <div className="mini-stats">
            <div><strong><CountUp value={total} /></strong><span>Planned</span></div>
            <div className="done"><strong><CountUp value={done} /></strong><span>Done</span></div>
            {isPast ? (
              <div className="missed"><strong><CountUp value={total - done} /></strong><span>Missed</span></div>
            ) : (
              <>
                <div className="progress"><strong><CountUp value={count('In Progress')} /></strong><span>In progress</span></div>
                <div className="pending"><strong><CountUp value={count('Pending')} /></strong><span>To do</span></div>
              </>
            )}
          </div>
        </div>
        <div className="hero-ring">
          <ProgressRing percent={percent} />
          {allDone && <p className="celebrate">{isPast ? 'Perfect day!' : 'All done! 🎉'}</p>}
        </div>
      </section>

      <section className="toolbar">
        <div className="filters" role="tablist">
          {FILTERS.map((f) => (
            <button key={f} role="tab" aria-selected={filter === f} className={`chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f}
              <span className="chip-count">{f === 'All' ? total : count(f)}</span>
            </button>
          ))}
        </div>
        <button className="btn primary" onClick={() => setEditing({})}><Icon name="plus" size={16} strokeWidth={2.5} /> New task</button>
      </section>

      {error && <div className="alert">{error}</div>}
      {loading ? (
        <Skeleton />
      ) : tasks.length === 0 ? (
        <div className="empty card">
          <div className="empty-icon"><Icon name={total ? 'inbox' : 'sparkle'} size={28} /></div>
          {total ? (
            <p>No tasks match this filter.</p>
          ) : (
            <>
              <h3>Nothing planned{isToday ? ' yet' : ''}</h3>
              <p className="muted">Add a task, or set up <Link to="/habits">daily habits</Link> that appear every day.</p>
              <button className="btn primary" onClick={() => setEditing({})}><Icon name="plus" size={16} strokeWidth={2.5} /> Add first task</button>
            </>
          )}
        </div>
      ) : (
        <ul className="task-list">
          {tasks.map((t, i) => {
            const shown = shownStatus(t);
            const isDone = t.status === 'Completed';
            return (
              <li
                key={t._id}
                className={`card task status-${statusKey[shown]} ${isDone ? 'is-done' : ''} ${leaving.includes(t._id) ? 'leaving' : ''}`}
                style={{ '--i': i }}
              >
                <button
                  className={`check ${isDone ? 'checked' : ''}`}
                  onClick={() => toggleDone(t)}
                  aria-pressed={isDone}
                  aria-label={`Mark "${t.title}" as ${isDone ? 'not done' : 'done'}`}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                </button>
                <div className="task-main">
                  <h3><span className="strike">{t.title}</span></h3>
                  {t.description && <p className="muted">{t.description}</p>}
                  <div className="row wrap tags">
                    <span className={`badge ${statusKey[shown]}`}>{shown}</span>
                    {t.habit && <span className="tag"><Icon name="repeat" size={12} strokeWidth={2.5} /> Daily habit</span>}
                  </div>
                </div>
                <div className="task-actions">
                  <button className="icon-btn" onClick={() => setEditing(t)} aria-label={`Edit "${t.title}"`} title="Edit"><Icon name="edit" /></button>
                  <button className="icon-btn danger" onClick={() => handleDelete(t)} aria-label={`Delete "${t.title}"`} title="Delete"><Icon name="trash" /></button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editing && (
        <TaskForm
          task={editing._id ? editing : null}
          defaultDate={date}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
