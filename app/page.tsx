"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Tab = "Today" | "Progress" | "Trackers" | "Goals";
type PersonId = "kameron" | "anna";

type Goal = {
  id: string;
  title: string;
  detail: string;
  active: boolean;
  template?: boolean;
};

type DayLog = {
  date: string;
  completedGoalIds: string[];
  weight: string;
  screenTime: string;
};

type PersonData = {
  goals: Goal[];
  logs: Record<string, DayLog>;
  startingWeight: string;
};

type AppData = Record<PersonId, PersonData>;
type SyncState = "loading" | "local" | "synced" | "saving" | "offline";

const tabs: Tab[] = ["Today", "Progress", "Trackers", "Goals"];
const people: { id: PersonId; name: string }[] = [
  { id: "kameron", name: "Kameron" },
  { id: "anna", name: "Anna" },
];

const storageKey = "momentum-75-day-challenge-v1";
const challengeStart = "2026-06-28";
const challengeEnd = "2026-09-10";
const challengeLength = 75;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const householdId = process.env.NEXT_PUBLIC_MOMENTUM_HOUSEHOLD_ID || "shared";
const syncEnabled = Boolean(supabaseUrl && supabaseAnonKey);

const sharedGoals: Goal[] = [
  { id: "workout-1", title: "Workout 1", detail: "45 minutes.", active: true, template: true },
  {
    id: "workout-2-outside",
    title: "Workout 2",
    detail: "45 minutes outside. Golf, pickleball, walking, running, or another outdoor activity counts.",
    active: true,
    template: true,
  },
  { id: "read", title: "Read 10 pages", detail: "10 pages.", active: true, template: true },
  { id: "devotional", title: "Pray / Christian devotional", detail: "Before bed.", active: true, template: true },
  { id: "screen-under-2", title: "Screen time under 2 hours", detail: "Enter iPhone Screen Time manually in Trackers.", active: true, template: true },
  { id: "no-phone-am", title: "No phone before 9:00 AM", detail: "Morning cutoff.", active: true, template: true },
  { id: "no-phone-pm", title: "No phone after 9:00 PM", detail: "Night cutoff.", active: true, template: true },
  { id: "eat-clean", title: "Eat clean", detail: "Choose whole, simple foods.", active: true, template: true },
  { id: "no-processed-snacks", title: "No processed-food snacks", detail: "Whole-food snacks only.", active: true, template: true },
  {
    id: "nightly-meeting",
    title: "Nightly meeting",
    detail: "Review what was accomplished and which goals were completed.",
    active: true,
    template: true,
  },
];

const kameronGoals: Goal[] = [
  { id: "read", title: "Read 30 pages", detail: "30 pages.", active: true, template: true },
  { id: "no-social-media", title: "No social media", detail: "Stay off social apps.", active: true, template: true },
  { id: "wake-up", title: "Get up 6:00 / 6:30 AM", detail: "Morning start.", active: true, template: true },
  { id: "learning-app-dev", title: "Continued learning / app development", detail: "Daily progress.", active: true, template: true },
  { id: "weekday-bedtime", title: "Bed by 10:30 on weekdays", detail: "Weekday bedtime.", active: true, template: true },
  { id: "pop-limit", title: "2 pops at work, 1 at home", detail: "Daily limit.", active: true, template: true },
];

const annaGoals: Goal[] = [
  { id: "wake-up", title: "Get up 6:00 / 6:30 AM", detail: "Morning start.", active: true, template: true },
  { id: "weekday-bedtime", title: "Bed by 10:30 on weekdays", detail: "Weekday bedtime.", active: true, template: true },
  { id: "review-material", title: "Review half of material day of", detail: "Same-day review.", active: true, template: true },
  { id: "coffee-sweetener-limit", title: "Coffee sweetener limit", detail: "Stay within the limit.", active: true, template: true },
];

function defaultGoalsFor(personId: PersonId): Goal[] {
  const overrides = personId === "kameron" ? kameronGoals : annaGoals;
  const overrideIds = new Set(overrides.map((goal) => goal.id));
  return [...sharedGoals.filter((goal) => !overrideIds.has(goal.id)), ...overrides];
}

function makePersonData(personId: PersonId): PersonData {
  return {
    goals: defaultGoalsFor(personId).map((goal) => ({ ...goal })),
    logs: {},
    startingWeight: "",
  };
}

const starterData: AppData = {
  kameron: makePersonData("kameron"),
  anna: makePersonData("anna"),
};

function dateParts(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(dateKey: string, days: number) {
  const next = dateParts(dateKey);
  next.setDate(next.getDate() + days);
  return toDateKey(next);
}

function todayKey() {
  return toDateKey(new Date());
}

function getInitialDate() {
  const today = todayKey();
  if (today < challengeStart) return challengeStart;
  if (today > challengeEnd) return challengeEnd;
  return today;
}

function friendlyDate(dateKey: string) {
  return dateParts(dateKey).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function compactDate(dateKey: string) {
  return dateParts(dateKey).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function challengeDay(dateKey: string) {
  const start = dateParts(challengeStart).getTime();
  const current = dateParts(dateKey).getTime();
  return Math.floor((current - start) / 86400000) + 1;
}

function dayLabel(dateKey: string) {
  const day = challengeDay(dateKey);
  if (day < 1) return "Before challenge";
  if (day > challengeLength) return "Challenge complete";
  return `Day ${day} of ${challengeLength}`;
}

function challengeDates() {
  return Array.from({ length: challengeLength }, (_, index) => addDays(challengeStart, index));
}

function defaultLog(date: string): DayLog {
  return { date, completedGoalIds: [], weight: "", screenTime: "" };
}

function activeGoals(person: PersonData) {
  return person.goals.filter((goal) => goal.active);
}

function completionFor(person: PersonData, dateKey: string) {
  const goals = activeGoals(person);
  const log = person.logs[dateKey] ?? defaultLog(dateKey);
  const completed = goals.filter((goal) => log.completedGoalIds.includes(goal.id)).length;
  return {
    completed,
    total: goals.length,
    pct: goals.length ? Math.round((completed / goals.length) * 100) : 0,
    full: goals.length > 0 && completed === goals.length,
  };
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function signedNumber(value: number) {
  if (!Number.isFinite(value) || value === 0) return "0";
  return value > 0 ? `+${value.toFixed(1)}` : value.toFixed(1);
}

function clean(value: string, suffix = "") {
  return value.trim() ? `${value}${suffix}` : "--";
}

function readNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function mergeSavedData(saved: unknown): AppData {
  const maybeData = saved as Partial<AppData> | null;
  const next: AppData = {
    kameron: makePersonData("kameron"),
    anna: makePersonData("anna"),
  };

  for (const person of people) {
    const savedPerson = maybeData?.[person.id];
    if (!savedPerson) continue;
    const savedGoals = Array.isArray(savedPerson.goals) ? savedPerson.goals : [];
    const customGoals = savedGoals.filter((goal) => goal && !goal.template);

    next[person.id] = {
      goals: [
        ...defaultGoalsFor(person.id).map((goal) => {
          const savedGoal = savedGoals.find((item) => item.id === goal.id);
          const useUpdatedDefault = person.id === "kameron" && goal.id === "read" && savedGoal?.title === "Read 10 pages";
          return {
            ...goal,
            title: useUpdatedDefault ? goal.title : typeof savedGoal?.title === "string" ? savedGoal.title : goal.title,
            detail: useUpdatedDefault ? goal.detail : typeof savedGoal?.detail === "string" ? savedGoal.detail : goal.detail,
            active: typeof savedGoal?.active === "boolean" ? savedGoal.active : goal.active,
          };
        }),
        ...customGoals.map((goal) => ({
          id: typeof goal.id === "string" ? goal.id : `custom-${Date.now()}`,
          title: typeof goal.title === "string" ? goal.title : "Custom goal",
          detail: typeof goal.detail === "string" ? goal.detail : "",
          active: typeof goal.active === "boolean" ? goal.active : true,
          template: false,
        })),
      ],
      logs: savedPerson.logs && typeof savedPerson.logs === "object" ? savedPerson.logs : {},
      startingWeight: typeof savedPerson.startingWeight === "string" ? savedPerson.startingWeight : "",
    };
  }

  return next;
}

function cloudHeaders() {
  return {
    apikey: supabaseAnonKey ?? "",
    Authorization: `Bearer ${supabaseAnonKey ?? ""}`,
  };
}

function cloudEndpoint() {
  return `${supabaseUrl}/rest/v1/momentum_challenge_state`;
}

async function fetchCloudData() {
  if (!syncEnabled) return null;
  const response = await fetch(
    `${cloudEndpoint()}?id=eq.${encodeURIComponent(householdId)}&select=app_data,updated_at`,
    {
      headers: cloudHeaders(),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error("Could not load shared Momentum data.");
  }

  const rows = (await response.json()) as { app_data?: unknown; updated_at?: string }[];
  const row = rows[0];
  if (!row?.app_data) return null;

  return {
    data: mergeSavedData(row.app_data),
    updatedAt: row.updated_at ?? "",
  };
}

async function saveCloudData(data: AppData) {
  if (!syncEnabled) return;
  const updatedAt = new Date().toISOString();
  const response = await fetch(`${cloudEndpoint()}?on_conflict=id`, {
    method: "POST",
    headers: {
      ...cloudHeaders(),
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({
      id: householdId,
      app_data: data,
      updated_at: updatedAt,
    }),
  });

  if (!response.ok) {
    throw new Error("Could not save shared Momentum data.");
  }

  return updatedAt;
}

export default function Home() {
  const [tab, setTab] = useState<Tab>("Today");
  const [date, setDate] = useState(getInitialDate);
  const [selectedPerson, setSelectedPerson] = useState<PersonId>("kameron");
  const [data, setData] = useState<AppData>(starterData);
  const [newGoals, setNewGoals] = useState<Record<PersonId, string>>({ kameron: "", anna: "" });
  const [trackerDraft, setTrackerDraft] = useState({ weight: "", screenTime: "" });
  const [hydrated, setHydrated] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>(syncEnabled ? "loading" : "local");
  const lastCloudSaveRef = useRef("");

  const dates = useMemo(() => challengeDates(), []);

  useEffect(() => {
    let cancelled = false;

    async function hydrateData() {
      let nextData = starterData;
      const saved = window.localStorage.getItem(storageKey);

      if (saved) {
        try {
          nextData = mergeSavedData(JSON.parse(saved));
        } catch {
          nextData = starterData;
        }
      }

      if (syncEnabled) {
        try {
          const cloud = await fetchCloudData();
          if (cancelled) return;

          if (cloud) {
            nextData = cloud.data;
            lastCloudSaveRef.current = cloud.updatedAt;
          } else if (saved) {
            const updatedAt = await saveCloudData(nextData);
            lastCloudSaveRef.current = updatedAt ?? "";
          }

          setSyncState("synced");
        } catch {
          if (cancelled) return;
          setSyncState("offline");
        }
      }

      if (!cancelled) {
        setData(nextData);
        setHydrated(true);
      }
    }

    hydrateData();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(storageKey, JSON.stringify(data));

    if (!syncEnabled) {
      setSyncState("local");
      return;
    }

    setSyncState("saving");
    const timeout = window.setTimeout(async () => {
      try {
        const updatedAt = await saveCloudData(data);
        lastCloudSaveRef.current = updatedAt ?? "";
        setSyncState("synced");
      } catch {
        setSyncState("offline");
      }
    }, 650);

    return () => window.clearTimeout(timeout);
  }, [data, hydrated]);

  useEffect(() => {
    if (!syncEnabled || !hydrated) return;

    let cancelled = false;

    async function refreshCloudData() {
      try {
        const cloud = await fetchCloudData();
        if (cancelled || !cloud || cloud.updatedAt === lastCloudSaveRef.current) return;
        lastCloudSaveRef.current = cloud.updatedAt;
        setData(cloud.data);
        setSyncState("synced");
      } catch {
        if (!cancelled) setSyncState("offline");
      }
    }

    const onFocus = () => refreshCloudData();
    const interval = window.setInterval(refreshCloudData, 30000);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [hydrated]);

  useEffect(() => {
    const log = data[selectedPerson].logs[date] ?? defaultLog(date);
    setTrackerDraft({ weight: log.weight, screenTime: log.screenTime });
  }, [data, date, selectedPerson]);

  function updatePerson(personId: PersonId, updater: (person: PersonData) => PersonData) {
    setData((current) => ({ ...current, [personId]: updater(current[personId]) }));
  }

  function updateLog(personId: PersonId, updater: (log: DayLog) => DayLog) {
    updatePerson(personId, (person) => {
      const currentLog = person.logs[date] ?? defaultLog(date);
      const nextLog = updater(currentLog);
      return { ...person, logs: { ...person.logs, [date]: nextLog } };
    });
  }

  function toggleGoal(personId: PersonId, goalId: string) {
    updateLog(personId, (log) => {
      const completedGoalIds = log.completedGoalIds.includes(goalId)
        ? log.completedGoalIds.filter((id) => id !== goalId)
        : [...log.completedGoalIds, goalId];
      return { ...log, completedGoalIds };
    });
  }

  function saveTrackers(personId: PersonId) {
    updatePerson(personId, (person) => {
      const currentLog = person.logs[date] ?? defaultLog(date);
      const nextLog = { ...currentLog, weight: trackerDraft.weight, screenTime: trackerDraft.screenTime };
      return {
        ...person,
        startingWeight: date === challengeStart ? trackerDraft.weight : person.startingWeight,
        logs: { ...person.logs, [date]: nextLog },
      };
    });
  }

  function updateGoal(personId: PersonId, goalId: string, field: "title" | "detail" | "active", value: string | boolean) {
    updatePerson(personId, (person) => ({
      ...person,
      goals: person.goals.map((goal) => (goal.id === goalId ? { ...goal, [field]: value } : goal)),
    }));
  }

  function addCustomGoal(personId: PersonId) {
    const title = newGoals[personId].trim();
    if (!title) return;
    updatePerson(personId, (person) => ({
      ...person,
      goals: [
        ...person.goals,
        {
          id: `custom-${Date.now()}-${personId}`,
          title,
          detail: "Custom challenge goal.",
          active: true,
          template: false,
        },
      ],
    }));
    setNewGoals((current) => ({ ...current, [personId]: "" }));
  }

  function deleteCustomGoal(personId: PersonId, goalId: string) {
    updatePerson(personId, (person) => ({
      ...person,
      goals: person.goals.filter((goal) => goal.id !== goalId || goal.template),
      logs: Object.fromEntries(
        Object.entries(person.logs).map(([logDate, log]) => [
          logDate,
          { ...log, completedGoalIds: log.completedGoalIds.filter((id) => id !== goalId) },
        ]),
      ),
    }));
  }

  const selectedName = people.find((person) => person.id === selectedPerson)?.name ?? "Kameron";
  const selectedToday = completionFor(data[selectedPerson], date);
  const selectedProgress = progressSummary(selectedPerson);
  const selectedTracker = trackerSummary(selectedPerson);

  function progressSummary(personId: PersonId) {
    const person = data[personId];
    const elapsedDates = dates.filter((item) => item <= date);
    const dayStats = dates.map((item) => ({ date: item, ...completionFor(person, item) }));
    const elapsedStats = dayStats.filter((item) => item.date <= date);
    const overall = Math.round(average(elapsedStats.map((item) => item.pct)));
    let currentStreak = 0;
    let bestStreak = 0;
    let running = 0;

    for (const item of elapsedStats) {
      if (item.full) {
        running += 1;
        bestStreak = Math.max(bestStreak, running);
      } else {
        running = 0;
      }
    }

    for (let index = elapsedDates.length - 1; index >= 0; index -= 1) {
      const item = dayStats.find((day) => day.date === elapsedDates[index]);
      if (!item?.full) break;
      currentStreak += 1;
    }

    return {
      dayStats,
      today: completionFor(person, date),
      overall,
      currentStreak,
      bestStreak,
    };
  }

  function trackerSummary(personId: PersonId) {
    const person = data[personId];
    const logs = dates.filter((item) => item <= date).map((item) => person.logs[item] ?? defaultLog(item));
    const weightLogs = logs
      .map((log) => ({ date: log.date, value: readNumber(log.weight) }))
      .filter((item): item is { date: string; value: number } => item.value !== null);
    const screenLogs = logs
      .map((log) => ({ date: log.date, value: readNumber(log.screenTime) }))
      .filter((item): item is { date: string; value: number } => item.value !== null);
    const currentLog = person.logs[date] ?? defaultLog(date);
    const currentScreen = readNumber(currentLog.screenTime);
    const lastSevenScreen = screenLogs.filter((item) => item.date <= date).slice(-7).map((item) => item.value);
    const startingWeight = readNumber(person.logs[challengeStart]?.weight) ?? readNumber(person.startingWeight);
    const currentWeight = date === challengeStart
      ? startingWeight
      : readNumber(currentLog.weight) ?? weightLogs.filter((item) => item.date > challengeStart).at(-1)?.value ?? null;

    return {
      log: currentLog,
      weightLogs,
      screenLogs,
      startingWeight,
      currentWeight,
      weightChange: startingWeight !== null && currentWeight !== null ? currentWeight - startingWeight : null,
      screenWeeklyAverage: average(lastSevenScreen),
      screenPassed: currentScreen !== null ? currentScreen < 2 : null,
    };
  }

  function PersonChecklist({ personId, name }: { personId: PersonId; name: string }) {
    const person = data[personId];
    const goals = activeGoals(person);
    const log = person.logs[date] ?? defaultLog(date);
    const stats = completionFor(person, date);

    return (
      <div className="card person-card">
        <div className="card-title compact">
          <div>
            <h2>{name}</h2>
            <p>{stats.completed} of {stats.total} goals complete.</p>
          </div>
          <strong className="score-pill">{stats.pct}%</strong>
        </div>
        <div className="progress-track light"><div className="progress-fill" style={{ width: `${stats.pct}%` }} /></div>
        <div className="check-list">
          {goals.map((goal) => {
            const done = log.completedGoalIds.includes(goal.id);
            return (
              <button key={goal.id} className={`task-row ${done ? "done" : ""}`} onClick={() => toggleGoal(personId, goal.id)}>
                <span className="box" />
                <span><strong>{goal.title}</strong><small>{goal.detail}</small></span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  function MiniCalendar({ personId }: { personId: PersonId }) {
    const summary = progressSummary(personId);
    return (
      <div className="calendar-grid" aria-label={`${personId} challenge calendar`}>
        {summary.dayStats.map((item, index) => (
          <button
            key={item.date}
            className={`day-dot ${item.full ? "full" : item.pct > 0 ? "partial" : ""} ${item.date === date ? "selected" : ""}`}
            title={`${compactDate(item.date)}: ${item.pct}%`}
            onClick={() => setDate(item.date)}
          >
            <span>{index + 1}</span>
            <i style={{ height: `${Math.max(item.pct, 6)}%` }} />
          </button>
        ))}
      </div>
    );
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div className="hero-top">
          <div>
            <p className="eyebrow">Momentum 75</p>
            <h1>{selectedName}</h1>
          </div>
          <span className={`sync-pill ${syncState}`}>
            {syncState === "local"
              ? "Local"
              : syncState === "offline"
                ? "Offline"
                : syncState === "saving"
                  ? "Saving"
                  : syncState === "loading"
                    ? "Loading"
                    : "Shared"}
          </span>
          <input
            className="date-pill"
            type="date"
            min={challengeStart}
            max={challengeEnd}
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </div>

        <div className="progress-area">
          <div className="progress-label">
            <span>{dayLabel(date)}</span>
            <span>{selectedToday.pct}%</span>
          </div>
          <div className="progress-track"><div className="progress-fill" style={{ width: `${selectedToday.pct}%` }} /></div>
        </div>

        <div className="stat-grid hero-stats">
          <div className="stat-card"><span>Range</span><strong>Jun 28 - Sep 10</strong></div>
          <div className="stat-card"><span>Done</span><strong>{selectedToday.completed}/{selectedToday.total}</strong></div>
          <div className="stat-card"><span>Overall</span><strong>{selectedProgress.overall}%</strong></div>
        </div>
      </section>

      <div className="person-switch" aria-label="Select person">
        {people.map((person) => (
          <button
            key={person.id}
            className={selectedPerson === person.id ? "active" : ""}
            onClick={() => setSelectedPerson(person.id)}
          >
            {person.name}
          </button>
        ))}
      </div>

      <div className="tabs">
        {tabs.map((name) => <button key={name} className={`tab ${tab === name ? "active" : ""}`} onClick={() => setTab(name)}>{name}</button>)}
      </div>

      {tab === "Today" && (
        <section className="section">
          <div className="focus-card">
            <span>{friendlyDate(date)}</span>
            <strong>{dayLabel(date)} - June 28, 2026 to September 10, 2026</strong>
          </div>

          <PersonChecklist personId={selectedPerson} name={selectedName} />
        </section>
      )}

      {tab === "Progress" && (
        <section className="section">
          <div className="card">
            <div className="card-title compact">
              <div>
                <h2>{selectedName} progress</h2>
                <p>{friendlyDate(date)}</p>
              </div>
              <strong className="score-pill">{selectedProgress.today.pct}% today</strong>
            </div>
            <div className="stat-grid light split">
              <div className="stat-card"><span>Overall</span><strong>{selectedProgress.overall}%</strong></div>
              <div className="stat-card"><span>Current</span><strong>{selectedProgress.currentStreak}</strong></div>
              <div className="stat-card"><span>Best</span><strong>{selectedProgress.bestStreak}</strong></div>
              <div className="stat-card"><span>Weight</span><strong>{selectedTracker.currentWeight === null ? "--" : selectedTracker.currentWeight.toFixed(1)}</strong><small>lbs</small></div>
              <div className="stat-card"><span>Screen</span><strong>{clean(selectedTracker.log.screenTime, "h")}</strong><small>today</small></div>
              <div className="stat-card"><span>Status</span><strong>{selectedTracker.screenPassed === null ? "--" : selectedTracker.screenPassed ? "Pass" : "Miss"}</strong><small>under 2h</small></div>
            </div>
            <MiniCalendar personId={selectedPerson} />
          </div>
        </section>
      )}

      {tab === "Trackers" && (
        <section className="section">
          <div className="focus-card">
            <span>{selectedName}</span>
            <strong>Screen time is entered manually from iPhone Screen Time.</strong>
          </div>

          <div className="card">
            <div className="card-title">
              <div><h2>Trackers</h2><p>{friendlyDate(date)}</p></div>
            </div>

            <div className="form-grid">
              <label className="metric-card">
                <span>{date === challengeStart ? "Starting weight" : "Current weight"}</span>
                <input
                  value={trackerDraft.weight}
                  onChange={(event) => setTrackerDraft((current) => ({ ...current, weight: event.target.value }))}
                  inputMode="decimal"
                  placeholder="lbs"
                />
                <small>{date === challengeStart ? "Challenge start" : "Daily entry"}</small>
              </label>
              <label className="metric-card">
                <span>Screen time</span>
                <input
                  value={trackerDraft.screenTime}
                  onChange={(event) => setTrackerDraft((current) => ({ ...current, screenTime: event.target.value }))}
                  inputMode="decimal"
                  placeholder="hours"
                />
                <small>{selectedTracker.screenPassed === null ? "Manual entry" : selectedTracker.screenPassed ? "Under 2 hours" : "Over 2 hours"}</small>
              </label>
            </div>
            <button className="btn save-trackers" onClick={() => saveTrackers(selectedPerson)}>Save day</button>

            <div className="stat-grid light tracker-stats">
              <div className="stat-card"><span>Start</span><strong>{selectedTracker.startingWeight === null ? "--" : selectedTracker.startingWeight.toFixed(1)}</strong><small>lbs</small></div>
              <div className="stat-card"><span>Current</span><strong>{selectedTracker.currentWeight === null ? "--" : selectedTracker.currentWeight.toFixed(1)}</strong><small>lbs</small></div>
              <div className="stat-card"><span>Change</span><strong>{selectedTracker.weightChange === null ? "--" : signedNumber(selectedTracker.weightChange)}</strong><small>lbs</small></div>
              <div className="stat-card"><span>Screen</span><strong>{clean(selectedTracker.log.screenTime, "h")}</strong><small>today</small></div>
              <div className="stat-card"><span>7-day avg</span><strong>{selectedTracker.screenWeeklyAverage ? selectedTracker.screenWeeklyAverage.toFixed(1) : "--"}</strong><small>hours</small></div>
              <div className="stat-card"><span>Status</span><strong>{selectedTracker.screenPassed === null ? "--" : selectedTracker.screenPassed ? "Pass" : "Miss"}</strong><small>under 2h</small></div>
            </div>
          </div>
        </section>
      )}

      {tab === "Goals" && (
        <section className="section">
          <div className="card">
            <div className="card-title">
              <div><h2>{selectedName} goals</h2></div>
            </div>

            <div className="add-goal">
              <input
                value={newGoals[selectedPerson]}
                onChange={(event) => setNewGoals((current) => ({ ...current, [selectedPerson]: event.target.value }))}
                placeholder={`Add a ${selectedName} goal`}
              />
              <button className="btn small" onClick={() => addCustomGoal(selectedPerson)}>Add</button>
            </div>

            <div className="goal-editor">
              {data[selectedPerson].goals.map((goal) => (
                <div className={`goal-edit-row ${goal.active ? "" : "inactive"}`} key={goal.id}>
                  <label className="toggle-line">
                    <input
                      type="checkbox"
                      checked={goal.active}
                      onChange={(event) => updateGoal(selectedPerson, goal.id, "active", event.target.checked)}
                    />
                    <span>{goal.active ? "Active" : "Paused"}</span>
                  </label>
                  <input value={goal.title} onChange={(event) => updateGoal(selectedPerson, goal.id, "title", event.target.value)} />
                  <textarea value={goal.detail} onChange={(event) => updateGoal(selectedPerson, goal.id, "detail", event.target.value)} />
                  {!goal.template && <button className="btn secondary small" onClick={() => deleteCustomGoal(selectedPerson, goal.id)}>Delete</button>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
