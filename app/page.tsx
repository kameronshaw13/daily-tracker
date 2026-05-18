"use client";

import { useEffect, useMemo, useState } from "react";

type Habit = {
  id: string;
  name: string;
  goal: string;
  doneDates: string[];
};

type ScheduleItem = {
  id: string;
  time: string;
  title: string;
  notes: string;
  doneDates: string[];
};

type Metrics = {
  weight: string;
  screenTime: string;
  steps: string;
  water: string;
  sleep: string;
  mood: string;
  energy: string;
  notes: string;
};

type DayLog = {
  date: string;
  metrics: Metrics;
  habitCount: number;
  habitDone: number;
  scheduleCount: number;
  scheduleDone: number;
};

type AppData = {
  habits: Habit[];
  schedule: ScheduleItem[];
  metricsByDate: Record<string, Metrics>;
  logs: Record<string, DayLog>;
};

const emptyMetrics: Metrics = {
  weight: "",
  screenTime: "",
  steps: "",
  water: "",
  sleep: "",
  mood: "",
  energy: "",
  notes: "",
};

const starterData: AppData = {
  habits: [
    { id: "habit-workout", name: "Workout", goal: "Move for 45+ minutes", doneDates: [] },
    { id: "habit-read", name: "Read", goal: "Read 10+ pages", doneDates: [] },
    { id: "habit-app", name: "App work", goal: "One focused build block", doneDates: [] },
  ],
  schedule: [
    { id: "schedule-plan", time: "09:00", title: "Plan the day", notes: "Pick the top 3 wins", doneDates: [] },
    { id: "schedule-workout", time: "10:00", title: "Workout", notes: "Strength/cardio + stretch", doneDates: [] },
    { id: "schedule-app", time: "13:00", title: "Work on app", notes: "One clear feature or fix", doneDates: [] },
    { id: "schedule-reset", time: "17:30", title: "House reset", notes: "Kitchen, counters, quick tidy", doneDates: [] },
  ],
  metricsByDate: {},
  logs: {},
};

const storageKey = "daily-progress-app-v1";
const tabs = ["Today", "Habits", "Schedule", "Progress"] as const;
type Tab = (typeof tabs)[number];

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function friendlyDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function cleanNumber(value: string) {
  return value.trim() || "—";
}

export default function Home() {
  const [tab, setTab] = useState<Tab>("Today");
  const [date, setDate] = useState(todayKey());
  const [data, setData] = useState<AppData>(starterData);
  const [habitName, setHabitName] = useState("");
  const [habitGoal, setHabitGoal] = useState("");
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [scheduleTitle, setScheduleTitle] = useState("");
  const [scheduleNotes, setScheduleNotes] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (saved) {
      try {
        setData(JSON.parse(saved));
      } catch {
        setData(starterData);
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(data));
  }, [data]);

  const metrics = data.metricsByDate[date] ?? emptyMetrics;
  const completedHabits = data.habits.filter((habit) => habit.doneDates.includes(date)).length;
  const completedSchedule = data.schedule.filter((item) => item.doneDates.includes(date)).length;
  const totalTasks = data.habits.length + data.schedule.length;
  const completedTasks = completedHabits + completedSchedule;
  const completionPct = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  const sortedSchedule = useMemo(() => {
    return [...data.schedule].sort((a, b) => a.time.localeCompare(b.time));
  }, [data.schedule]);

  const history = useMemo(() => {
    return Object.values(data.logs).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14);
  }, [data.logs]);

  function saveDailyLog(nextData = data) {
    const dayMetrics = nextData.metricsByDate[date] ?? emptyMetrics;
    const habitDone = nextData.habits.filter((habit) => habit.doneDates.includes(date)).length;
    const scheduleDone = nextData.schedule.filter((item) => item.doneDates.includes(date)).length;

    const log: DayLog = {
      date,
      metrics: dayMetrics,
      habitCount: nextData.habits.length,
      habitDone,
      scheduleCount: nextData.schedule.length,
      scheduleDone,
    };

    setData({ ...nextData, logs: { ...nextData.logs, [date]: log } });
  }

  function updateMetric(key: keyof Metrics, value: string) {
    setData((prev) => {
      const nextMetrics = { ...(prev.metricsByDate[date] ?? emptyMetrics), [key]: value };
      const next = { ...prev, metricsByDate: { ...prev.metricsByDate, [date]: nextMetrics } };
      const log: DayLog = {
        date,
        metrics: nextMetrics,
        habitCount: next.habits.length,
        habitDone: next.habits.filter((habit) => habit.doneDates.includes(date)).length,
        scheduleCount: next.schedule.length,
        scheduleDone: next.schedule.filter((item) => item.doneDates.includes(date)).length,
      };
      return { ...next, logs: { ...next.logs, [date]: log } };
    });
  }

  function toggleHabit(id: string) {
    setData((prev) => {
      const habits = prev.habits.map((habit) => {
        if (habit.id !== id) return habit;
        const isDone = habit.doneDates.includes(date);
        return {
          ...habit,
          doneDates: isDone ? habit.doneDates.filter((d) => d !== date) : [...habit.doneDates, date],
        };
      });
      const next = { ...prev, habits };
      const log: DayLog = {
        date,
        metrics: next.metricsByDate[date] ?? emptyMetrics,
        habitCount: next.habits.length,
        habitDone: next.habits.filter((habit) => habit.doneDates.includes(date)).length,
        scheduleCount: next.schedule.length,
        scheduleDone: next.schedule.filter((item) => item.doneDates.includes(date)).length,
      };
      return { ...next, logs: { ...next.logs, [date]: log } };
    });
  }

  function toggleSchedule(id: string) {
    setData((prev) => {
      const schedule = prev.schedule.map((item) => {
        if (item.id !== id) return item;
        const isDone = item.doneDates.includes(date);
        return {
          ...item,
          doneDates: isDone ? item.doneDates.filter((d) => d !== date) : [...item.doneDates, date],
        };
      });
      const next = { ...prev, schedule };
      const log: DayLog = {
        date,
        metrics: next.metricsByDate[date] ?? emptyMetrics,
        habitCount: next.habits.length,
        habitDone: next.habits.filter((habit) => habit.doneDates.includes(date)).length,
        scheduleCount: next.schedule.length,
        scheduleDone: next.schedule.filter((item) => item.doneDates.includes(date)).length,
      };
      return { ...next, logs: { ...next.logs, [date]: log } };
    });
  }

  function addHabit() {
    if (!habitName.trim()) return;
    setData((prev) => ({
      ...prev,
      habits: [...prev.habits, { id: uid("habit"), name: habitName.trim(), goal: habitGoal.trim(), doneDates: [] }],
    }));
    setHabitName("");
    setHabitGoal("");
  }

  function removeHabit(id: string) {
    setData((prev) => ({ ...prev, habits: prev.habits.filter((habit) => habit.id !== id) }));
  }

  function addScheduleItem() {
    if (!scheduleTitle.trim()) return;
    setData((prev) => ({
      ...prev,
      schedule: [
        ...prev.schedule,
        { id: uid("schedule"), time: scheduleTime, title: scheduleTitle.trim(), notes: scheduleNotes.trim(), doneDates: [] },
      ],
    }));
    setScheduleTitle("");
    setScheduleNotes("");
  }

  function removeScheduleItem(id: string) {
    setData((prev) => ({ ...prev, schedule: prev.schedule.filter((item) => item.id !== id) }));
  }

  function resetToday() {
    setData((prev) => ({
      ...prev,
      habits: prev.habits.map((habit) => ({ ...habit, doneDates: habit.doneDates.filter((d) => d !== date) })),
      schedule: prev.schedule.map((item) => ({ ...item, doneDates: item.doneDates.filter((d) => d !== date) })),
      metricsByDate: { ...prev.metricsByDate, [date]: emptyMetrics },
    }));
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `daily-progress-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div className="hero-top">
          <div>
            <p className="eyebrow">Daily Progress</p>
            <h1>Build a better day.</h1>
          </div>
          <div className="today-pill">{friendlyDate(date)}</div>
        </div>

        <div className="progress-area">
          <div className="progress-label">
            <span>Today&apos;s completion</span>
            <span>{completionPct}%</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${completionPct}%` }} />
          </div>
        </div>

        <div className="stat-grid">
          <div className="stat-card">
            <span>Habits</span>
            <strong>{completedHabits}/{data.habits.length}</strong>
          </div>
          <div className="stat-card">
            <span>Schedule</span>
            <strong>{completedSchedule}/{data.schedule.length}</strong>
          </div>
          <div className="stat-card">
            <span>Screen</span>
            <strong>{cleanNumber(metrics.screenTime)}h</strong>
          </div>
        </div>
      </section>

      <div className="tabs">
        {tabs.map((name) => (
          <button key={name} className={`tab ${tab === name ? "active" : ""}`} onClick={() => setTab(name)}>
            {name}
          </button>
        ))}
      </div>

      {tab === "Today" && (
        <section className="section">
          <div className="card">
            <div className="card-title">
              <div>
                <h2>Today</h2>
                <div className="subtle">Change date, track metrics, and save the day.</div>
              </div>
            </div>
            <div className="form-row">
              <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              <div className="metric-grid">
                <div className="metric-card">
                  <label>Weight</label>
                  <input value={metrics.weight} onChange={(e) => updateMetric("weight", e.target.value)} inputMode="decimal" placeholder="—" />
                  <span className="unit">lbs</span>
                </div>
                <div className="metric-card">
                  <label>Screen time</label>
                  <input value={metrics.screenTime} onChange={(e) => updateMetric("screenTime", e.target.value)} inputMode="decimal" placeholder="—" />
                  <span className="unit">hours</span>
                </div>
                <div className="metric-card">
                  <label>Steps</label>
                  <input value={metrics.steps} onChange={(e) => updateMetric("steps", e.target.value)} inputMode="numeric" placeholder="—" />
                  <span className="unit">steps</span>
                </div>
                <div className="metric-card">
                  <label>Water</label>
                  <input value={metrics.water} onChange={(e) => updateMetric("water", e.target.value)} inputMode="decimal" placeholder="—" />
                  <span className="unit">cups</span>
                </div>
                <div className="metric-card">
                  <label>Sleep</label>
                  <input value={metrics.sleep} onChange={(e) => updateMetric("sleep", e.target.value)} inputMode="decimal" placeholder="—" />
                  <span className="unit">hours</span>
                </div>
                <div className="metric-card">
                  <label>Energy</label>
                  <input value={metrics.energy} onChange={(e) => updateMetric("energy", e.target.value)} inputMode="numeric" placeholder="1-10" />
                  <span className="unit">rating</span>
                </div>
              </div>
              <select className="select" value={metrics.mood} onChange={(e) => updateMetric("mood", e.target.value)}>
                <option value="">Mood</option>
                <option>Great</option>
                <option>Good</option>
                <option>Okay</option>
                <option>Stressed</option>
                <option>Tired</option>
              </select>
              <textarea className="textarea" value={metrics.notes} onChange={(e) => updateMetric("notes", e.target.value)} placeholder="Notes, wins, problems, or what to improve tomorrow..." />
              <button className="btn" onClick={() => saveDailyLog()}>Save today</button>
              <button className="btn secondary" onClick={resetToday}>Reset today</button>
            </div>
          </div>

          <div className="card">
            <div className="card-title">
              <h2>Quick checklist</h2>
              <span className="subtle">Habits + schedule</span>
            </div>
            <div className="list">
              {[...data.habits.map((h) => ({ type: "habit", id: h.id, title: h.name, detail: h.goal, done: h.doneDates.includes(date) })), ...sortedSchedule.map((s) => ({ type: "schedule", id: s.id, title: s.title, detail: `${s.time} ${s.notes ? `• ${s.notes}` : ""}`, done: s.doneDates.includes(date) }))].map((item) => (
                <div className="item" key={`${item.type}-${item.id}`}>
                  <button className={`check ${item.done ? "done" : ""}`} onClick={() => item.type === "habit" ? toggleHabit(item.id) : toggleSchedule(item.id)}>✓</button>
                  <div className="item-main">
                    <strong>{item.title}</strong>
                    <span>{item.detail}</span>
                  </div>
                  <span className="subtle">{item.done ? "Done" : "Open"}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {tab === "Habits" && (
        <section className="section">
          <div className="card">
            <div className="card-title">
              <div>
                <h2>Habits & goals</h2>
                <div className="subtle">Create daily actions you want to repeat.</div>
              </div>
            </div>
            <div className="form-row">
              <input className="input" value={habitName} onChange={(e) => setHabitName(e.target.value)} placeholder="Habit name, e.g. Workout" />
              <input className="input" value={habitGoal} onChange={(e) => setHabitGoal(e.target.value)} placeholder="Goal, e.g. 45 minutes" />
              <button className="btn" onClick={addHabit}>Add habit</button>
            </div>
          </div>

          <div className="card">
            <div className="list">
              {data.habits.length === 0 && <div className="empty">No habits yet.</div>}
              {data.habits.map((habit) => (
                <div className="item" key={habit.id}>
                  <button className={`check ${habit.doneDates.includes(date) ? "done" : ""}`} onClick={() => toggleHabit(habit.id)}>✓</button>
                  <div className="item-main">
                    <strong>{habit.name}</strong>
                    <span>{habit.goal || "Daily goal"}</span>
                  </div>
                  <button className="btn danger small" onClick={() => removeHabit(habit.id)}>Delete</button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {tab === "Schedule" && (
        <section className="section">
          <div className="card">
            <div className="card-title">
              <div>
                <h2>Daily schedule</h2>
                <div className="subtle">Build a repeatable day and check it off.</div>
              </div>
            </div>
            <div className="form-row">
              <div className="form-grid">
                <input className="input" type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} />
                <input className="input" value={scheduleTitle} onChange={(e) => setScheduleTitle(e.target.value)} placeholder="Task" />
              </div>
              <input className="input" value={scheduleNotes} onChange={(e) => setScheduleNotes(e.target.value)} placeholder="Notes" />
              <button className="btn" onClick={addScheduleItem}>Add schedule item</button>
            </div>
          </div>

          <div className="card">
            <div className="list">
              {sortedSchedule.length === 0 && <div className="empty">No schedule items yet.</div>}
              {sortedSchedule.map((item) => (
                <div className="item schedule-item" key={item.id}>
                  <div className="time-chip">{item.time}</div>
                  <div className="item-main">
                    <strong>{item.title}</strong>
                    <span>{item.notes || "No notes"}</span>
                  </div>
                  <div style={{ display: "grid", gap: 6 }}>
                    <button className={`check ${item.doneDates.includes(date) ? "done" : ""}`} onClick={() => toggleSchedule(item.id)}>✓</button>
                    <button className="btn danger small" onClick={() => removeScheduleItem(item.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {tab === "Progress" && (
        <section className="section">
          <div className="card">
            <div className="card-title">
              <div>
                <h2>Progress history</h2>
                <div className="subtle">Recent saved days from this browser.</div>
              </div>
              <button className="btn secondary small" onClick={exportData}>Export</button>
            </div>
            <div className="list">
              {history.length === 0 && <div className="empty">Save today to start your history.</div>}
              {history.map((log) => {
                const done = log.habitDone + log.scheduleDone;
                const count = log.habitCount + log.scheduleCount;
                const pct = count === 0 ? 0 : Math.round((done / count) * 100);
                return (
                  <div className="history-row" key={log.date}>
                    <div>
                      <strong>{friendlyDate(log.date)}</strong>
                      <div className="subtle">{pct}% complete • {done}/{count} tasks</div>
                    </div>
                    <div className="history-values">
                      <span>{cleanNumber(log.metrics.weight)} lb</span>
                      <span>{cleanNumber(log.metrics.screenTime)}h screen</span>
                      <span>{cleanNumber(log.metrics.sleep)}h sleep</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card">
            <div className="card-title">
              <div>
                <h2>What this tracks</h2>
                <div className="subtle">Easy personal metrics to build momentum.</div>
              </div>
            </div>
            <div className="list">
              <div className="empty">Weight, screen time, steps, water, sleep, mood, energy, notes, habits, goals, and schedule completion.</div>
            </div>
          </div>
        </section>
      )}

      <nav className="bottom-nav">
        {tabs.map((name) => (
          <button key={name} className={tab === name ? "active" : ""} onClick={() => setTab(name)}>
            {name}
          </button>
        ))}
      </nav>
    </main>
  );
}
