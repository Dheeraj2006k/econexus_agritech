const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const AGENT_API = process.env.NEXT_PUBLIC_AGENT_URL || 'http://localhost:8000/api/agents';

export const getAuth = () => {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('en_token');
  const user = localStorage.getItem('en_user');
  if (!token || !user) return null;
  return { token, user: JSON.parse(user) };
};

export const saveAuth = (token: string, user: object) => {
  localStorage.setItem('en_token', token);
  localStorage.setItem('en_user', JSON.stringify(user));
};

export const logout = () => {
  localStorage.removeItem('en_token');
  localStorage.removeItem('en_user');
  window.location.href = '/login';
};

export const apiFetch = async (path: string, options?: RequestInit) => {
  const auth = getAuth();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(auth ? { Authorization: `Bearer ${auth.token}` } : {}),
  };
  const res = await fetch(`${API}${path}`, { ...options, headers });
  return res.json();
};

export const agentFetch = async (path: string, options?: RequestInit) => {
  const res = await fetch(`${AGENT_API}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  return res.json();
};

export { API, AGENT_API };
