import axios from "axios";

// Point this at your deployed Flask backend (Render, etc.) in production.
export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export async function predictLoan(payload) {
  const { data } = await axios.post(`${API_BASE_URL}/predict`, payload, {
    headers: { "Content-Type": "application/json" },
    timeout: 10000,
  });
  return data;
}

export async function fetchMetadata() {
  const { data } = await axios.get(`${API_BASE_URL}/metadata`, { timeout: 8000 });
  return data;
}
