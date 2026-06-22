import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, FlatList, Modal, Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useDatabase, Appliance } from "@/context/DatabaseContext";
import { EngCalc, ApplianceLoad } from "@/utils/engCalc";
import { useRouter } from "expo-router";

interface AddedItem {
  appliance: Appliance;
  qty: number;
  hours: number;
}

type Category = "all" | "cooling" | "kitchen" | "water" | "entertainment" | "lighting" | "other";

const CATEGORY_ICONS: Record<string, string> = {
  all: "grid", cooling: "wind", kitchen: "coffee", water: "droplet",
  entertainment: "tv", lighting: "sun", other: "box",
};

const PSH = 5.5;

export default function EnergyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isReady, getAppliances } = useDatabase();
  const [appliances, setAppliances] = useState<Appliance[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<Category>("all");
  const [added, setAdded] = useState<AddedItem[]>([]);
  const [showRec, setShowRec] = useState(false);

  useEffect(() => {
    if (isReady) getAppliances().then(setAppliances);
  }, [isReady]);

  const filtered = appliances.filter((a) => {
    const matchCat = category === "all" || a.category === category;
    const matchSearch = a.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const addAppliance = useCallback((a: Appliance) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAdded((prev) => {
      const idx = prev.findIndex((i) => i.appliance.id === a.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], qty: updated[idx].qty + 1 };
        return updated;
      }
      return [...prev, { appliance: a, qty: 1, hours: a.default_hours }];
    });
  }, []);

  const updateItem = useCallback((id: number, field: "qty" | "hours", delta: number) => {
    Haptics.selectionAsync();
    setAdded((prev) =>
      prev.map((i) => {
        if (i.appliance.id !== id) return i;
        if (field === "qty") return { ...i, qty: Math.max(1, i.qty + delta) };
        return { ...i, hours: Math.max(0.5, Math.min(24, i.hours + delta)) };
      })
    );
  }, []);

  const removeItem = useCallback((id: number) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setAdded((prev) => prev.filter((i) => i.appliance.id !== id));
  }, []);

  const loads: ApplianceLoad[] = added.map((i) => ({
    wattage: i.appliance.wattage, qty: i.qty, hoursPerDay: i.hours, name: i.appliance.name,
  }));

  const totalWh = loads.reduce((s, l) => s + l.wattage * l.qty * l.hoursPerDay, 0);
  const totalKwh = totalWh / 1000;
  const energyResult = loads.length > 0 ? EngCalc.computeEnergy(loads, PSH) : null;

  const categories: Category[] = ["all", "cooling", "kitchen", "water", "entertainment", "lighting", "other"];
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="search" size={16} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="Search appliances..."
          placeholderTextColor={colors.mutedForeground}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Feather name="x" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll} contentContainerStyle={styles.catContent}>
        {categories.map((c) => (
          <TouchableOpacity
            key={c}
            style={[styles.catChip, { backgroundColor: category === c ? colors.primary : colors.card, borderColor: category === c ? colors.primary : colors.border }]}
            onPress={() => { setCategory(c); Haptics.selectionAsync(); }}
          >
            <Feather name={CATEGORY_ICONS[c] as any} size={12} color={category === c ? "#fff" : colors.mutedForeground} />
            <Text style={[styles.catText, { color: category === c ? "#fff" : colors.foreground }]}>
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.flex} contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 140 }]}>
        <View style={styles.applianceGrid}>
          {filtered.map((a) => (
            <TouchableOpacity
              key={a.id}
              style={[styles.applianceCard, { backgroundColor: colors.card }]}
              onPress={() => addAppliance(a)}
              activeOpacity={0.8}
            >
              <Feather name={CATEGORY_ICONS[a.category || "other"] as any} size={20} color={colors.primary} />
              <Text style={[styles.appName, { color: colors.foreground }]} numberOfLines={2}>{a.name}</Text>
              <Text style={[styles.appWatt, { color: colors.mutedForeground }]}>{a.wattage}W</Text>
              <View style={[styles.addBtn, { backgroundColor: colors.primary }]}>
                <Feather name="plus" size={14} color="#fff" />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {added.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 20 }]}>ADDED APPLIANCES</Text>
            {added.map((item) => (
              <View key={item.appliance.id} style={[styles.addedRow, { backgroundColor: colors.card }]}>
                <View style={styles.addedInfo}>
                  <Text style={[styles.addedName, { color: colors.foreground }]}>{item.appliance.name}</Text>
                  <Text style={[styles.addedWh, { color: colors.mutedForeground }]}>
                    {(item.appliance.wattage * item.qty * item.hours / 1000).toFixed(2)} kWh/day
                  </Text>
                </View>
                <View style={styles.steppers}>
                  <View style={styles.stepperGroup}>
                    <Text style={[styles.stepLabel, { color: colors.mutedForeground }]}>Qty</Text>
                    <View style={styles.stepper}>
                      <TouchableOpacity onPress={() => updateItem(item.appliance.id, "qty", -1)} style={[styles.stepperBtn, { borderColor: colors.border }]}>
                        <Feather name="minus" size={12} color={colors.foreground} />
                      </TouchableOpacity>
                      <Text style={[styles.stepperVal, { color: colors.foreground }]}>{item.qty}</Text>
                      <TouchableOpacity onPress={() => updateItem(item.appliance.id, "qty", 1)} style={[styles.stepperBtn, { borderColor: colors.border }]}>
                        <Feather name="plus" size={12} color={colors.foreground} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.stepperGroup}>
                    <Text style={[styles.stepLabel, { color: colors.mutedForeground }]}>Hours</Text>
                    <View style={styles.stepper}>
                      <TouchableOpacity onPress={() => updateItem(item.appliance.id, "hours", -0.5)} style={[styles.stepperBtn, { borderColor: colors.border }]}>
                        <Feather name="minus" size={12} color={colors.foreground} />
                      </TouchableOpacity>
                      <Text style={[styles.stepperVal, { color: colors.foreground }]}>{item.hours}h</Text>
                      <TouchableOpacity onPress={() => updateItem(item.appliance.id, "hours", 0.5)} style={[styles.stepperBtn, { borderColor: colors.border }]}>
                        <Feather name="plus" size={12} color={colors.foreground} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => removeItem(item.appliance.id)} style={[styles.deleteBtn, { backgroundColor: colors.destructive + "15" }]}>
                    <Feather name="trash-2" size={14} color={colors.destructive} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {added.length > 0 && (
        <View style={[styles.bottomBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: bottomPad + 10 }]}>
          <View>
            <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Total Daily Load</Text>
            <Text style={[styles.totalValue, { color: colors.primary }]}>{totalKwh.toFixed(2)} kWh/day</Text>
          </View>
          <TouchableOpacity
            style={[styles.recBtn, { backgroundColor: colors.primary }]}
            onPress={() => { setShowRec(true); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }}
          >
            <Text style={styles.recBtnText}>Get Recommendation</Text>
            <Feather name="arrow-right" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={showRec} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowRec(false)}>
        <RecommendationSheet
          energyResult={energyResult}
          loads={loads}
          onClose={() => setShowRec(false)}
          onUseSizing={(kw, batt) => {
            setShowRec(false);
            router.push({ pathname: "/(tabs)/calculator", params: { systemKw: String(kw), systemType: batt > 0 ? "HYBRID" : "GRID_TIE", batteryKwh: String(batt) } });
          }}
          colors={colors}
          insets={insets}
        />
      </Modal>
    </View>
  );
}

function RecommendationSheet({ energyResult, loads, onClose, onUseSizing, colors, insets }: any) {
  if (!energyResult) return null;
  const battOptions = [
    { label: "No Battery", kwh: 0, days: "Grid-Tie" },
    { label: "Half-Day Backup", kwh: energyResult.batteryRecs["0.5day"], days: "0.5 day" },
    { label: "Full-Day Backup", kwh: energyResult.batteryRecs["1.0day"], days: "1 day" },
    { label: "2-Day Backup", kwh: energyResult.batteryRecs["2.0day"], days: "2 days" },
  ];
  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
        <Text style={[styles.modalTitle, { color: colors.foreground }]}>Recommendation</Text>
        <TouchableOpacity onPress={onClose}><Feather name="x" size={22} color={colors.foreground} /></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}>
        <View style={[styles.recHighlight, { backgroundColor: colors.orangeLight }]}>
          <Text style={[styles.recHighlightLabel, { color: colors.orange }]}>Recommended System Size</Text>
          <Text style={[styles.recHighlightValue, { color: colors.orange }]}>{energyResult.recommendedKwp} kWp</Text>
          <Text style={[styles.recHighlightSub, { color: colors.orange }]}>Est. daily generation: {energyResult.estimatedGenKwh.toFixed(1)} kWh</Text>
        </View>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 20 }]}>BATTERY OPTIONS</Text>
        {battOptions.map((opt, i) => (
          <TouchableOpacity key={i}
            style={[styles.battOption, { backgroundColor: colors.card }]}
            onPress={() => onUseSizing(energyResult.recommendedKwp, opt.kwh)}
          >
            <View>
              <Text style={[styles.battOptionLabel, { color: colors.foreground }]}>{opt.label}</Text>
              <Text style={[styles.battOptionSub, { color: colors.mutedForeground }]}>
                {opt.kwh > 0 ? `${opt.kwh} kWh — ${opt.days} backup` : "Grid power only"}
              </Text>
            </View>
            <Feather name="arrow-right" size={18} color={colors.primary} />
          </TouchableOpacity>
        ))}
        <View style={[styles.loadSummary, { backgroundColor: colors.card, marginTop: 16 }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground, marginBottom: 10 }]}>Load Summary</Text>
          {loads.map((l: ApplianceLoad, i: number) => (
            <Text key={i} style={[styles.loadItem, { color: colors.mutedForeground }]}>
              • {l.name} × {l.qty} @ {l.hoursPerDay}h/day = {(l.wattage * l.qty * l.hoursPerDay).toLocaleString()} Wh
            </Text>
          ))}
          <Text style={[styles.loadTotal, { color: colors.foreground, marginTop: 8 }]}>
            Total: {(loads.reduce((s: number, l: ApplianceLoad) => s + l.wattage * l.qty * l.hoursPerDay, 0) / 1000).toFixed(2)} kWh/day
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  searchBar: { flexDirection: "row", alignItems: "center", gap: 10, margin: 12, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 14 },
  catScroll: { maxHeight: 44 },
  catContent: { paddingHorizontal: 12, gap: 8, paddingVertical: 4 },
  catChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  catText: { fontSize: 12, fontWeight: "600" },
  content: { paddingHorizontal: 12, paddingTop: 8 },
  applianceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  applianceCard: { width: "47%", padding: 14, borderRadius: 12, gap: 6, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  appName: { fontSize: 12, fontWeight: "600", lineHeight: 16 },
  appWatt: { fontSize: 11 },
  addBtn: { width: 26, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center", alignSelf: "flex-end" },
  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, marginBottom: 10 },
  addedRow: { borderRadius: 12, padding: 14, marginBottom: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  addedInfo: { marginBottom: 10 },
  addedName: { fontSize: 14, fontWeight: "600" },
  addedWh: { fontSize: 12, marginTop: 2 },
  steppers: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepperGroup: { gap: 4 },
  stepLabel: { fontSize: 10, fontWeight: "600" },
  stepper: { flexDirection: "row", alignItems: "center", gap: 8 },
  stepperBtn: { width: 28, height: 28, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  stepperVal: { fontSize: 14, fontWeight: "700", minWidth: 30, textAlign: "center" },
  deleteBtn: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", marginLeft: "auto" },
  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 8 },
  totalLabel: { fontSize: 11, fontWeight: "600" },
  totalValue: { fontSize: 20, fontWeight: "800" },
  recBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12 },
  recBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  recHighlight: { borderRadius: 16, padding: 20, gap: 4 },
  recHighlightLabel: { fontSize: 13, fontWeight: "600" },
  recHighlightValue: { fontSize: 36, fontWeight: "800" },
  recHighlightSub: { fontSize: 13 },
  battOption: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderRadius: 12, marginBottom: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  battOptionLabel: { fontSize: 14, fontWeight: "600" },
  battOptionSub: { fontSize: 12, marginTop: 2 },
  loadSummary: { borderRadius: 16, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  loadItem: { fontSize: 12, lineHeight: 20 },
  loadTotal: { fontSize: 14, fontWeight: "700" },
  cardTitle: { fontSize: 15, fontWeight: "700" },
});
