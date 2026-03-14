import * as SecureStore from "expo-secure-store";

export interface Settings {
  theme: "light" | "dark" | "system";
  fontSize: "small" | "medium" | "large";
  customInstructions: string;
}

const SETTINGS_KEY = "raalhu_settings";

const DEFAULT_SETTINGS: Settings = {
  theme: "dark",
  fontSize: "medium",
  customInstructions: "",
};

export function loadSettingsSync(): Settings {
  // Fallback for synchronous usage — returns defaults
  return { ...DEFAULT_SETTINGS };
}

export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await SecureStore.getItemAsync(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  await SecureStore.setItemAsync(SETTINGS_KEY, JSON.stringify(settings));
}

export function getFontSize(size: Settings["fontSize"]): number {
  switch (size) {
    case "small": return 16;
    case "medium": return 18.5;
    case "large": return 22;
  }
}
