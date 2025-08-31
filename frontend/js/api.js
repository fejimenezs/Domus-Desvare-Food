import { API_URL } from './config.js';

// ===================================================
// Request helper
// ===================================================
export async function request(path, options = {}) {
  try {
    const token = localStorage.getItem('bb_token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };

    const res = await fetch(API_URL + path, { ...options, headers });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText || `HTTP error ${res.status}`);
    }

    if (res.status === 204) return null; // sin contenido
    return await res.json();
  } catch (err) {
    console.error('❌ API request error:', err.message);
    throw err;
  }
}
