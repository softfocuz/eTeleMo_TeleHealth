from flask import Flask
from routes.auth import auth_bp
from routes.nurse import nurse_bp
from routes.admin import admin_bp
from routes.patient import patient_bp
import os  # <-- needed to get PORT from environment

app = Flask(__name__)
app.secret_key = "etelemo-secret-2024"

app.register_blueprint(auth_bp)
app.register_blueprint(nurse_bp)
app.register_blueprint(admin_bp, url_prefix="/admin")
app.register_blueprint(patient_bp)

if __name__ == "__main__":
    # Use Render-provided port if available, default to 5000
    port = int(os.environ.get("PORT", 5000))
    # Bind to 0.0.0.0 so Render can detect it
    app.run(host="0.0.0.0", port=port, debug=True)