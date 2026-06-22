import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import * as SQLite from "expo-sqlite";
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
  db: SQLite.SQLiteDatabase | null;
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

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const database = await SQLite.openDatabaseAsync("solarworks.db");
      await database.execAsync(`
        PRAGMA journal_mode = WAL;

        CREATE TABLE IF NOT EXISTS price_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          description TEXT UNIQUE NOT NULL,
          unit TEXT NOT NULL,
          unit_cost REAL NOT NULL,
          category TEXT,
          updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS appliances (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          wattage REAL NOT NULL,
          category TEXT,
          default_hours REAL DEFAULT 8,
          is_custom INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS boq_documents (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          boq_number TEXT UNIQUE NOT NULL,
          created_at INTEGER NOT NULL,
          project_title TEXT,
          location TEXT,
          system_type TEXT,
          system_kw REAL,
          battery_kwh REAL,
          total_php REAL,
          pdf_path TEXT
        );
      `);

      const existing = await database.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM price_items"
      );
      if (!existing || existing.count === 0) {
        const now = Date.now();
        for (const item of SEED_PRICE_ITEMS) {
          await database.runAsync(
            "INSERT OR IGNORE INTO price_items (description, unit, unit_cost, category, updated_at) VALUES (?, ?, ?, ?, ?)",
            [item.description, item.unit, item.unit_cost, item.category, now]
          );
        }
      }

      const existingAppliances = await database.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) as count FROM appliances"
      );
      if (!existingAppliances || existingAppliances.count === 0) {
        for (const a of SEED_APPLIANCES) {
          await database.runAsync(
            "INSERT OR IGNORE INTO appliances (name, wattage, category, default_hours, is_custom) VALUES (?, ?, ?, ?, 0)",
            [a.name, a.wattage, a.category, a.default_hours]
          );
        }
      }

      const defaults: Array<[string, string]> = [
        ["usd_exchange_rate", "56.00"],
        ["admin_pin", "0000"],
        ["boq_daily_counter", "0"],
        ["boq_counter_date", ""],
        ["company_name", "SolarWorks Zambales"],
        ["company_address", "Brgy. Sto. Rosario, Iba, Zambales"],
        ["company_phone", "+63 912 458 2437"],
        ["company_social", "facebook.com/SolarWorksZambales"],
      ];
      for (const [key, val] of defaults) {
        await database.runAsync(
          "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)",
          [key, val]
        );
      }

      if (mounted) {
        setDb(database);
        setIsReady(true);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const getPriceItems = useCallback(async (): Promise<PriceItem[]> => {
    if (!db) return [];
    return db.getAllAsync<PriceItem>("SELECT * FROM price_items ORDER BY category, description");
  }, [db]);

  const getPriceMap = useCallback(async (): Promise<Record<string, number>> => {
    if (!db) return {};
    const items = await db.getAllAsync<PriceItem>("SELECT * FROM price_items");
    const map: Record<string, number> = {};
    for (const item of items) map[item.description] = item.unit_cost;
    return map;
  }, [db]);

  const upsertPriceItem = useCallback(async (item: Omit<PriceItem, "id">) => {
    if (!db) return;
    await db.runAsync(
      `INSERT INTO price_items (description, unit, unit_cost, category, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(description) DO UPDATE SET unit=excluded.unit, unit_cost=excluded.unit_cost, updated_at=excluded.updated_at`,
      [item.description, item.unit, item.unit_cost, item.category, item.updated_at]
    );
  }, [db]);

  const getSetting = useCallback(async (key: string): Promise<string | null> => {
    if (!db) return null;
    const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE key = ?", [key]);
    return row?.value ?? null;
  }, [db]);

  const setSetting = useCallback(async (key: string, value: string) => {
    if (!db) return;
    await db.runAsync(
      "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
      [key, value]
    );
  }, [db]);

  const getAppliances = useCallback(async (): Promise<Appliance[]> => {
    if (!db) return [];
    return db.getAllAsync<Appliance>("SELECT * FROM appliances ORDER BY category, name");
  }, [db]);

  const addCustomAppliance = useCallback(async (
    name: string, wattage: number, category: string, hours: number
  ): Promise<number> => {
    if (!db) return -1;
    const result = await db.runAsync(
      "INSERT INTO appliances (name, wattage, category, default_hours, is_custom) VALUES (?, ?, ?, ?, 1)",
      [name, wattage, category, hours]
    );
    return result.lastInsertRowId;
  }, [db]);

  const getBOQDocuments = useCallback(async (): Promise<BOQDocument[]> => {
    if (!db) return [];
    return db.getAllAsync<BOQDocument>("SELECT * FROM boq_documents ORDER BY created_at DESC");
  }, [db]);

  const saveBOQDocument = useCallback(async (doc: Omit<BOQDocument, "id">): Promise<number> => {
    if (!db) return -1;
    const result = await db.runAsync(
      `INSERT OR REPLACE INTO boq_documents 
       (boq_number, created_at, project_title, location, system_type, system_kw, battery_kwh, total_php, pdf_path)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [doc.boq_number, doc.created_at, doc.project_title, doc.location, doc.system_type,
       doc.system_kw, doc.battery_kwh, doc.total_php, doc.pdf_path]
    );
    return result.lastInsertRowId;
  }, [db]);

  const deleteBOQDocument = useCallback(async (id: number) => {
    if (!db) return;
    await db.runAsync("DELETE FROM boq_documents WHERE id = ?", [id]);
  }, [db]);

  const resetPricesToDefault = useCallback(async () => {
    if (!db) return;
    await db.runAsync("DELETE FROM price_items");
    const now = Date.now();
    for (const item of SEED_PRICE_ITEMS) {
      await db.runAsync(
        "INSERT OR IGNORE INTO price_items (description, unit, unit_cost, category, updated_at) VALUES (?, ?, ?, ?, ?)",
        [item.description, item.unit, item.unit_cost, item.category, now]
      );
    }
  }, [db]);

  return (
    <DatabaseContext.Provider value={{
      db, isReady, getPriceItems, getPriceMap, upsertPriceItem,
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
