eTELEmo TeleHealth Nursing Information System
=============================================

HOW TO RUN:
  1. Install Python dependencies:
       pip install flask openpyxl

  2. Start the server:
       cd etelemo_clean
       python app.py

  3. Open your browser at:
       http://localhost:5000

  NOTE: You MUST run the Flask server and open http://localhost:5000
        Opening index.html directly in a browser will NOT work.

ADMIN LOGIN:
  Email:    admin@etelemo.health
  Password: admin123

NURSE WORKFLOW:
  1. Register as a nurse (click Register on home page)
  2. Admin must approve your account
  3. Login and fill in clinical forms
  4. Forms are saved to submissions.json AND written to eTELEmo_TeleHealth.xlsx
  5. Admin can download the updated Excel via Export button

EXCEL DATA:
  Each form submission is appended to the correct sheet in the Excel file.
  Sheets used:
    - Admission and Discharge Record
    - vs (Vital Signs)
    - HISTORY RECORD
    - MIO (Intake & Output)
    - Medication sheet
    - Iv fluid chart
    - Kardex
    - Doctors Order Progress Notes
    - Nurses Progress Notes
