import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Icon from '../components/Icon.jsx';
import CountUp from '../components/CountUp.jsx';
import ProgressRing from '../components/ProgressRing.jsx';
import { addMonths, formatDay, formatMonth, formatShort, isMonthStr, localToday, weekdayMon } from '../dates.js';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Calendar colour steps: one hue, light (little done) -> dark (everything done)
const HEAT_STEPS = [
  { label: '0%', min: 0, cls: 'heat-0' },
  { label: '1–49%', min: 1, cls: 'heat-1' },
  { label: '50–79%', min: 50, cls: 'heat-2' },
  { label: '80–99%', min: 80, cls: 'heat-3' },
  { label: '100%', min: 100, cls: 'heat-4' },
];
const heatClass = (day) => {
  if (day.future) return 'heat-future';
  if (!day.total) return 'heat-none';
  return [...HEAT_STEPS].reverse().find((s) => day.percent >= s.min).cls;
};

const open = (d) => d.total - d.completed - d.missed; // not done yet, on today or a future day

const describeDay = (d) => {
  if (!d.total) return `${formatDay(d.date)}: no tasks`;
  const parts = [`${d.completed} of ${d.total} done (${d.percent}%)`];
  if (d.missed) parts.push(`${d.missed} missed`);
  if (open(d)) parts.push(`${open(d)} still open`);
  return `${formatDay(d.date)}: ${parts.join(', ')}`;
};

// Tooltip that follows the hovered / focused mark inside a chart
function useTooltip() {
  const [tip, setTip] = useState(null);
  const show = (e, text) => {
    const box = e.currentTarget.closest('.chart').getBoundingClientRect();
    const mark = e.currentTarget.getBoundingClientRect();
    setTip({ text, x: mark.left - box.left + mark.width / 2, y: mark.top - box.top });
  };
  const bind = (text) => ({
    onMouseEnter: (e) => show(e, text),
    onFocus: (e) => show(e, text),
    onMouseLeave: () => setTip(null),
    onBlur: () => setTip(null),
  });
  const node = tip && (
    <div className="tooltip" style={{ left: tip.x, top: tip.y }}>{tip.text}</div>
  );
  return { bind, node };
}

function MonthCalendar({ days, today, onPick }) {
  const { bind, node } = useTooltip();
  const blanks = weekdayMon(days[0].date);

  return (
    <div className="chart">
      <div className="calendar">
        {WEEKDAYS.map((w) => <div key={w} className="cal-head">{w}</div>)}
        {Array.from({ length: blanks }, (_, i) => <div key={`b${i}`} />)}
        {days.map((d, i) => (
          <button
            key={d.date}
            style={{ '--i': i }}
            className={`cal-cell ${heatClass(d)} ${d.date === today ? 'is-today' : ''}`}
            onClick={() => onPick(d.date)}
            aria-label={describeDay(d)}
            {...bind(describeDay(d))}
          >
            {Number(d.date.slice(8))}
          </button>
        ))}
      </div>
      <div className="legend">
        <span><i className="swatch heat-none" />No tasks</span>
        {HEAT_STEPS.map((s) => <span key={s.cls}><i className={`swatch ${s.cls}`} />{s.label}</span>)}
      </div>
      {node}
    </div>
  );
}

// Stacked bars: completed (bottom), missed, still open (top)
function DailyBars({ days }) {
  const { bind, node } = useTooltip();
  const max = Math.max(1, ...days.map((d) => d.total));
  const ticks = [max, Math.round(max / 2), 0].filter((v, i, a) => a.indexOf(v) === i);
  const labelEvery = (i) => i === 0 || (i + 1) % 5 === 0 || i === days.length - 1;

  return (
    <div className="chart">
      <div className="bars-wrap">
        <div className="y-axis">
          {ticks.map((t) => <span key={t} style={{ bottom: `${(t / max) * 100}%` }}>{t}</span>)}
        </div>
        <div className="bars">
          {ticks.map((t) => <div key={t} className="gridline" style={{ bottom: `${(t / max) * 100}%` }} />)}
          {days.map((d, i) => (
            <div key={d.date} className="bar-col" tabIndex={0} aria-label={describeDay(d)} {...bind(describeDay(d))}>
              <div className="bar-stack" style={{ height: `${(d.total / max) * 100}%`, '--i': i }}>
                {d.completed > 0 && <div className="seg seg-done" style={{ flexGrow: d.completed }} />}
                {d.missed > 0 && <div className="seg seg-missed" style={{ flexGrow: d.missed }} />}
                {open(d) > 0 && <div className="seg seg-open" style={{ flexGrow: open(d) }} />}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="x-axis">
        {days.map((d, i) => <span key={d.date}>{labelEvery(i) ? Number(d.date.slice(8)) : ''}</span>)}
      </div>
      <div className="legend">
        <span><i className="swatch seg-done" />Completed</span>
        <span><i className="swatch seg-missed" />Missed</span>
        <span><i className="swatch seg-open" />Still open</span>
      </div>
      {node}
    </div>
  );
}

const Stat = ({ icon, tone = '', label, children, sub }) => (
  <div className={`card stat ${tone}`}>
    <span className="stat-icon"><Icon name={icon} size={18} /></span>
    <strong>{children}</strong>
    <span className="stat-label">{label}</span>
    {sub && <small className="muted">{sub}</small>}
  </div>
);

export default function Analytics() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const thisMonth = localToday().slice(0, 7);
  const month = isMonthStr(params.get('month')) ? params.get('month') : thisMonth;

  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [showTable, setShowTable] = useState(false);
  const [slide, setSlide] = useState('');

  const load = useCallback(async () => {
    try {
      setData(null);
      const res = await api(`/stats/monthly?month=${month}`);
      setData(res.data);
      setError('');
    } catch (err) {
      if (err.status === 401) logout();
      else setError(err.message);
    }
  }, [month, logout]);

  useEffect(() => {
    load();
  }, [load]);

  const goTo = (m) => {
    setSlide(m > month ? 'from-right' : 'from-left');
    setParams(m === thisMonth ? {} : { month: m });
  };
  const s = data?.summary;
  const pastDays = data ? data.days.filter((d) => !d.future) : [];

  return (
    <>
      <section className="page-head">
        <div>
          <p className="eyebrow">Monthly analysis</p>
          <div className="day-switch">
            <button className="icon-btn" onClick={() => goTo(addMonths(month, -1))} aria-label="Previous month"><Icon name="left" /></button>
            <h2 key={month} className={`day-heading ${slide}`}>{formatMonth(month)}</h2>
            <button className="icon-btn" onClick={() => goTo(addMonths(month, 1))} aria-label="Next month"><Icon name="right" /></button>
          </div>
        </div>
        {month !== thisMonth && <button className="btn small" onClick={() => goTo(thisMonth)}>This month</button>}
      </section>

      {error && <div className="alert">{error}</div>}
      {!data && !error && (
        <div className="stats">
          {[0, 1, 2, 3].map((i) => <div key={i} className="card stat skeleton-card"><span className="skeleton line w40" /><span className="skeleton line w60" /></div>)}
        </div>
      )}

      {data && (
        <div className="fade-in">
          <section className="card overview">
            <ProgressRing percent={s.completionRate ?? 0} size={132} stroke={11} />
            <div>
              <h3>{s.totalTasks ? `${s.completed} of ${s.totalTasks} tasks completed` : 'No tasks yet this month'}</h3>
              <p className="muted">
                {s.activeDays} day{s.activeDays === 1 ? '' : 's'} with tasks.
                {s.bestDay && ` Best day: ${formatShort(s.bestDay.date)} (${s.bestDay.completed}/${s.bestDay.total}, ${s.bestDay.percent}%).`}
              </p>
            </div>
          </section>

          <section className="stats">
            <Stat icon="check" tone="done" label="Completed"><CountUp value={s.completed} /></Stat>
            <Stat icon="x" tone="missed" label="Missed"><CountUp value={s.missed} /></Stat>
            <Stat icon="sparkle" tone="primary" label="Perfect days" sub="all tasks done"><CountUp value={s.perfectDays} /></Stat>
            <Stat icon="flame" tone="streak" label="Current streak" sub={`best this month: ${s.longestStreak}`}>
              <CountUp value={s.currentStreak} />
            </Stat>
          </section>

          <div className="grid-2">
            <section className="card">
              <h3>Completion calendar</h3>
              <p className="muted">Share of each day's tasks completed. Click a day to open it.</p>
              <MonthCalendar days={data.days} today={data.today} onPick={(d) => navigate(`/?date=${d}`)} />
            </section>

            <section className="card">
              <div className="row between">
                <h3>Tasks per day</h3>
                <button className="btn small" onClick={() => setShowTable(!showTable)}>
                  {showTable ? 'Show chart' : 'Show table'}
                </button>
              </div>
              <p className="muted">How many tasks you planned, and what happened to them.</p>
              {showTable ? (
                <div className="table-wrap fade-in">
                  <table>
                    <thead><tr><th>Day</th><th>Tasks</th><th>Done</th><th>Missed</th><th>%</th></tr></thead>
                    <tbody>
                      {pastDays.filter((d) => d.total).map((d) => (
                        <tr key={d.date}>
                          <td>{formatShort(d.date)}</td><td>{d.total}</td><td>{d.completed}</td><td>{d.missed}</td><td>{d.percent}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!pastDays.some((d) => d.total) && <p className="muted">No tasks yet this month.</p>}
                </div>
              ) : (
                <DailyBars days={data.days} />
              )}
            </section>
          </div>

          <div className="grid-2">
            <section className="card">
              <h3>Daily habits</h3>
              {data.habits.length === 0 ? (
                <p className="muted">No habit tasks this month. Add some on the Habits page.</p>
              ) : (
                <ul className="meter-list">
                  {data.habits.map((h, i) => (
                    <li key={h.habitId}>
                      <div className="row between"><span>{h.title}</span><span className="muted">{h.completed}/{h.total} · {h.percent}%</span></div>
                      <div className="meter"><div style={{ width: `${h.percent}%`, '--i': i }} /></div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="card">
              <h3>Most missed</h3>
              {data.topMissed.length === 0 ? (
                <p className="muted">Nothing missed this month. 🎉</p>
              ) : (
                <ol className="missed-list">
                  {data.topMissed.map((m, i) => (
                    <li key={m.title} style={{ '--i': i }}>
                      <span className="rank">{i + 1}</span>
                      <span className="grow">{m.title}</span>
                      <span className="badge missed">{m.count}×</span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        </div>
      )}
    </>
  );
}
