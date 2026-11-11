// Correo transaccional con Resend (https://resend.com). Sin clave, el correo se
// escribe en la consola del servidor: útil para probar en local.

export async function sendMail(cfg, { to, subject, text, html }, fetchImpl = fetch) {
  if (!cfg.mail.resendKey) {
    console.log(`[correo] Para: ${to} · ${subject}\n${text || ''}`);
    return { logged: true };
  }
  const res = await fetchImpl(`${cfg.mail.apiBase}/emails`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.mail.resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: cfg.mail.from, to: [to], subject, text, html: html || undefined }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error(`[correo] Resend respondió ${res.status}: ${body.slice(0, 200)}`);
    return { sent: false };
  }
  return { sent: true };
}
