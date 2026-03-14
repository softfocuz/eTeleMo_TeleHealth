from flask import Blueprint, request, jsonify, session, render_template
from datetime import datetime
from config import ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME
from database import get_user_by_email, get_user_by_username, create_user

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/")
def index():
    return render_template("index.html")


@auth_bp.route("/api/me")
def me():
    if "user" not in session:
        return jsonify({"error": "Not logged in"}), 401
    return jsonify(session["user"])


@auth_bp.route("/api/register", methods=["POST"])
def register():
    data = request.get_json()
    required = ["fname", "lname", "email", "username", "password"]

    if not all(data.get(f) for f in required):
        return jsonify({"error": "Please fill in all required fields"}), 400

    if get_user_by_email(data["email"]):
        return jsonify({"error": "Email is already registered"}), 400

    if get_user_by_username(data["username"]):
        return jsonify({"error": "Username is already taken"}), 400

    create_user({
        "fname":         data["fname"].strip(),
        "lname":         data["lname"].strip(),
        "name":          f"{data['fname'].strip()} {data['lname'].strip()}",
        "email":         data["email"].strip().lower(),
        "username":      data["username"].strip().lower(),
        "password":      data["password"],
        "status":        "pending",
        "registered_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
    })

    return jsonify({"ok": True, "message": "Registration submitted. Await admin approval."})


@auth_bp.route("/api/login", methods=["POST"])
def login():
    data     = request.get_json()
    login_id = data.get("login_id", "").strip().lower()
    password = data.get("password", "")

    # Admin check (email only)
    if login_id == ADMIN_EMAIL and password == ADMIN_PASSWORD:
        session["user"] = {"name": ADMIN_NAME, "role": "admin", "email": ADMIN_EMAIL}
        return jsonify({"role": "admin", "name": ADMIN_NAME})

    # Accept either email OR username
    user = get_user_by_email(login_id) or get_user_by_username(login_id)

    if not user or user["password"] != password:
        return jsonify({"error": "Invalid email/username or password"}), 401

    if user["status"] == "pending":
        return jsonify({"error": "Your account is pending admin approval"}), 403

    if user["status"] == "rejected":
        return jsonify({"error": "Your registration was not approved. Contact the admin."}), 403

    session["user"] = {**user, "role": "nurse"}
    return jsonify({"role": "nurse", "name": user["name"]})


@auth_bp.route("/api/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"ok": True})
