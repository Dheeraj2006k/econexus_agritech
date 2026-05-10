export const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
export const AGENT_API = process.env.NEXT_PUBLIC_AGENT_URL || 'http://localhost:8000/api/agents';

export const saveAuth = (token, user) => {
  localStorage.setItem('en_token', token);
  localStorage.setItem('en_user', JSON.stringify(user));
};

export const getAuth = () => {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('en_token');
  const user = localStorage.getItem('en_user');
  if (!token || !user) return null;
  return { token, user: JSON.parse(user) };
};

export const logout = () => {
  localStorage.removeItem('en_token');
  localStorage.removeItem('en_user');
  window.location.href = '/login';
};

export const requireAuth = (requiredRole) => {
  const auth = getAuth();
  if (!auth) {
    window.location.href = '/login';
    return null;
  }
  if (requiredRole && auth.user.role !== requiredRole) {
    window.location.href = '/login';
    return null;
  }
  return auth;
};

export const getTier = (score) => {
  if (score >= 80) return 'Platinum';
  if (score >= 60) return 'Gold';
  if (score >= 40) return 'Silver';
  return 'Bronze';
};

export const getTierColor = (tier) => {
  const colors = {
    Platinum: '#00d4ff',
    Gold: '#ffaa00',
    Silver: '#aaaaaa',
    Bronze: '#cd7f32'
  };
  return colors[tier] || '#aaaaaa';
};
