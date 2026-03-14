/* ═══════════════════════════════════════════════════════
   forms.js — Clean single-entry forms with Add Row
   ═══════════════════════════════════════════════════════ */

function openForm(formId) {
  const def = FORMS_DEF.find(f => f.id === formId);
  if (!def) return;
  document.getElementById("form-bc").textContent       = def.name;
  document.getElementById("form-title").textContent    = `${def.icon} ${def.name}`;
  document.getElementById("form-subtitle").textContent = def.desc;
  document.getElementById("form-content").innerHTML    = FORM_BUILDERS[formId]?.(def) || "<p>Form not found.</p>";
  showPage("form");
}

async function submitForm(event, formId, formName) {
  event.preventDefault();
  const data = {};
  new FormData(event.target).forEach((v, k) => { if (v) data[k] = v; });
  event.target.querySelectorAll("input[type='checkbox']").forEach(cb => {
    if (cb.checked) data[cb.name] = "Yes";
  });
  const res = await api("/api/submit", "POST", { form_id: formId, form_name: formName, data });
  if (res.error) { toast(res.error, "error"); return; }
  toast(`${formName} submitted successfully.`, "success");
  await loadNurseDashboard();
  showPage("dashboard");
}

/* ── Helpers ─────────────────────────────────────────── */
const card  = (hdr, body) =>
  `<div class="form-card"><div class="form-card-header">${hdr}</div><div class="form-card-body">${body}</div></div>`;
const fi = (lbl, name, type="text", ph="", req="") =>
  `<div class="form-group"><label class="form-label">${lbl}</label><input class="form-input" type="${type}" name="${name}" placeholder="${ph}" ${req}></div>`;
const fs = (lbl, name, opts) =>
  `<div class="form-group"><label class="form-label">${lbl}</label><select class="form-select" name="${name}"><option value="">-- Select --</option>${opts.map(o=>`<option>${o}</option>`).join("")}</select></div>`;
const ft = (lbl, name, ph="", h="75px") =>
  `<div class="form-group"><label class="form-label">${lbl}</label><textarea class="form-textarea" name="${name}" placeholder="${ph}" style="min-height:${h}"></textarea></div>`;
const ck = (name, lbl) =>
  `<label class="chk-label"><input type="checkbox" name="${name}"> ${lbl}</label>`;
const g2 = (...f) => `<div class="grid-2">${f.join("")}</div>`;
const g3 = (...f) => `<div class="grid-3">${f.join("")}</div>`;
const g4 = (...f) => `<div class="grid-4">${f.join("")}</div>`;
const inp = (name, ph="", w="100%", type="text") =>
  `<input class="form-input" type="${type}" name="${name}" placeholder="${ph}" style="width:${w};padding:4px 6px;font-size:.82rem">`;
const submitRow = () =>
  `<div class="submit-row"><button type="button" class="btn-cancel" onclick="showPage('dashboard')">✕ Cancel</button><button type="submit" class="btn-primary">✓ Submit Form</button></div>`;
const wrap = (id, name, body) =>
  `<div style="padding-bottom:2rem"><form onsubmit="submitForm(event,'${id}','${name}')">${body}${submitRow()}</form></div>`;

/* ── Dynamic table helpers ─────────────────────────────── */
function addRow(tableId) {
  const tbody = document.querySelector(`#${tableId} tbody`);
  const rows  = tbody.querySelectorAll("tr");
  const newIdx = rows.length + 1;
  const tpl  = rows[0].cloneNode(true);
  // Update all name attributes: replace _1 suffix with _newIdx
  tpl.querySelectorAll("[name]").forEach(el => {
    el.name  = el.name.replace(/_(\d+)(_\d+)*$/, (m, n, rest) => `_${newIdx}${rest||""}`);
    el.value = "";
    if (el.tagName === "TEXTAREA") el.textContent = "";
  });
  // Update row number display if present
  const rn = tpl.querySelector(".row-num");
  if (rn) rn.textContent = newIdx;
  tbody.appendChild(tpl);
}

function removeRow(btn) {
  const tbody = btn.closest("tbody");
  if (tbody.querySelectorAll("tr").length > 1) {
    btn.closest("tr").remove();
  }
}

/* row number cell */
const rnCell = `<td style="text-align:center;font-size:.75rem;color:var(--muted);min-width:28px"><span class="row-num">1</span></td>`;
const delBtn = `<td style="text-align:center;min-width:28px"><button type="button" onclick="removeRow(this)" style="background:none;border:none;cursor:pointer;color:#c0392b;font-size:1rem;padding:0">✕</button></td>`;
const addBtn = (id, lbl="+ Add Row") =>
  `<button type="button" onclick="addRow('${id}')" class="btn-add-row">${lbl}</button>`;

const FORM_BUILDERS = {

/* ══════════════════════════════════════════════════════
   ADMISSION AND DISCHARGE RECORD
   ══════════════════════════════════════════════════════ */
admission: (def) => wrap(def.id, def.name, `
  ${card("ADMISSION AND DISCHARGE RECORD", `
    ${g2(fi("HRN No.","hrn_no"), fi("Med. Record No.","med_record_no"))}
  `)}
  ${card("Patient's Name", `
    ${g4(fi("Last Name *","patient_last","text","","required"), fi("First Name","patient_first"), fi("Suffix","patient_suffix","text","Jr./Sr."), fi("Middle Name","patient_middle"))}
    ${g2(fi("Service","service"), fi("Rooms","rooms"))}
  `)}
  ${card("Personal Information", `
    ${g2(fi("Permanent Address","address"), fi("Telephone No.","tel_no"))}
    ${g3(fi("Sex","sex"), fi("Civil Status","civil_status"), fi("Birth Date","birth_date","date"))}
    ${g4(fi("Age","age","number"), fi("Birth Place","birth_place"), fi("Nationality","nationality"), fi("Religion","religion"))}
    ${fi("Occupation","occupation")}
    ${g3(fi("Employer","employer"), fi("Address (Employer)","employer_address"), fi("Tel. No.","employer_tel"))}
    ${g2(fi("Father","father"), fi("Mother","mother"))}
    ${g3(fi("Spouse","spouse"), fi("Address (Spouse)","spouse_address"), fi("Tel. No.","spouse_tel"))}
  `)}
  ${card("Admission / Discharge", `
    ${g4(fi("Admission Date & Time *","admission_datetime","datetime-local","","required"), fi("Discharge Date & Time","discharge_datetime","datetime-local"), fi("Day of Stay","day_of_stay","number"), fi("Attending Physician","attending_physician"))}
    ${g3(fi("Type of Admission","type_of_admission"), fi("Admitted by","admitted_by"), fi("Resident","resident"))}
    ${fi("Allergic to","allergic_to","text","NKDA or specify")}
  `)}
  ${card("Social Services & Insurance", `
    ${g4(fi("Social Services","social_services"), fi("Hospitalization Plan","hosp_plan"), fi("Health Insurance Name","health_insurance"), fi("PhilHealth ID","philhealth_id"))}
    <div class="cert-text">I CERTIFY THAT THE FACTS I HAVE GIVEN ARE TRUE TO THE BEST OF MY KNOWLEDGE</div>
    ${g3(fi("Data Furnished by","data_furnished_by"), fi("Address","data_address"), fi("Relationship to Patient","relationship"))}
  `)}
  ${card("Diagnosis & Procedures", `
    ${g2(ft("Admission Diagnosis","admission_dx"), fi("ICD CODE No.","admission_icd"))}
    <div style="display:grid;grid-template-columns:1fr auto;gap:.8rem;align-items:start;margin-bottom:.8rem">
      ${ft("Principal Diagnosis","principal_dx")}
      <div>${fi("ICD CODE No.","principal_icd")}<div class="chk-col" style="margin-top:.4rem">${ck("no_smoker","□ NO SMOKER")}${ck("smoker","□ SMOKER")}</div></div>
    </div>
    ${ft("Other Diagnosis","other_dx")}
    ${ft("Principal Operating Procedures","principal_procedures")}
    ${ft("Other Operation / Procedure","other_procedures")}
    ${ft("Accident / Injuries / Poisoning","accident_injuries")}
    ${fi("Place of Occurrence","place_of_occurrence")}
  `)}
  ${card("Disposition & Result", `
    <div class="disp-grid">
      <div><div class="sect-label">Disposition</div><div class="chk-col">${ck("disp_discharge","□ Discharge")}${ck("disp_transferred","□ Transferred")}${ck("disp_absconded","□ Absconded")}${ck("disp_dama","□ DAMA")}</div></div>
      <div><div class="sect-label">Result</div><div class="chk-col">${ck("result_recovered","□ Recovered")}${ck("result_improved","□ Improved")}${ck("result_died","□ Died")}${ck("result_unimproved","□ Unimproved")}${ck("result_48h_minus","□ -48 Hours")}${ck("result_48h_plus","□ +48 Hours")}${ck("result_autopsied","□ Autopsied")}${ck("result_not_autopsied","□ Not Autopsied")}</div></div>
      <div><div class="sect-label">Attending Physician</div>${fi("Signature / M.D.","attending_sig")}${fi("Audit","audit")}</div>
    </div>
  `)}
`),

/* ══════════════════════════════════════════════════════
   VITAL SIGNS — table with Add Row
   ══════════════════════════════════════════════════════ */
vitals: (def) => wrap(def.id, def.name, `
  ${card("VITAL SIGNS MONITORING SHEET", `
    <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:.8rem">
      ${fi("Name *","patient_name","text","","required")}
      ${fi("Age","age","number")}
      ${fs("Sex","sex",["Male","Female"])}
      ${fi("Ward","ward")}
    </div>
  `)}
  ${card("Readings", `
    <div class="tbl-wrap">
      <table class="vstbl" id="vitals-tbl">
        <thead><tr>
          <th style="width:28px">#</th>
          <th style="min-width:120px">DATE</th>
          <th style="min-width:90px">TIME</th>
          <th style="min-width:100px">BLOOD PRESSURE</th>
          <th style="min-width:90px">CARDIAC RATE</th>
          <th style="min-width:100px">RESPIRATORY RATE</th>
          <th style="min-width:90px">TEMPERATURE</th>
          <th style="min-width:90px">O2 SAT (%)</th>
          <th style="min-width:120px">SIGNATURE</th>
          <th style="width:28px"></th>
        </tr></thead>
        <tbody>
          <tr>
            ${rnCell}
            <td>${inp("date_1","","100%","date")}</td>
            <td>${inp("time_1","","100%","time")}</td>
            <td>${inp("bp_1","","100%")}</td>
            <td>${inp("cr_1","","100%")}</td>
            <td>${inp("rr_1","","100%")}</td>
            <td>${inp("temp_1","","100%")}</td>
            <td>${inp("spo2_1","","100%")}</td>
            <td>${inp("sig_1","","100%")}</td>
            ${delBtn}
          </tr>
        </tbody>
      </table>
    </div>
    ${addBtn("vitals-tbl")}
  `)}
`),

/* ══════════════════════════════════════════════════════
   HISTORY RECORD — checkboxes + clinical impression
   ══════════════════════════════════════════════════════ */
history: (def) => wrap(def.id, def.name, `
  ${card("HISTORY RECORD", `
    ${g2(fi("Patient Name *","patient_name","text","","required"), fi("Date","history_date","date"))}
  `)}
  ${card("Physical Examination — General & Vital Signs", `
    <div class="pe-section">
      <span class="pe-label">General Survey:</span>
      <div class="chk-row">${ck("gen_awake","□ Awake and alert")}${ck("gen_altered","□ Altered Sensorium")}</div>
      ${fi("□ Others","gen_others","text","Others")}
    </div>
    <div class="pe-section">
      <span class="pe-label">Vital Signs:</span>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.6rem">
        ${fi("BP","vs_bp")}${fi("HR","vs_hr")}${fi("RR","vs_rr")}${fi("Temperature","vs_temp")}
      </div>
    </div>
  `)}
  ${card("HEENT", `
    <div class="pe-3col">
      <div class="chk-col">${ck("heent_normal","□ Essentially normal")}${ck("heent_icteric","□ Icteric sclera")}${ck("heent_dry","□ Dry mucus membrane")}</div>
      <div class="chk-col">${ck("heent_pupil","□ Abnormal pupillary reaction")}${ck("heent_pale_conj","□ Pale conjunctive")}${ck("heent_sunken_font","□ Sunken fontanelle")}</div>
      <div class="chk-col">${ck("heent_lymph","□ Cervical lymphadenopathy")}${ck("heent_sunken_eye","□ Sunken eyeballs")}${fi("□ Others","heent_others")}</div>
    </div>
  `)}
  ${card("Chest / Lungs", `
    <div class="pe-3col">
      <div class="chk-col">${ck("chest_normal","□ Essentially normal")}${ck("chest_lump","□ Lump/s over breast(s)")}${ck("chest_wheeze","□ Wheeze")}</div>
      <div class="chk-col">${ck("chest_asym","□ Asymmetrical chest expansion")}${ck("chest_rales","□ Rale/crackles/rhonchi")}${fi("Others","chest_others")}</div>
      <div class="chk-col">${ck("chest_decreased","□ Decreased breath sounds")}${ck("chest_retract","□ Intercostal rib/Clavicular retractions")}</div>
    </div>
  `)}
  ${card("CVs", `
    <div class="pe-3col">
      <div class="chk-col">${ck("cvs_normal","□ Essentially normal")}${ck("cvs_irregular","□ Irregular rhythm")}${ck("cvs_murmur","□ Murmur")}</div>
      <div class="chk-col">${ck("cvs_displaced","□ Displaced apex beat")}${ck("cvs_muffled","□ Muffled heart sound")}${fi("Others","cvs_others")}</div>
      <div class="chk-col">${ck("cvs_heaves","□ Heaves and/or thrills")}${ck("cvs_pericardial","□ Pericardial bulge")}</div>
    </div>
  `)}
  ${card("Abdomen", `
    <div class="pe-3col">
      <div class="chk-col">${ck("abd_normal","□ Essentially normal")}${ck("abd_palpable","□ Palpable mass/es")}${ck("abd_uterine","□ Uterine contraction")}${fi("□ Others","abd_others")}</div>
      <div class="chk-col">${ck("abd_rigidity","□ Abdomen Rigidity")}${ck("abd_tympanic","□ Tympanic/dull abdomen")}${fi("□ Fundic Height","abd_fundic")}</div>
      <div class="chk-col">${ck("abd_tenderness","□ Abdominal tenderness")}${ck("abd_hyperactive","□ Hyperactive bowel sounds")}${fi("□ FHT","abd_fht")}</div>
    </div>
  `)}
  ${card("GU (IE)", `
    <div class="chk-row">${ck("gu_normal","□ Essentially Normal")}${ck("gu_blood","□ Blood stained exam finger")}${ck("gu_discharge","□ Presence of abnormal vaginal discharge")}</div>
    ${ft("□ Internal Examination","gu_ie","","65px")}
  `)}
  ${card("Skin / Extremities", `
    <div class="pe-3col">
      <div class="chk-col">${ck("skin_normal","□ Essentially Normal")}${ck("skin_edema","□ Edema/swelling")}${ck("skin_rashes","□ Rashes")}${ck("skin_poor_turgor","□ Poor skin turgor")}</div>
      <div class="chk-col">${ck("skin_clubbing","□ Clubbing")}${ck("skin_decreased","□ Decreased mobility")}${ck("skin_weak","□ Weak pulses")}${fi("Others","skin_others")}</div>
      <div class="chk-col">${ck("skin_cold","□ Cold clammy skin")}${ck("skin_pale","□ Pale nailbeds")}${ck("skin_cyanosis","□ Cyanosis/mottled skin")}</div>
    </div>
  `)}
  ${card("Neuro-Exam", `
    <div class="pe-3col">
      <div class="chk-col">${ck("neuro_normal","□ Essentially Normal")}${ck("neuro_reflex","□ Abnormal reflex(es)")}${ck("neuro_gait","□ Abnormal gait")}</div>
      <div class="chk-col">${ck("neuro_sensation","□ Abnormal/decreased sensation")}${ck("neuro_coord","□ Poor coordination")}${fi("Others","neuro_others")}</div>
    </div>
  `)}
  ${card("Clinical Impression", `
    ${ft("Others / Additional Findings","other_findings","","60px")}
    ${ft("Clinical Impression","clinical_impression","","90px")}
    ${fi("Attending Physician","attending_physician")}
  `)}
`),

/* ══════════════════════════════════════════════════════
   INTAKE & OUTPUT (MIO) — 3 blocks with Add Row each
   ══════════════════════════════════════════════════════ */
mio: (def) => wrap(def.id, def.name, `
  ${card("INTAKE & OUTPUT — MIO", `
    ${g3(fi("PATIENT NAME *","patient_name","text","","required"), fi("ROOM #","room_no"), fi("DATE *","mio_date","date","","required"))}
    ${g2(fi("Admission Weight","admission_weight","text","kg"), fi("Current Weight","current_weight","text","kg"))}
  `)}
  ${[1,2,3].map(s=>`
  ${card(`Shift Block ${s}`, `
    <div class="tbl-wrap">
      <table class="miotbl" id="mio-tbl-${s}">
        <thead>
          <tr>
            <th style="width:28px">#</th>
            <th colspan="5" class="tbl-section-head">INTAKE</th>
            <th colspan="5" class="tbl-section-head">OUTPUT</th>
            <th style="width:28px"></th>
          </tr>
          <tr>
            <th></th>
            <th>TIME</th><th>PO</th><th>IV FLUIDS</th><th>TUBE FEEDING</th><th>OTHER</th>
            <th>URINE</th><th>EMESIS</th><th>NG</th><th>STOOL</th><th>OTHER</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr>
            ${rnCell}
            <td>${inp(`s${s}_time_1`,"","80px","time")}</td>
            ${["po","ivf","tube","oth_in","urine","emesis","ng","stool","oth_out"].map(c=>`<td>${inp(`s${s}_${c}_1`,"","58px")}</td>`).join("")}
            ${delBtn}
          </tr>
        </tbody>
      </table>
    </div>
    ${addBtn("mio-tbl-"+s)}
    ${fi("NURSING ASSISTANT SIGNATURE","s"+s+"_na_sig","text","______________________________")}
  `)}`).join("")}
`),

/* ══════════════════════════════════════════════════════
   MEDICATION SHEET — with Add Row, shifts 11-7/7-3/3-11
   ══════════════════════════════════════════════════════ */
medication: (def) => wrap(def.id, def.name, `
  ${card("MEDICATION SHEET", `
    ${g3(fi("Name *","patient_name","text","","required"), fi("Ward/Room","ward_room"), fi("Physician","physician","text","Dr. "))}
  `)}
  ${card("Medications", `
    <div class="tbl-wrap">
      <table class="medtbl" id="med-tbl">
        <thead>
          <tr>
            <th rowspan="2" style="width:28px">#</th>
            <th rowspan="2" style="min-width:110px">Date Ordered/<br>Remarks</th>
            <th rowspan="2" style="min-width:150px">Medication Dosage/<br>Frequency</th>
            <th style="min-width:100px">Date</th>
            <th style="min-width:55px">SHIFT</th>
            ${[1,2,3,4,5,6].map(_=>`<th class="sm-th">Hr</th><th class="sm-th">Sig</th>`).join("")}
            <th rowspan="2" style="width:28px"></th>
          </tr>
        </thead>
        <tbody>
          ${["11-7","7-3","3-11"].map((shift,si)=>`
          <tr>
            ${si===0?`<td rowspan="3" style="text-align:center;font-size:.75rem;color:var(--muted)"><span class="row-num">1</span></td>
                      <td rowspan="3" style="vertical-align:top;padding:4px">${inp("date_ordered_1","","100%","date")}</td>
                      <td rowspan="3" style="vertical-align:top;padding:4px">${inp("med_1","Medication, dosage, frequency...")}</td>`: ""}
            <td style="padding:3px 4px">${inp(`med_date_1_${si+1}`,"","100%","date")}</td>
            <td style="text-align:center;font-weight:700;font-size:.78rem;background:var(--teal-pale);color:var(--navy);padding:4px 5px">${shift}</td>
            ${[1,2,3,4,5,6].map(j=>`<td style="padding:2px 3px">${inp(`hr_1_${si+1}_${j}`,"","36px")}</td><td style="padding:2px 3px">${inp(`sig_1_${si+1}_${j}`,"","36px")}</td>`).join("")}
            ${si===0?`<td rowspan="3" style="text-align:center;vertical-align:middle"><button type="button" onclick="removeMedRow(this)" style="background:none;border:none;cursor:pointer;color:#c0392b;font-size:1rem;padding:0">✕</button></td>`:""}
          </tr>`).join("")}
        </tbody>
      </table>
    </div>
    <button type="button" onclick="addMedRow()" class="btn-add-row">+ Add Medication</button>
  `)}
  ${card("Nurse Names & Initials", `
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1rem">
      ${[1,2,3,4].map(i=>`<div>${fi("Nurse Name","nurse_name_"+i)}${fi("Initial","nurse_initial_"+i)}</div>`).join("")}
    </div>
  `)}
`),

/* ══════════════════════════════════════════════════════
   IV FLUID CHART — with Add Row
   ══════════════════════════════════════════════════════ */
ivfluid: (def) => wrap(def.id, def.name, `
  ${card("IV FLUID CHART", `
    ${g3(fi("HRN","hrn_no"), fi("Name *","patient_name","text","","required"), fi("Ward/Room","ward_room"))}
    ${fi("Physician","physician","text","Dr. ")}
  `)}
  ${card("IV Fluid Entries", `
    <div class="tbl-wrap">
      <table class="ivftbl" id="ivf-tbl">
        <thead><tr>
          <th>Bottle #</th>
          <th style="min-width:130px">Type of Fluid</th>
          <th style="min-width:120px">Drug Additives</th>
          <th style="min-width:80px">IV Rate</th>
          <th style="min-width:160px">Time/Date Started</th>
          <th style="min-width:160px">Time/Date Consumed</th>
          <th style="min-width:150px">Nurses Signature Over Printed Name</th>
          <th style="width:28px"></th>
        </tr></thead>
        <tbody>
          <tr>
            <td style="text-align:center;font-weight:700;color:var(--navy)"><span class="row-num">1</span></td>
            <td>${inp("ivf_type_1","","100%")}</td>
            <td>${inp("drug_add_1","","100%")}</td>
            <td>${inp("iv_rate_1","mL/hr","100%")}</td>
            <td>${inp("started_1","","100%","datetime-local")}</td>
            <td>${inp("consumed_1","","100%","datetime-local")}</td>
            <td>${inp("ivf_sig_1","","100%")}</td>
            ${delBtn}
          </tr>
        </tbody>
      </table>
    </div>
    ${addBtn("ivf-tbl","+ Add Bottle")}
  `)}
`),

/* ══════════════════════════════════════════════════════
   KARDEX
   ══════════════════════════════════════════════════════ */
kardex: (def) => wrap(def.id, def.name, `
  ${card("KARDEX", `
    ${g2(fi("Patient Name *","patient_name","text","","required"), fi("Hospital No.","hospital_no"))}
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr 1fr 1fr;gap:.6rem;align-items:end">
      ${fi("Age","age","number")}
      <div class="form-group"><label class="form-label">Sex</label><div class="chk-row" style="margin:0;gap:.8rem">${ck("sex_m","[ ] M")}${ck("sex_f","[ ] F")}</div></div>
      ${fi("Religion","religion")}${fi("CS","civil_status")}${fi("Rm/Ward","room_ward")}${fi("TPR","tpr")}
    </div>
    ${g4(fi("Dx","diagnosis"), fi("Attending Physician","physician"), fi("Date Admitted *","date_admitted","date","","required"), fi("MIO","mio_val"))}
  `)}
  ${card("O2 / VR Set-up / Contraption List / Diet / CBG", `
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem">
      <div>
        <div class="sect-label">O2 Inhalation</div>
        ${fi("LPM","o2_lpm")}
        <div class="chk-col" style="margin-top:.4rem">${ck("o2_cannula","[ ] Cannula")}${ck("o2_face_mask","[ ] Face Mask")}${ck("o2_nasal_cath","[ ] Nasal Cath")}</div>
      </div>
      <div>
        <div class="sect-label">VR Set-up</div>
        ${ft("","vr_setup","","65px")}
        <div class="sect-label" style="margin-top:.5rem">Diet</div>${fi("","diet")}
        <div class="sect-label" style="margin-top:.5rem">CBG</div>${fi("","cbg")}
      </div>
      <div>
        <div class="sect-label">Contraption List</div>
        <div class="chk-col">${ck("cont_o2","[ ] O2")}${ck("cont_ett","[ ] ETT")}${ck("cont_ngt","[ ] NGT/OGT")}${ck("cont_foley","[ ] Foley Catheter")}${ck("cont_ctt","[ ] CTT")}</div>
        ${fi("[ ] Others","cont_others")}
      </div>
    </div>
  `)}
  ${card("Medications (Column A)", `
    ${Array.from({length:8},(_,i)=>i+1).map(i=>`<div class="date-med-row">${inp("med_date_a_"+i,"","105px","date")}${inp("med_a_"+i,"Medication, dosage, frequency, timing...")}</div>`).join("")}
  `)}
  ${card("Medications (Column B) + Inhalations + PRN", `
    <div class="sect-label">Medications Column B</div>
    ${Array.from({length:4},(_,i)=>i+1).map(i=>`<div class="date-med-row">${inp("med_date_b_"+i,"","105px","date")}${inp("med_b_"+i,"Medication, dosage, frequency, timing...")}</div>`).join("")}
    <div class="sect-label" style="margin-top:.8rem">INHALATIONS</div>
    ${Array.from({length:3},(_,i)=>i+1).map(i=>`<div class="date-med-row">${inp("inh_date_"+i,"","105px","date")}${inp("inhalation_"+i,"Inhalation medication...")}</div>`).join("")}
    <div class="sect-label" style="margin-top:.8rem">PRN MEDICATIONS</div>
    ${Array.from({length:5},(_,i)=>i+1).map(i=>`<div class="date-med-row">${inp("prn_date_"+i,"","105px","date")}${inp("prn_med_"+i,"PRN medication...")}</div>`).join("")}
  `)}
  ${card("Present / Started / Due  |  IV Fluids  |  Side Drips", `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
      <div>
        <table class="kardex-tbl"><thead><tr><th>PRESENT</th><th>STARTED</th><th>DUE</th></tr></thead>
        <tbody>${Array.from({length:5},(_,i)=>i+1).map(i=>`<tr><td>${inp("present_"+i,"","100%")}</td><td>${inp("started_l_"+i,"","80px")}</td><td>${inp("due_l_"+i,"","80px")}</td></tr>`).join("")}</tbody></table>
        <div class="sect-label" style="margin-top:.6rem">IV FLUIDS</div>
        ${Array.from({length:3},(_,i)=>i+1).map(i=>`<div class="date-med-row">${inp("ivf_k_date_"+i,"","105px","date")}${inp("ivf_k_"+i,"IV Fluid...")}</div>`).join("")}
        <div class="sect-label" style="margin-top:.6rem">TO FOLLOW</div>
        ${ft("","to_follow","","55px")}
      </div>
      <div>
        <table class="kardex-tbl"><thead><tr><th>STARTED</th><th>DUE</th></tr></thead>
        <tbody>${Array.from({length:5},(_,i)=>i+1).map(i=>`<tr><td>${inp("started_r_"+i,"","100%")}</td><td>${inp("due_r_"+i,"","80px")}</td></tr>`).join("")}</tbody></table>
        <div class="sect-label" style="margin-top:.6rem">SIDE DRIPS / REPLACEMENTS</div>
        ${Array.from({length:6},(_,i)=>i+1).map(i=>`<div class="date-med-row">${inp("side_drip_date_"+i,"","105px","date")}${inp("side_drip_"+i,"Side drip / replacement...")}</div>`).join("")}
      </div>
    </div>
  `)}
  ${card("Lab / Diagnostics  &  Special Endorsements", `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
      <div>
        <div class="sect-label">LABORATORY / DIAGNOSTICS</div>
        <table class="kardex-tbl"><thead><tr><th>DATE</th><th>LAB/DIAGNOSTICS</th><th>REMARKS</th></tr></thead>
        <tbody>${Array.from({length:8},(_,i)=>i+1).map(i=>`<tr><td>${inp("lab_date_"+i,"","100%","date")}</td><td>${inp("lab_"+i,"","100%")}</td><td>${inp("lab_rem_"+i,"","80px")}</td></tr>`).join("")}</tbody></table>
      </div>
      <div>
        <div class="sect-label">SPECIAL ENDORSEMENTS</div>
        <table class="kardex-tbl"><thead><tr><th>DATE</th><th>SPECIAL ENDORSEMENTS</th></tr></thead>
        <tbody>${Array.from({length:8},(_,i)=>i+1).map(i=>`<tr><td>${inp("endorse_date_"+i,"","100%","date")}</td><td>${inp("endorse_"+i,"","100%")}</td></tr>`).join("")}</tbody></table>
      </div>
    </div>
  `)}
`),

/* ══════════════════════════════════════════════════════
   DOCTOR'S ORDER / PROGRESS NOTES — Add Row
   ══════════════════════════════════════════════════════ */
doctors_order: (def) => wrap(def.id, def.name, `
  ${card("DOCTOR'S ORDER / PROGRESS NOTES", `
    ${fi("HRN","hrn_no")}
    ${g3(fi("Name *","patient_name","text","","required"), fi("Ward\\\\Room","ward_room"), fi("Physician","physician","text","Dr. "))}
  `)}
  ${card("Entries", `
    <div class="tbl-wrap">
      <table class="notestbl" id="order-tbl" style="min-width:680px">
        <thead><tr>
          <th style="width:28px">#</th>
          <th style="min-width:100px">DATE</th>
          <th style="min-width:80px">TIME</th>
          <th>PROGRESS NOTES S-O-A-P<br><small style="font-weight:400">(Affix Printed Name and Signature)</small></th>
          <th>DOCTOR's ORDER<br><small style="font-weight:400">(Affix Printed Name and Signature)</small></th>
          <th style="width:28px"></th>
        </tr></thead>
        <tbody>
          <tr>
            ${rnCell}
            <td>${inp("order_date_1","","100%","date")}</td>
            <td>${inp("order_time_1","","100%","time")}</td>
            <td><textarea class="tbl-ta" name="soap_1" placeholder="S:\nO:\nA:\nP:"></textarea></td>
            <td><textarea class="tbl-ta" name="doctors_order_1" placeholder="1.\n2.\n3."></textarea></td>
            ${delBtn}
          </tr>
        </tbody>
      </table>
    </div>
    ${addBtn("order-tbl","+ Add Entry")}
  `)}
`),

/* ══════════════════════════════════════════════════════
   NURSES PROGRESS NOTES — Add Row
   ══════════════════════════════════════════════════════ */
nurses_notes: (def) => wrap(def.id, def.name, `
  ${card("NURSES PROGRESS NOTES", `
    ${fi("HRN","hrn_no")}
    ${g3(fi("Name *","patient_name","text","","required"), fi("Ward\\\\Room","ward_room"), fi("Physician","physician","text","Dr. "))}
  `)}
  ${card("Progress Notes", `
    <div class="tbl-wrap">
      <table class="notestbl" id="notes-tbl">
        <thead><tr>
          <th style="width:28px">#</th>
          <th style="min-width:140px">Date/Time</th>
          <th style="min-width:90px">DIET</th>
          <th style="min-width:110px">FOCUS</th>
          <th>D= Data &nbsp; A= Action &nbsp; R= Response</th>
          <th style="width:28px"></th>
        </tr></thead>
        <tbody>
          <tr>
            ${rnCell}
            <td>${inp("note_dt_1","","100%","datetime-local")}</td>
            <td>${inp("diet_1","","100%")}</td>
            <td>${inp("focus_1","","100%")}</td>
            <td><textarea class="tbl-ta" name="dar_1" placeholder="D: \nA: \nR: "></textarea></td>
            ${delBtn}
          </tr>
        </tbody>
      </table>
    </div>
    ${addBtn("notes-tbl","+ Add Entry")}
  `)}
`),

};

/* ── Medication special add/remove ──────────────────── */
function addMedRow() {
  const tbody = document.querySelector("#med-tbl tbody");
  const allRows = tbody.querySelectorAll("tr");
  const medCount = allRows.length / 3;
  const newIdx = medCount + 1;
  const shifts = ["11-7","7-3","3-11"];
  shifts.forEach((shift, si) => {
    const tr = document.createElement("tr");
    let html = "";
    if (si === 0) {
      html += `<td rowspan="3" style="text-align:center;font-size:.75rem;color:var(--muted)">${newIdx}</td>`;
      html += `<td rowspan="3" style="vertical-align:top;padding:4px">${inp("date_ordered_"+newIdx,"","100%","date")}</td>`;
      html += `<td rowspan="3" style="vertical-align:top;padding:4px">${inp("med_"+newIdx,"Medication, dosage, frequency...")}</td>`;
    }
    html += `<td style="padding:3px 4px">${inp(`med_date_${newIdx}_${si+1}`,"","100%","date")}</td>`;
    html += `<td style="text-align:center;font-weight:700;font-size:.78rem;background:var(--teal-pale);color:var(--navy);padding:4px 5px">${shift}</td>`;
    for (let j=1;j<=6;j++) {
      html += `<td style="padding:2px 3px">${inp(`hr_${newIdx}_${si+1}_${j}`,"","36px")}</td>`;
      html += `<td style="padding:2px 3px">${inp(`sig_${newIdx}_${si+1}_${j}`,"","36px")}</td>`;
    }
    if (si === 0) {
      html += `<td rowspan="3" style="text-align:center;vertical-align:middle"><button type="button" onclick="removeMedRow(this)" style="background:none;border:none;cursor:pointer;color:#c0392b;font-size:1rem;padding:0">✕</button></td>`;
    }
    tr.innerHTML = html;
    tbody.appendChild(tr);
  });
}

function removeMedRow(btn) {
  const tbody = btn.closest("tbody");
  if (tbody.querySelectorAll("tr").length <= 3) return;
  const row = btn.closest("tr");
  // Remove this row and the next 2 (3-shift group)
  row.nextElementSibling?.remove();
  row.nextElementSibling?.remove();
  row.remove();
}

/* ══════════════════════════════════════════════════════
   FORM 10 — VS GRAPH SHEET  (Image: Cardiac / Pulse / Temp)
   Header: eTele Mo / TeleHealth Communication / Poblacion, Banga, Aklan / Tel. No. 0945 2482 898
   Three sections: Cardiac (10–90), Pulse (40–120), Temperature (40–120)
   Each section has:
     Date: ___  Days of Hospitalization: ___  Post-Operative Days: ___
     Columns: AM (12 8 4) PM (12 8 4) × 10 days
     Y-axis grid with numeric scale
   ══════════════════════════════════════════════════════ */
FORM_BUILDERS.vs_graph = (def) => wrap(def.id, def.name, `
  ${card("VS GRAPH SHEET", `
    ${g2(fi("Patient Name *","patient_name","text","","required"), fi("Date","graph_date","date"))}
    ${g2(fi("Days of Hospitalization","days_hosp"), fi("Post-Operative Days","post_op_days"))}
  `)}

  ${buildGraphSection("CARDIAC", "cardiac", [90,80,85,60,50,40,30,20,10])}
  ${buildGraphSection("PULSE",   "pulse",   [120,110,100,90,80,70,60,50,40])}
  ${buildGraphSection("TEMP.",   "temp",    [120,110,100,90,80,70,60,50,40])}
`);

function buildGraphSection(label, key, yVals) {
  const color = label==="CARDIAC" ? "#e74c3c" : label==="PULSE" ? "#2980b9" : "#27ae60";
  // 10 day-columns × 3 time slots (AM12, AM8, AM4 then PM12, PM8, PM4... simplified to 12 cols)
  const cols = 10; // days
  const times = ["12","8","4"]; // per AM and PM

  return `
  <div class="form-card" style="margin-bottom:1.2rem">
    <div class="form-card-header" style="background:${color};color:#fff">${label}</div>
    <div class="form-card-body" style="padding:.8rem">

      <!-- Date / Days header row -->
      <div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:4px;margin-bottom:.5rem">
        ${Array.from({length:cols},(_,i)=>`
        <div>
          <div class="form-group" style="margin-bottom:2px">
            <label class="form-label" style="font-size:.65rem">Day ${i+1} Date</label>
            <input class="form-input" type="date" name="${key}_date_${i+1}" style="padding:3px 5px;font-size:.72rem">
          </div>
        </div>`).join("")}
      </div>

      <!-- AM / PM column headers -->
      <div class="tbl-wrap">
        <table class="vstbl" style="font-size:.68rem;min-width:700px">
          <thead>
            <tr>
              <th style="width:32px;background:${color};color:#fff">${label}</th>
              ${Array.from({length:cols},(_,i)=>`
              <th colspan="3" style="background:#f0f0f0;color:#333;text-align:center">
                AM
              </th>
              <th colspan="3" style="background:#e8e8e8;color:#333;text-align:center">
                PM
              </th>`).join("")}
            </tr>
            <tr>
              <th style="background:${color};color:#fff;font-size:.62rem">Scale</th>
              ${Array.from({length:cols},(_,d)=>
                ["AM","PM"].map(ap=>
                  times.map(t=>`<th style="font-size:.62rem;background:${ap==="AM"?"#f7f7f7":"#efefef"}">${t}</th>`).join("")
                ).join("")
              ).join("")}
            </tr>
          </thead>
          <tbody>
            ${yVals.map(y=>`
            <tr>
              <td style="font-weight:600;font-size:.72rem;color:#333;text-align:right;padding-right:4px;background:#f9f9f9;border-right:2px solid ${color}">${y}</td>
              ${Array.from({length:cols},(_,d)=>
                ["am","pm"].map(ap=>
                  times.map((t,ti)=>`
                  <td style="height:14px;min-width:22px;border:1px solid #ddd;background:${ap==="am"?"#fafff9":"#f9f9f9"}">
                    <input type="text" name="${key}_${ap}_${t}_d${d+1}_y${y}"
                      style="width:100%;border:none;background:transparent;font-size:.65rem;text-align:center;padding:0;height:12px"
                      placeholder="">
                  </td>`).join("")
                ).join("")
              ).join("")}
            </tr>`).join("")}
          </tbody>
        </table>
      </div>

    </div>
  </div>`;
}
