import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SEED_PRICE_ITEMS, SEED_APPLIANCES } from "@/constants/seeds";

export interface PriceItem {
  id: number;
  description: string;
  unit: string;
  unit_cost: number;
  category: string;
  updated_at: number;
}

export interface AppSetting {
  key: string;
  value: string;
}

export interface Appliance {
  id: number;
  name: string;
  wattage: number;
  category: string;
  default_hours: number;
  is_custom: number;
}

export interface BOQDocument {
  id: number;
  boq_number: string;
  created_at: number;
  project_title: string;
  location: string;
  system_type: string;
  system_kw: number;
  battery_kwh: number;
  total_php: number;
  pdf_path: string;
}

interface DatabaseContextType {
  db: null;
  isReady: boolean;
  getPriceItems: () => Promise<PriceItem[]>;
  getPriceMap: () => Promise<Record<string, number>>;
  upsertPriceItem: (item: Omit<PriceItem, "id">) => Promise<void>;
  getSetting: (key: string) => Promise<string | null>;
  setSetting: (key: string, value: string) => Promise<void>;
  getAppliances: () => Promise<Appliance[]>;
  addCustomAppliance: (name: string, wattage: number, category: string, hours: number) => Promise<number>;
  getBOQDocuments: () => Promise<BOQDocument[]>;
  saveBOQDocument: (doc: Omit<BOQDocument, "id">) => Promise<number>;
  deleteBOQDocument: (id: number) => Promise<void>;
  resetPricesToDefault: () => Promise<void>;
}

const DatabaseContext = createContext<DatabaseContextType | null>(null);

const PRICES_KEY = "@solarworks/prices";
const SETTINGS_KEY = "@solarworks/settings";
const APPLIANCES_KEY = "@solarworks/appliances";
const BOQS_KEY = "@solarworks/boqs";

const DEFAULTS: Record<string, string> = {
  usd_exchange_rate: "56.00",
  admin_pin: "209920",
  boq_daily_counter: "0",
  boq_counter_date: "",
  company_name: "SolarWorks Zambales",
  company_address: "Brgy. Sto. Rosario, Iba, Zambales",
  company_phone: "+63 912 458 2437",
  company_social: "facebook.com/SolarWorksZambales",
  sheets_csv_url: "https://docs.google.com/spreadsheets/d/1fdiw6Nh0pPUyKpJqQZWfYm_rZpBgwBzeqQIYecXTYsc/export?format=csv",
};

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [prices, setPrices] = useState<Record<string, PriceItem>>({});
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [appliances, setAppliances] = useState<Appliance[]>([]);
  const [boqs, setBOQs] = useState<BOQDocument[]>([]);
  const [nextId, setNextId] = useState(1);

  useEffect(() => {
    (async () => {
      const [rawPrices, rawSettings, rawAppliances, rawBOQs] = await Promise.all([
        AsyncStorage.getItem(PRICES_KEY),
        AsyncStorage.getItem(SETTINGS_KEY),
        AsyncStorage.getItem(APPLIANCES_KEY),
        AsyncStorage.getItem(BOQS_KEY),
      ]);

      const loadedPrices: Record<string, PriceItem> = rawPrices ? JSON.parse(rawPrices) : {};
      const loadedSettings: Record<string, string> = rawSettings ? JSON.parse(rawSettings) : {};
      const loadedAppliances: Appliance[] = rawAppliances ? JSON.parse(rawAppliances) : [];
      const loadedBOQs: BOQDocument[] = rawBOQs ? JSON.parse(rawBOQs) : [];

      if (Object.keys(loadedPrices).length === 0) {
        const now = Date.now();
        SEED_PRICE_ITEMS.forEach((item, i) => {
          loadedPrices[item.description] = { id: i + 1, ...item, updated_at: now };
        });
        await AsyncStorage.setItem(PRICES_KEY, JSON.stringify(loadedPrices));
      }

      if (loadedAppliances.length === 0) {
        SEED_APPLIANCES.forEach((a, i) => {
          loadedAppliances.push({ id: i + 1, ...a, is_custom: 0 });
        });
        await AsyncStorage.setItem(APPLIANCES_KEY, JSON.stringify(loadedAppliances));
      }

      for (const [k, v] of Object.entries(DEFAULTS)) {
        if (!(k in loadedSettings)) loadedSettings[k] = v;
      }
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(loadedSettings));

      setPrices(loadedPrices);
      setSettings(loadedSettings);
      setAppliances(loadedAppliances);
      setBOQs(loadedBOQs);
      setNextId(Math.max(loadedBOQs.length + 1, 1));
      setIsReady(true);
    })();
  }, []);

  const getPriceItems = useCallback(async (): Promise<PriceItem[]> => {
    return Object.values(prices).sort((a, b) => a.description.localeCompare(b.description));
  }, [prices]);

  const getPriceMap = useCallback(async (): Promise<Record<string, number>> => {
    const map: Record<string, number> = {};
    for (const item of Object.values(prices)) map[item.description] = item.unit_cost;
    return map;
  }, [prices]);

  const upsertPriceItem = useCallback(async (item: Omit<PriceItem, "id">) => {
    setPrices((prev) => {
      const existing = prev[item.description];
      const updated = { ...prev, [item.description]: { ...item, id: existing?.id ?? Date.now() } };
      AsyncStorage.setItem(PRICES_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const getSetting = useCallback(async (key: string): Promise<string | null> => {
    return settings[key] ?? DEFAULTS[key] ?? null;
  }, [settings]);

  const setSetting = useCallback(async (key: string, value: string) => {
    setSettings((prev) => {
      const updated = { ...prev, [key]: value };
      AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const getAppliances = useCallback(async (): Promise<Appliance[]> => {
    return [...appliances].sort((a, b) => a.name.localeCompare(b.name));
  }, [appliances]);

  const addCustomAppliance = useCallback(async (
    name: string, wattage: number, category: string, hours: number
  ): Promise<number> => {
    const id = Date.now();
    const newAppliance: Appliance = { id, name, wattage, category, default_hours: hours, is_custom: 1 };
    setAppliances((prev) => {
      const updated = [...prev, newAppliance];
      AsyncStorage.setItem(APPLIANCES_KEY, JSON.stringify(updated));
      return updated;
    });
    return id;
  }, []);

  const getBOQDocuments = useCallback(async (): Promise<BOQDocument[]> => {
    return [...boqs].sort((a, b) => b.created_at - a.created_at);
  }, [boqs]);

  const saveBOQDocument = useCallback(async (doc: Omit<BOQDocument, "id">): Promise<number> => {
    const id = Date.now();
    const newDoc: BOQDocument = { id, ...doc };
    setBOQs((prev) => {
      const updated = [...prev.filter((b) => b.boq_number !== doc.boq_number), newDoc];
      AsyncStorage.setItem(BOQS_KEY, JSON.stringify(updated));
      return updated;
    });
    return id;
  }, []);

  const deleteBOQDocument = useCallback(async (id: number) => {
    setBOQs((prev) => {
      const updated = prev.filter((b) => b.id !== id);
      AsyncStorage.setItem(BOQS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const resetPricesToDefault = useCallback(async () => {
    const now = Date.now();
    const reset: Record<string, PriceItem> = {};
    SEED_PRICE_ITEMS.forEach((item, i) => {
      reset[item.description] = { id: i + 1, ...item, updated_at: now };
    });
    await AsyncStorage.setItem(PRICES_KEY, JSON.stringify(reset));
    setPrices(reset);
  }, []);

  return (
    <DatabaseContext.Provider value={{
      db: null, isReady, getPriceItems, getPriceMap, upsertPriceItem,
      getSetting, setSetting, getAppliances, addCustomAppliance,
      getBOQDocuments, saveBOQDocument, deleteBOQDocument, resetPricesToDefault,
    }}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase() {
  const ctx = useContext(DatabaseContext);
  if (!ctx) throw new Error("useDatabase must be used within DatabaseProvider");
  return ctx;
}
