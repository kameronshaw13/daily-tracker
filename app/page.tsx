"use client";

import { useEffect, useMemo, useState } from "react";

type Tab = "Today" | "Food" | "Workout" | "Goals" | "Progress";
type DayType = "workday" | "friday" | "weekend";
type MealKey = "breakfast" | "lunch" | "dinner" | "snack";

type Metrics = {
  weight: string;
  sleep: string;
  screenTime: string;
  water: string;
  mood: string;
  energy: string;
  notes: string;
};

type DayLog = {
  date: string;
  completed: string[];
  metrics: Metrics;
  readingPages: string;
  appMinutes: string;
};

type AppData = {
  logs: Record<string, DayLog>;
};

type ScheduleItem = {
  id: string;
  time: string;
  title: string;
  detail: string;
};

type Workout = {
  title: string;
  time: string;
  focus: string;
  exercises: string[];
};

const tabs: Tab[] = ["Today", "Food", "Workout", "Goals", "Progress"];
const storageKey = "momentum-daily-v1";

const emptyMetrics: Metrics = {
  weight: "",
  sleep: "",
  screenTime: "",
  water: "",
  mood: "",
  energy: "",
  notes: "",
};

const starterData: AppData = { logs: {} };

const breakfastIdeas = [
  "Eggs, toast, and fruit",
  "Greek yogurt bowl with berries and granola",
  "Protein smoothie with banana and peanut butter",
  "Breakfast burrito with eggs, turkey sausage, cheese, and salsa",
  "Oatmeal with banana, cinnamon, and peanut butter",
];

const lunchIdeas = [
  "Chicken rice bowl with veggies, salsa, and avocado",
  "Turkey sandwich with fruit and Greek yogurt",
  "Tuna wrap with carrots and hummus",
  "Leftover protein bowl with rice or potatoes",
  "Chipotle-style bowl with chicken, beans, rice, and lettuce",
];

const dinnerIdeas = [
  "Chicken tacos with salsa, avocado, and side salad",
  "Turkey burger bowl with roasted potatoes and veggies",
  "Salmon, rice, and broccoli",
  "Steak bowl with peppers, onions, and potatoes",
  "Pasta with lean meat sauce and side salad",
];

const snackIdeas = [
  "Protein shake",
  "Greek yogurt",
  "Apple and peanut butter",
  "String cheese and fruit",
  "Cottage cheese",
  "Beef jerky and carrots",
];

const presenceGoals = [
  "Eat dinner without your phone nearby.",
  "Take a 10-minute walk without headphones.",
  "Have one real conversation and do not multitask during it.",
  "Sit outside for 10 minutes and do nothing else.",
  "Clean one area of the house before relaxing.",
  "Spend intentional time with your wife, family, or dog.",
];

const appGoals = [
  "Fix one small bug in one of your apps.",
  "Improve one screen visually.",
  "Work for 45 focused minutes with no phone next to you.",
  "Plan the next feature before touching code.",
  "Clean up one messy file or component.",
  "Push one finished change to GitHub.",
];

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function dateParts(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function friendlyDate(dateKey: string) {
  return dateParts(dateKey).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function shortDate(dateKey: string) {
  return dateParts(dateKey).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function dayType(dateKey: string): DayType {
  const day = dateParts(dateKey).getDay();
  if (day >= 1 && day <= 4) return "workday";
  if (day === 5) return "friday";
  return "weekend";
}

function rotate<T>(items: T[], dateKey: string, offset = 0) {
  const seed = dateKey.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return items[(seed + offset) % items.length];
}

function scheduleFor(type: DayType): ScheduleItem[] {
  if (type === "friday") {
    return [
      { id: "wake", time: "6:30", title: "Wake up + water", detail: "Start easy, no rushing." },
      { id: "walk", time: "7:00", title: "Walk or stretch", detail: "Light movement before work." },
      { id: "breakfast", time: "7:30", title: "Breakfast", detail: "Protein first." },
      { id: "work", time: "8:00–12:00", title: "Work from home", detail: "Keep phone away from the desk." },
      { id: "lunch", time: "12:15", title: "Lunch", detail: "Simple meal, then reset." },
      { id: "gym", time: "1:00", title: "Gym", detail: "Make this your best workout of the week." },
      { id: "errands", time: "2:15", title: "Groceries / errands", detail: "Set up the weekend." },
      { id: "apps", time: "3:30", title: "App work", detail: "One clear feature or fix." },
      { id: "home", time: "5:00", title: "House reset", detail: "Kitchen, laundry, or quick clean." },
      { id: "night", time: "6:30", title: "Dinner + real life", detail: "Date night, family time, or relax on purpose." },
    ];
  }

  if (type === "weekend") {
    return [
      { id: "wake", time: "8:00", title: "Wake up + breakfast", detail: "Do not let the day drift." },
      { id: "move", time: "9:00", title: "Long walk or workout", detail: "Get outside or get to the gym." },
      { id: "reset", time: "10:30", title: "House / groceries", detail: "Reset the house and prep food." },
      { id: "lunch", time: "12:00", title: "Lunch", detail: "Protein + carb + fruit or veggie." },
      { id: "apps", time: "1:00", title: "App work / hobby block", detail: "Build something or do something active." },
      { id: "free", time: "4:00", title: "Free time", detail: "Enjoy it intentionally, not by accident." },
      { id: "dinner", time: "6:30", title: "Dinner", detail: "Good meal, phone away." },
      { id: "plan", time: "8:30", title: "Plan tomorrow", detail: "Look at schedule, food, workout, and goals." },
    ];
  }

  return [
    { id: "wake", time: "6:00", title: "Wake up + water", detail: "Start the day without immediately grabbing your phone." },
    { id: "move", time: "6:15", title: "Walk / stretch", detail: "Light movement or dog walk." },
    { id: "ready", time: "6:45", title: "Shower + get ready", detail: "Keep the morning simple." },
    { id: "breakfast", time: "7:10", title: "Breakfast", detail: "Protein first." },
    { id: "work1", time: "8:00–12:00", title: "Work block", detail: "Focus on work; phone out of sight." },
    { id: "lunch", time: "12:00", title: "Lunch", detail: "Eat a real meal." },
    { id: "walk", time: "12:30", title: "10-minute walk", detail: "Reset before the afternoon." },
    { id: "work2", time: "1:00–6:00", title: "Work block", detail: "Finish strong." },
    { id: "workout", time: "6:30", title: "Workout / walk", detail: "Move before settling in." },
    { id: "dinner", time: "7:15", title: "Dinner", detail: "Phone-free meal." },
    { id: "goals", time: "8:00", title: "Reading / app work / family", detail: "Pick one meaningful thing." },
    { id: "wind", time: "9:30", title: "Wind down", detail: "Prep for tomorrow and read." },
  ];
}

function workoutFor(dateKey: string): Workout {
  const day = dateParts(dateKey).getDay();
  if (day === 1) return {
    title: "Strength A",
    time: "45 minutes",
    focus: "Start the week strong.",
    exercises: ["Warm up 5 minutes", "Squat or leg press — 3x8", "Bench press or pushups — 3x8–12", "Row — 3x10", "Plank — 3 rounds", "10-minute walk cooldown"],
  };
  if (day === 2) return {
    title: "Cardio + Mobility",
    time: "35–45 minutes",
    focus: "Get your heart rate up and loosen up.",
    exercises: ["30-minute walk, jog, bike, or incline treadmill", "Hip stretch", "Hamstring stretch", "Back and shoulder mobility", "Easy breathing cooldown"],
  };
  if (day === 3) return {
    title: "Strength B",
    time: "45 minutes",
    focus: "Full body, controlled reps.",
    exercises: ["Warm up 5 minutes", "Romanian deadlift — 3x8", "Shoulder press — 3x8", "Lat pulldown — 3x10", "Lunges — 3x10 each leg", "Core — 5–10 minutes"],
  };
  if (day === 4) return {
    title: "Light Reset Day",
    time: "25–35 minutes",
    focus: "Do not crush yourself. Just move.",
    exercises: ["30-minute walk", "Stretch hips and back", "Optional pushups — 2 easy sets", "Clean one thing after the walk"],
  };
  if (day === 5) return {
    title: "Best Workout of the Week",
    time: "50–60 minutes",
    focus: "Full body lift plus a finish.",
    exercises: ["Warm up 5 minutes", "Leg press or squat — 3x8", "Bench or dumbbell press — 3x10", "Row or pulldown — 3x10", "Lunges or step-ups — 3x10", "Incline walk — 15 minutes"],
  };
  if (day === 6) return {
    title: "Active Day",
    time: "45–60 minutes",
    focus: "Make movement part of your weekend.",
    exercises: ["Long walk", "Golf range, pickup sport, hike, or bike", "Optional light core", "Stretch for 5 minutes"],
  };
  return {
    title: "Recovery + Prep",
    time: "20–30 minutes",
    focus: "Recover and set up Monday.",
    exercises: ["Easy walk", "Stretch", "Meal prep", "Plan workouts for the week"],
  };
}

function defaultLog(date: string): DayLog {
  return { date, completed: [], metrics: emptyMetrics, readingPages: "", appMinutes: "" };
}

function clean(value: string, suffix = "") {
  return value.trim() ? `${value}${suffix}` : "—";
}

export default function Home() {
  const [tab, setTab] = useState<Tab>("Today");
  const [date, setDate] = useState(todayKey());
  const [data, setData] = useState<AppData>(starterData);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return;
    try {
      setData(JSON.parse(saved));
    } catch {
      setData(starterData);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(data));
  }, [data]);

  const type = dayType(date);
  const schedule = useMemo(() => scheduleFor(type), [type]);
  const workout = useMemo(() => workoutFor(date), [date]);
  const log = data.logs[date] ?? defaultLog(date);

  const dailyMeals = {
    breakfast: rotate(breakfastIdeas, date, 0),
    lunch: rotate(lunchIdeas, date, 1),
    dinner: rotate(dinnerIdeas, date, 2),
    snack: rotate(snackIdeas, date, 3),
  };

  const coreTasks = [
    { id: "workout", title: "Workout or walk", detail: workout.title },
    { id: "breakfast", title: "Eat a good breakfast", detail: dailyMeals.breakfast },
    { id: "water", title: "Drink water", detail: "Aim for 80 oz or steady water all day." },
    { id: "reading", title: "Read", detail: "10 pages or 10 focused minutes." },
    { id: "app-work", title: "Work on your apps", detail: rotate(appGoals, date, 1) },
    { id: "presence", title: "Be present", detail: rotate(presenceGoals, date, 2) },
    { id: "clean", title: "Clean one thing", detail: "Kitchen, laundry, desk, car, or one room." },
  ];

  const allTaskIds = [...schedule.map((item) => `schedule-${item.id}`), ...coreTasks.map((item) => `task-${item.id}`), `workout-${workout.title}`];
  const completedCount = allTaskIds.filter((id) => log.completed.includes(id)).length;
  const completionPct = allTaskIds.length ? Math.round((completedCount / allTaskIds.length) * 100) : 0;

  function updateLog(updater: (current: DayLog) => DayLog) {
    setData((prev) => {
      const current = prev.logs[date] ?? defaultLog(date);
      const nextLog = updater(current);
      return { ...prev, logs: { ...prev.logs, [date]: nextLog } };
    });
  }

  function toggle(id: string) {
    updateLog((current) => {
      const completed = current.completed.includes(id)
        ? current.completed.filter((taskId) => taskId !== id)
        : [...current.completed, id];
      return { ...current, completed };
    });
  }

  function updateMetric(key: keyof Metrics, value: string) {
    updateLog((current) => ({ ...current, metrics: { ...current.metrics, [key]: value } }));
  }

  function updateField(key: "readingPages" | "appMinutes", value: string) {
    updateLog((current) => ({ ...current, [key]: value }));
  }

  function resetToday() {
    setData((prev) => {
      const next = { ...prev.logs };
      delete next[date];
      return { ...prev, logs: next };
    });
  }

  const history = Object.values(data.logs).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14);
  const weeklyLogs = Object.values(data.logs).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);
  const weeklyWorkouts = weeklyLogs.filter((item) => item.completed.some((id) => id.startsWith("workout") || id === "task-workout")).length;
  const weeklyPages = weeklyLogs.reduce((sum, item) => sum + Number(item.readingPages || 0), 0);
  const weeklyAppMinutes = weeklyLogs.reduce((sum, item) => sum + Number(item.appMinutes || 0), 0);

  function MealCard({ title, meal, ideas }: { title: string; meal: string; ideas: string[] }) {
    return (
      <div className="mini-card">
        <div className="mini-label">{title}</div>
        <strong>{meal}</strong>
        <div className="idea-list">
          {ideas.slice(0, 4).map((idea) => <span key={idea}>{idea}</span>)}
        </div>
      </div>
    );
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div className="hero-top">
          <div>
            <p className="eyebrow">Momentum</p>
            <h1>Build a better day.</h1>
          </div>
          <input className="date-pill" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </div>

        <p className="hero-copy">Move your body. Eat clean. Build something. Be present.</p>

        <div className="progress-area">
          <div className="progress-label">
            <span>{friendlyDate(date)}</span>
            <span>{completionPct}%</span>
          </div>
          <div className="progress-track"><div className="progress-fill" style={{ width: `${completionPct}%` }} /></div>
        </div>

        <div className="stat-grid">
          <div className="stat-card"><span>Done</span><strong>{completedCount}/{allTaskIds.length}</strong></div>
          <div className="stat-card"><span>Workout</span><strong>{workout.title.split(" ")[0]}</strong></div>
          <div className="stat-card"><span>Screen</span><strong>{clean(log.metrics.screenTime, "h")}</strong></div>
        </div>
      </section>

      <div className="tabs">
        {tabs.map((name) => <button key={name} className={`tab ${tab === name ? "active" : ""}`} onClick={() => setTab(name)}>{name}</button>)}
      </div>

      {tab === "Today" && (
        <section className="section">
          <div className="focus-card">
            <span>{type === "workday" ? "Workday plan" : type === "friday" ? "Friday reset" : "Weekend plan"}</span>
            <strong>{type === "workday" ? "Win the morning, move after work, then choose one meaningful night goal." : type === "friday" ? "Finish work early, train hard, reset the house, and set up the weekend." : "Enjoy the day without letting it drift."}</strong>
          </div>

          <div className="card">
            <div className="card-title">
              <div><h2>Today’s schedule</h2><p>Check off the day as you go.</p></div>
              <button className="btn secondary small" onClick={resetToday}>Reset</button>
            </div>
            <div className="timeline">
              {schedule.map((item) => {
                const id = `schedule-${item.id}`;
                const done = log.completed.includes(id);
                return (
                  <button key={item.id} className={`timeline-row ${done ? "done" : ""}`} onClick={() => toggle(id)}>
                    <span className="time-chip">{item.time}</span>
                    <span className="timeline-main"><strong>{item.title}</strong><small>{item.detail}</small></span>
                    <span className="checkmark">✓</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="card">
            <div className="card-title"><div><h2>Today’s wins</h2><p>Minimum win: complete any 3.</p></div></div>
            <div className="list">
              {coreTasks.map((task) => {
                const id = `task-${task.id}`;
                const done = log.completed.includes(id);
                return (
                  <button key={task.id} className={`task-row ${done ? "done" : ""}`} onClick={() => toggle(id)}>
                    <span className="box">✓</span>
                    <span><strong>{task.title}</strong><small>{task.detail}</small></span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="card">
            <div className="card-title"><div><h2>Today’s food</h2><p>Simple ideas for this day.</p></div></div>
            <div className="meal-grid">
              <MealCard title="Breakfast" meal={dailyMeals.breakfast} ideas={breakfastIdeas} />
              <MealCard title="Lunch" meal={dailyMeals.lunch} ideas={lunchIdeas} />
              <MealCard title="Dinner" meal={dailyMeals.dinner} ideas={dinnerIdeas} />
              <MealCard title="Snack" meal={dailyMeals.snack} ideas={snackIdeas} />
            </div>
          </div>
        </section>
      )}

      {tab === "Food" && (
        <section className="section">
          <div className="card">
            <div className="card-title"><div><h2>Food ideas</h2><p>Repeatable meals that are easy during work weeks.</p></div></div>
            <div className="meal-grid">
              <MealCard title="Breakfast" meal={dailyMeals.breakfast} ideas={breakfastIdeas} />
              <MealCard title="Lunch" meal={dailyMeals.lunch} ideas={lunchIdeas} />
              <MealCard title="Dinner" meal={dailyMeals.dinner} ideas={dinnerIdeas} />
              <MealCard title="Snack" meal={dailyMeals.snack} ideas={snackIdeas} />
            </div>
          </div>
          <div className="card">
            <div className="card-title"><div><h2>Simple plate rule</h2><p>Use this when you do not know what to eat.</p></div></div>
            <div className="rule-grid">
              <div><strong>Protein</strong><span>Chicken, eggs, turkey, steak, fish, Greek yogurt.</span></div>
              <div><strong>Carb</strong><span>Rice, potatoes, oats, tortillas, pasta, fruit.</span></div>
              <div><strong>Color</strong><span>Broccoli, salad, peppers, carrots, berries, green beans.</span></div>
            </div>
          </div>
        </section>
      )}

      {tab === "Workout" && (
        <section className="section">
          <div className="card workout-card">
            <div className="card-title">
              <div><h2>{workout.title}</h2><p>{workout.focus} Estimated time: {workout.time}.</p></div>
              <button className={`btn small ${log.completed.includes(`workout-${workout.title}`) ? "complete" : ""}`} onClick={() => toggle(`workout-${workout.title}`)}>{log.completed.includes(`workout-${workout.title}`) ? "Done" : "Mark done"}</button>
            </div>
            <div className="exercise-list">
              {workout.exercises.map((exercise) => <div key={exercise}>{exercise}</div>)}
            </div>
          </div>

          <div className="card">
            <div className="card-title"><div><h2>Weekly rhythm</h2><p>A balanced plan around your work schedule.</p></div></div>
            <div className="week-list">
              <span><strong>Mon</strong> Strength A</span>
              <span><strong>Tue</strong> Cardio + mobility</span>
              <span><strong>Wed</strong> Strength B</span>
              <span><strong>Thu</strong> Light reset</span>
              <span><strong>Fri</strong> Best workout</span>
              <span><strong>Sat</strong> Active day</span>
              <span><strong>Sun</strong> Recovery + prep</span>
            </div>
          </div>
        </section>
      )}

      {tab === "Goals" && (
        <section className="section">
          <div className="card">
            <div className="card-title"><div><h2>Reading + app work</h2><p>Track the two goals that help you improve without overcomplicating it.</p></div></div>
            <div className="form-grid">
              <label className="metric-card"><span>Pages read</span><input value={log.readingPages} onChange={(e) => updateField("readingPages", e.target.value)} inputMode="numeric" placeholder="10" /></label>
              <label className="metric-card"><span>App minutes</span><input value={log.appMinutes} onChange={(e) => updateField("appMinutes", e.target.value)} inputMode="numeric" placeholder="45" /></label>
            </div>
          </div>

          <div className="card">
            <div className="card-title"><div><h2>Goal ideas</h2><p>Pick one from each section when you need direction.</p></div></div>
            <div className="goal-columns">
              <div><h3>App work</h3>{appGoals.map((goal) => <span key={goal}>{goal}</span>)}</div>
              <div><h3>Presence</h3>{presenceGoals.map((goal) => <span key={goal}>{goal}</span>)}</div>
            </div>
          </div>

          <div className="card">
            <div className="card-title"><div><h2>Daily metrics</h2><p>Quick logs for progress history.</p></div></div>
            <div className="metric-grid">
              <label className="metric-card"><span>Weight</span><input value={log.metrics.weight} onChange={(e) => updateMetric("weight", e.target.value)} inputMode="decimal" placeholder="—" /><small>lbs</small></label>
              <label className="metric-card"><span>Sleep</span><input value={log.metrics.sleep} onChange={(e) => updateMetric("sleep", e.target.value)} inputMode="decimal" placeholder="—" /><small>hours</small></label>
              <label className="metric-card"><span>Screen</span><input value={log.metrics.screenTime} onChange={(e) => updateMetric("screenTime", e.target.value)} inputMode="decimal" placeholder="—" /><small>hours</small></label>
              <label className="metric-card"><span>Water</span><input value={log.metrics.water} onChange={(e) => updateMetric("water", e.target.value)} inputMode="decimal" placeholder="—" /><small>oz</small></label>
              <label className="metric-card"><span>Energy</span><input value={log.metrics.energy} onChange={(e) => updateMetric("energy", e.target.value)} inputMode="numeric" placeholder="1-10" /><small>rating</small></label>
              <label className="metric-card"><span>Mood</span><input value={log.metrics.mood} onChange={(e) => updateMetric("mood", e.target.value)} placeholder="Good" /><small>today</small></label>
            </div>
            <textarea className="textarea" value={log.metrics.notes} onChange={(e) => updateMetric("notes", e.target.value)} placeholder="What went well? What do you want to improve tomorrow?" />
          </div>
        </section>
      )}

      {tab === "Progress" && (
        <section className="section">
          <div className="card">
            <div className="card-title"><div><h2>This week</h2><p>Recent progress from this browser.</p></div></div>
            <div className="stat-grid light">
              <div className="stat-card"><span>Workouts</span><strong>{weeklyWorkouts}</strong></div>
              <div className="stat-card"><span>Pages</span><strong>{weeklyPages}</strong></div>
              <div className="stat-card"><span>App min</span><strong>{weeklyAppMinutes}</strong></div>
            </div>
          </div>

          <div className="card">
            <div className="card-title"><div><h2>Progress history</h2><p>Last 14 logged days.</p></div></div>
            <div className="history-list">
              {history.length === 0 && <div className="empty">Start checking things off to build your history.</div>}
              {history.map((item) => {
                const done = item.completed.length;
                const pct = allTaskIds.length ? Math.round((done / allTaskIds.length) * 100) : 0;
                return (
                  <div className="history-row" key={item.date}>
                    <div><strong>{shortDate(item.date)}</strong><small>{pct}% complete • {done} wins</small></div>
                    <div className="history-values">
                      <span>{clean(item.metrics.weight, " lb")}</span>
                      <span>{clean(item.metrics.sleep, "h sleep")}</span>
                      <span>{clean(item.metrics.screenTime, "h screen")}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <nav className="bottom-nav">
        {tabs.map((name) => <button key={name} className={tab === name ? "active" : ""} onClick={() => setTab(name)}>{name}</button>)}
      </nav>
    </main>
  );
}
