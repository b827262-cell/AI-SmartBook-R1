import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { DEFAULT_APPEARANCE, type AppearanceSettings } from "@ai-smartbook/schema";
import { studentClient } from "./studentClient";

const AppearanceContext = createContext<AppearanceSettings>(DEFAULT_APPEARANCE);

/**
 * Fetches admin-configured appearance settings once and shares them with the
 * whole student app. Falls back to defaults on any failure so the homepage
 * never blanks out.
 */
export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppearanceSettings>(DEFAULT_APPEARANCE);

  useEffect(() => {
    let active = true;
    studentClient
      .getAppearanceSettings()
      .then((r) => active && setSettings(r.settings))
      .catch(() => active && setSettings(DEFAULT_APPEARANCE));
    return () => {
      active = false;
    };
  }, []);

  return <AppearanceContext.Provider value={settings}>{children}</AppearanceContext.Provider>;
}

export function useAppearance(): AppearanceSettings {
  return useContext(AppearanceContext);
}
