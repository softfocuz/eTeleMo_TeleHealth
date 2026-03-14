import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# File paths
EXCEL_FILE        = os.path.join(BASE_DIR, "data", "eTELEmo_TeleHealth.xlsx")
USERS_FILE        = os.path.join(BASE_DIR, "data", "users.json")
SUBMISSIONS_FILE  = os.path.join(BASE_DIR, "data", "submissions.json")
PATIENTS_FILE     = os.path.join(BASE_DIR, "data", "patients.json")
APPOINTMENTS_FILE = os.path.join(BASE_DIR, "data", "appointments.json")

# Admin credentials
ADMIN_EMAIL    = "admin@etelemo.health"
ADMIN_PASSWORD = "admin123"
ADMIN_NAME     = "Administrator"

# Maps form_id → Excel sheet name
SHEET_MAP = {
    "admission":     "Admission and Discharge Record",
    "vitals":        "vs",
    "history":       "HISTORY RECORD",
    "mio":           "MIO",
    "medication":    "Medication sheet",
    "ivfluid":       "Iv fluid chart",
    "kardex":        "Kardex",
    "doctors_order": "Doctors Order Progress Notes",
    "nurses_notes":  "Nurses Progress Notes",
    "vs_graph":      "vs graph sheet",
}
