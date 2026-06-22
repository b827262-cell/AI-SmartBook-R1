import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { DEFAULT_APPEARANCE, type AppearanceSettings } from "@ai-smartbook/schema";
import { adminApi } from "./api";

interface AppearanceContextValue {
  settings: AppearanceSettings;
  refresh: () => Promise<void>;
}

const AppearanceContext = createContext<AppearanceContextValue>({
  settings: DEFAULT_APPEARANCE,
  refresh: async () => {}
});

/** Loads appearance settings once and shares them across the admin shell. */
export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppearanceSettings>(DEFAULT_APPEARANCE);

  const refresh = useCallback(async () => {
    try {
      const { settings: s } = await adminApi.getAppearanceSettings();
      setSettings(s);
    } catch {
      // Keep defaults on failure — never blank the UI.
      setSettings(DEFAULT_APPEARANCE);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <AppearanceContext.Provider value={{ settings, refresh }}>{children}</AppearanceContext.Provider>
  );
}

export function useAppearance(): AppearanceContextValue {
  return useContext(AppearanceContext);
}
