def test_health(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "UP"}


def test_ready(client):
    res = client.get("/ready")
    assert res.status_code == 200
    assert res.json()["status"] == "READY"


def test_list_doctors(client):
    res = client.get("/api/doctors")
    assert res.status_code == 200
    assert len(res.json()) == 4


def test_book_appointment(client, booking):
    res = client.post("/api/appointments", json=booking)
    assert res.status_code == 201
    data = res.json()
    assert data["id"] > 0
    assert data["patient_name"] == "Rahul Sharma"
    assert data["status"] == "BOOKED"


def test_book_needs_valid_phone(client, booking):
    booking["phone"] = "12345"
    res = client.post("/api/appointments", json=booking)
    assert res.status_code == 422


def test_book_needs_patient_name(client, booking):
    del booking["patient_name"]
    res = client.post("/api/appointments", json=booking)
    assert res.status_code == 422


def test_same_doctor_same_slot_is_blocked(client, booking):
    client.post("/api/appointments", json=booking)
    booking["patient_name"] = "Aman Verma"
    booking["phone"] = "9123456780"
    res = client.post("/api/appointments", json=booking)
    assert res.status_code == 409


def test_slot_is_free_again_after_cancel(client, booking):
    first = client.post("/api/appointments", json=booking).json()
    client.put(f"/api/appointments/{first['id']}", json={"status": "CANCELLED"})
    booking["patient_name"] = "Aman Verma"
    res = client.post("/api/appointments", json=booking)
    assert res.status_code == 201


def test_list_appointments_with_filters(client, booking):
    client.post("/api/appointments", json=booking)
    booking["time_slot"] = "11:00"
    booking["appointment_date"] = "2026-10-21"
    client.post("/api/appointments", json=booking)
    assert len(client.get("/api/appointments").json()) == 2
    assert len(client.get("/api/appointments?day=2026-10-20").json()) == 1
    assert len(client.get("/api/appointments?status=COMPLETED").json()) == 0


def test_get_appointment(client, booking):
    created = client.post("/api/appointments", json=booking).json()
    res = client.get(f"/api/appointments/{created['id']}")
    assert res.status_code == 200
    assert res.json()["doctor"] == "Dr. Anita Mehta"


def test_get_missing_appointment(client):
    res = client.get("/api/appointments/999")
    assert res.status_code == 404


def test_reschedule_and_complete(client, booking):
    created = client.post("/api/appointments", json=booking).json()
    res = client.put(f"/api/appointments/{created['id']}", json={"time_slot": "12:00"})
    assert res.json()["time_slot"] == "12:00"
    res = client.put(f"/api/appointments/{created['id']}", json={"status": "COMPLETED"})
    assert res.status_code == 200
    assert res.json()["status"] == "COMPLETED"


def test_reschedule_into_taken_slot_is_blocked(client, booking):
    client.post("/api/appointments", json=booking)
    booking["time_slot"] = "11:00"
    second = client.post("/api/appointments", json=booking).json()
    res = client.put(f"/api/appointments/{second['id']}", json={"time_slot": "10:30"})
    assert res.status_code == 409


def test_delete_appointment(client, booking):
    created = client.post("/api/appointments", json=booking).json()
    res = client.delete(f"/api/appointments/{created['id']}")
    assert res.status_code == 204
    assert client.get(f"/api/appointments/{created['id']}").status_code == 404


def test_stats_for_a_day(client, booking):
    first = client.post("/api/appointments", json=booking).json()
    booking["time_slot"] = "11:00"
    client.post("/api/appointments", json=booking)
    client.put(f"/api/appointments/{first['id']}", json={"status": "COMPLETED"})
    res = client.get("/api/appointments/stats?day=2026-10-20")
    assert res.json() == {"day": "2026-10-20", "today": 2, "booked": 1, "completed": 1, "cancelled": 0}


def test_metrics(client):
    client.get("/health")
    res = client.get("/metrics")
    assert res.status_code == 200
    assert "http_request" in res.text
