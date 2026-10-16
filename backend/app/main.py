from datetime import date

from fastapi import Depends, FastAPI, HTTPException, status
from prometheus_fastapi_instrumentator import Instrumentator
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .config import settings
from .db import get_db
from .models import Appointment
from .schemas import (
    AppointmentCreate,
    AppointmentOut,
    AppointmentUpdate,
    Doctor,
    StatsOut,
    Status,
)

DOCTORS = [
    Doctor(name="Dr. Anita Mehta", department="General"),
    Doctor(name="Dr. Rohan Iyer", department="Dental"),
    Doctor(name="Dr. Sana Khan", department="Skin"),
    Doctor(name="Dr. Vikram Rao", department="Child"),
]

app = FastAPI(title=settings.app_name, version="1.0.0")
Instrumentator().instrument(app).expose(app, endpoint="/metrics")


def find_or_404(db: Session, appointment_id: int) -> Appointment:
    appointment = db.get(Appointment, appointment_id)
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return appointment


def check_slot_free(db: Session, doctor: str, day: date, slot: str, skip_id: int | None = None):
    query = select(Appointment.id).where(
        Appointment.doctor == doctor,
        Appointment.appointment_date == day,
        Appointment.time_slot == slot,
        Appointment.status != "CANCELLED",
    )
    if skip_id is not None:
        query = query.where(Appointment.id != skip_id)
    if db.scalar(query) is not None:
        raise HTTPException(status_code=409, detail=f"{doctor} is already booked at {slot} on {day}")


@app.get("/")
def root():
    return {"service": settings.app_name, "version": "1.0.0", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "UP"}


@app.get("/ready")
def ready(db: Session = Depends(get_db)):
    db.execute(select(func.count(Appointment.id)))
    return {"status": "READY"}


@app.get("/api/doctors", response_model=list[Doctor])
def list_doctors():
    return DOCTORS


@app.get("/api/appointments", response_model=list[AppointmentOut])
def list_appointments(
    day: date | None = None,
    status: Status | None = None,
    doctor: str | None = None,
    db: Session = Depends(get_db),
):
    query = select(Appointment)
    if day:
        query = query.where(Appointment.appointment_date == day)
    if status:
        query = query.where(Appointment.status == status)
    if doctor:
        query = query.where(Appointment.doctor == doctor)
    query = query.order_by(Appointment.appointment_date, Appointment.time_slot)
    return list(db.scalars(query))


@app.get("/api/appointments/stats", response_model=StatsOut)
def appointment_stats(day: date | None = None, db: Session = Depends(get_db)):
    day = day or date.today()
    rows = db.execute(
        select(Appointment.status, func.count(Appointment.id))
        .where(Appointment.appointment_date == day)
        .group_by(Appointment.status)
    ).all()
    counts = dict(rows)
    return StatsOut(
        day=day,
        today=sum(counts.values()),
        booked=counts.get("BOOKED", 0),
        completed=counts.get("COMPLETED", 0),
        cancelled=counts.get("CANCELLED", 0),
    )


@app.get("/api/appointments/{appointment_id}", response_model=AppointmentOut)
def get_appointment(appointment_id: int, db: Session = Depends(get_db)):
    return find_or_404(db, appointment_id)


@app.post("/api/appointments", response_model=AppointmentOut, status_code=status.HTTP_201_CREATED)
def create_appointment(payload: AppointmentCreate, db: Session = Depends(get_db)):
    check_slot_free(db, payload.doctor, payload.appointment_date, payload.time_slot)
    appointment = Appointment(**payload.model_dump(), status="BOOKED")
    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    return appointment


@app.put("/api/appointments/{appointment_id}", response_model=AppointmentOut)
def update_appointment(appointment_id: int, payload: AppointmentUpdate, db: Session = Depends(get_db)):
    appointment = find_or_404(db, appointment_id)
    changes = payload.model_dump(exclude_unset=True)
    for key, value in changes.items():
        setattr(appointment, key, value)
    if appointment.status != "CANCELLED" and {"doctor", "appointment_date", "time_slot", "status"} & changes.keys():
        check_slot_free(db, appointment.doctor, appointment.appointment_date, appointment.time_slot, appointment.id)
    db.commit()
    db.refresh(appointment)
    return appointment


@app.delete("/api/appointments/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_appointment(appointment_id: int, db: Session = Depends(get_db)):
    appointment = find_or_404(db, appointment_id)
    db.delete(appointment)
    db.commit()
