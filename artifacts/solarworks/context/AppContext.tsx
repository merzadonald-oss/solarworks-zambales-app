import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import * as Network from "expo-network";
import { parseCSV } from "@/utils/csvParser";
import { useDatabase } from "./DatabaseContext";

export type Currency = "PHP" | "USD";

export interface SyncStatus {
  status: "idle" | "syncing" | "success" | "offline" | "no_url";
  lastSyncTs: number | null;
  rowCount: number | null;
}

interface AppContextType {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  usdRate: number;
  setUsdRate: (r: number) => void;
  syncStatus: SyncStatus;
  triggerSync: () => Promise<void>;
  isOnline: boolean;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { isReady, getSetting, setSetting, upsertPriceItem } = useDatabase();
  const [currency, setCurrencyState] = useState<Currency>("PHP");
  const [usdRate, setUsdRateState] = useState(56.0);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ status: "idle", lastSyncTs: null, rowCount: null });
  const [isOnline, setIsOnline] = useState(true);
  const syncInProgress = useRef(false);

  useEffect(() => {
    if (!isReady) return;
    (async () => {
      const rate = await getSetting("usd_exchange_rate");
      if (rate) setUsdRateState(parseFloat(rate));
      const lastTs = await getSetting("last_sync_ts");
      if (lastTs) setSyncStatus(s => ({ ...s, lastSyncTs: parseInt(lastTs) }));
    })();
  }, [isReady]);

  useEffect(() => {
    const checkNetwork = async () => {
      const state = await Network.getNetworkStateAsync();
      setIsOnline(state.isConnected ?? false);
    };
    checkNetwork();
    const interval = setInterval(checkNetwork, 10000);
    return () => clearInterval(interval);
  }, []);

  const setCurrency = useCallback((c: Currency) => setCurrencyState(c), []);

  const setUsdRate = useCallback(async (r: number) => {
    setUsdRateState(r);
    await setSetting("usd_exchange_rate", String(r));
  }, [setSetting]);

  const triggerSync = useCallback(async () => {
    if (syncInProgress.current || !isReady) return;
    syncInProgress.current = true;
    setSyncStatus(s => ({ ...s, status: "syncing" }));

    try {
      const url = await getSetting("sheets_csv_url");
      if (!url) {
        setSyncStatus({ status: "no_url", lastSyncTs: null, rowCount: null });
        syncInProgress.current = false;
        return;
      }

      const netState = await Network.getNetworkStateAsync();
      if (!netState.isConnected) {
        const lastTs = await getSetting("last_sync_ts");
        setSyncStatus({
          status: "offline",
          lastSyncTs: lastTs ? parseInt(lastTs) : null,
          rowCount: null,
        });
        syncInProgress.current = false;
        return;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      const rows = parseCSV(text);
      const now = Date.now();

      for (const row of rows) {
        await upsertPriceItem({
          description: row.description,
          unit: row.unit,
          unit_cost: row.unit_cost,
          category: "other",
          updated_at: now,
        });
      }

      await setSetting("last_sync_ts", String(now));
      setSyncStatus({ status: "success", lastSyncTs: now, rowCount: rows.length });
    } catch {
      const lastTs = await getSetting("last_sync_ts");
      setSyncStatus({
        status: "offline",
        lastSyncTs: lastTs ? parseInt(lastTs) : null,
        rowCount: null,
      });
    } finally {
      syncInProgress.current = false;
    }
  }, [isReady, getSetting, setSetting, upsertPriceItem]);

  useEffect(() => {
    if (isReady) {
      triggerSync();
    }
  }, [isReady]);

  return (
    <AppContext.Provider value={{ currency, setCurrency, usdRate, setUsdRate, syncStatus, triggerSync, isOnline }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
