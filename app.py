from flask import Flask
from routes.auth import auth_bp
from routes.nurse import nurse_bp
from routes.admin import admin_bp
from routes.patient import patient_bp

app = Flask(__name__)
app.secret_key = "etelemo-secret-2024"

app.register_blueprint(auth_bp)
app.register_blueprint(nurse_bp)
app.register_blueprint(admin_bp, url_prefix="/admin")
app.register_blueprint(patient_bp)

if __name__ == "__main__":
    app.run(debug=True, port=5000)
