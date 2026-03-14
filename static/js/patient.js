/* ═══════════════════════════════════════════════════════
   patient.js — Patient portal: register, login, appointments
   ═══════════════════════════════════════════════════════ */

let _patientUser = null;

/* ── Auth ─────────────────────────────────────────────── */
async function patientRegister() {
  const fields = {
    fname:     val("preg-fname"),    lname:    val("preg-lname"),
    mname:     val("preg-mname"),    age:      val("preg-age"),
    sex:       val("preg-sex"),      birthday: val("preg-birthday"),
    address:   val("preg-address"),  phone:    val("preg-phone"),
    email:     val("preg-email"),    messenger:val("preg-messenger"),
    password:  val("preg-password"), confirm:  val("preg-confirm"),
    appt_date: val("preg-appt-date"),appt_time:val("preg-appt-time"),
    concern:   val("preg-concern"),
  };

  // Validate all required
  const reqFields = ["fname","lname","mname","age","sex","birthday",
                     "address","phone","email","messenger","password","confirm",
                     "appt_date","appt_time","concern"];
  for (const f of reqFields) {
    if (!fields[f]) { toast(`Please fill in all required fields.`, "error"); return; }
  }
  if (fields.password !== fields.confirm) {
    toast("Passwords do not match.", "error"); return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
    toast("Please enter a valid email address.", "error"); return;
  }
  if (isNaN(fields.age) || +fields.age < 1 || +fields.age > 120) {
    toast("Please enter a valid age.", "error"); return;
  }

  const res = await api("/api/patient/register", "POST", fields);
  if (res.error) { toast(res.error, "error"); return; }

  // Auto-book appointment after register
  await api("/api/patient/appointments", "POST", {
    appt_date: fields.appt_date,
    appt_time: fields.appt_time,
    concern:   fields.concern,
  });

  _patientUser = { name: res.name };
  toast(`Welcome, ${res.name}! Your appointment request has been submitted.`, "success");
  await loadPatientPortal();
  showPage("patient-portal");
}

async function patientLogin() {
  const email    = val("plogin-email");
  const password = val("plogin-password");
  if (!email || !password) { toast("Please enter email and password.", "error"); return; }

  const res = await api("/api/patient/login", "POST", { email, password });
  if (res.error) { toast(res.error, "error"); return; }

  _patientUser = { name: res.name };
  toast(`Welcome back, ${res.name}!`, "success");
  await loadPatientPortal();
  showPage("patient-portal");
}

async function patientLogout() {
  await api("/api/patient/logout", "POST");
  _patientUser = null;
  showPage("home");
  updateNav();
}

/* ── Portal ───────────────────────────────────────────── */
async function loadPatientPortal() {
  if (!_patientUser) return;

  document.getElementById("portal-name").textContent = _patientUser.name;

  const me   = await api("/api/patient/me");
  const appts = await api("/api/patient/appointments");

  // Fill profile display
  const fields = ["fname","lname","mname","age","sex","birthday","address","phone","email","messenger"];
  fields.forEach(f => {
    const el = document.getElementById("prof-" + f);
    if (el) el.textContent = me[f] || "—";
  });

  renderPatientAppointments(appts);
}

function renderPatientAppointments(appts) {
  const tbody = document.getElementById("patient-appt-tbody");
  if (!tbody) return;

  if (!appts.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:2rem">No appointments yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = [...appts].reverse().map(a => `
    <tr>
      <td><strong>${a.appt_date}</strong></td>
      <td>${a.appt_time}</td>
      <td style="max-width:200px;font-size:.83rem">${a.concern}</td>
      <td>${a.submitted_at}</td>
      <td><span class="appt-badge appt-${a.status.toLowerCase()}">${a.status}</span>
          ${a.notes ? `<div style="font-size:.72rem;color:var(--muted);margin-top:3px">Note: ${a.notes}</div>` : ""}
      </td>
      <td>
        ${a.status === "Pending" ? `
          <button class="action-btn btn-view" onclick="openEditAppt(${a.id},'${a.appt_date}','${a.appt_time}',\`${a.concern.replace(/`/g,"'")}\`)">✏️ Edit</button>
          <button class="action-btn btn-reject" onclick="cancelAppt(${a.id})" style="margin-left:4px">✕ Cancel</button>
        ` : `<span style="color:var(--muted);font-size:.78rem">${a.status}</span>`}
      </td>
    </tr>`).join("");
}

function openBookAppt() {
  openModal(`
    <h2 class="modal-title">📅 Book New Appointment</h2>
    <div class="form-group"><label class="form-label">Appointment Date *</label>
      <input class="form-input" type="date" id="new-appt-date" min="${new Date().toISOString().split('T')[0]}"></div>
    <div class="form-group"><label class="form-label">Appointment Time *</label>
      <input class="form-input" type="time" id="new-appt-time"></div>
    <div class="form-group"><label class="form-label">Concern / Message *</label>
      <textarea class="form-textarea" id="new-appt-concern" placeholder="Describe your concern..." style="min-height:100px"></textarea></div>
    <div class="form-group"><label class="chk-label"><input type="checkbox" id="new-appt-urgent"> 🔴 Mark as urgent</label></div>
    <div class="submit-row">
      <button class="btn-cancel" onclick="closeModal()">Cancel</button>
      <button class="btn-primary" onclick="submitNewAppt()">Submit Request</button>
    </div>`);
}

async function submitNewAppt() {
  const appt_date = val("new-appt-date");
  const appt_time = val("new-appt-time");
  const concern   = val("new-appt-concern");
  const urgent    = document.getElementById("new-appt-urgent")?.checked || false;

  if (!appt_date || !appt_time || !concern) {
    toast("Please fill in all fields.", "error"); return;
  }
  const res = await api("/api/patient/appointments", "POST", {appt_date, appt_time, concern, urgent});
  if (res.error) { toast(res.error, "error"); return; }
  toast("Appointment request submitted!", "success");
  closeModal();
  const appts = await api("/api/patient/appointments");
  renderPatientAppointments(appts);
}

function openEditAppt(id, date, time, concern) {
  openModal(`
    <h2 class="modal-title">✏️ Edit Appointment</h2>
    <div class="form-group"><label class="form-label">Appointment Date *</label>
      <input class="form-input" type="date" id="edit-appt-date" value="${date}" min="${new Date().toISOString().split('T')[0]}"></div>
    <div class="form-group"><label class="form-label">Appointment Time *</label>
      <input class="form-input" type="time" id="edit-appt-time" value="${time}"></div>
    <div class="form-group"><label class="form-label">Concern / Message *</label>
      <textarea class="form-textarea" id="edit-appt-concern" style="min-height:100px">${concern}</textarea></div>
    <div class="submit-row">
      <button class="btn-cancel" onclick="closeModal()">Cancel</button>
      <button class="btn-primary" onclick="saveEditAppt(${id})">Save Changes</button>
    </div>`);
}

async function saveEditAppt(id) {
  const appt_date = val("edit-appt-date");
  const appt_time = val("edit-appt-time");
  const concern   = val("edit-appt-concern");
  if (!appt_date || !appt_time || !concern) {
    toast("Please fill in all fields.", "error"); return;
  }
  const res = await api(`/api/patient/appointments/${id}`, "PUT", {appt_date, appt_time, concern});
  if (res.error) { toast(res.error, "error"); return; }
  toast("Appointment updated!", "success");
  closeModal();
  const appts = await api("/api/patient/appointments");
  renderPatientAppointments(appts);
}

async function cancelAppt(id) {
  if (!confirm("Cancel this appointment request?")) return;
  const res = await api(`/api/patient/appointments/${id}/cancel`, "POST");
  if (res.error) { toast(res.error, "error"); return; }
  toast("Appointment cancelled.", "info");
  const appts = await api("/api/patient/appointments");
  renderPatientAppointments(appts);
}
