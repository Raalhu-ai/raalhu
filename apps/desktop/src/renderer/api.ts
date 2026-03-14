import { createApiClient } from "@raalhu/shared/src/api-core";
import type { SessionStorage } from "@raalhu/shared/src/api-core";

export const API_BASE = "http://127.0.0.1:3000";
const SESSION_KEY = "raalhu_session";

const localStorageAdapter: SessionStorage = {
  get: () => localStorage.getItem(SESSION_KEY),
  set: (id: string) => localStorage.setItem(SESSION_KEY, id),
  clear: () => localStorage.removeItem(SESSION_KEY),
};

const client = createApiClient(API_BASE, localStorageAdapter);

export function authHeaders(): Record<string, string> {
  return client.getAuthHeaders() as Record<string, string>;
}

export const startLogin = client.startLogin;
export const exchangeCode = client.exchangeCode;
export const fetchMe = client.fetchMe;
export const setupCodeAssist = client.setupCodeAssist;
export const fetchQuota = client.fetchQuota;
export const logout = client.logout;
export const clearSession = client.clearSession as () => void;

// Re-export types for existing consumers
export type { ApiUser as User, ApiQuotaModel as QuotaModel, ApiSetupResult as SetupResult } from "@raalhu/shared/src/api-core";
