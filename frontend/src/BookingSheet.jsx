import { useEffect, useState } from "react";
import Hosy from "./Hosy.jsx";
import { api } from "./api.js";

export const SLOTS = [];
for (let h = 9; h < 17; h++) {
  SLOTS.push(`${String(h).padStart(2, "0")}:00`, `${String(h).padStart(2, "0")}:30`);
}

const EMPTY = {
  patient_name: "",
  phone: "",
  doctor: "",
  department: "",
  appointment_date: "",
  time_slot: "",
  reason: "",
};

export default function BookingSheet({ open, editing, day, doctors, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [taken, setTaken] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError("");
    if (editing) {
      const { id, status, created_at, ...rest } = editing;
      setForm(rest);
    } else {
      setForm({ ...EMPTY, appointment_date: day, doctor: doctors[0]?.name || "", department: doctors[0]?.department || "" });
    }
  }, [open, editing, day, doctors]);

  useEffect(() => {
    if (!open || !form.doctor || !form.appointment_date) return;
    api
      .list({ day: form.appointment_date, doctor: form.doctor })
      .then((rows) =>
        setTaken(rows.filter((r) => r.status !== "CANCELLED" && r.id !== editing?.id).map((r) => r.time_slot))
      )
      .catch(() => setTaken([]));
  }, [open, form.doctor, form.appointment_date, editing]);

  if (!open) return null;

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const pickDoctor = (e) => {
    const doc = doctors.find((d) => d.name === e.target.value);
    setForm({ ...form, doctor: doc.name, department: doc.department, time_slot: "" });
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editing) {
        await api.update(editing.id, form);
      } else {
        await api.create(form);
      }
      onSaved(editing ? "appointment updated" : "appointment booked");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <form className="sheet" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="sheet-head">
          <Hosy pose="hello" size={44} />
          <div>
            <h2>{editing ? "reschedule." : "book appointment."}</h2>
            <p className="mute">{editing ? editing.patient_name : "fill patient details and pick a slot"}</p>
          </div>
        </div>

        <label>
          Patient name
          <input value={form.patient_name} onChange={set("patient_name")} placeholder="Rahul Sharma" required />
        </label>
        <label>
          Phone
          <input value={form.phone} onChange={set("phone")} placeholder="9876543210" inputMode="numeric" maxLength={10} required />
        </label>
        <div className="row-2">
          <label>
            Doctor
            <select value={form.doctor} onChange={pickDoctor}>
              {doctors.map((d) => (
                <option key={d.name} value={d.name}>
                  {d.name} · {d.department}
                </option>
              ))}
            </select>
          </label>
          <label>
            Date
            <input type="date" value={form.appointment_date} onChange={set("appointment_date")} required />
          </label>
        </div>

        <div className="field-label">Time slot</div>
        <div className="slots">
          {SLOTS.map((s) => (
            <button
              type="button"
              key={s}
              disabled={taken.includes(s)}
              className={"slot" + (form.time_slot === s ? " picked" : "")}
              onClick={() => setForm({ ...form, time_slot: s })}
            >
              {s}
            </button>
          ))}
        </div>

        <label>
          Reason
          <input value={form.reason} onChange={set("reason")} placeholder="fever, tooth pain, checkup..." />
        </label>

        {error && <p className="form-error">{error}</p>}

        <div className="sheet-actions">
          <button type="button" className="pill grey" onClick={onClose}>
            Cancel
          </button>
          <button className="pill black" disabled={saving || !form.time_slot}>
            {saving ? "Saving..." : editing ? "Save changes" : "Book"}
          </button>
        </div>
      </form>
    </div>
  );
}
