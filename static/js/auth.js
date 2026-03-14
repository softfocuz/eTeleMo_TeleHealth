/* ═══════════════════════════════════════════════════════
   auth.js — Nurse & admin authentication
   ═══════════════════════════════════════════════════════ */

async function doRegister() {
  const fname    = val("reg-fname");
  const lname    = val("reg-lname");
  const email    = val("reg-email");
  const username = val("reg-username");
  const password = val("reg-password");

  if (!fname || !lname || !email || !username || !password) {
    toast("Please fill in all required fields.", "error");
    return;
  }

  const res = await api("/api/register", "POST", { fname, lname, email, username, password });

  if (res.error) { toast(res.error, "error"); return; }

  toast("Registration submitted! Await admin approval.", "success");
  showPage("login");
}

async function doLogin() {
  const login_id = val("login-id");
  const password = val("login-password");

  if (!login_id || !password) { toast("Enter your email/username and password.", "error"); return; }

  const res = await api("/api/login", "POST", { login_id, password });

  if (res.error) { toast(res.error, "error"); return; }

  currentUser = res;

  if (res.role === "admin") {
    await loadAdminDashboard();
    showPage("admin");
  } else {
    await loadNurseDashboard();
    showPage("dashboard");
  }
}

async function doAdminLogin() {
  const login_id = val("admin-email");
  const password = val("admin-password");

  const res = await api("/api/login", "POST", { login_id, password });

  if (res.error) { toast(res.error, "error"); return; }

  currentUser = res;
  await loadAdminDashboard();
  showPage("admin");
}

async function doLogout() {
  await api("/api/logout", "POST");
  currentUser = null;
  showPage("home");
  updateNav();
}
