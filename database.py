import json, os
from config import USERS_FILE, SUBMISSIONS_FILE, PATIENTS_FILE, APPOINTMENTS_FILE


def _read(path):
    if not os.path.exists(path):
        return []
    with open(path, "r") as f:
        return json.load(f)

def _write(path, data):
    with open(path, "w") as f:
        json.dump(data, f, indent=2, default=str)


# ── Nurse users ────────────────────────────────────────
def get_all_users():               return _read(USERS_FILE)
def get_user_by_email(email):      return next((u for u in get_all_users() if u["email"] == email), None)
def get_user_by_username(un):      return next((u for u in get_all_users() if u.get("username") == un), None)
def get_user_by_id(uid):           return next((u for u in get_all_users() if u["id"] == uid), None)

def create_user(data):
    users = get_all_users()
    data["id"] = len(users) + 1
    users.append(data)
    _write(USERS_FILE, users)
    return data

def update_user_status(uid, status):
    users = get_all_users()
    for u in users:
        if u["id"] == uid:
            u["status"] = status
            break
    _write(USERS_FILE, users)


# ── Clinical submissions ───────────────────────────────
def get_all_submissions():             return _read(SUBMISSIONS_FILE)
def get_submissions_by_email(email):   return [s for s in get_all_submissions() if s.get("nurse_email") == email]

def create_submission(data):
    subs = get_all_submissions()
    data["id"] = len(subs) + 1
    subs.append(data)
    _write(SUBMISSIONS_FILE, subs)
    return data


# ── Patient portal ─────────────────────────────────────
def get_all_patients():
    return _read(PATIENTS_FILE)

def get_patient_by_email(email):
    return next((p for p in get_all_patients() if p["email"].lower() == email.lower()), None)

def get_patient_by_id(pid):
    return next((p for p in get_all_patients() if p["id"] == pid), None)

def create_patient(data):
    patients = get_all_patients()
    data["id"] = len(patients) + 1
    patients.append(data)
    _write(PATIENTS_FILE, patients)
    return data

def update_patient(pid, updates):
    patients = get_all_patients()
    for p in patients:
        if p["id"] == pid:
            p.update(updates)
            break
    _write(PATIENTS_FILE, patients)


# ── Appointments ───────────────────────────────────────
def get_all_appointments():
    return _read(APPOINTMENTS_FILE)

def get_appointments_by_patient(pid):
    return [a for a in get_all_appointments() if a["patient_id"] == pid]

def get_appointment_by_id(aid):
    return next((a for a in get_all_appointments() if a["id"] == aid), None)

def create_appointment(data):
    appts = get_all_appointments()
    data["id"] = len(appts) + 1
    appts.append(data)
    _write(APPOINTMENTS_FILE, appts)
    return data

def update_appointment(aid, updates):
    appts = get_all_appointments()
    for a in appts:
        if a["id"] == aid:
            a.update(updates)
            break
    _write(APPOINTMENTS_FILE, appts)
