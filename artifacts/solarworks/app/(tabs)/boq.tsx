import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useDatabase, BOQDocument } from "@/context/DatabaseContext";
import { EngCalc, BOQResult } from "@/utils/engCalc";
import { generateBOQPDF } from "@/utils/pdfGenerator";
import { generateBOQNumber } from "@/utils/boqNumber";
import { formatPhp } from "@/utils/currencyFormatter";
import { BOQListItem } from "@/components/BOQListItem";
import { useLocalSearchParams } from "expo-router";

type Tab = "new" | "history";
type SystemType = "HYBRID" | "GRID_TIE" | "OFF_GRID";

export default function BOQScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ systemKw?: string; systemType?: string; batteryKwh?: string; panelW?: string }>();
  const { isReady, getPriceMap, getSetting, setSetting, getBOQDocuments, saveBOQDocument, deleteBOQDocument } = useDatabase();
  const [activeTab, setActiveTab] = useState<Tab>("new");
  const [ownerName, setOwnerName] = useState("");
  const [location, setLocation] = useState("");
  const [systemType, setSystemType] = useState<SystemType>("HYBRID");
  const [systemKw, setSystemKw] = useState(6.0);
  const [panelW, setPanelW] = useState(620);
  const [battKwh, setBattKwh] = useState(10.0);
  const [result, setResult] = useState<BOQResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [history, setHistory] = useState<BOQDocument[]>([]);
  const [companyInfo, setCompanyInfo] = useState({ name: "", address: "", phone: "", social: "" });

  useEffect(() => {
    if (params.systemKw) setSystemKw(parseFloat(params.systemKw));
    if (params.systemType) setSystemType(params.systemType as SystemType);
    if (params.batteryKwh) setBattKwh(parseFloat(params.batteryKwh));
    if (params.panelW) setPanelW(parseInt(params.panelW));
  }, [params.systemKw, params.systemType, params.batteryKwh, params.panelW]);

  useEffect(() => {
    if (!isReady) return;
    (async () => {
      const [name, address, phone, social] = await Promise.all([
        getSetting("company_name"), getSetting("company_address"),
        getSetting("company_phone"), getSetting("company_social"),
      ]);
      setCompanyInfo({ name: name ?? "", address: address ?? "", phone: phone ?? "", social: social ?? "" });
    })();
  }, [isReady]);

  const loadHistory = useCallback(async () => {
    if (!isReady) return;
    const docs = await getBOQDocuments();
    setHistory(docs);
  }, [isReady, getBOQDocuments]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  useEffect(() => {
    if (!isReady) return;
    getPriceMap().then((prices) => {
      if (Object.keys(prices).length === 0) return;
      try {
        const res = EngCalc.computeBOQ({ systemKw, panelW, systemType, batteryKwh: battKwh, numRows: 2, prices });
        setResult(res);
      } catch {}
    });
  }, [isReady, systemKw, panelW, systemType, battKwh, getPriceMap]);

  const handleGenerate = async () => {
    if (!result || !isReady) return;
    setGenerating(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const counterDate = await getSetting("boq_counter_date");
    const counterVal = parseInt((await getSetting("boq_daily_counter")) ?? "0");
    const { boqNumber, newDate, newCounter } = generateBOQNumber(counterDate, counterVal);
    await setSetting("boq_counter_date", newDate);
    await setSetting("boq_daily_counter", String(newCounter));

    const prices = await getPriceMap();
    const freshResult = EngCalc.computeBOQ({ systemKw, panelW, systemType, batteryKwh: battKwh, numRows: 2, prices });

    const ownerFinal = ownerName || "Client";
    const projectTitle = `Supply, Delivery, Installation, Configuration, Testing and Commissioning of PV System for ${ownerFinal}`;

    const pdfPath = await generateBOQPDF({
      boqNumber,
      projectTitle,
      ownerName: ownerFinal,
      location,
      systemType,
      systemKw,
      batteryKwh: battKwh,
      panelW,
      boqResult: freshResult,
      estimatedGenKwh: systemKw * 5.5 * 0.85,
      companyName: companyInfo.name,
      companyAddress: companyInfo.address,
      companyPhone: companyInfo.phone,
      companySocial: companyInfo.social,
    });

    await saveBOQDocument({
      boq_number: boqNumber,
      created_at: Date.now(),
      project_title: ownerFinal,
      location,
      system_type: systemType,
      system_kw: systemKw,
      battery_kwh: battKwh,
      total_php: freshResult.total,
      pdf_path: pdfPath ?? "",
    });

    await loadHistory();
    setGenerating(false);
    Alert.alert("BOQ Generated", `${boqNumber} saved successfully!`, [{ text: "OK" }]);
  };

  const typeLabels: Record<SystemType, string> = { HYBRID: "Hybrid", GRID_TIE: "Grid-Tie", OFF_GRID: "Off-Grid" };
  const sysTypes: SystemType[] = ["HYBRID", "GRID_TIE", "OFF_GRID"];
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <View style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {(["new", "history"] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, activeTab === t && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => { setActiveTab(t); Haptics.selectionAsync(); }}
          >
            <Text style={[styles.tabText, { color: activeTab === t ? colors.primary : colors.mutedForeground }]}>
              {t === "new" ? "New BOQ" : `History (${history.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === "new" ? (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 40 }]} showsVerticalScrollIndicator={false}>
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Project Details</Text>

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Name of Owner</Text>
            <TextInput
              style={[styles.textInput, { borderColor: colors.border, color: colors.foreground }]}
              placeholder="e.g. Juan dela Cruz"
              placeholderTextColor={colors.mutedForeground}
              value={ownerName}
              onChangeText={setOwnerName}
            />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground, marginTop: 8 }]}>Location</Text>
            <TextInput
              style={[styles.textInput, { borderColor: colors.border, color: colors.foreground }]}
              placeholder="e.g. Iba, Zambales"
              placeholderTextColor={colors.mutedForeground}
              value={location}
              onChangeText={setLocation}
            />

            {ownerName.length > 0 && (
              <View style={[styles.titlePreview, { backgroundColor: colors.muted }]}>
                <Text style={[styles.titlePreviewLabel, { color: colors.mutedForeground }]}>PDF Title:</Text>
                <Text style={[styles.titlePreviewText, { color: colors.foreground }]} numberOfLines={3}>
                  Supply, Delivery, Installation, Configuration, Testing and Commissioning of PV System for {ownerName}
                </Text>
              </View>
            )}
          </View>

          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>System Parameters</Text>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>System Type</Text>
            <View style={styles.segRow}>
              {sysTypes.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.seg, { backgroundColor: systemType === t ? colors.primary : colors.muted, borderColor: systemType === t ? colors.primary : colors.border }]}
                  onPress={() => setSystemType(t)}
                >
                  <Text style={[styles.segText, { color: systemType === t ? "#fff" : colors.foreground }]}>{typeLabels[t]}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.paramRow}>
              <View style={styles.paramField}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Size (kW)</Text>
                <TextInput
                  style={[styles.paramInput, { borderColor: colors.border, color: colors.primary }]}
                  value={String(systemKw)}
                  onChangeText={(v) => { const n = parseFloat(v); if (!isNaN(n)) setSystemKw(n); }}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.paramField}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Panel (W)</Text>
                <TextInput
                  style={[styles.paramInput, { borderColor: colors.border, color: colors.primary }]}
                  value={String(panelW)}
                  onChangeText={(v) => { const n = parseInt(v); if (!isNaN(n)) setPanelW(n); }}
                  keyboardType="numeric"
                />
              </View>
              {(systemType === "HYBRID" || systemType === "OFF_GRID") && (
                <View style={styles.paramField}>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Battery (kWh)</Text>
                  <TextInput
                    style={[styles.paramInput, { borderColor: colors.border, color: colors.primary }]}
                    value={String(battKwh)}
                    onChangeText={(v) => { const n = parseFloat(v); if (!isNaN(n)) setBattKwh(n); }}
                    keyboardType="numeric"
                  />
                </View>
              )}
            </View>
          </View>

          {result && (
            <View style={[styles.previewCard, { backgroundColor: colors.orangeLight, borderColor: colors.primary + "30" }]}>
              <Text style={[styles.previewTitle, { color: colors.orange }]}>PRICE PREVIEW</Text>
              <Text style={[styles.previewDesc, { color: colors.navy }]}>
                {result.numPanels} × {panelW}W panels • {result.inverterKey.replace("Inverter, ", "")}
                {battKwh > 0 ? ` • ${battKwh}kWh battery` : ""}
              </Text>
              <Text style={[styles.previewTotal, { color: colors.orange }]}>{formatPhp(result.total)}</Text>
              <Text style={[styles.previewVat, { color: colors.orange + "99" }]}>VAT Exclusive</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.generateBtn, { backgroundColor: generating ? colors.mutedForeground : colors.primary }]}
            onPress={handleGenerate}
            disabled={generating}
          >
            {generating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name="file-text" size={18} color="#fff" />
                <Text style={styles.generateBtnText}>Generate PDF</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 40 }]}>
          {history.length === 0 ? (
            <View style={[styles.empty, { backgroundColor: colors.card }]}>
              <Feather name="inbox" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No BOQs yet</Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>Generate your first BOQ from the New tab</Text>
            </View>
          ) : (
            history.map((doc) => (
              <BOQListItem
                key={doc.id}
                doc={doc}
                onPress={() => Alert.alert(
                  doc.boq_number,
                  `Owner: ${doc.project_title}\nTotal: ${formatPhp(doc.total_php)}\nSystem: ${doc.system_kw}kWp ${doc.system_type}\nLocation: ${doc.location || "—"}`
                )}
                onLongPress={() =>
                  Alert.alert("Delete", `Delete ${doc.boq_number}?`, [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Delete", style: "destructive",
                      onPress: async () => { await deleteBOQDocument(doc.id); loadHistory(); }
                    },
                  ])
                }
              />
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tabBar: { flexDirection: "row", borderBottomWidth: 1 },
  tab: { flex: 1, paddingVertical: 14, alignItems: "center" },
  tabText: { fontSize: 14, fontWeight: "600" },
  content: { padding: 16, gap: 12 },
  card: { borderRadius: 16, padding: 16, gap: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontSize: 15, fontWeight: "700" },
  fieldLabel: { fontSize: 11, fontWeight: "600", marginBottom: 4 },
  textInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14 },
  titlePreview: { borderRadius: 8, padding: 10, gap: 3, marginTop: 4 },
  titlePreviewLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  titlePreviewText: { fontSize: 12, lineHeight: 17 },
  segRow: { flexDirection: "row", gap: 8 },
  seg: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, alignItems: "center" },
  segText: { fontSize: 11, fontWeight: "600" },
  paramRow: { flexDirection: "row", gap: 10 },
  paramField: { flex: 1, gap: 4 },
  paramInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 16, fontWeight: "700", textAlign: "center" },
  previewCard: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 4 },
  previewTitle: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
  previewDesc: { fontSize: 13, fontWeight: "500" },
  previewTotal: { fontSize: 24, fontWeight: "800" },
  previewVat: { fontSize: 11, fontStyle: "italic" },
  generateBtn: { borderRadius: 14, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, shadowColor: "#E87C27", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 6 },
  generateBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  empty: { borderRadius: 16, padding: 40, alignItems: "center", gap: 10 },
  emptyText: { fontSize: 16, fontWeight: "600" },
  emptySub: { fontSize: 13, textAlign: "center" },
});
