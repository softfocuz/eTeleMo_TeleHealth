/* ═══════════════════════════════════════════════════════
   router.js — SPA routing
   ═══════════════════════════════════════════════════════ */

let currentUser = null;

function showPage(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  const el = document.getElementById("page-" + id);
  if (el) el.classList.add("active");
  window.scrollTo(0, 0);
  updateNav();
}

function scrollToAnchor(selector) {
  const goTo = () => document.querySelector(selector)?.scrollIntoView({ behavior: "smooth" });
  if (document.getElementById("page-home").classList.contains("active")) {
    goTo();
  } else {
    showPage("home");
    setTimeout(goTo, 400);
  }
}

function updateNav() {
  const guestNav   = document.getElementById("guest-nav");
  const userNav    = document.getElementById("user-nav");
  const patientNav = document.getElementById("patient-nav");

  // reset all
  guestNav.style.display   = "none";
  userNav.style.display    = "none";
  if (patientNav) patientNav.style.display = "none";

  if (!currentUser && !_patientUser) {
    guestNav.style.display = "flex";
    return;
  }

  if (currentUser?.role === "admin") return; // admin has its own header

  if (currentUser?.role === "nurse") {
    userNav.style.display = "flex";
    document.getElementById("nav-avatar").textContent   = currentUser.name[0].toUpperCase();
    document.getElementById("nav-username").textContent = currentUser.name;
    return;
  }

  if (_patientUser) {
    if (patientNav) {
      patientNav.style.display = "flex";
      const el = document.getElementById("nav-patient-name");
      if (el) el.textContent = _patientUser.name;
    }
    return;
  }

  guestNav.style.display = "flex";
}
