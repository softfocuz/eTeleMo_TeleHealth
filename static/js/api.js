/* ═══════════════════════════════════════════════════════
   api.js — Centralised fetch wrapper + toast helper
   ═══════════════════════════════════════════════════════ */

/**
 * Thin wrapper around fetch that always sends/receives JSON.
 * Returns the parsed JSON body (or throws on network error).
 */
async function api(path, method = "GET", body = null) {
  const opts = { method, headers: { "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(path, opts);
  return res.json();
}

/* ── Toast notifications ──────────────────────────────── */

/**
 * Show a transient notification.
 * @param {string} message
 * @param {"info"|"success"|"error"} type
 */
function toast(message, type = "info") {
  const container = document.getElementById("toasts");
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  const icon = type === "success" ? "✓" : type === "error" ? "✕" : "ℹ";
  el.innerHTML = `<span>${icon}</span> ${message}`;
  container.appendChild(el);
  setTimeout(() => el.remove(), 4500);
}

/* ── Modal helpers ────────────────────────────────────── */

function openModal(htmlContent) {
  document.getElementById("modal-content").innerHTML = htmlContent;
  document.getElementById("modal").classList.remove("hidden");
}

function closeModal() {
  document.getElementById("modal").classList.add("hidden");
}

/* ── DOM shortcut ─────────────────────────────────────── */
function val(id) {
  return (document.getElementById(id)?.value ?? "").trim();
}
