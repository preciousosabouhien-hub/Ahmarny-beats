/** Central API helpers: attach the customer's JWT and normalize API errors here. */
export const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
export const CART_KEY = 'ahmarny_cart_v1';
export const token = () => localStorage.getItem('ahmarny_token');

export async function api(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const jwt = token();
  if (jwt) headers.set('Authorization', `Bearer ${jwt}`);
  const response = await fetch(`${API}${path}`, { ...options, headers });
  let data: any = {};
  try { data = await response.json(); } catch { /* Some successful endpoints have no JSON body. */ }
  if (!response.ok) throw new Error(data.message || 'Request failed');
  return data;
}
