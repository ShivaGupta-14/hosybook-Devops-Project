import { useEffect, useState } from "react";
import Hosy from "./Hosy.jsx";
import BookingSheet, { SLOTS } from "./BookingSheet.jsx";
import { api } from "./api.js";

const toISO = (d) => {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const TODAY = toISO(new Date());
const WEEK = Array.from({ length: 7 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() + i - 2);
  return d;
});

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "good morning";
  if (h < 17) return "good afternoon";
  return "good evening";
};

const initials = (name) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");

const prettyDate = (iso) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });

const FILTERS = ["ALL", "BOOKED", "COMPLETED", "CANCELLED"];

const NAV = [
  { key: "today", label: "Today", icon: "M3 11 L12 4 L21 11 V20 H15 V14 H9 V20 H3 Z" },
  { key: "all", label: "Appointments", icon: "M4 5 H20 V20 H4 Z M4 10 H20 M9 3 V7 M15 3 V7" },
  { key: "doctors", label: "Doctors", icon: "M12 12 a4 4 0 1 0 0 -8 a4 4 0 1 0 0 8 M4 21 a8 6 0 0 1 16 0" },
];

function Icon({ d }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round">
      <path d={d} />
    </svg>
  );
}

function AppointmentRow({ a, onEdit, onStatus, onDelete, showDate }) {
  return (
    <div className={"row-card" + (a.status !== "BOOKED" ? " done" : "")}>
      <div className="avatar">{initials(a.patient_name)}</div>
      <button className="row-main" onClick={() => onEdit(a)}>
        <strong>{a.patient_name}</strong>
        <span className="mute">
          {showDate && prettyDate(a.appointment_date) + " · "}
          {a.time_slot} · {a.doctor} · {a.department}
        </span>
        {a.reason && <span className="faint">{a.reason}</span>}
      </button>
      <div className="row-actions">
        {a.status === "BOOKED" ? (
          <>
            <button className="pill black small" onClick={() => onStatus(a, "COMPLETED")}>
              Done
            </button>
            <button className="pill outline small" onClick={() => onStatus(a, "CANCELLED")}>
              Cancel
            </button>
          </>
        ) : (
          <span className={"badge " + a.status.toLowerCase()}>{a.status.toLowerCase()}</span>
        )}
        <button className="icon-btn" title="Delete" onClick={() => onDelete(a)}>
          <Icon d="M5 7 H19 M10 7 V4 H14 V7 M7 7 L8 20 H16 L17 7" />
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState("today");
  const [day, setDay] = useState(TODAY);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [doctors, setDoctors] = useState([]);
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState({ today: 0, booked: 0, completed: 0, cancelled: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sheet, setSheet] = useState({ open: false, editing: null });
  const [toast, setToast] = useState("");

  const load = async () => {
    try {
      setError("");
      const [docs, list, st] = await Promise.all([
        api.doctors(),
        api.list(view === "today" || view === "doctors" ? { day } : {}),
        api.stats(day),
      ]);
      setDoctors(docs);
      setRows(list);
      setStats(st);
    } catch (e) {
      setError("could not reach the backend");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [view, day]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const changeStatus = async (a, status) => {
    try {
      await api.update(a.id, { status });
      setToast(status === "COMPLETED" ? "marked as done" : "appointment cancelled");
      load();
    } catch (e) {
      setToast(e.message);
    }
  };

  const remove = async (a) => {
    if (!window.confirm(`Delete appointment of ${a.patient_name}?`)) return;
    await api.remove(a.id);
    setToast("appointment deleted");
    load();
  };

  const saved = (msg) => {
    setSheet({ open: false, editing: null });
    setToast(msg);
    load();
  };

  const visible = rows
    .filter((a) => filter === "ALL" || a.status === filter)
    .filter((a) => a.patient_name.toLowerCase().includes(search.toLowerCase()) || a.phone.includes(search));

  const waiting = rows.filter((a) => a.status === "BOOKED");
  const totalSlots = SLOTS.length * (doctors.length || 4);
  const filled = stats.booked + stats.completed;
  const isToday = day === TODAY;
  const rowProps = {
    onEdit: (a) => setSheet({ open: true, editing: a }),
    onStatus: changeStatus,
    onDelete: remove,
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <div className="logo-circle">
            <Hosy size={30} />
          </div>
          <span>hosybook</span>
        </div>
        <nav>
          {NAV.map((n) => (
            <button key={n.key} className={"nav-item" + (view === n.key ? " active" : "")} onClick={() => setView(n.key)}>
              <Icon d={n.icon} />
              <span>{n.label}</span>
            </button>
          ))}
        </nav>
        <div className="side-note">
          <Hosy pose="happy" size={40} />
          <p>
            <strong>{stats.completed}</strong> {stats.completed === 1 ? "patient" : "patients"} seen {isToday ? "today" : "on " + prettyDate(day)}
          </p>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div className="logo-circle mobile-only">
            <Hosy size={30} />
          </div>
          <div className="search">
            <Icon d="M11 18 a7 7 0 1 0 0 -14 a7 7 0 1 0 0 14 M16 16 L21 21" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search patients, phone" />
          </div>
          <button className="pill black desktop-only" onClick={() => setSheet({ open: true, editing: null })}>
            Book appointment
          </button>
        </header>

        {view !== "all" && (
          <>
            <div className="greeting-row">
              <Hosy pose="hello" size={64} />
              <h1 className="greeting">{greeting()}, reception.</h1>
            </div>
            <div className="days">
              {WEEK.map((d) => {
                const iso = toISO(d);
                return (
                  <button key={iso} className={"day" + (iso === day ? " picked" : "") + (iso < TODAY ? " past" : "")} onClick={() => setDay(iso)}>
                    <span>{d.toLocaleDateString("en-IN", { weekday: "short" }).slice(0, 2)}</span>
                    <strong>{d.getDate()}</strong>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {loading && (
          <div className="state">
            <Hosy pose="sleep" size={80} />
            <p className="mute">loading appointments...</p>
          </div>
        )}

        {!loading && error && (
          <div className="state">
            <Hosy pose="sorry" size={90} />
            <h3>{error}</h3>
            <p className="mute">check if the api is running and try again</p>
            <button className="pill black" onClick={load}>
              Try again
            </button>
          </div>
        )}

        {!loading && !error && view === "today" && (
          <>
            <section className="hero">
              <div className="card big">
                <span className="mute">{isToday ? "Appointments today" : "Appointments on " + prettyDate(day)}</span>
                <strong className="num">{stats.today}</strong>
                <span className="mute">
                  {stats.completed} done · {stats.cancelled} cancelled
                </span>
                <button className="pill outline" onClick={() => setView("all")}>
                  View all
                </button>
              </div>
              <div className="card big dark">
                <span>Waiting now</span>
                <strong className="num">{stats.booked}</strong>
                <span>{stats.booked === 1 ? "patient" : "patients"} in queue</span>
                <button className="pill white" onClick={() => setSheet({ open: true, editing: null })}>
                  Book new
                </button>
              </div>
            </section>

            <section className="card slots-card">
              <div className="slots-top">
                <strong>Slots filled</strong>
                <span>
                  <strong className="num-sm">{filled}</strong> / {totalSlots}
                </span>
              </div>
              <div className="bar">
                <div style={{ width: Math.min(100, (filled / totalSlots) * 100) + "%" }} />
              </div>
              <p className="mute">
                {totalSlots - filled} slots free
                {stats.cancelled > 0 && <span className="attention"> · {stats.cancelled} cancelled</span>}
              </p>
            </section>

            <h4 className="section-label">needs you · {waiting.length}</h4>
            {waiting.length === 0 ? (
              <div className="state small">
                <Hosy pose="empty" size={70} />
                <p className="mute">no one waiting. book the first patient.</p>
              </div>
            ) : (
              <div className="list">
                {waiting
                  .filter((a) => a.patient_name.toLowerCase().includes(search.toLowerCase()) || a.phone.includes(search))
                  .map((a) => (
                    <AppointmentRow key={a.id} a={a} {...rowProps} />
                  ))}
              </div>
            )}
          </>
        )}

        {!loading && !error && view === "all" && (
          <>
            <h1 className="greeting">all appointments.</h1>
            <div className="chips">
              {FILTERS.map((f) => (
                <button key={f} className={"chip" + (filter === f ? " active" : "")} onClick={() => setFilter(f)}>
                  {f.toLowerCase()}
                </button>
              ))}
            </div>
            {visible.length === 0 ? (
              <div className="state small">
                <Hosy pose="thinking" size={70} />
                <p className="mute">nothing found here</p>
              </div>
            ) : (
              <div className="list">
                {visible.map((a) => (
                  <AppointmentRow key={a.id} a={a} showDate {...rowProps} />
                ))}
              </div>
            )}
          </>
        )}

        {!loading && !error && view === "doctors" && (
          <>
            <h4 className="section-label">doctors · {prettyDate(day)}</h4>
            <div className="doctor-grid">
              {doctors.map((d) => {
                const mine = rows.filter((a) => a.doctor === d.name && a.status !== "CANCELLED");
                return (
                  <div key={d.name} className="card doctor">
                    <div className="avatar">{initials(d.name.replace("Dr. ", ""))}</div>
                    <strong>{d.name}</strong>
                    <span className="mute">{d.department}</span>
                    <div className="bar">
                      <div style={{ width: (mine.length / SLOTS.length) * 100 + "%" }} />
                    </div>
                    <span className="mute">
                      {mine.length} booked · {SLOTS.length - mine.length} free
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>

      <div className="bottom-actions mobile-only">
        <button className="pill black" onClick={() => setSheet({ open: true, editing: null })}>
          Book appointment
        </button>
      </div>

      <nav className="tabbar mobile-only">
        {NAV.map((n) => (
          <button key={n.key} className={"tab" + (view === n.key ? " active" : "")} onClick={() => setView(n.key)}>
            <Icon d={n.icon} />
            <span>{n.label}</span>
          </button>
        ))}
      </nav>

      <BookingSheet
        open={sheet.open}
        editing={sheet.editing}
        day={day < TODAY ? TODAY : day}
        doctors={doctors}
        onClose={() => setSheet({ open: false, editing: null })}
        onSaved={saved}
      />

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
