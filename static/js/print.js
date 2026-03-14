/* ═══════════════════════════════════════════════════════
   print.js — Patient records print/download
   ═══════════════════════════════════════════════════════ */

async function loadPatientRecords() {
  const list = document.getElementById("patient-list");
  list.innerHTML = `<div class="loading-msg">⏳ Loading patients…</div>`;
  const subs = await api("/api/my-submissions");
  if (!subs || subs.error || !subs.length) {
    list.innerHTML = `<div class="empty-msg">No submissions yet.<br>Fill out a patient form first, then come back here to print.</div>`;
    return;
  }

  const patients = {};
  subs.forEach(s => {
    const pname = s.patient_name || s.data?.patient_last || "Unknown";
    if (!patients[pname]) patients[pname] = [];
    patients[pname].push(s);
  });

  const ICONS = {
    admission:"🏥",vitals:"📊",history:"📋",mio:"💧",
    medication:"💊",ivfluid:"🧪",kardex:"🗂️",
    doctors_order:"🩺",nurses_notes:"✍️",vs_graph:"📈"
  };

  list.innerHTML = `
    <div style="margin-bottom:1.2rem;padding:.8rem 1rem;background:var(--teal-pale);border-radius:10px;border:1px solid rgba(13,115,119,.2);font-size:.85rem;color:var(--teal)">
      💡 <strong>How to download:</strong> Click "Print / Download" on a patient → in the new window click
      <strong>🖨️ Print / Save as PDF</strong> → choose <em>"Save as PDF"</em> as the destination.
    </div>
    ${Object.entries(patients).map(([pname, psubs]) => `
    <div class="patient-card">
      <div class="patient-card-info">
        <div class="patient-card-name">👤 ${pname}</div>
        <div class="patient-card-meta">${psubs.length} form${psubs.length>1?"s":""} — Last submitted: ${psubs[psubs.length-1].submitted_at}</div>
        <div class="patient-card-forms">
          ${psubs.map(s=>`<span class="form-tag">${ICONS[s.form_id]||"📄"} ${s.form_name}</span>`).join("")}
        </div>
      </div>
      <div class="patient-card-actions">
        <button class="btn-view-patient" onclick="openPatientPrint('${encodeURIComponent(pname)}')">
          🖨️ Print / Download
        </button>
      </div>
    </div>`).join("")}`;
}

/* ── Open print preview in new tab ──────────────────── */
function openPatientPrint(encodedName) {
  // Use direct server route — no popup blocking issues
  const pname = encodeURIComponent(decodeURIComponent(encodedName));
  window.open("/api/print-patient/" + pname, "_blank");
}

/* ── Build complete print HTML ───────────────────────── */
function buildPrintHTML(patientName, submissions) {
  const ORDER = ["admission","vitals","history","mio","medication","ivfluid","kardex","doctors_order","nurses_notes","vs_graph"];
  const pages = ORDER
    .map(fid => { const sub = submissions.find(s => s.form_id === fid); return sub ? buildFormPage(fid, sub) : ""; })
    .filter(Boolean)
    .join('<div class="page-break"></div>');

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<title>eTELEmo — ${patientName}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,sans-serif;font-size:9pt;color:#000;background:#fff;padding-top:52px}
.print-controls{position:fixed;top:0;left:0;right:0;z-index:999;background:#0A1628;color:#fff;
  padding:10px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px;box-shadow:0 2px 8px rgba(0,0,0,.3)}
.print-controls h2{font-size:14px;font-weight:600}
.btn-print{background:#0D7377;color:#fff;border:none;padding:8px 20px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600}
.btn-close{background:transparent;color:#aaa;border:1px solid #555;padding:8px 16px;border-radius:6px;cursor:pointer;font-size:12px}
.form-page{width:210mm;min-height:297mm;margin:0 auto;padding:10mm 12mm}
.page-break{page-break-after:always;break-after:page;height:0}
.form-title{text-align:center;font-size:11pt;font-weight:bold;text-transform:uppercase;
  letter-spacing:.05em;border-bottom:2px solid #000;padding-bottom:3px;margin-bottom:8px}
.clinic-header{text-align:center;font-size:8pt;margin-bottom:6px}
.clinic-header .clinic-name{font-size:10pt;font-weight:bold}
.field-row{display:flex;border-bottom:1px solid #000;min-height:18px}
.field-cell{flex:1;padding:2px 4px;border-right:1px solid #000;display:flex;flex-direction:column;justify-content:flex-end;min-height:18px}
.field-cell:last-child{border-right:none}
.field-cell.w2{flex:2}.field-cell.w3{flex:3}.field-cell.w4{flex:4}
.field-label{font-size:6.5pt;color:#444;line-height:1.1}
.field-value{font-size:8.5pt;font-weight:500;min-height:10px;border-bottom:1px solid #555}
.form-section{border:1px solid #000;margin-bottom:4px}
.form-section>.field-row{border-bottom:1px solid #000}
.form-section>.field-row:last-child{border-bottom:none}
.form-table{width:100%;border-collapse:collapse;font-size:7.5pt;margin-bottom:4px}
.form-table th{background:#d0e8e8;border:1px solid #000;padding:3px 4px;text-align:center;font-size:7pt;font-weight:bold}
.form-table td{border:1px solid #000;padding:2px 4px;min-height:16px;height:16px}
.form-table td.val{font-size:8pt;font-weight:500}
.section-head{background:#0A1628;color:#fff;text-align:center;font-weight:bold;font-size:7pt}
.check-grid{display:flex;flex-wrap:wrap;gap:3px 16px;padding:3px 6px;font-size:7.5pt}
.check-item{display:flex;align-items:center;gap:3px}
.cb{width:9px;height:9px;border:1px solid #000;display:inline-flex;align-items:center;justify-content:center;font-size:7pt;flex-shrink:0}
.cb.checked{background:#000;color:#fff;font-size:6pt}
.cert-text{font-size:7pt;font-style:italic;text-align:center;padding:4px;border-top:1px solid #000;border-bottom:1px solid #000;margin:2px 0}
.sig-line{border-bottom:1px solid #000;min-width:80px;display:inline-block}
.submitted-by{font-size:7pt;color:#555;text-align:right;margin-top:4px}
@media print{
  .print-controls{display:none!important}
  body{padding-top:0}
  .form-page{page-break-after:always}
  .form-page:last-child{page-break-after:auto}
  @page{size:A4;margin:8mm 10mm}
}
</style></head><body>
<div class="print-controls">
  <h2>🖨️ Patient Records — ${patientName}</h2>
  <div style="display:flex;gap:8px">
    <button class="btn-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
    <button class="btn-close" onclick="window.close()">✕ Close</button>
  </div>
</div>
${pages}
</body></html>`;
}

function buildFormPage(formId, sub) {
  const B = {
    admission:buildAdmission, vitals:buildVitals, history:buildHistory,
    mio:buildMIO, medication:buildMedication, ivfluid:buildIVFluid,
    kardex:buildKardex, doctors_order:buildDoctorsOrder,
    nurses_notes:buildNursesNotes, vs_graph:buildVsGraph
  };
  const fn = B[formId];
  return fn ? `<div class="form-page">${fn(sub.data||{}, sub)}</div>` : "";
}

/* ── Shared helpers ──────────────────────────────────── */
const v = (d,k) => d[k] || "";
function cell(label, value, cls="") {
  return `<div class="field-cell ${cls}"><span class="field-label">${label}</span><div class="field-value">${value||"&nbsp;"}</div></div>`;
}
function frow(...cells) { return `<div class="field-row">${cells.join("")}</div>`; }
function cb(d, key, label) {
  const on = d[key] ? "checked" : "";
  return `<span class="check-item"><span class="cb ${on}">${on?"✓":""}</span> ${label}</span>`;
}
function subBy(sub) {
  return `<div class="submitted-by">Submitted by: ${sub.nurse_name} — ${sub.submitted_at}</div>`;
}

/* ═══════════════════════════════════════════════════════
   1. ADMISSION AND DISCHARGE RECORD
   ═══════════════════════════════════════════════════════ */
function buildAdmission(d, sub) {
  return `
  <div class="clinic-header"><div class="clinic-name">eTele Mo — TeleHealth Communication</div>
  <div>"PHIC Accredited Health Care Provider" Poblacion, Banga, Aklan</div></div>
  <div class="form-title">Admission and Discharge Record</div>
  <div class="form-section">
    ${frow(cell("HRN No.",v(d,"hrn_no"),"w2"),cell("Med. Record No.",v(d,"med_record_no"),"w2"))}
    ${frow(cell("Last Name",v(d,"patient_last"),"w3"),cell("First Name",v(d,"patient_first"),"w2"),cell("Suffix",v(d,"patient_suffix")),cell("Middle Name",v(d,"patient_middle"),"w2"),cell("Service",v(d,"service")),cell("Rooms",v(d,"rooms")))}
    ${frow(cell("Permanent Address",v(d,"address"),"w4"),cell("Telephone No",v(d,"tel_no"),"w2"),cell("Sex",v(d,"sex")),cell("Civil Status",v(d,"civil_status")))}
    ${frow(cell("Birth Date",v(d,"birth_date")),cell("Age",v(d,"age")),cell("Birth Place",v(d,"birth_place"),"w2"),cell("Nationality",v(d,"nationality")),cell("Religion",v(d,"religion")),cell("Occupation",v(d,"occupation")))}
    ${frow(cell("Employer",v(d,"employer"),"w2"),cell("Address",v(d,"employer_address"),"w3"),cell("Tel. No.",v(d,"employer_tel")))}
    ${frow(cell("Father",v(d,"father"),"w3"),cell("Mother",v(d,"mother"),"w3"))}
    ${frow(cell("Spouse",v(d,"spouse"),"w2"),cell("Address",v(d,"spouse_address"),"w3"),cell("Tel. No.",v(d,"spouse_tel")))}
  </div>
  <div class="form-section">
    ${frow(cell("Admission Date & Time",v(d,"admission_datetime"),"w2"),cell("Discharge Date & Time",v(d,"discharge_datetime"),"w2"),cell("Day of Stay",v(d,"day_of_stay")),cell("Attending Physician",v(d,"attending_physician"),"w2"))}
    ${frow(cell("Type of Admission",v(d,"type_of_admission"),"w2"),cell("Admitted by",v(d,"admitted_by"),"w2"),cell("Resident",v(d,"resident"),"w2"))}
    ${frow(cell("Allergic to",v(d,"allergic_to"),"w4"))}
  </div>
  <div class="form-section">
    ${frow(cell("Social Services",v(d,"social_services")),cell("Hospitalization Plan",v(d,"hosp_plan")),cell("Health Insurance",v(d,"health_insurance")),cell("PhilHealth ID",v(d,"philhealth_id")))}
    <div class="cert-text">I CERTIFY THAT THE FACTS I HAVE GIVEN ARE TRUE TO THE BEST OF MY KNOWLEDGE</div>
    ${frow(cell("Data Furnished by",v(d,"data_furnished_by"),"w2"),cell("Address",v(d,"data_address"),"w3"),cell("Relationship",v(d,"relationship")))}
  </div>
  <div class="form-section">
    ${frow(cell("Admission Diagnosis",v(d,"admission_dx"),"w4"),cell("ICD CODE No.",v(d,"admission_icd")))}
    ${frow(cell("Principal Diagnosis",v(d,"principal_dx"),"w4"),cell("ICD CODE No.",v(d,"principal_icd")))}
    <div class="field-row"><div class="field-cell w4"></div><div class="field-cell" style="gap:4px;padding:4px">
      ${cb(d,"no_smoker","□ NO SMOKER")} &nbsp; ${cb(d,"smoker","□ SMOKER")}
    </div></div>
    ${frow(cell("Other Diagnosis",v(d,"other_dx"),"w4"))}
    ${frow(cell("Principal Operating Procedures",v(d,"principal_procedures"),"w4"))}
    ${frow(cell("Other Operation / Procedure",v(d,"other_procedures"),"w4"))}
    ${frow(cell("Accident / Injuries / Poisoning",v(d,"accident_injuries"),"w4"))}
    ${frow(cell("Place of Occurrence",v(d,"place_of_occurrence"),"w4"))}
  </div>
  <table style="width:100%;border-collapse:collapse;border:1px solid #000;margin-bottom:4px"><tr>
    <td style="width:25%;border-right:1px solid #000;padding:4px 6px;vertical-align:top">
      <div style="font-size:7pt;font-weight:bold;margin-bottom:3px">Disposition</div>
      ${["discharge","transferred","absconded","dama"].map(k=>`<div style="font-size:7.5pt">${cb(d,"disp_"+k,"□ "+k.charAt(0).toUpperCase()+k.slice(1))}</div>`).join("")}
    </td>
    <td style="width:38%;border-right:1px solid #000;padding:4px 6px;vertical-align:top">
      <div style="font-size:7pt;font-weight:bold;margin-bottom:3px">Result</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px;font-size:7.5pt">
        <div>${cb(d,"result_recovered","□ Recovered")}</div><div>${cb(d,"result_improved","□ Improved")}</div>
        <div>${cb(d,"result_died","□ Died")}</div><div>${cb(d,"result_unimproved","□ Unimproved")}</div>
        <div>${cb(d,"result_48h_minus","□ -48 Hours")}</div><div>${cb(d,"result_48h_plus","□ +48 Hours")}</div>
        <div>${cb(d,"result_autopsied","□ Autopsied")}</div><div>${cb(d,"result_not_autopsied","□ Not Autopsied")}</div>
      </div>
    </td>
    <td style="width:37%;padding:4px 6px;vertical-align:top">
      <div style="font-size:7pt;font-weight:bold;margin-bottom:3px">Attending Physician</div>
      <div style="font-size:8pt">${v(d,"attending_physician")}</div>
      <div style="font-size:7pt;margin-top:6px">Signature: <span class="sig-line">${v(d,"attending_sig")}</span> M.D.</div>
      <div style="font-size:7pt;margin-top:3px">Audit: ${v(d,"audit")}</div>
    </td>
  </tr></table>
  ${subBy(sub)}`;
}

/* ═══════════════════════════════════════════════════════
   2. VITAL SIGNS MONITORING SHEET
   ═══════════════════════════════════════════════════════ */
function buildVitals(d, sub) {
  const rows = [];
  for (let i=1;i<=50;i++) {
    const r=[v(d,"date_"+i),v(d,"time_"+i),v(d,"bp_"+i),v(d,"cr_"+i),v(d,"rr_"+i),v(d,"temp_"+i),v(d,"spo2_"+i),v(d,"sig_"+i)];
    if (r.some(Boolean)) rows.push(r);
  }
  while (rows.length<15) rows.push(Array(8).fill(""));
  return `
  <div class="form-title">Vital Signs Monitoring Sheet</div>
  <div class="form-section">${frow(cell("Name",v(d,"patient_name"),"w3"),cell("Age",v(d,"age")),cell("Sex",v(d,"sex")),cell("Ward",v(d,"ward")))}</div>
  <table class="form-table">
    <thead><tr><th>DATE</th><th>TIME</th><th>BLOOD PRESSURE</th><th>CARDIAC RATE</th><th>RESPIRATORY RATE</th><th>TEMPERATURE</th><th>O2 SATURATION (%)</th><th>SIGNATURE</th></tr></thead>
    <tbody>${rows.map(r=>`<tr>${r.map(c=>`<td class="val">${c||"&nbsp;"}</td>`).join("")}</tr>`).join("")}</tbody>
  </table>
  ${subBy(sub)}`;
}

/* ═══════════════════════════════════════════════════════
   3. HISTORY RECORD
   ═══════════════════════════════════════════════════════ */
function buildHistory(d, sub) {
  function peSec(title, items, othKey) {
    return `<tr>
      <td style="width:18%;font-weight:bold;font-size:7.5pt;vertical-align:top;padding:2px 4px;border-right:1px solid #000">${title}</td>
      <td style="padding:2px 4px"><div class="check-grid">
        ${items.map(([k,l])=>cb(d,k,l)).join("")}
        ${othKey&&d[othKey]?`<span class="check-item">Others: <strong>${d[othKey]}</strong></span>`:""}
      </div></td></tr>`;
  }
  return `
  <div class="clinic-header"><div class="clinic-name">eTele Mo — TeleHealth Communication</div>
  <div>"PHIC Accredited Health Care Provider" Kalibo, Aklan</div></div>
  <div class="form-title">History Record</div>
  <div class="form-section">${frow(cell("Patient Name",v(d,"patient_name"),"w3"),cell("Date",v(d,"history_date")))}</div>
  <div style="font-size:7.5pt;font-weight:bold;padding:2px 4px;background:#eee;border:1px solid #000;border-bottom:none">PHYSICAL EXAMINATION (Pertinent findings per system):</div>
  <table class="form-table" style="margin-bottom:2px"><tbody>
    <tr>
      <td style="width:18%;font-weight:bold;font-size:7.5pt;border-right:1px solid #000;padding:2px 4px">General Survey</td>
      <td style="padding:2px 4px"><div class="check-grid">${cb(d,"gen_awake","Awake and alert")} ${cb(d,"gen_altered","Altered Sensorium")} ${d.gen_others?`<span>Others: <strong>${d.gen_others}</strong></span>`:""}</div></td>
    </tr>
    <tr>
      <td style="font-weight:bold;font-size:7.5pt;border-right:1px solid #000;padding:2px 4px">Vital Signs</td>
      <td style="padding:2px 4px;font-size:8pt">BP: <strong>${v(d,"vs_bp")}</strong> &nbsp; HR: <strong>${v(d,"vs_hr")}</strong> &nbsp; RR: <strong>${v(d,"vs_rr")}</strong> &nbsp; Temp: <strong>${v(d,"vs_temp")}</strong></td>
    </tr>
  </tbody></table>
  <div style="font-size:7.5pt;font-weight:bold;padding:2px 4px;background:#eee;border:1px solid #000;border-bottom:none">PHYSICAL EXAMINATION continued:</div>
  <table class="form-table"><tbody>
    ${peSec("HEENT",[["heent_normal","Essentially normal"],["heent_pupil","Abnormal pupillary reaction"],["heent_lymph","Cervical lymphadenopathy"],["heent_icteric","Icteric sclera"],["heent_pale_conj","Pale conjunctive"],["heent_sunken_eye","Sunken eyeballs"],["heent_dry","Dry mucus membrane"],["heent_sunken_font","Sunken fontanelle"]],"heent_others")}
    ${peSec("Chest/Lungs",[["chest_normal","Essentially normal"],["chest_asym","Asymmetrical chest expansion"],["chest_decreased","Decreased breath sounds"],["chest_lump","Lump/s over breast(s)"],["chest_rales","Rale/crackles/rhonchi"],["chest_retract","Intercostal rib/Clavicular retractions"],["chest_wheeze","Wheeze"]],"chest_others")}
    ${peSec("CVs",[["cvs_normal","Essentially normal"],["cvs_displaced","Displaced apex beat"],["cvs_heaves","Heaves and/or thrills"],["cvs_irregular","Irregular rhythm"],["cvs_muffled","Muffled heart sound"],["cvs_pericardial","Pericardial bulge"],["cvs_murmur","Murmur"]],"cvs_others")}
    ${peSec("Abdomen",[["abd_normal","Essentially normal"],["abd_rigidity","Abdomen Rigidity"],["abd_tenderness","Abdominal tenderness"],["abd_palpable","Palpable mass/es"],["abd_tympanic","Tympanic/dull abdomen"],["abd_hyperactive","Hyperactive bowel sounds"],["abd_uterine","Uterine contraction"]],"abd_others")}
    <tr><td style="font-weight:bold;font-size:7.5pt;border-right:1px solid #000;padding:2px 4px">Abdomen (cont.)</td>
      <td style="padding:2px 4px;font-size:7.5pt">Fundic Height: <strong>${v(d,"abd_fundic")}</strong> &nbsp;&nbsp; FHT: <strong>${v(d,"abd_fht")}</strong></td></tr>
    ${peSec("GU (IE)",[["gu_normal","Essentially Normal"],["gu_blood","Blood stained exam finger"],["gu_discharge","Presence of abnormal vaginal discharge"]])}
    <tr><td style="font-weight:bold;font-size:7.5pt;border-right:1px solid #000;padding:2px 4px">IE</td><td style="padding:2px 4px;font-size:7.5pt">${v(d,"gu_ie")||"&nbsp;"}</td></tr>
    ${peSec("Skin/Extremities",[["skin_normal","Essentially Normal"],["skin_clubbing","Clubbing"],["skin_cold","Cold clammy skin"],["skin_edema","Edema/swelling"],["skin_decreased","Decreased mobility"],["skin_pale","Pale nailbeds"],["skin_rashes","Rashes"],["skin_weak","Weak pulses"],["skin_cyanosis","Cyanosis/mottled skin"],["skin_poor_turgor","Poor skin turgor"]],"skin_others")}
    ${peSec("Neuro-Exam",[["neuro_normal","Essentially Normal"],["neuro_sensation","Abnormal/decreased sensation"],["neuro_reflex","Abnormal reflex(es)"],["neuro_coord","Poor coordination"],["neuro_gait","Abnormal gait"]],"neuro_others")}
  </tbody></table>
  <div style="border:1px solid #000;padding:3px 6px;margin-bottom:2px;font-size:8pt"><span style="font-size:7pt;color:#444">Others: </span>${v(d,"other_findings")||"&nbsp;"}</div>
  <div style="border:1px solid #000;padding:3px 6px;margin-bottom:4px">
    <div style="font-size:7pt;font-weight:bold;text-align:center;margin-bottom:2px">Clinical Impression</div>
    <div style="font-size:8.5pt;min-height:20px">${v(d,"clinical_impression")||"&nbsp;"}</div>
    <div style="text-align:right;font-size:7.5pt;margin-top:4px">Attending Physician: <span class="sig-line">${v(d,"attending_physician")}</span></div>
  </div>
  ${subBy(sub)}`;
}

/* ═══════════════════════════════════════════════════════
   4. INTAKE & OUTPUT (MIO)
   ═══════════════════════════════════════════════════════ */
function buildMIO(d, sub) {
  function block(s) {
    const rows=[];
    for(let r=1;r<=20;r++){
      const t=v(d,`s${s}_time_${r}`);
      const vals=["po","ivf","tube","oth_in","urine","emesis","ng","stool","oth_out"].map(k=>v(d,`s${s}_${k}_${r}`));
      if(t||vals.some(Boolean)) rows.push([t,...vals]);
    }
    while(rows.length<8) rows.push(Array(10).fill(""));
    return `<table class="form-table" style="margin-bottom:1px">
      <thead>
        <tr><th colspan="5" class="section-head">INTAKE</th><th colspan="5" class="section-head">OUTPUT</th></tr>
        <tr><th>TIME</th><th>PO</th><th>IV FLUIDS</th><th>TUBE FEEDING</th><th>OTHER</th><th>URINE</th><th>EMESIS</th><th>NG</th><th>STOOL</th><th>OTHER</th></tr>
      </thead>
      <tbody>
        ${rows.map(r=>`<tr>${r.map(c=>`<td class="val">${c||"&nbsp;"}</td>`).join("")}</tr>`).join("")}
        <tr style="background:#eee">
          <td style="font-size:7pt;font-weight:bold">TOTALS:</td>
          ${["po","ivf","tube","oth_in"].map(k=>`<td class="val">${v(d,`s${s}_tot_${k}`)}</td>`).join("")}
          <td style="font-size:7pt;font-weight:bold">TOTALS:</td>
          ${["emesis","ng","stool","oth_out"].map(k=>`<td class="val">${v(d,`s${s}_tot_${k}`)}</td>`).join("")}
        </tr>
      </tbody>
    </table>
    <div style="font-size:7.5pt;margin-bottom:4px">NURSING ASSISTANT SIGNATURE: <span class="sig-line">${v(d,"s"+s+"_na_sig")}</span></div>`;
  }
  return `
  <div class="form-title">Intake &amp; Output — MIO</div>
  <div class="form-section" style="margin-bottom:4px">
    ${frow(cell("Patient Name",v(d,"patient_name"),"w3"),cell("Room #",v(d,"room_no")),cell("Date",v(d,"mio_date")),cell("Admission Weight",v(d,"admission_weight")),cell("Current Weight",v(d,"current_weight")))}
  </div>
  ${block(1)}${block(2)}${block(3)}
  ${subBy(sub)}`;
}

/* ═══════════════════════════════════════════════════════
   5. MEDICATION SHEET
   ═══════════════════════════════════════════════════════ */
function buildMedication(d, sub) {
  const meds=[];
  for(let i=1;i<=20;i++) if(v(d,"med_"+i)) meds.push(i);
  if(!meds.length) meds.push(1);
  const shifts=["11-7","7-3","3-11"];
  return `
  <div class="form-title">Medication Sheet</div>
  <div class="form-section" style="margin-bottom:4px">
    ${frow(cell("Name",v(d,"patient_name"),"w3"),cell("Ward/Room",v(d,"ward_room"),"w2"),cell("Physician",v(d,"physician"),"w2"))}
  </div>
  <table class="form-table">
    <thead>
      <tr><th rowspan="2">Date Ordered/Remarks</th><th rowspan="2">Medication Dosage/Frequency</th><th colspan="2">Date / SHIFT</th>${[1,2,3,4,5,6].map(_=>`<th colspan="2">Hr / Sig</th>`).join("")}</tr>
      <tr><th>Date</th><th>SHIFT</th>${[1,2,3,4,5,6].map(_=>`<th>Hr</th><th>Sig</th>`).join("")}</tr>
    </thead>
    <tbody>
      ${meds.map(i=>shifts.map((shift,si)=>`<tr>
        ${si===0?`<td rowspan="3" class="val">${v(d,"date_ordered_"+i)}</td><td rowspan="3" class="val">${v(d,"med_"+i)}</td>`:""}
        <td class="val">${v(d,`med_date_${i}_${si+1}`)}</td>
        <td style="text-align:center;font-weight:bold;font-size:7pt;background:#d0e8e8">${shift}</td>
        ${[1,2,3,4,5,6].map(j=>`<td class="val">${v(d,`hr_${i}_${si+1}_${j}`)}</td><td class="val">${v(d,`sig_${i}_${si+1}_${j}`)}</td>`).join("")}
      </tr>`).join("")).join("")}
    </tbody>
  </table>
  <table class="form-table" style="margin-top:2px">
    <thead><tr><th>Nurse Name</th><th>Initial</th><th>Nurse Name</th><th>Initial</th><th>Nurse Name</th><th>Initial</th><th>Nurse Name</th><th>Initial</th></tr></thead>
    <tbody><tr>${[1,2,3,4].map(i=>`<td class="val">${v(d,"nurse_name_"+i)}</td><td class="val">${v(d,"nurse_initial_"+i)}</td>`).join("")}</tr></tbody>
  </table>
  ${subBy(sub)}`;
}

/* ═══════════════════════════════════════════════════════
   6. IV FLUID CHART
   ═══════════════════════════════════════════════════════ */
function buildIVFluid(d, sub) {
  const rows=[];
  for(let i=1;i<=20;i++) if(v(d,"ivf_type_"+i)) rows.push([i,v(d,"ivf_type_"+i),v(d,"drug_add_"+i),v(d,"iv_rate_"+i),v(d,"started_"+i),v(d,"consumed_"+i),v(d,"ivf_sig_"+i)]);
  while(rows.length<8) rows.push([rows.length+1,"","","","","",""]);
  return `
  <div style="text-align:right;font-size:8pt;margin-bottom:2px">HRN: <strong>${v(d,"hrn_no")}</strong></div>
  <div class="form-title">IV Fluid Chart</div>
  <div class="form-section" style="margin-bottom:4px">
    ${frow(cell("Name",v(d,"patient_name"),"w3"),cell("Ward/Room",v(d,"ward_room"),"w2"),cell("Physician",v(d,"physician"),"w2"))}
  </div>
  <table class="form-table">
    <thead><tr><th>IVF Bottle No.</th><th>Type of Fluid</th><th>Drug Additives</th><th>IV Rate</th><th>Time/Date Started</th><th>Time/Date Consumed</th><th>Nurses Signature Over Printed Name</th></tr></thead>
    <tbody>${rows.map(r=>`<tr>${r.map((c,i)=>`<td class="val"${i===0?" style='text-align:center;font-weight:bold'":" "}>${c||"&nbsp;"}</td>`).join("")}</tr>`).join("")}</tbody>
  </table>
  ${subBy(sub)}`;
}

/* ═══════════════════════════════════════════════════════
   7. KARDEX
   ═══════════════════════════════════════════════════════ */
function buildKardex(d, sub) {
  return `
  <div class="form-title">Kardex</div>
  <div class="form-section">
    ${frow(cell("Hospital No.",v(d,"hospital_no"),"w2"),cell("Patient Name",v(d,"patient_name"),"w4"))}
    ${frow(cell("Age",v(d,"age")),cell("Sex",(d.sex_m?"M":"")+(d.sex_f?"F":"")),cell("Religion",v(d,"religion")),cell("CS",v(d,"civil_status")),cell("Rm/Ward",v(d,"room_ward")),cell("TPR",v(d,"tpr")),cell("MIO",v(d,"mio_val")))}
    ${frow(cell("Dx",v(d,"diagnosis"),"w3"),cell("Attending Physician",v(d,"physician"),"w2"),cell("Date Admitted",v(d,"date_admitted")))}
  </div>
  <table class="form-table" style="margin-bottom:2px"><tr>
    <td style="width:22%;vertical-align:top;border-right:1px solid #000;padding:3px">
      <div style="font-size:7pt;font-weight:bold">O2 Inhalation</div>
      <div style="font-size:8pt">${v(d,"o2_lpm")||"—"} LPM</div>
      <div class="check-grid" style="flex-direction:column">
        ${cb(d,"o2_cannula","Cannula")} ${cb(d,"o2_face_mask","Face Mask")} ${cb(d,"o2_nasal_cath","Nasal Cath")}
      </div>
    </td>
    <td style="width:28%;vertical-align:top;border-right:1px solid #000;padding:3px">
      <div style="font-size:7pt;font-weight:bold">VR Set-up</div>
      <div style="font-size:8pt">${v(d,"vr_setup")||"&nbsp;"}</div>
    </td>
    <td style="width:28%;vertical-align:top;border-right:1px solid #000;padding:3px">
      <div style="font-size:7pt;font-weight:bold">Contraption List</div>
      <div class="check-grid" style="flex-direction:column">
        ${cb(d,"cont_o2","O2")} ${cb(d,"cont_ett","ETT")} ${cb(d,"cont_ngt","NGT/OGT")} ${cb(d,"cont_foley","Foley Catheter")} ${cb(d,"cont_ctt","CTT")}
        ${d.cont_others?`<span>Others: ${d.cont_others}</span>`:""}
      </div>
    </td>
    <td style="width:22%;vertical-align:top;padding:3px">
      <div style="font-size:7pt;font-weight:bold">Diet:</div><div style="font-size:8pt">${v(d,"diet")}</div>
      <div style="font-size:7pt;font-weight:bold;margin-top:4px">CBG:</div><div style="font-size:8pt">${v(d,"cbg")}</div>
    </td>
  </tr></table>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:2px">
    <div>
      <div style="font-size:7pt;font-weight:bold;background:#d0e8e8;border:1px solid #000;padding:2px 4px">DATE — MEDICATIONS (A)</div>
      <table class="form-table" style="margin:0">${Array.from({length:8},(_,i)=>`<tr><td class="val" style="width:35%">${v(d,"med_date_a_"+(i+1))}</td><td class="val">${v(d,"med_a_"+(i+1))}</td></tr>`).join("")}</table>
    </div>
    <div>
      <div style="font-size:7pt;font-weight:bold;background:#d0e8e8;border:1px solid #000;padding:2px 4px">DATE — MEDICATIONS (B)</div>
      <table class="form-table" style="margin:0">${Array.from({length:4},(_,i)=>`<tr><td class="val" style="width:35%">${v(d,"med_date_b_"+(i+1))}</td><td class="val">${v(d,"med_b_"+(i+1))}</td></tr>`).join("")}</table>
      <div style="font-size:7pt;font-weight:bold;background:#d0e8e8;border:1px solid #000;padding:2px 4px;margin-top:2px">INHALATIONS</div>
      <table class="form-table" style="margin:0">${Array.from({length:3},(_,i)=>`<tr><td class="val" style="width:35%">${v(d,"inh_date_"+(i+1))}</td><td class="val">${v(d,"inhalation_"+(i+1))}</td></tr>`).join("")}</table>
      <div style="font-size:7pt;font-weight:bold;background:#d0e8e8;border:1px solid #000;padding:2px 4px;margin-top:2px">PRN MEDICATIONS</div>
      <table class="form-table" style="margin:0">${Array.from({length:5},(_,i)=>`<tr><td class="val" style="width:35%">${v(d,"prn_date_"+(i+1))}</td><td class="val">${v(d,"prn_med_"+(i+1))}</td></tr>`).join("")}</table>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:2px">
    <div>
      <table class="form-table" style="margin:0"><thead><tr><th>PRESENT</th><th>STARTED</th><th>DUE</th></tr></thead>
      <tbody>${Array.from({length:5},(_,i)=>`<tr><td class="val">${v(d,"present_"+(i+1))}</td><td class="val">${v(d,"started_l_"+(i+1))}</td><td class="val">${v(d,"due_l_"+(i+1))}</td></tr>`).join("")}</tbody></table>
      <div style="font-size:7pt;font-weight:bold;margin-top:2px">IV FLUIDS:</div>
      ${Array.from({length:3},(_,i)=>`<div style="font-size:8pt;border-bottom:1px solid #ccc;padding:1px">${v(d,"ivf_k_date_"+(i+1))||"&nbsp;"} — ${v(d,"ivf_k_"+(i+1))||"&nbsp;"}</div>`).join("")}
      <div style="font-size:7pt;font-weight:bold;margin-top:2px">TO FOLLOW:</div>
      <div style="font-size:8pt;border:1px solid #ccc;padding:2px;min-height:14px">${v(d,"to_follow")||"&nbsp;"}</div>
    </div>
    <div>
      <table class="form-table" style="margin:0"><thead><tr><th>STARTED</th><th>DUE</th></tr></thead>
      <tbody>${Array.from({length:5},(_,i)=>`<tr><td class="val">${v(d,"started_r_"+(i+1))}</td><td class="val">${v(d,"due_r_"+(i+1))}</td></tr>`).join("")}</tbody></table>
      <div style="font-size:7pt;font-weight:bold;margin-top:2px">SIDE DRIPS / REPLACEMENTS:</div>
      ${Array.from({length:6},(_,i)=>`<div style="font-size:8pt;border-bottom:1px solid #ccc;padding:1px">${v(d,"side_drip_date_"+(i+1))||"&nbsp;"} — ${v(d,"side_drip_"+(i+1))||"&nbsp;"}</div>`).join("")}
    </div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">
    <div>
      <div style="font-size:7pt;font-weight:bold;background:#d0e8e8;border:1px solid #000;padding:2px 4px">LABORATORY / DIAGNOSTICS</div>
      <table class="form-table" style="margin:0"><thead><tr><th>DATE</th><th>LAB/DIAGNOSTICS</th><th>REMARKS</th></tr></thead>
      <tbody>${Array.from({length:8},(_,i)=>`<tr><td class="val">${v(d,"lab_date_"+(i+1))}</td><td class="val">${v(d,"lab_"+(i+1))}</td><td class="val">${v(d,"lab_rem_"+(i+1))}</td></tr>`).join("")}</tbody></table>
    </div>
    <div>
      <div style="font-size:7pt;font-weight:bold;background:#d0e8e8;border:1px solid #000;padding:2px 4px">SPECIAL ENDORSEMENTS</div>
      <table class="form-table" style="margin:0"><thead><tr><th>DATE</th><th>ENDORSEMENTS</th></tr></thead>
      <tbody>${Array.from({length:8},(_,i)=>`<tr><td class="val">${v(d,"endorse_date_"+(i+1))}</td><td class="val">${v(d,"endorse_"+(i+1))}</td></tr>`).join("")}</tbody></table>
    </div>
  </div>
  ${subBy(sub)}`;
}

/* ═══════════════════════════════════════════════════════
   8. DOCTOR'S ORDER / PROGRESS NOTES
   ═══════════════════════════════════════════════════════ */
function buildDoctorsOrder(d, sub) {
  const rows=[];
  for(let i=1;i<=30;i++){
    const soap=v(d,"soap_"+i),order=v(d,"doctors_order_"+i);
    if(v(d,"order_date_"+i)||soap||order) rows.push([v(d,"order_date_"+i),v(d,"order_time_"+i),soap,order]);
  }
  while(rows.length<8) rows.push(["","","",""]);
  return `
  <div style="text-align:right;font-size:8pt;margin-bottom:2px">HRN: <strong>${v(d,"hrn_no")}</strong></div>
  <div class="form-title">Doctor's Order / Progress Notes</div>
  <div class="form-section" style="margin-bottom:4px">
    ${frow(cell("Name",v(d,"patient_name"),"w3"),cell("Ward/Room",v(d,"ward_room"),"w2"),cell("Physician",v(d,"physician"),"w2"))}
  </div>
  <table class="form-table">
    <thead><tr>
      <th style="width:12%">DATE</th><th style="width:9%">TIME</th>
      <th style="width:40%">PROGRESS NOTES S-O-A-P<br><span style="font-weight:normal;font-size:6.5pt">(Affix Printed Name and Signature)</span></th>
      <th>DOCTOR's ORDER<br><span style="font-weight:normal;font-size:6.5pt">(Affix Printed Name and Signature)</span></th>
    </tr></thead>
    <tbody>${rows.map(([date,time,soap,order])=>`<tr style="height:42px">
      <td class="val" style="vertical-align:top">${date||"&nbsp;"}</td>
      <td class="val" style="vertical-align:top">${time||"&nbsp;"}</td>
      <td class="val" style="vertical-align:top;white-space:pre-wrap">${soap||"&nbsp;"}</td>
      <td class="val" style="vertical-align:top;white-space:pre-wrap">${order||"&nbsp;"}</td>
    </tr>`).join("")}</tbody>
  </table>
  ${subBy(sub)}`;
}

/* ═══════════════════════════════════════════════════════
   9. NURSES PROGRESS NOTES
   ═══════════════════════════════════════════════════════ */
function buildNursesNotes(d, sub) {
  const rows=[];
  for(let i=1;i<=40;i++){
    const dar=v(d,"dar_"+i),dt=v(d,"note_dt_"+i);
    if(dt||v(d,"diet_"+i)||v(d,"focus_"+i)||dar) rows.push([dt,v(d,"diet_"+i),v(d,"focus_"+i),dar]);
  }
  while(rows.length<10) rows.push(["","","",""]);
  return `
  <div class="clinic-header"><div class="clinic-name">eTele Mo — TeleHealth Communication</div>
  <div>Poblacion, Banga, Aklan &nbsp;|&nbsp; Tel. No. 0945 2482 898</div></div>
  <div class="form-title">Nurses Progress Notes</div>
  <div style="text-align:right;font-size:8pt;margin-bottom:2px">HRN: <strong>${v(d,"hrn_no")}</strong></div>
  <div class="form-section" style="margin-bottom:4px">
    ${frow(cell("Name",v(d,"patient_name"),"w3"),cell("Ward/Room",v(d,"ward_room"),"w2"),cell("Physician",v(d,"physician"),"w2"))}
  </div>
  <table class="form-table">
    <thead><tr><th style="width:17%">Date/Time</th><th style="width:11%">DIET</th><th style="width:13%">FOCUS</th><th>D = Data &nbsp;&nbsp; A = Action &nbsp;&nbsp; R = Response</th></tr></thead>
    <tbody>${rows.map(([dt,diet,focus,dar])=>`<tr style="height:38px">
      <td class="val" style="vertical-align:top">${dt||"&nbsp;"}</td>
      <td class="val" style="vertical-align:top">${diet||"&nbsp;"}</td>
      <td class="val" style="vertical-align:top">${focus||"&nbsp;"}</td>
      <td class="val" style="vertical-align:top;white-space:pre-wrap">${dar||"&nbsp;"}</td>
    </tr>`).join("")}</tbody>
  </table>
  ${subBy(sub)}`;
}

/* ═══════════════════════════════════════════════════════
   10. VS GRAPH SHEET
   ═══════════════════════════════════════════════════════ */
function buildVsGraph(d, sub) {
  const sections=[
    {key:"cardiac",label:"Cardiac",color:"#c0392b",yVals:[90,80,85,60,50,40,30,20,10]},
    {key:"pulse",  label:"Pulse",  color:"#2980b9",yVals:[120,110,100,90,80,70,60,50,40]},
    {key:"temp",   label:"Temp.",  color:"#27ae60",yVals:[120,110,100,90,80,70,60,50,40]},
  ];
  const days=Array.from({length:10},(_,i)=>i+1);
  const times=["12","8","4"];

  function graphSection(sec) {
    return `<div style="margin-bottom:6px">
      <table style="width:100%;border-collapse:collapse;font-size:6pt">
        <thead>
          <tr><td colspan="${1+days.length*6}" style="padding:1px 0;font-size:6.5pt">
            Date: ${days.map(d2=>`<span style="display:inline-block;min-width:16mm;text-align:center">${v(d,sec.key+"_date_"+d2)||"______"}</span>`).join("")}
          </td></tr>
          <tr>
            <th style="background:${sec.color};color:#fff;width:22px;border:1px solid #000;padding:2px;font-size:6.5pt">${sec.label}</th>
            ${days.map(()=>`<th colspan="3" style="background:#e0e0e0;text-align:center;border:1px solid #999;font-size:5.5pt">AM</th><th colspan="3" style="background:#c8c8c8;text-align:center;border:1px solid #999;font-size:5.5pt">PM</th>`).join("")}
          </tr>
          <tr>
            <th style="background:${sec.color};color:#fff;border:1px solid #000"></th>
            ${days.map(()=>["am","pm"].map(ap=>times.map(t=>`<th style="font-size:5pt;text-align:center;border:1px solid #ccc;background:${ap==="am"?"#f5f5f5":"#ebebeb"}">${t}</th>`).join("")).join("")).join("")}
          </tr>
        </thead>
        <tbody>
          ${sec.yVals.map(y=>`<tr>
            <td style="font-size:6.5pt;font-weight:600;text-align:right;padding-right:2px;border-right:2px solid ${sec.color};border:1px solid #ddd;background:#f9f9f9">${y}</td>
            ${days.map(d2=>["am","pm"].map(ap=>times.map(t=>{
              const val=d[`${sec.key}_${ap}_${t}_d${d2}_y${y}`]||"";
              return `<td style="height:10px;border:1px solid #e0e0e0;text-align:center;font-size:5.5pt;background:${ap==="am"?"#fefefe":"#f8f8f8"}">${val}</td>`;
            }).join("")).join("")).join("")}
          </tr>`).join("")}
        </tbody>
      </table>
    </div>`;
  }

  return `
  <div class="clinic-header"><div class="clinic-name">eTele Mo — TeleHealth Communication</div>
  <div>Poblacion, Banga, Aklan &nbsp;|&nbsp; Tel. No. 0945 2482 898</div></div>
  <div class="form-title">VS Graph Sheet</div>
  <div class="form-section" style="margin-bottom:6px">
    ${frow(cell("Patient Name",v(d,"patient_name"),"w3"),cell("Date",v(d,"graph_date")),cell("Days of Hospitalization",v(d,"days_hosp")),cell("Post-Operative Days",v(d,"post_op_days")))}
  </div>
  ${sections.map(sec=>graphSection(sec)).join("")}
  ${subBy(sub)}`;
}
