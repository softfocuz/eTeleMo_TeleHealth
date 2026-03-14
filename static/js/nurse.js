/* ═══════════════════════════════════════════════════════
   nurse.js — Nurse dashboard
   ═══════════════════════════════════════════════════════ */

/* Forms definition — one entry per Excel sheet */
const FORMS_DEF = [
  { id:"admission",     icon:"🏥", name:"Admission and Discharge Record",    desc:" " },
  { id:"vitals",        icon:"📊", name:"Vital Signs Monitoring Sheet",       desc:" " },
  { id:"history",       icon:"📋", name:"History Record",                     desc:" " },
  { id:"mio",           icon:"💧", name:"Intake & Output (MIO)",              desc:" " },
  { id:"medication",    icon:"💊", name:"Medication Sheet",                   desc:" " },
  { id:"ivfluid",       icon:"🧪", name:"IV Fluid Chart",                     desc:" " },
  { id:"kardex",        icon:"🗂️", name:"Kardex",                             desc:" " },
  { id:"doctors_order", icon:"🩺", name:"Doctor's Order / Progress Notes",    desc:" " },
  { id:"nurses_notes",  icon:"✍️",  name:"Nurses Progress Notes",              desc:" " },
  { id:"vs_graph",      icon:"📈", name:"VS Graph Sheet",                      desc:" " },
];

async function loadNurseDashboard() {
  if (!currentUser) return;
  document.getElementById("dash-name").textContent = currentUser.name || "Nurse";
  document.getElementById("dash-date").textContent = new Date().toLocaleDateString("en-PH",{weekday:"long",year:"numeric",month:"long",day:"numeric"});

  renderFormGrid();

  try {
    const subs = await api("/api/my-submissions");
    const today = new Date().toISOString().split("T")[0];
    const todayCount = subs.filter(s => s.submitted_at?.startsWith(today)).length;
    document.getElementById("stat-today").textContent = todayCount;
    document.getElementById("stat-total").textContent = subs.length;
    renderRecentSubmissions(subs);
  } catch(e) {}
}

function renderFormGrid() {
  const grid = document.getElementById("forms-grid");
  if (!grid) return;
  grid.innerHTML = FORMS_DEF.map((f, i) => `
    <div class="form-tile" onclick="openForm('${f.id}')">
      <div class="tile-num">${String(i+1).padStart(2,"0")}</div>
      <div class="tile-icon">${f.icon || ""}</div>
      <div class="tile-name">${f.name}</div>
      <div class="tile-desc">${f.desc}</div>
      <div class="tile-arrow">→</div>
    </div>
  `).join("");
}

function renderRecentSubmissions(subs) {
  const panel = document.getElementById("recent-submissions");
  const tbody = document.getElementById("recent-tbody");
  if (!panel || !tbody) return;
  if (!subs.length) { panel.style.display = "none"; return; }
  panel.style.display = "";
  tbody.innerHTML = subs.slice(-10).reverse().map(s => `
    <tr>
      <td>${s.form_name}</td>
      <td>${s.data?.patient_name || s.data?.patient_last || "—"}</td>
      <td>${s.submitted_at || "—"}</td>
    </tr>
  `).join("");
}
