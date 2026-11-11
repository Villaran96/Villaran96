// Cliente del servidor. Si no hay servidor (vista previa o hosting estático), la web
// funciona en modo local con los datos en el navegador.

async function request(method, path, body) {
  const res = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* sin cuerpo JSON */ }
  if (!res.ok) {
    const err = new Error(data?.error || `El servidor respondió ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

/** Devuelve la configuración pública si hay servidor de Contrapeso, o null. */
export async function detect() {
  try {
    const res = await fetch('/api/config', { credentials: 'same-origin', headers: { Accept: 'application/json' } });
    if (!res.ok || !String(res.headers.get('content-type') || '').includes('json')) return null;
    const data = await res.json();
    return data && data.backend ? data : null;
  } catch {
    return null;
  }
}

export const config = () => request('GET', '/api/config');
export const register = (b) => request('POST', '/api/auth/register', b);
export const login = (b) => request('POST', '/api/auth/login', b);
export const logout = () => request('POST', '/api/auth/logout', {});
export const me = () => request('GET', '/api/auth/me');
export const forgot = (email) => request('POST', '/api/auth/forgot', { email });
export const reset = (token, password) => request('POST', '/api/auth/reset', { token, password });
export const updateMe = (b) => request('PATCH', '/api/me', b);
export const changePassword = (current, next) => request('POST', '/api/me/password', { current, next });
export const deleteMe = (password) => request('DELETE', '/api/me', { password });
export const getData = () => request('GET', '/api/me/data');
export const putData = (b) => request('PUT', '/api/me/data', b);
export const content = () => request('GET', '/api/content');
export const checkout = (plan, interval = 'month') => request('POST', '/api/billing/checkout', { plan, interval });
export const cancelSubscription = () => request('POST', '/api/billing/cancel', {});
export const resumeSubscription = () => request('POST', '/api/billing/resume', {});
export const portal = () => request('POST', '/api/billing/portal', {});
export const metodo = () => request('GET', '/api/metodo');
export const apply = (b) => request('POST', '/api/metodo/apply', b);
export const sign = (b) => request('POST', '/api/metodo/sign', b);
export const contract = (id) => request('GET', `/api/contracts/${encodeURIComponent(id)}`);

export const admin = {
  overview: () => request('GET', '/api/admin/overview'),
  putContent: (kind, items) => request('PUT', `/api/admin/content/${kind}`, { items }),
  putSettings: (b) => request('PUT', '/api/admin/settings', b),
  patchUser: (id, b) => request('PATCH', `/api/admin/users/${encodeURIComponent(id)}`, b),
  patchApplication: (id, status) => request('PATCH', `/api/admin/applications/${encodeURIComponent(id)}`, { status }),
  stripeSetup: () => request('POST', '/api/admin/stripe/setup', {}),
  createCoupon: (b) => request('POST', '/api/admin/stripe/coupon', b),
};
