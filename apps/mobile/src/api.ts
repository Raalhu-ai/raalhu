import * as SecureStore from "expo-secure-store";
import { createApiClient } from "@raalhu/shared/src/api-core";
import type { SessionStorage } from "@raalhu/shared/src/api-core";

// TODO: use environment variable or config for production
export const API_BASE = "http://localhost:3000";
const SESSION_KEY = "raalhu_session";

const expoSecureStoreAdapter: SessionStorage = {
  get: () => SecureStore.getItemAsync(SESSION_KEY),
  set: (id: string) => SecureStore.setItemAsync(SESSION_KEY, id),
  clear: () => SecureStore.deleteItemAsync(SESSION_KEY),
};

const client = createApiClient(API_BASE, expoSecureStoreAdapter);

/** Public alias for modules that need auth headers (agent, chat-history) */
export const getAuthHeaders = client.getAuthHeaders as () => Promise<Record<string, string>>;

export const startLogin = client.startLogin;
export const exchangeCode = client.exchangeCode;
export const fetchMe = client.fetchMe;
export const setupCodeAssist = client.setupCodeAssist;
export const fetchQuota = client.fetchQuota;
export const logout = client.logout;
export const clearSession = client.clearSession as () => Promise<void>;

// Re-export types for existing consumers
export type { ApiUser as User, ApiQuotaModel as QuotaModel, ApiSetupResult as SetupResult } from "@raalhu/shared/src/api-core";
