// A tiny self-contained branded HTML page for public token endpoints (newsletter
// confirm / unsubscribe) — these are opened directly from an email, so they render
// their own page rather than relying on the app shell.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export function statusResponse(title: string, message: string, ok: boolean): Response {
  const color = ok ? "#1e6b3a" : "#b42318"
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${escapeHtml(
    title,
  )}</title></head><body style="margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f4f6f9;color:#1a1a2e;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px"><div style="max-width:440px;width:100%;background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:36px;text-align:center;box-shadow:0 1px 2px rgba(0,0,0,.04)"><div style="width:46px;height:46px;border-radius:12px;background:${color}1a;color:${color};display:flex;align-items:center;justify-content:center;margin:0 auto 18px;font-size:24px;font-weight:700">${
    ok ? "&#10003;" : "!"
  }</div><h1 style="font-size:20px;margin:0 0 8px">${escapeHtml(
    title,
  )}</h1><p style="margin:0;color:#555;line-height:1.55">${escapeHtml(
    message,
  )}</p></div></body></html>`
  return new Response(html, {
    status: ok ? 200 : 400,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  })
}
