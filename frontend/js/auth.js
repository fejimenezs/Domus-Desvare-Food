import { request } from './api.js';
export async function registerUser(email, password, name, phone){
  const res = await request('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, name, phone }) });
  localStorage.setItem('bb_token', res.token);
  localStorage.setItem('bb_user', JSON.stringify(res.user));
  return res.user;
}
export async function loginUser(email, password){
  const res = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  localStorage.setItem('bb_token', res.token);
  localStorage.setItem('bb_user', JSON.stringify(res.user));
  return res.user;
}
export function logoutUser(){ localStorage.removeItem('bb_token'); localStorage.removeItem('bb_user'); }
export function getActiveUser(){ try{ const u = localStorage.getItem('bb_user'); return u ? JSON.parse(u): null; }catch{ return null; } }
