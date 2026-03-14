/* ═══════════════════════════════════════════════════════
   admin.js — Admin dashboard
   ═══════════════════════════════════════════════════════ */

let _allSubmissions  = [];
let _allAppointments = [];

async function loadAdminDashboard() {
  await renderNurses();
  await renderSubmissions();
  await renderAppointments();
}

/* ── Tab switching ──────────────────────────────────── */
function adminTab(name) {
  document.querySelectorAll(".atab").forEach(t => t.classList.remove("active"));
  document.querySelector(`[data-tab="${name}"]`).classList.add("active");
  document.querySelectorAll(".admin-panel").forEach(p => p.classList.remove("active"));
  document.getElementById("panel-" + name).classList.add("active");
  if (name === "registrations")  renderNurses();
  if (name === "submissions")    renderSubmissions();
  if (name === "appointments")   renderAppointments();
  if (name === "export")         {}
}

/* ── Nurses ─────────────────────────────────────────── */
async function renderNurses() {
  const nurses = await api("/admin/nurses");
  const tbody  = document.getElementById("reg-tbody");
  if (!nurses.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">👩‍⚕️</div>No registrations yet.</div></td></tr>`;
    return;
  }
  tbody.innerHTML = nurses.map(n => `
    <tr>
      <td><strong>${n.name}</strong></td>
      <td>${n.email}</td>
      <td>${n.username || "—"}</td>
      <td>${n.registered_at}</td>
      <td><span class="badge badge-${n.status}">${cap(n.status)}</span></td>
      <td>${n.status === "pending"
        ? `<button class="action-btn btn-approve" onclick="approveNurse(${n.id})">✓ Approve</button>
           <button class="action-btn btn-reject"  onclick="rejectNurse(${n.id})">✕ Reject</button>`
        : `<span style="color:var(--muted);font-size:.8rem">${n.status === "approved" ? "✓ Approved" : "✕ Rejected"}</span>`
      }</td>
    </tr>`).join("");
}

async function approveNurse(id) {
  await api(`/admin/nurses/${id}/approve`, "POST");
  toast("Nurse approved!", "success");
  renderNurses();
}

async function rejectNurse(id) {
  await api(`/admin/nurses/${id}/reject`, "POST");
  toast("Registration rejected.", "info");
  renderNurses();
}

/* ── Submissions ────────────────────────────────────── */
async function renderSubmissions() {
  _allSubmissions = await api("/admin/submissions");
  const tbody = document.getElementById("sub-tbody");
  if (!_allSubmissions.length) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">📋</div>No submissions yet.</div></td></tr>`;
    return;
  }
  tbody.innerHTML = [..._allSubmissions].reverse().map(s => `
    <tr>
      <td><span class="badge badge-form">${s.form_name}</span></td>
      <td><strong>${s.patient_name}</strong></td>
      <td>${s.nurse_name}</td>
      <td>${s.submitted_at}</td>
      <td><button class="action-btn btn-view" onclick="viewSubmission(${s.id})">View Details</button></td>
    </tr>`).join("");
}

function viewSubmission(id) {
  const sub = _allSubmissions.find(s => s.id === id);
  if (!sub) return;
  const rows = Object.entries(sub.data)
    .filter(([,v]) => v && v !== "No")
    .map(([k,v]) => `<div class="detail-row">
      <div class="detail-label">${k.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())}</div>
      <div class="detail-val">${v}</div>
    </div>`).join("");
  openModal(`<h2 class="modal-title">${sub.form_name}</h2>
    <p style="color:var(--muted);font-size:.84rem;margin-bottom:1rem">
      Patient: <strong style="color:var(--navy)">${sub.patient_name}</strong> &nbsp;|&nbsp;
      By: ${sub.nurse_name} &nbsp;|&nbsp; ${sub.submitted_at}</p>
    <div>${rows || '<p style="color:var(--muted)">No data recorded.</p>'}</div>`);
}

/* ── Appointments ───────────────────────────────────── */
let _apptFilter = "all";

async function renderAppointments() {
  _allAppointments = await api("/api/admin/appointments");
  _renderApptTable();
}

function filterAppts(status) {
  _apptFilter = status;
  document.querySelectorAll(".appt-filter-btn").forEach(b => b.classList.remove("active"));
  document.querySelector(`[data-filter="${status}"]`)?.classList.add("active");
  _renderApptTable();
}

function _renderApptTable() {
  const tbody = document.getElementById("appt-tbody");
  if (!tbody) return;
  let data = _allAppointments;
  if (_apptFilter !== "all") data = data.filter(a => a.status === _apptFilter);

  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">📅</div>No appointments found.</div></td></tr>`;
    return;
  }
  tbody.innerHTML = data.map(a => `
    <tr class="${a.urgent ? 'appt-urgent-row' : ''}">
      <td>
        ${a.urgent ? '<span style="color:#e74c3c;font-weight:700;margin-right:4px">🔴</span>' : ""}
        <strong>${a.patient_name}</strong>
      </td>
      <td><a href="mailto:${a.patient_email}" style="color:var(--teal)">${a.patient_email}</a></td>
      <td><a href="tel:${a.patient_phone}" style="color:var(--teal)">${a.patient_phone || "—"}</a></td>
      <td>${a.patient_messenger || "—"}</td>
      <td><strong>${a.appt_date}</strong> ${a.appt_time}</td>
      <td style="max-width:180px;font-size:.82rem">${a.concern}</td>
      <td><span class="appt-badge appt-${a.status.toLowerCase()}">${a.status}</span></td>
      <td>
        <select class="appt-status-sel" onchange="updateApptStatus(${a.id}, this.value)">
          <option value="">Update…</option>
          <option value="Pending"   ${a.status==="Pending"   ?"selected":""}>Pending</option>
          <option value="Confirmed" ${a.status==="Confirmed" ?"selected":""}>Confirmed</option>
          <option value="Completed" ${a.status==="Completed" ?"selected":""}>Completed</option>
          <option value="Cancelled" ${a.status==="Cancelled" ?"selected":""}>Cancelled</option>
        </select>
        <button class="action-btn btn-view" style="margin-top:4px" onclick="openApptNote(${a.id})">📝 Note</button>
      </td>
    </tr>`).join("");
}

async function updateApptStatus(id, status) {
  if (!status) return;
  const res = await api(`/api/admin/appointments/${id}/status`, "POST", {status});
  if (res.error) { toast(res.error, "error"); return; }
  toast(`Status updated to ${status}`, "success");
  await renderAppointments();
}

function openApptNote(id) {
  const appt = _allAppointments.find(a => a.id === id);
  if (!appt) return;
  openModal(`
    <h2 class="modal-title">📝 Add Note — ${appt.patient_name}</h2>
    <p style="color:var(--muted);font-size:.83rem;margin-bottom:.8rem">
      Date: ${appt.appt_date} ${appt.appt_time} | Concern: ${appt.concern}</p>
    <div class="form-group"><label class="form-label">Note / Communication Log</label>
      <textarea class="form-textarea" id="appt-note-text" style="min-height:90px"
        placeholder="e.g. Called patient, confirmed appointment...">${appt.notes||""}</textarea></div>
    <div class="form-group"><label class="form-label">Update Status</label>
      <select class="form-select" id="appt-note-status">
        <option value="">Keep current (${appt.status})</option>
        <option value="Pending">Pending</option>
        <option value="Confirmed">Confirmed</option>
        <option value="Completed">Completed</option>
        <option value="Cancelled">Cancelled</option>
      </select></div>
    <div class="submit-row">
      <button class="btn-cancel" onclick="closeModal()">Cancel</button>
      <button class="btn-primary" onclick="saveApptNote(${id})">Save</button>
    </div>`);
}

async function saveApptNote(id) {
  const notes  = document.getElementById("appt-note-text")?.value.trim();
  const status = document.getElementById("appt-note-status")?.value;
  const payload = {notes};
  if (status) payload.status = status;
  const res = await api(`/api/admin/appointments/${id}/status`, "POST", payload);
  if (res.error) { toast(res.error, "error"); return; }
  toast("Note saved!", "success");
  closeModal();
  await renderAppointments();
}

function searchAppts() {
  const q = val("appt-search").toLowerCase();
  const rows = document.querySelectorAll("#appt-tbody tr");
  rows.forEach(r => {
    r.style.display = r.textContent.toLowerCase().includes(q) ? "" : "none";
  });
}

/* ── Export ─────────────────────────────────────────── */
function downloadExcel() { window.location.href = "/admin/export/excel"; }

function printRecords() {
  const w = window.open("", "_blank");
  const byForm = {};
  _allSubmissions.forEach(s => {
    if (!byForm[s.form_name]) byForm[s.form_name] = [];
    byForm[s.form_name].push(s);
  });
  let tables = Object.entries(byForm).map(([name, rows]) => `
    <h2>${name}</h2>
    <table><tr><th>Patient</th><th>Nurse</th><th>Date</th></tr>
      ${rows.map(r=>`<tr><td>${r.patient_name}</td><td>${r.nurse_name}</td><td>${r.submitted_at}</td></tr>`).join("")}
    </table>`).join("") || "<p>No records yet.</p>";
  w.document.write(`<!DOCTYPE html><html><head><title>eTELEmo Records</title>
    <style>body{font-family:Arial;padding:2rem}h2{color:#0D7377}table{width:100%;border-collapse:collapse;margin-bottom:1.5rem}
    th{background:#0D7377;color:#fff;padding:8px}td{padding:8px;border-bottom:1px solid #ddd}@media print{button{display:none}}</style>
    </head><body><h1>eTELEmo — Patient Records</h1>
    <button onclick="window.print()" style="background:#0D7377;color:#fff;padding:8px 18px;border:none;border-radius:6px;cursor:pointer;margin-bottom:1rem">🖨 Print</button>
    ${tables}</body></html>`);
  w.document.close();
}

/* ── Helpers ─────────────────────────────────────────── */
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
