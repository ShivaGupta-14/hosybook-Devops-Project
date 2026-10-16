from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Status = Literal["BOOKED", "COMPLETED", "CANCELLED"]
Department = Literal["General", "Dental", "Skin", "Child"]


class AppointmentCreate(BaseModel):
    patient_name: str = Field(min_length=2, max_length=120)
    phone: str = Field(pattern=r"^[6-9]\d{9}$")
    doctor: str = Field(min_length=2, max_length=120)
    department: Department
    appointment_date: date
    time_slot: str = Field(pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    reason: str = Field(default="", max_length=500)


class AppointmentUpdate(BaseModel):
    patient_name: str | None = Field(default=None, min_length=2, max_length=120)
    phone: str | None = Field(default=None, pattern=r"^[6-9]\d{9}$")
    doctor: str | None = Field(default=None, min_length=2, max_length=120)
    department: Department | None = None
    appointment_date: date | None = None
    time_slot: str | None = Field(default=None, pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    reason: str | None = Field(default=None, max_length=500)
    status: Status | None = None


class AppointmentOut(AppointmentCreate):
    id: int
    status: Status
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class Doctor(BaseModel):
    name: str
    department: Department


class StatsOut(BaseModel):
    day: date
    today: int
    booked: int
    completed: int
    cancelled: int
