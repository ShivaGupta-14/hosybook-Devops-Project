import os

os.environ["DATABASE_URL"] = "sqlite:///./test.db"

import pytest
from fastapi.testclient import TestClient

from app.db import Base, engine
from app.main import app


@pytest.fixture(autouse=True)
def reset_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def booking():
    return {
        "patient_name": "Rahul Sharma",
        "phone": "9876543210",
        "doctor": "Dr. Anita Mehta",
        "department": "General",
        "appointment_date": "2026-10-20",
        "time_slot": "10:30",
        "reason": "fever and cough",
    }
