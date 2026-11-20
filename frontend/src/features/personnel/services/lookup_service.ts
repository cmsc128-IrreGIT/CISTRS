import type { LookupItem } from "../types/personnel_types";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

async function fetchJson<T>(url: string): Promise<T> {
  const token = sessionStorage.getItem("cistrs.session");
  const response = await fetch(url, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}`);
  }
  return response.json();
}

export async function fetchLicenseTypes(): Promise<LookupItem[]> {
  return fetchJson<LookupItem[]>(`${API_BASE}/personnel/lookup/license-types`);
}

export async function fetchRenewalStatuses(): Promise<LookupItem[]> {
  return fetchJson<LookupItem[]>(`${API_BASE}/personnel/lookup/renewal-statuses`);
}

export async function fetchTrainingTypes(): Promise<LookupItem[]> {
  return fetchJson<LookupItem[]>(`${API_BASE}/personnel/lookup/training-types`);
}

export async function fetchTrainingProviders(): Promise<LookupItem[]> {
  return fetchJson<LookupItem[]>(`${API_BASE}/personnel/lookup/training-providers`);
}