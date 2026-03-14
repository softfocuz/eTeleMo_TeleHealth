from flask import Blueprint, request, jsonify, session
from datetime import datetime
from database import create_submission, get_submissions_by_email
from excel_service import append_submission_to_excel

nurse_bp = Blueprint("nurse", __name__)


def _require_nurse():
    user = session.get("user")
    if not user or user.get("role") != "nurse":
        return None
    return user


def _extract_patient_name(data):
    """Extract patient name from form data, handling all form structures."""
    # Admission form: patient_last + patient_first
    if data.get("patient_last"):
        parts = [data.get("patient_last", ""), data.get("patient_first", "")]
        return ", ".join(p for p in parts if p).strip(", ")
    # All other forms: patient_name field
    return data.get("patient_name") or data.get("name") or "Unknown"


@nurse_bp.route("/api/submit", methods=["POST"])
def submit_form():
    user = _require_nurse()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    payload = request.get_json()
    form_id   = payload.get("form_id")
    form_name = payload.get("form_name")
    data      = payload.get("data", {})

    if not form_id or not form_name:
        return jsonify({"error": "Missing form_id or form_name"}), 400

    patient_name = _extract_patient_name(data)

    submission = create_submission({
        "form_id":      form_id,
        "form_name":    form_name,
        "patient_name": patient_name,
        "nurse_name":   user["name"],
        "nurse_email":  user["email"],
        "submitted_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "data":         data,
    })

    append_submission_to_excel(submission)

    return jsonify({"ok": True, "submission_id": submission["id"]})


@nurse_bp.route("/api/my-submissions")
def my_submissions():
    user = _require_nurse()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    subs = get_submissions_by_email(user["email"])
    return jsonify(subs)


@nurse_bp.route("/api/my-patients")
def my_patients():
    """Return list of unique patient names from this nurse's submissions."""
    user = _require_nurse()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    subs = get_submissions_by_email(user["email"])
    # Group by patient name
    patients = {}
    for s in subs:
        pname = s.get("patient_name") or "Unknown"
        if pname not in patients:
            patients[pname] = []
        patients[pname].append(s)
    result = [{"patient": p, "submissions": v} for p, v in patients.items()]
    return jsonify(result)


@nurse_bp.route("/api/print-patient/<path:patient_name>")
def print_patient(patient_name):
    """Return a standalone HTML file for printing/saving as PDF."""
    from flask import Response
    user = _require_nurse()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401

    from urllib.parse import unquote
    pname = unquote(patient_name)
    subs = get_submissions_by_email(user["email"])
    psubs = [s for s in subs if (
        (s.get("patient_name") or s.get("data", {}).get("patient_last") or "Unknown") == pname
    )]

    if not psubs:
        return jsonify({"error": "No submissions found for this patient"}), 404

    html = _build_print_html(pname, psubs, user["name"])
    return Response(html, mimetype="text/html; charset=utf-8")


def _build_print_html(patient_name, submissions, nurse_name):
    """Server-side: build the print HTML (mirrors print.js client logic)."""
    import html as html_mod

    def esc(v):
        return html_mod.escape(str(v)) if v else ""

    def v(d, k):
        return esc(d.get(k, ""))

    def cell(label, value, cls=""):
        return f'<div class="fc {cls}"><span class="fl">{label}</span><div class="fv">{value or "&nbsp;"}</div></div>'

    def frow(*cells):
        return f'<div class="fr">{"".join(cells)}</div>'

    def cb_item(d, key, label):
        checked = "✓" if d.get(key) else ""
        cls = "chk-y" if d.get(key) else ""
        return f'<span class="ci"><span class="cb {cls}">{checked}</span>{label}</span>'

    FORM_ORDER = ["admission","vitals","history","mio","medication","ivfluid","kardex","doctors_order","nurses_notes","vs_graph"]

    pages = []
    for fid in FORM_ORDER:
        sub = next((s for s in submissions if s["form_id"] == fid), None)
        if not sub:
            continue
        d = sub.get("data", {})
        meta = f'<div class="meta">Submitted by: {esc(sub["nurse_name"])} — {esc(sub["submitted_at"])}</div>'

        if fid == "admission":
            name = ", ".join(filter(None, [d.get("patient_last",""), d.get("patient_first",""), d.get("patient_middle","")]))
            pg = f"""
<div class="clinic-hdr"><b>eTele Mo — TeleHealth Communication</b><br>Poblacion, Banga, Aklan</div>
<div class="ftitle">ADMISSION AND DISCHARGE RECORD</div>
<div class="fs">
  {frow(cell("HRN No.", v(d,"hrn_no"),"w2"), cell("Med. Record No.", v(d,"med_record_no"),"w2"))}
  {frow(cell("Patient's Name (Last)", v(d,"patient_last"),"w2"), cell("(First)", v(d,"patient_first"),"w2"), cell("(Suffix)", v(d,"patient_suffix")), cell("(Middle)", v(d,"patient_middle"),"w2"), cell("Service", v(d,"service")), cell("Rooms", v(d,"rooms")))}
  {frow(cell("Permanent Address", v(d,"address"),"w4"), cell("Telephone No", v(d,"tel_no"),"w2"), cell("Sex", v(d,"sex")), cell("Civil Status", v(d,"civil_status")))}
  {frow(cell("Birth Date", v(d,"birth_date")), cell("Age", v(d,"age")), cell("Birth Place", v(d,"birth_place"),"w2"), cell("Nationality", v(d,"nationality")), cell("Religion", v(d,"religion")), cell("Occupation", v(d,"occupation")))}
  {frow(cell("Employer", v(d,"employer"),"w2"), cell("Address", v(d,"employer_address"),"w3"), cell("Tel. No.", v(d,"employer_tel")))}
  {frow(cell("Father", v(d,"father"),"w3"), cell("Mother", v(d,"mother"),"w3"))}
  {frow(cell("Spouse", v(d,"spouse"),"w2"), cell("Address", v(d,"spouse_address"),"w3"), cell("Tel. No.", v(d,"spouse_tel")))}
</div>
<div class="fs">
  {frow(cell("Admission Date and Time", v(d,"admission_datetime"),"w2"), cell("Discharge Date and Time", v(d,"discharge_datetime"),"w2"), cell("Day of Stay", v(d,"day_of_stay")), cell("Attending Physician", v(d,"attending_physician"),"w2"))}
  {frow(cell("Type of Admission", v(d,"type_of_admission"),"w2"), cell("Admitted by", v(d,"admitted_by"),"w2"), cell("Resident", v(d,"resident"),"w2"))}
  {frow(cell("Allergic to", v(d,"allergic_to"),"w4"))}
</div>
<div class="fs">
  {frow(cell("Social Services", v(d,"social_services")), cell("Hospitalization Plan", v(d,"hosp_plan")), cell("Health Insurance Name", v(d,"health_insurance")), cell("PhilHealth ID", v(d,"philhealth_id")))}
  <div class="cert">I CERTIFY THAT THE FACTS I HAVE GIVEN ARE TRUE TO THE BEST OF MY KNOWLEDGE</div>
  {frow(cell("Data Furnished by", v(d,"data_furnished_by"),"w2"), cell("Address", v(d,"data_address"),"w3"), cell("Relationship to Patient", v(d,"relationship")))}
</div>
<div class="fs">
  {frow(cell("Admission Diagnosis", v(d,"admission_dx"),"w4"), cell("ICD CODE No.", v(d,"admission_icd")))}
  {frow(cell("Principal Diagnosis", v(d,"principal_dx"),"w4"), cell("ICD CODE No.", v(d,"principal_icd")), cell("", cb_item(d,"no_smoker","NO SMOKER") + " " + cb_item(d,"smoker","SMOKER")))}
  {frow(cell("Other Diagnosis", v(d,"other_dx"),"w4"))}
  {frow(cell("Principal Operating Procedures", v(d,"principal_procedures"),"w4"))}
  {frow(cell("Other Operation / Procedure", v(d,"other_procedures"),"w4"))}
  {frow(cell("Accident / Injuries / Poisoning", v(d,"accident_injuries"),"w4"))}
  {frow(cell("Place of Occurrence", v(d,"place_of_occurrence"),"w4"))}
</div>
<table class="dtbl">
  <tr>
    <td style="width:25%"><b style="font-size:7pt">Disposition</b><br>
      {cb_item(d,"disp_discharge","Discharge")}<br>{cb_item(d,"disp_transferred","Transferred")}<br>
      {cb_item(d,"disp_absconded","Absconded")}<br>{cb_item(d,"disp_dama","DAMA")}
    </td>
    <td style="width:35%"><b style="font-size:7pt">Result</b><br>
      <div class="cg2">{cb_item(d,"result_recovered","Recovered")}{cb_item(d,"result_improved","Improved")}{cb_item(d,"result_died","Died")}{cb_item(d,"result_unimproved","Unimproved")}{cb_item(d,"result_48h_minus","-48 Hours")}{cb_item(d,"result_48h_plus","+48 Hours")}{cb_item(d,"result_autopsied","Autopsied")}{cb_item(d,"result_not_autopsied","Not Autopsied")}</div>
    </td>
    <td style="width:40%"><b style="font-size:7pt">Attending Physician</b><br>
      <span style="font-size:8pt">{v(d,"attending_physician")}</span><br>
      Signature: <u>{v(d,"attending_sig")}</u>&nbsp;M.D.<br>
      Audit: {v(d,"audit")}
    </td>
  </tr>
</table>
{meta}"""

        elif fid == "vitals":
            rows_html = ""
            found = False
            for i in range(1, 50):
                date = d.get(f"date_{i}",""); time_ = d.get(f"time_{i}","")
                bp = d.get(f"bp_{i}",""); cr = d.get(f"cr_{i}","")
                rr = d.get(f"rr_{i}",""); temp = d.get(f"temp_{i}","")
                spo2 = d.get(f"spo2_{i}",""); sig = d.get(f"sig_{i}","")
                if any([date,time_,bp,cr,rr,temp,spo2,sig]):
                    found = True
                    rows_html += f"<tr>{''.join(f'<td class=tv>{esc(x) or chr(160)}</td>' for x in [date,time_,bp,cr,rr,temp,spo2,sig])}</tr>"
            # Add blank rows to fill page
            blank = "<tr>" + "<td class=tv>&nbsp;</td>"*8 + "</tr>"
            filled = rows_html.count("<tr>")
            for _ in range(max(0, 20 - filled)):
                rows_html += blank
            pg = f"""
<div class="ftitle">VITAL SIGNS MONITORING SHEET</div>
<div class="fs">{frow(cell("Name", v(d,"patient_name"),"w3"), cell("Age", v(d,"age")), cell("Sex", v(d,"sex")), cell("Ward", v(d,"ward")))}</div>
<table class="ft">
  <thead><tr><th>DATE</th><th>TIME</th><th>BLOOD PRESSURE</th><th>CARDIAC RATE</th><th>RESPIRATORY RATE</th><th>TEMPERATURE</th><th>O2 SATURATION (%)</th><th>SIGNATURE</th></tr></thead>
  <tbody>{rows_html}</tbody>
</table>
{meta}"""

        elif fid == "history":
            def pe_row(title, checks, others_key=None):
                cbs = "".join(cb_item(d, k, lbl) for k, lbl in checks)
                oth = f' Others: <b>{esc(d[others_key])}</b>' if others_key and d.get(others_key) else ""
                return f'<tr><td class="pe-label">{title}</td><td class="pe-body"><div class="cg">{cbs}{oth}</div></td></tr>'
            pg = f"""
<div class="clinic-hdr"><b>eTele Mo — TeleHealth Communication</b><br>"PHIC Accredited Health Care Provider" Kalibo, Aklan</div>
<div class="ftitle">HISTORY RECORD</div>
<div class="fs">{frow(cell("Patient Name", v(d,"patient_name"),"w3"), cell("Date", v(d,"history_date")))}</div>
<div class="sec-hdr">PHYSICAL EXAMINATION (Pertinent findings per system):</div>
<table class="ft">
  <tbody>
    <tr><td class="pe-label">General Survey</td><td class="pe-body"><div class="cg">{cb_item(d,"gen_awake","Awake and alert")}{cb_item(d,"gen_altered","Altered Sensorium")}{f" Others: <b>{esc(d['gen_others'])}</b>" if d.get("gen_others") else ""}</div></td></tr>
    <tr><td class="pe-label">Vital Signs</td><td class="pe-body"><span style="font-size:8.5pt">BP: <b>{v(d,"vs_bp")}</b> &nbsp; HR: <b>{v(d,"vs_hr")}</b> &nbsp; RR: <b>{v(d,"vs_rr")}</b> &nbsp; Temperature: <b>{v(d,"vs_temp")}</b></span></td></tr>
  </tbody>
</table>
<div class="sec-hdr">PHYSICAL EXAMINATION continued (Pertinent findings per system):</div>
<table class="ft">
  <tbody>
    {pe_row("HEENT", [("heent_normal","Essentially normal"),("heent_pupil","Abnormal pupillary reaction"),("heent_lymph","Cervical lymphadenopathy"),("heent_icteric","Icteric sclera"),("heent_pale_conj","Pale conjunctive"),("heent_sunken_eye","Sunken eyeballs"),("heent_dry","Dry mucus membrane"),("heent_sunken_font","Sunken fontanelle")], "heent_others")}
    {pe_row("Chest/Lungs", [("chest_normal","Essentially normal"),("chest_asym","Asymmetrical chest expansion"),("chest_decreased","Decreased breath sounds"),("chest_lump","Lump/s over breast(s)"),("chest_rales","Rale/crackles/rhonchi"),("chest_retract","Intercostal rib/Clavicular retractions"),("chest_wheeze","Wheeze")], "chest_others")}
    {pe_row("CVs", [("cvs_normal","Essentially normal"),("cvs_displaced","Displaced apex beat"),("cvs_heaves","Heaves and/or thrills"),("cvs_irregular","Irregular rhythm"),("cvs_muffled","Muffled heart sound"),("cvs_pericardial","Pericardial bulge"),("cvs_murmur","Murmur")], "cvs_others")}
    {pe_row("Abdomen", [("abd_normal","Essentially normal"),("abd_rigidity","Abdomen Rigidity"),("abd_tenderness","Abdominal tenderness"),("abd_palpable","Palpable mass/es"),("abd_tympanic","Tympanic/dull abdomen"),("abd_hyperactive","Hyperactive bowel sounds"),("abd_uterine","Uterine contraction")], "abd_others")}
    <tr><td class="pe-label">Abdomen (cont.)</td><td class="pe-body">Fundic Height: <b>{v(d,"abd_fundic") or "_______"}</b> &nbsp;&nbsp; FHT: <b>{v(d,"abd_fht") or "_______"}</b></td></tr>
    {pe_row("GU (IE)", [("gu_normal","Essentially Normal"),("gu_blood","Blood stained exam finger"),("gu_discharge","Presence of abnormal vaginal discharge")])}
    <tr><td class="pe-label">Internal Examination</td><td class="pe-body">{v(d,"gu_ie") or "&nbsp;"}</td></tr>
    {pe_row("Skin/Extremities", [("skin_normal","Essentially Normal"),("skin_clubbing","Clubbing"),("skin_cold","Cold clammy skin"),("skin_edema","Edema/swelling"),("skin_decreased","Decreased mobility"),("skin_pale","Pale nailbeds"),("skin_rashes","Rashes"),("skin_weak","Weak pulses"),("skin_cyanosis","Cyanosis/mottled skin"),("skin_poor_turgor","Poor skin turgor")], "skin_others")}
    {pe_row("Neuro-Exam", [("neuro_normal","Essentially Normal"),("neuro_sensation","Abnormal/decreased sensation"),("neuro_reflex","Abnormal reflex(es)"),("neuro_coord","Poor coordination"),("neuro_gait","Abnormal gait")], "neuro_others")}
  </tbody>
</table>
<div class="fs" style="margin-top:2px"><span class="fl">Others:</span><div class="fv">{v(d,"other_findings") or "&nbsp;"}</div></div>
<div class="ci-sec"><div class="ci-title">Clinical Impression</div><div class="ci-body">{v(d,"clinical_impression") or "&nbsp;"}</div><div style="text-align:right;font-size:7.5pt;padding:2px 4px">Attending Physician: <u>{v(d,"attending_physician")}</u></div></div>
{meta}"""

        elif fid == "mio":
            def mio_block(s):
                rows_html = ""
                for r in range(1,30):
                    t = d.get(f"s{s}_time_{r}","")
                    vals = [d.get(f"s{s}_{k}_{r}","") for k in ["po","ivf","tube","oth_in","urine","emesis","ng","stool","oth_out"]]
                    if t or any(vals):
                        rows_html += f"<tr><td class=tv>{esc(t) or chr(160)}</td>" + "".join(f"<td class=tv>{esc(x) or chr(160)}</td>" for x in vals) + "</tr>"
                for _ in range(max(0, 8 - rows_html.count("<tr>"))):
                    rows_html += "<tr><td class=tv>&nbsp;</td>"*10 + "</tr>"
                tot = "".join(f"<td class=tv>{esc(d.get(f's{s}_tot_{k}','')) or chr(160)}</td>" for k in ["po","ivf","tube","oth_in","urine","emesis","ng","stool","oth_out"])
                sig = esc(d.get(f"s{s}_na_sig",""))
                return f"""<table class="ft" style="margin-bottom:1px">
  <thead>
    <tr><th colspan="5" class="sh">INTAKE</th><th colspan="5" class="sh">OUTPUT</th></tr>
    <tr><th>TIME</th><th>PO</th><th>IV FLUIDS</th><th>TUBE FEEDING</th><th>OTHER</th><th>URINE</th><th>EMESIS</th><th>NG</th><th>STOOL</th><th>OTHER</th></tr>
  </thead>
  <tbody>{rows_html}
    <tr class="tot-row"><td style="font-weight:bold;font-size:7pt">TOTALS:</td>{tot}</tr>
  </tbody>
</table>
<div style="font-size:7.5pt;margin-bottom:4px">NURSING ASSISTANT SIGNATURE: <u style="min-width:120px;display:inline-block">{sig}</u></div>"""

            pg = f"""
<div class="ftitle">INTAKE &amp; OUTPUT — MIO</div>
<div class="fs">{frow(cell("Patient Name", v(d,"patient_name"),"w3"), cell("Room #", v(d,"room_no")), cell("Date", v(d,"mio_date")), cell("Admission Weight", v(d,"admission_weight")), cell("Current Weight", v(d,"current_weight")))}</div>
{mio_block(1)}{mio_block(2)}{mio_block(3)}
{meta}"""

        elif fid == "medication":
            med_rows = ""
            for i in range(1,25):
                if not d.get(f"med_{i}"): continue
                for si, shift in enumerate(["11-7","7-3","3-11"], 1):
                    hr_sigs = "".join(f'<td class=tv>{esc(d.get(f"hr_{i}_{si}_{j}",""))}</td><td class=tv>{esc(d.get(f"sig_{i}_{si}_{j}",""))}</td>' for j in range(1,7))
                    first = si == 1
                    med_rows += f"""<tr>
                      {"<td class=tv rowspan=3>" + esc(d.get(f"date_ordered_{i}","")) + "</td><td class=tv rowspan=3>" + esc(d.get(f"med_{i}","")) + "</td>" if first else ""}
                      <td class=tv>{esc(d.get(f"med_date_{i}_{si}",""))}</td>
                      <td style="text-align:center;font-weight:bold;background:#d0e8e8;font-size:7pt">{shift}</td>
                      {hr_sigs}
                    </tr>"""
            pg = f"""
<div class="ftitle">MEDICATION SHEET</div>
<div class="fs">{frow(cell("Name", v(d,"patient_name"),"w3"), cell("Ward/Room", v(d,"ward_room"),"w2"), cell("Physician", v(d,"physician"),"w2"))}</div>
<table class="ft">
  <thead>
    <tr>
      <th rowspan="2">Date Ordered/<br>Remarks</th>
      <th rowspan="2">Medication Dosage/<br>Frequency</th>
      <th>Date</th><th>SHIFT</th>
      {"".join("<th>Hr</th><th>Sig</th>" for _ in range(6))}
    </tr>
  </thead>
  <tbody>{med_rows}</tbody>
</table>
<table class="ft" style="margin-top:2px">
  <thead><tr><th>Nurse Name</th><th>Initial</th><th>Nurse Name</th><th>Initial</th><th>Nurse Name</th><th>Initial</th><th>Nurse Name</th><th>Initial</th></tr></thead>
  <tbody><tr>{"".join(f'<td class=tv>{v(d,"nurse_name_"+str(i))}</td><td class=tv>{v(d,"nurse_initial_"+str(i))}</td>' for i in range(1,5))}</tr></tbody>
</table>
{meta}"""

        elif fid == "ivfluid":
            ivf_rows = ""
            for i in range(1, 20):
                if not d.get(f"ivf_type_{i}"): continue
                ivf_rows += f"<tr><td class=tv style='text-align:center;font-weight:bold'>{i}</td>" + \
                    "".join(f'<td class=tv>{esc(d.get(f"{k}_{i}",""))}</td>' for k in ["ivf_type","drug_add","iv_rate","started","consumed","ivf_sig"]) + "</tr>"
            for i in range(max(1, ivf_rows.count("<tr>")), 9):
                ivf_rows += f"<tr><td class=tv style='text-align:center'>{ivf_rows.count('<tr>')+1}</td>" + "<td class=tv>&nbsp;</td>"*6 + "</tr>"
            pg = f"""
<div style="text-align:right;font-size:8pt;margin-bottom:2px">HRN: <b>{v(d,"hrn_no")}</b></div>
<div class="ftitle">IV FLUID CHART</div>
<div class="fs">{frow(cell("Name", v(d,"patient_name"),"w3"), cell("Ward/Room", v(d,"ward_room"),"w2"), cell("Physician", v(d,"physician"),"w2"))}</div>
<table class="ft">
  <thead><tr><th>IVF Bottle No.</th><th>Type of Fluid</th><th>Drug Additives</th><th>IV Rate</th><th>Time/Date Started</th><th>Time/Date Consumed</th><th>Nurses Signature Over Printed Name</th></tr></thead>
  <tbody>{ivf_rows}</tbody>
</table>
{meta}"""

        elif fid == "kardex":
            med_col = lambda prefix, count: "".join(f'<tr><td class=tv>{esc(d.get(f"{prefix}_date_{i+1}",""))}</td><td class=tv>{esc(d.get(f"{prefix}_{i+1}",""))}</td></tr>' for i in range(count))
            pg = f"""
<div class="ftitle">KARDEX</div>
<div class="fs">
  {frow(cell("Hospital No.", v(d,"hospital_no"),"w2"), cell("Patient Name", v(d,"patient_name"),"w4"))}
  {frow(cell("Age", v(d,"age")), cell("Sex", ("M" if d.get("sex_m") else "") + ("F" if d.get("sex_f") else "")), cell("Religion", v(d,"religion")), cell("CS", v(d,"civil_status")), cell("Rm/Ward", v(d,"room_ward")), cell("TPR", v(d,"tpr")), cell("MIO", v(d,"mio_val")))}
  {frow(cell("Dx", v(d,"diagnosis"),"w3"), cell("Attending Physician", v(d,"physician"),"w2"), cell("Date Admitted", v(d,"date_admitted")))}
</div>
<table class="ft" style="margin-bottom:2px"><tr>
  <td style="width:22%;vertical-align:top;border-right:1px solid #000;padding:3px">
    <b style="font-size:7pt">O2 Inhalation</b><br>{v(d,"o2_lpm")} LPM<br>
    <div class="cg-col">{cb_item(d,"o2_cannula","Cannula")}{cb_item(d,"o2_face_mask","Face Mask")}{cb_item(d,"o2_nasal_cath","Nasal Cath")}</div>
  </td>
  <td style="width:28%;vertical-align:top;border-right:1px solid #000;padding:3px">
    <b style="font-size:7pt">VR Set-up</b><br><span style="font-size:8pt">{v(d,"vr_setup") or "&nbsp;"}</span>
  </td>
  <td style="width:28%;vertical-align:top;border-right:1px solid #000;padding:3px">
    <b style="font-size:7pt">Contraption List</b><br>
    <div class="cg-col">{cb_item(d,"cont_o2","O2")}{cb_item(d,"cont_ett","ETT")}{cb_item(d,"cont_ngt","NGT/OGT")}{cb_item(d,"cont_foley","Foley Catheter")}{cb_item(d,"cont_ctt","CTT")}{f"<span>Others: {esc(d['cont_others'])}</span>" if d.get("cont_others") else ""}</div>
  </td>
  <td style="width:22%;vertical-align:top;padding:3px">
    <b style="font-size:7pt">Diet:</b> {v(d,"diet")}<br><b style="font-size:7pt">CBG:</b> {v(d,"cbg")}
  </td>
</tr></table>
<div class="two-col">
  <div><div class="col-hdr">DATE — MEDICATIONS, DOSAGE, FREQUENCY, TIMING (A)</div>
  <table class="ft">{med_col("med_date_a", 8)}</table></div>
  <div>
    <div class="col-hdr">DATE — MEDICATIONS, DOSAGE, FREQUENCY, TIMING (B)</div>
    <table class="ft">{"".join(f'<tr><td class=tv>{esc(d.get(f"med_date_b_{i+1}",""))}</td><td class=tv>{esc(d.get(f"med_b_{i+1}",""))}</td></tr>' for i in range(4))}</table>
    <div class="col-hdr">INHALATIONS</div>
    <table class="ft">{"".join(f'<tr><td class=tv>{esc(d.get(f"inh_date_{i+1}",""))}</td><td class=tv>{esc(d.get(f"inhalation_{i+1}",""))}</td></tr>' for i in range(3))}</table>
    <div class="col-hdr">PRN MEDICATIONS</div>
    <table class="ft">{"".join(f'<tr><td class=tv>{esc(d.get(f"prn_date_{i+1}",""))}</td><td class=tv>{esc(d.get(f"prn_med_{i+1}",""))}</td></tr>' for i in range(5))}</table>
  </div>
</div>
<div class="two-col">
  <div>
    <table class="ft"><thead><tr><th>PRESENT</th><th>STARTED</th><th>DUE</th></tr></thead>
    <tbody>{"".join(f'<tr><td class=tv>{v(d,f"present_{i+1}")}</td><td class=tv>{v(d,f"started_l_{i+1}")}</td><td class=tv>{v(d,f"due_l_{i+1}")}</td></tr>' for i in range(5))}</tbody></table>
    <b style="font-size:7pt">IV FLUIDS:</b>{"".join(f'<div class="med-row">{v(d,f"ivf_k_date_{i+1}")} — {v(d,f"ivf_k_{i+1}")}</div>' for i in range(3))}
    <b style="font-size:7pt">TO FOLLOW:</b><div style="border:1px solid #ccc;padding:2px;font-size:8pt">{v(d,"to_follow") or "&nbsp;"}</div>
  </div>
  <div>
    <table class="ft"><thead><tr><th>STARTED</th><th>DUE</th></tr></thead>
    <tbody>{"".join(f'<tr><td class=tv>{v(d,f"started_r_{i+1}")}</td><td class=tv>{v(d,f"due_r_{i+1}")}</td></tr>' for i in range(5))}</tbody></table>
    <b style="font-size:7pt">SIDE DRIPS / REPLACEMENTS:</b>{"".join(f'<div class="med-row">{v(d,f"side_drip_date_{i+1}")} — {v(d,f"side_drip_{i+1}")}</div>' for i in range(6))}
  </div>
</div>
<div class="two-col">
  <div><div class="col-hdr">DATE — LABORATORY/DIAGNOSTICS — REMARKS</div>
  <table class="ft"><thead><tr><th>DATE</th><th>LAB/DIAGNOSTICS</th><th>REMARKS</th></tr></thead>
  <tbody>{"".join(f'<tr><td class=tv>{v(d,f"lab_date_{i+1}")}</td><td class=tv>{v(d,f"lab_{i+1}")}</td><td class=tv>{v(d,f"lab_rem_{i+1}")}</td></tr>' for i in range(8))}</tbody></table></div>
  <div><div class="col-hdr">DATE — SPECIAL ENDORSEMENTS</div>
  <table class="ft"><thead><tr><th>DATE</th><th>SPECIAL ENDORSEMENTS</th></tr></thead>
  <tbody>{"".join(f'<tr><td class=tv>{v(d,f"endorse_date_{i+1}")}</td><td class=tv>{v(d,f"endorse_{i+1}")}</td></tr>' for i in range(8))}</tbody></table></div>
</div>
{meta}"""

        elif fid == "doctors_order":
            order_rows = ""
            for i in range(1, 30):
                date_ = d.get(f"order_date_{i}",""); time_ = d.get(f"order_time_{i}","")
                soap = d.get(f"soap_{i}",""); order = d.get(f"doctors_order_{i}","")
                if any([date_,time_,soap,order]):
                    order_rows += f'<tr style="height:45px"><td class=tv style="vertical-align:top">{esc(date_) or chr(160)}</td><td class=tv style="vertical-align:top">{esc(time_) or chr(160)}</td><td class=tv style="vertical-align:top;white-space:pre-wrap">{esc(soap) or chr(160)}</td><td class=tv style="vertical-align:top;white-space:pre-wrap">{esc(order) or chr(160)}</td></tr>'
            for _ in range(max(0, 8 - order_rows.count("<tr>"))):
                order_rows += '<tr style="height:45px"><td class=tv>&nbsp;</td><td class=tv>&nbsp;</td><td class=tv>&nbsp;</td><td class=tv>&nbsp;</td></tr>'
            pg = f"""
<div style="text-align:right;font-size:8pt;margin-bottom:2px">HRN: <b>{v(d,"hrn_no")}</b></div>
<div class="ftitle">DOCTOR'S ORDER / PROGRESS NOTES</div>
<div class="fs">{frow(cell("Name", v(d,"patient_name"),"w3"), cell("Ward/Room", v(d,"ward_room"),"w2"), cell("Physician", v(d,"physician"),"w2"))}</div>
<table class="ft">
  <thead><tr>
    <th style="width:12%">DATE</th><th style="width:9%">TIME</th>
    <th style="width:40%">PROGRESS NOTES S-O-A-P<br><small style="font-weight:normal">(Affix Printed Name and Signature)</small></th>
    <th style="width:39%">DOCTOR's ORDER<br><small style="font-weight:normal">(Affix Printed Name and Signature)</small></th>
  </tr></thead>
  <tbody>{order_rows}</tbody>
</table>
{meta}"""

        elif fid == "nurses_notes":
            note_rows = ""
            for i in range(1, 40):
                dt = d.get(f"note_dt_{i}",""); diet_ = d.get(f"diet_{i}","")
                focus = d.get(f"focus_{i}",""); dar = d.get(f"dar_{i}","")
                if any([dt,diet_,focus,dar]):
                    note_rows += f'<tr style="height:40px"><td class=tv style="vertical-align:top">{esc(dt) or chr(160)}</td><td class=tv style="vertical-align:top">{esc(diet_) or chr(160)}</td><td class=tv style="vertical-align:top">{esc(focus) or chr(160)}</td><td class=tv style="vertical-align:top;white-space:pre-wrap">{esc(dar) or chr(160)}</td></tr>'
            for _ in range(max(0, 10 - note_rows.count("<tr>"))):
                note_rows += '<tr style="height:40px"><td class=tv>&nbsp;</td><td class=tv>&nbsp;</td><td class=tv>&nbsp;</td><td class=tv>&nbsp;</td></tr>'
            pg = f"""
<div class="clinic-hdr"><b>eTele Mo — TeleHealth Communication</b><br>Poblacion, Banga, Aklan | Tel. No. 0945 2482 898</div>
<div class="ftitle">NURSES PROGRESS NOTES</div>
<div style="text-align:right;font-size:8pt;margin-bottom:2px">HRN: <b>{v(d,"hrn_no")}</b></div>
<div class="fs">{frow(cell("Name", v(d,"patient_name"),"w3"), cell("Ward/Room", v(d,"ward_room"),"w2"), cell("Physician", v(d,"physician"),"w2"))}</div>
<table class="ft">
  <thead><tr>
    <th style="width:17%">Date/Time</th><th style="width:11%">DIET</th>
    <th style="width:13%">FOCUS</th>
    <th>D = Data &nbsp;&nbsp; A = Action &nbsp;&nbsp; R = Response</th>
  </tr></thead>
  <tbody>{note_rows}</tbody>
</table>
{meta}"""
        elif fid == "vs_graph":
            import html as _h
            sections = [
                ("cardiac","Cardiac","#c0392b",[90,80,85,60,50,40,30,20,10]),
                ("pulse",  "Pulse",  "#2980b9",[120,110,100,90,80,70,60,50,40]),
                ("temp",   "Temp.",  "#27ae60",[120,110,100,90,80,70,60,50,40]),
            ]
            days  = list(range(1,11))
            times = ["12","8","4"]
            graph_html = ""
            for sec_key, sec_label, sec_color, y_vals in sections:
                header_dates = "".join(f'<span style="display:inline-block;min-width:18mm;text-align:center;font-size:5.5pt">{esc(d.get(sec_key+"_date_"+str(day),"")) or "______"}</span>' for day in days)
                am_pm_ths = "".join('<th colspan="3" style="background:#e0e0e0;text-align:center;border:1px solid #999;font-size:5.5pt">AM</th><th colspan="3" style="background:#c8c8c8;text-align:center;border:1px solid #999;font-size:5.5pt">PM</th>' for _ in days)
                time_ths = "".join("".join(f'<th style="font-size:5pt;text-align:center;border:1px solid #ccc;background:{"#f5f5f5" if ap=="am" else "#ebebeb"}">{t}</th>' for t in times) for _ in days for ap in ["am","pm"])
                body_rows = ""
                for y in y_vals:
                    cells = "".join("".join(f'<td style="height:10px;border:1px solid #e0e0e0;font-size:5.5pt;text-align:center;background:{"#fefefe" if ap=="am" else "#f8f8f8"}">{esc(d.get(f"{sec_key}_{ap}_{t}_d{day}_y{y}",""))}</td>' for t in times) for day in days for ap in ["am","pm"])
                    body_rows += f'<tr><td style="font-size:6.5pt;font-weight:600;text-align:right;padding-right:2px;border-right:2px solid {sec_color};border:1px solid #ddd;background:#f9f9f9">{y}</td>{cells}</tr>'
                graph_html += f"""<div style="margin-bottom:5px">
<div style="font-size:6.5pt;margin-bottom:1px">Date: {header_dates}</div>
<table style="width:100%;border-collapse:collapse;font-size:6pt">
  <thead>
    <tr><th style="background:{sec_color};color:#fff;width:22px;border:1px solid #000;padding:2px;font-size:6.5pt">{sec_label}</th>{am_pm_ths}</tr>
    <tr><th style="background:{sec_color};color:#fff;border:1px solid #000"></th>{time_ths}</tr>
  </thead>
  <tbody>{body_rows}</tbody>
</table></div>"""
            pg = f"""
<div class="clinic-hdr"><b>eTele Mo — TeleHealth Communication</b><br>Poblacion, Banga, Aklan | Tel. No. 0945 2482 898</div>
<div class="ftitle">VS GRAPH SHEET</div>
<div class="fs">{frow(cell("Patient Name", v(d,"patient_name"),"w3"), cell("Date", v(d,"graph_date")), cell("Days of Hospitalization", v(d,"days_hosp")), cell("Post-Operative Days", v(d,"post_op_days")))}</div>
{graph_html}
{meta}"""

        else:
            continue

        pages.append(f'<div class="fp">{pg}</div>')

    CSS = """
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: Arial, sans-serif; font-size: 9pt; background: #f0f0f0; }
.print-bar { position:fixed;top:0;left:0;right:0;z-index:999;background:#0A1628;color:#fff;padding:10px 20px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 2px 8px rgba(0,0,0,.4); }
.print-bar h2 { font-size:13px; }
.print-bar .pb { display:flex;gap:8px; }
.bp { background:#0D7377;color:#fff;border:none;padding:8px 20px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:700; }
.bc { background:transparent;color:#aaa;border:1px solid #555;padding:8px 16px;border-radius:6px;cursor:pointer;font-size:12px; }
.pages { padding-top:56px; }
.fp { width:210mm;min-height:297mm;background:#fff;margin:12px auto;padding:10mm 12mm;box-shadow:0 2px 12px rgba(0,0,0,.15); }
.clinic-hdr { text-align:center;font-size:7.5pt;margin-bottom:5px;line-height:1.6; }
.ftitle { text-align:center;font-size:11pt;font-weight:bold;text-transform:uppercase;letter-spacing:.04em;border-bottom:2px solid #000;padding-bottom:3px;margin-bottom:6px; }
.fs { border:1px solid #000;margin-bottom:3px; }
.fr { display:flex;border-bottom:1px solid #000; }
.fr:last-child { border-bottom:none; }
.fc { flex:1;padding:2px 4px;border-right:1px solid #000;display:flex;flex-direction:column;justify-content:flex-end;min-height:18px; }
.fc:last-child { border-right:none; }
.fc.w2 { flex:2; } .fc.w3 { flex:3; } .fc.w4 { flex:4; }
.fl { font-size:6.5pt;color:#444;line-height:1.1; }
.fv { font-size:8.5pt;font-weight:500;min-height:10px;border-bottom:1px solid #888; }
.cert { font-size:7pt;font-style:italic;text-align:center;padding:3px 4px;border-top:1px solid #000;border-bottom:1px solid #000;margin:2px 0; }
.ft { width:100%;border-collapse:collapse;font-size:7.5pt;margin-bottom:3px; }
.ft th { background:#d0e8e8;border:1px solid #000;padding:3px 4px;text-align:center;font-size:7pt;font-weight:bold; }
.ft td { border:1px solid #000;padding:2px 4px;min-height:16px; }
.tv { font-size:8pt;font-weight:500; }
.sh { background:#0A1628;color:#fff;text-align:center;font-weight:bold;font-size:7pt; }
.tot-row td { background:#e8e8e8; }
.cg { display:flex;flex-wrap:wrap;gap:2px 12px; }
.cg2 { display:grid;grid-template-columns:1fr 1fr;gap:1px 6px;font-size:7.5pt; }
.cg-col { display:flex;flex-direction:column;gap:2px; }
.ci { display:flex;align-items:center;gap:3px;font-size:7.5pt;white-space:nowrap; }
.cb { width:9px;height:9px;border:1px solid #000;display:inline-flex;align-items:center;justify-content:center;font-size:6pt;flex-shrink:0; }
.chk-y { background:#000;color:#fff; }
.dtbl { width:100%;border-collapse:collapse;border:1px solid #000;margin-bottom:3px; }
.dtbl td { border:1px solid #000;padding:3px 6px;font-size:7.5pt;vertical-align:top; }
.pe-label { width:16%;font-weight:bold;font-size:7.5pt;vertical-align:top;padding:2px 4px;border-right:1px solid #000; }
.pe-body { padding:2px 4px; }
.sec-hdr { font-size:7.5pt;font-weight:bold;padding:2px 4px;background:#eee;border:1px solid #000;border-bottom:none; }
.ci-sec { border:1px solid #000;margin-bottom:3px; }
.ci-title { font-size:7.5pt;font-weight:bold;text-align:center;padding:2px;border-bottom:1px solid #000; }
.ci-body { font-size:8.5pt;min-height:24px;padding:3px 6px; }
.two-col { display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:3px; }
.col-hdr { font-size:7pt;font-weight:bold;background:#d0e8e8;border:1px solid #000;padding:2px 4px;border-bottom:none; }
.med-row { font-size:8pt;border-bottom:1px solid #ccc;padding:1px 2px;min-height:14px; }
.meta { font-size:7pt;color:#777;text-align:right;margin-top:4px;border-top:1px dotted #ccc;padding-top:3px; }
@media print {
  .print-bar { display:none!important; }
  .pages { padding-top:0; }
  body { background:#fff; }
  .fp { margin:0;padding:8mm 10mm;box-shadow:none;page-break-after:always; }
  .fp:last-child { page-break-after:auto; }
  @page { size:A4;margin:0; }
}"""

    return f"""<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8">
<title>eTELEmo — {html_mod.escape(patient_name)}</title>
<style>{CSS}</style>
</head>
<body>
<div class="print-bar">
  <h2>🏥 eTELEmo — Patient Records: {html_mod.escape(patient_name)}</h2>
  <div class="pb">
    <button class="bp" onclick="window.print()">🖨️ Print / Save as PDF</button>
    <button class="bc" onclick="window.close()">✕ Close</button>
  </div>
</div>
<div class="pages">{"".join(pages)}</div>
</body></html>"""
