from flask import Blueprint, request, jsonify, session
from datetime import datetime
from database import (
    get_patient_by_email, get_patient_by_id, create_patient, update_patient,
    get_all_appointments, get_appointments_by_patient,
    get_appointment_by_id, create_appointment, update_appointment
)

patient_bp = Blueprint("patient", __name__)


def _require_patient():
    user = session.get("patient")
    if not user:
        return None
    return user


# ── Patient auth ───────────────────────────────────────

@patient_bp.route("/api/patient/register", methods=["POST"])
def patient_register():
    d = request.get_json()
    required = ["fname","lname","mname","age","sex","birthday",
                "address","phone","email","messenger","password"]
    missing = [f for f in required if not d.get(f)]
    if missing:
        return jsonify({"error": f"Please fill in all required fields: {', '.join(missing)}"}), 400

    email = d["email"].strip().lower()
    if get_patient_by_email(email):
        return jsonify({"error": "Email is already registered. Please log in."}), 400

    # Basic validations
    import re
    if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
        return jsonify({"error": "Invalid email format."}), 400
    if not str(d["age"]).isdigit() or int(d["age"]) < 1 or int(d["age"]) > 120:
        return jsonify({"error": "Age must be a valid number."}), 400

    patient = create_patient({
        "fname":       d["fname"].strip(),
        "lname":       d["lname"].strip(),
        "mname":       d["mname"].strip(),
        "name":        f"{d['fname'].strip()} {d['mname'].strip()} {d['lname'].strip()}",
        "age":         int(d["age"]),
        "sex":         d["sex"],
        "birthday":    d["birthday"],
        "address":     d["address"].strip(),
        "phone":       d["phone"].strip(),
        "email":       email,
        "messenger":   d["messenger"].strip(),
        "password":    d["password"],
        "registered_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
    })
    session["patient"] = {"id": patient["id"], "name": patient["name"],
                          "email": patient["email"], "role": "patient"}
    return jsonify({"ok": True, "name": patient["name"]})


@patient_bp.route("/api/patient/login", methods=["POST"])
def patient_login():
    d = request.get_json()
    email    = d.get("email","").strip().lower()
    password = d.get("password","")
    patient  = get_patient_by_email(email)
    if not patient or patient["password"] != password:
        return jsonify({"error": "Invalid email or password."}), 401
    session["patient"] = {"id": patient["id"], "name": patient["name"],
                          "email": patient["email"], "role": "patient"}
    return jsonify({"ok": True, "name": patient["name"]})


@patient_bp.route("/api/patient/logout", methods=["POST"])
def patient_logout():
    session.pop("patient", None)
    return jsonify({"ok": True})


@patient_bp.route("/api/patient/me")
def patient_me():
    p = _require_patient()
    if not p:
        return jsonify({"error": "Not logged in"}), 401
    patient = get_patient_by_id(p["id"])
    return jsonify(patient)


# ── Appointments ───────────────────────────────────────

@patient_bp.route("/api/patient/appointments", methods=["GET"])
def get_my_appointments():
    p = _require_patient()
    if not p:
        return jsonify({"error": "Unauthorized"}), 401
    return jsonify(get_appointments_by_patient(p["id"]))


@patient_bp.route("/api/patient/appointments", methods=["POST"])
def book_appointment():
    p = _require_patient()
    if not p:
        return jsonify({"error": "Unauthorized"}), 401

    d = request.get_json()
    required = ["appt_date", "appt_time", "concern"]
    missing = [f for f in required if not d.get(f)]
    if missing:
        return jsonify({"error": f"Missing: {', '.join(missing)}"}), 400

    patient = get_patient_by_id(p["id"])
    appt = create_appointment({
        "patient_id":   p["id"],
        "patient_name": patient["name"],
        "patient_email":patient["email"],
        "patient_phone":patient.get("phone",""),
        "patient_messenger": patient.get("messenger",""),
        "appt_date":    d["appt_date"],
        "appt_time":    d["appt_time"],
        "concern":      d["concern"].strip(),
        "status":       "Pending",
        "urgent":       d.get("urgent", False),
        "notes":        "",
        "submitted_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "updated_at":   datetime.now().strftime("%Y-%m-%d %H:%M"),
    })
    return jsonify({"ok": True, "id": appt["id"]})


@patient_bp.route("/api/patient/appointments/<int:aid>", methods=["PUT"])
def update_my_appointment(aid):
    p = _require_patient()
    if not p:
        return jsonify({"error": "Unauthorized"}), 401
    appt = get_appointment_by_id(aid)
    if not appt or appt["patient_id"] != p["id"]:
        return jsonify({"error": "Not found"}), 404
    if appt["status"] == "Completed":
        return jsonify({"error": "Cannot edit a completed appointment."}), 400

    d = request.get_json()
    updates = {}
    for field in ["appt_date","appt_time","concern"]:
        if d.get(field):
            updates[field] = d[field]
    updates["updated_at"] = datetime.now().strftime("%Y-%m-%d %H:%M")
    update_appointment(aid, updates)
    return jsonify({"ok": True})


@patient_bp.route("/api/patient/appointments/<int:aid>/cancel", methods=["POST"])
def cancel_appointment(aid):
    p = _require_patient()
    if not p:
        return jsonify({"error": "Unauthorized"}), 401
    appt = get_appointment_by_id(aid)
    if not appt or appt["patient_id"] != p["id"]:
        return jsonify({"error": "Not found"}), 404
    update_appointment(aid, {"status": "Cancelled",
                              "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M")})
    return jsonify({"ok": True})


# ── Admin: manage appointments ─────────────────────────

@patient_bp.route("/api/admin/appointments", methods=["GET"])
def admin_get_appointments():
    from flask import session as s
    user = s.get("user")
    if not user or user.get("role") not in ("admin","nurse"):
        return jsonify({"error": "Forbidden"}), 403
    appts = get_all_appointments()
    # sort: Pending first, then by date
    appts.sort(key=lambda a: (
        0 if a["status"]=="Pending" else 1 if a["status"]=="Confirmed" else 2,
        a.get("appt_date","")
    ))
    return jsonify(appts)


@patient_bp.route("/api/admin/appointments/<int:aid>/status", methods=["POST"])
def admin_update_status(aid):
    from flask import session as s
    user = s.get("user")
    if not user or user.get("role") not in ("admin","nurse"):
        return jsonify({"error": "Forbidden"}), 403
    d = request.get_json()
    status = d.get("status")
    if status not in ("Pending","Confirmed","Completed","Cancelled"):
        return jsonify({"error": "Invalid status"}), 400
    updates = {"status": status,
               "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M")}
    if d.get("notes"):
        updates["notes"] = d["notes"]
    update_appointment(aid, updates)
    return jsonify({"ok": True})


@patient_bp.route("/api/admin/patients", methods=["GET"])
def admin_get_patients():
    from flask import session as s
    from database import get_all_patients
    user = s.get("user")
    if not user or user.get("role") not in ("admin","nurse"):
        return jsonify({"error": "Forbidden"}), 403
    patients = get_all_patients()
    # remove passwords
    return jsonify([{k:v for k,v in p.items() if k != "password"} for p in patients])
