import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Switch, Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useDatabase } from "@/context/DatabaseContext";
import { useApp } from "@/context/AppContext";
import { EngCalc, BOQResult } from "@/utils/engCalc";
import { formatAmount, formatPhp } from "@/utils/currencyFormatter";
import { useRouter, useLocalSearchParams } from "expo-router";

type SystemType = "HYBRID" | "GRID_TIE" | "OFF_GRID";
type PanelW = 400 | 420 | 540 | 580 | 620;
type BattKwh = 0 | 5 | 10 | 15 | 20 | 25 | 30;

const PANEL_OPTIONS: PanelW[] = [400, 420, 540, 580, 620];
const BATT_OPTIONS: BattKwh[] = [0, 5, 10, 15, 20, 25, 30];

export default function CalculatorScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ systemKw?: string; systemType?: string; batteryKwh?: string }>();
  const { getPriceMap } = useDatabase();
  const { currency, setCurrency, usdRate } = useApp();

  const [systemType, setSystemType] = useState<SystemType>("HYBRID");
  const [systemKw, setSystemKw] = useState(6.0);
  const [systemKwInput, setSystemKwInput] = useState("6");
  const [panelW, setPanelW] = useState<PanelW>(620);
  const [battKwh, setBattKwh] = useState<BattKwh>(10);
  const [result, setResult] = useState<BOQResult | null>(null);
  const [priceMap, setPriceMap] = useState<Record<string, number>>({});
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPriceMap().then((map) => { setPriceMap(map); setLoading(false); });
  }, [getPriceMap]);

  useEffect(() => {
    if (params.systemKw) { const k = parseFloat(params.systemKw); setSystemKw(k); setSystemKwInput(String(k)); }
    if (params.systemType) setSystemType(params.systemType as SystemType);
    if (params.batteryKwh) setBattKwh(parseFloat(params.batteryKwh) as BattKwh);
  }, [params.systemKw, params.systemType, params.batteryKwh]);

  const calculate = useCallback(() => {
    if (loading || Object.keys(priceMap).length === 0) return;
    try {
      const res = EngCalc.computeBOQ({
        systemKw, panelW, systemType, batteryKwh: battKwh, numRows: 2, prices: priceMap,
      });
      setResult(res);
    } catch {}
  }, [systemKw, panelW, systemType, battKwh, priceMap, loading]);

  useEffect(() => { calculate(); }, [calculate]);

  const fmt = (amount: number) => formatAmount(amount, currency, usdRate);
  const invLabel = result ? result.inverterKey.replace("Inverter, ", "") : "—";
  const sysTypes: SystemType[] = ["HYBRID", "GRID_TIE", "OFF_GRID"];
  const sysLabels: Record<SystemType, string> = { HYBRID: "Hybrid", GRID_TIE: "Grid-Tie", OFF_GRID: "Off-Grid" };

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 100 }]} showsVerticalScrollIndicator={false}>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>System Configuration</Text>
            <View style={styles.currencyToggle}>
              <Text style={[styles.currencyLabel, { color: currency === "PHP" ? colors.primary : colors.mutedForeground }]}>₱</Text>
              <Switch
                value={currency === "USD"}
                onValueChange={(v) => { setCurrency(v ? "USD" : "PHP"); Haptics.selectionAsync(); }}
                trackColor={{ false: colors.primary + "40", true: colors.primary + "40" }}
                thumbColor={colors.primary}
              />
              <Text style={[styles.currencyLabel, { color: currency === "USD" ? colors.primary : colors.mutedForeground }]}>$</Text>
            </View>
          </View>
          {currency === "USD" && (
            <Text style={[styles.rateNote, { color: colors.mutedForeground }]}>1 USD = ₱{usdRate.toFixed(2)}</Text>
          )}

          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>System Type</Text>
          <View style={styles.segRow}>
            {sysTypes.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.seg, { backgroundColor: systemType === t ? colors.primary : colors.muted, borderColor: systemType === t ? colors.primary : colors.border }]}
                onPress={() => { setSystemType(t); Haptics.selectionAsync(); }}
              >
                <Text style={[styles.segText, { color: systemType === t ? "#fff" : colors.foreground }]}>{sysLabels[t]}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>System Size (kW)</Text>
          <View style={styles.kwhRow}>
            <TouchableOpacity style={[styles.stepBtn, { borderColor: colors.border }]}
              onPress={() => { const v = Math.max(1, systemKw - 0.5); setSystemKw(v); setSystemKwInput(String(v)); Haptics.selectionAsync(); }}>
              <Feather name="minus" size={16} color={colors.foreground} />
            </TouchableOpacity>
            <TextInput
              style={[styles.kwInput, { borderColor: colors.border, color: colors.primary }]}
              value={systemKwInput}
              onChangeText={setSystemKwInput}
              onBlur={() => { const v = Math.min(30, Math.max(1, parseFloat(systemKwInput) || 6)); setSystemKw(v); setSystemKwInput(String(v)); }}
              keyboardType="numeric"
              textAlign="center"
            />
            <TouchableOpacity style={[styles.stepBtn, { borderColor: colors.border }]}
              onPress={() => { const v = Math.min(30, systemKw + 0.5); setSystemKw(v); setSystemKwInput(String(v)); Haptics.selectionAsync(); }}>
              <Feather name="plus" size={16} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.kwUnit, { color: colors.mutedForeground }]}>kW (1–30)</Text>
          </View>

          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Panel Capacity</Text>
          <View style={styles.chipRow}>
            {PANEL_OPTIONS.map((w) => (
              <TouchableOpacity key={w} style={[styles.chip, { backgroundColor: panelW === w ? colors.primary : colors.muted, borderColor: panelW === w ? colors.primary : colors.border }]}
                onPress={() => { setPanelW(w); Haptics.selectionAsync(); }}>
                <Text style={[styles.chipText, { color: panelW === w ? "#fff" : colors.foreground }]}>{w}W</Text>
              </TouchableOpacity>
            ))}
          </View>

          {(systemType === "HYBRID" || systemType === "OFF_GRID") && (
            <>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Battery Capacity</Text>
              <View style={styles.chipRow}>
                {BATT_OPTIONS.map((b) => (
                  <TouchableOpacity key={b} style={[styles.chip, { backgroundColor: battKwh === b ? colors.primary : colors.muted, borderColor: battKwh === b ? colors.primary : colors.border }]}
                    onPress={() => { setBattKwh(b); Haptics.selectionAsync(); }}>
                    <Text style={[styles.chipText, { color: battKwh === b ? "#fff" : colors.foreground }]}>{b === 0 ? "None" : `${b}kWh`}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>

        {result && (
          <>
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <View style={styles.infoRow}>
                <Feather name="cpu" size={14} color={colors.primary} />
                <Text style={[styles.infoText, { color: colors.foreground }]}>Inverter: {invLabel}</Text>
              </View>
              <View style={styles.infoRow}>
                <Feather name="grid" size={14} color={colors.primary} />
                <Text style={[styles.infoText, { color: colors.foreground }]}>{result.numPanels} × {panelW}W panels ({EngCalc.computeNumPanels(systemKw, panelW)} required)</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.card }]}
              onPress={() => setExpanded(!expanded)}
              activeOpacity={0.9}
            >
              <View style={styles.expandHeader}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>Material Breakdown</Text>
                <Feather name={expanded ? "chevron-up" : "chevron-down"} size={18} color={colors.mutedForeground} />
              </View>
              {expanded && (
                <View style={styles.breakdownList}>
                  <BreakRow label="Solar Panels" value={fmt(result.panelCost)} colors={colors} />
                  <BreakRow label="Inverter" value={fmt(result.inverterCost)} colors={colors} />
                  {result.batteryCost > 0 && <BreakRow label="Battery" value={fmt(result.batteryCost)} colors={colors} />}
                  <BreakRow label="Conductors & Connectors" value={fmt(result.group1)} colors={colors} />
                  <BreakRow label="Grounding System" value={fmt(result.group2)} colors={colors} />
                  <BreakRow label="Railing & Mounting" value={fmt(result.group3)} colors={colors} />
                  <BreakRow label="Protection & Controls" value={fmt(result.group4)} colors={colors} />
                  <BreakRow label="Other Consumables" value={fmt(result.otherCost)} colors={colors} />
                </View>
              )}
            </TouchableOpacity>

            <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
              <SummaryRow label="Material Subtotal" value={fmt(result.materialSubtotal)} colors={colors} />
              <SummaryRow label="Mobilization" value={fmt(result.mobilization)} colors={colors} />
              <SummaryRow label="Installation (30%)" value={fmt(result.installation)} colors={colors} />
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.totalRow}>
                <Text style={[styles.totalLabel, { color: colors.foreground }]}>TOTAL</Text>
                <Text style={[styles.totalValue, { color: colors.primary }]}>{fmt(result.total)}</Text>
              </View>
              <Text style={[styles.vatNote, { color: colors.mutedForeground }]}>VAT Exclusive</Text>
            </View>

            <TouchableOpacity
              style={[styles.ctaBtn, { backgroundColor: colors.primary }]}
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                router.push({
                  pathname: "/(tabs)/boq",
                  params: { systemKw: String(systemKw), systemType, batteryKwh: String(battKwh), panelW: String(panelW) },
                });
              }}
            >
              <Feather name="file-text" size={18} color="#fff" />
              <Text style={styles.ctaText}>Generate BOQ PDF</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function BreakRow({ label, value, colors }: any) {
  return (
    <View style={styles.breakRow}>
      <Text style={[styles.breakLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.breakValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

function SummaryRow({ label, value, colors }: any) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.summaryValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, gap: 12 },
  card: { borderRadius: 16, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  cardTitle: { fontSize: 15, fontWeight: "700" },
  currencyToggle: { flexDirection: "row", alignItems: "center", gap: 4 },
  currencyLabel: { fontSize: 14, fontWeight: "700" },
  rateNote: { fontSize: 11, marginTop: -10, marginBottom: 10 },
  fieldLabel: { fontSize: 11, fontWeight: "600", marginBottom: 8, marginTop: 12 },
  segRow: { flexDirection: "row", gap: 8 },
  seg: { flex: 1, paddingVertical: 9, borderRadius: 8, borderWidth: 1, alignItems: "center" },
  segText: { fontSize: 12, fontWeight: "600" },
  kwhRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepBtn: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  kwInput: { width: 80, borderWidth: 1, borderRadius: 10, paddingVertical: 8, fontSize: 18, fontWeight: "700" },
  kwUnit: { fontSize: 12 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: "600" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  infoText: { fontSize: 13 },
  expandHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  breakdownList: { marginTop: 12, gap: 6 },
  breakRow: { flexDirection: "row", justifyContent: "space-between" },
  breakLabel: { fontSize: 13 },
  breakValue: { fontSize: 13, fontWeight: "600" },
  summaryCard: { borderRadius: 16, padding: 16, gap: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  summaryLabel: { fontSize: 13 },
  summaryValue: { fontSize: 13, fontWeight: "600" },
  divider: { height: 1, marginVertical: 4 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabel: { fontSize: 16, fontWeight: "800" },
  totalValue: { fontSize: 22, fontWeight: "800" },
  vatNote: { fontSize: 11, fontStyle: "italic" },
  ctaBtn: { borderRadius: 14, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, shadowColor: "#E87C27", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 6 },
  ctaText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
