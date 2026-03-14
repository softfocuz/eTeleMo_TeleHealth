from flask import Blueprint, request, jsonify, session, send_file
from datetime import datetime
import tempfile, os
from database import get_all_users, get_all_submissions, update_user_status
from excel_builder import build_excel

admin_bp = Blueprint("admin", __name__)


def _require_admin():
    user = session.get("user")
    if not user or user.get("role") != "admin":
        return None
    return user


@admin_bp.route("/nurses")
def list_nurses():
    if not _require_admin():
        return jsonify({"error": "Forbidden"}), 403
    return jsonify(get_all_users())


@admin_bp.route("/nurses/<int:uid>/approve", methods=["POST"])
def approve_nurse(uid):
    if not _require_admin():
        return jsonify({"error": "Forbidden"}), 403
    update_user_status(uid, "approved")
    return jsonify({"ok": True})


@admin_bp.route("/nurses/<int:uid>/reject", methods=["POST"])
def reject_nurse(uid):
    if not _require_admin():
        return jsonify({"error": "Forbidden"}), 403
    update_user_status(uid, "rejected")
    return jsonify({"ok": True})


@admin_bp.route("/submissions")
def list_submissions():
    if not _require_admin():
        return jsonify({"error": "Forbidden"}), 403
    return jsonify(get_all_submissions())


@admin_bp.route("/export/excel")
def export_excel():
    if not _require_admin():
        return jsonify({"error": "Forbidden"}), 403

    # Build a fresh Excel file from all current submissions
    tmp = tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False)
    tmp.close()
    build_excel(tmp.name)

    filename = f"eTELEmo_Records_{datetime.now().strftime('%Y%m%d_%H%M')}.xlsx"
    return send_file(
        tmp.name,
        as_attachment=True,
        download_name=filename,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
