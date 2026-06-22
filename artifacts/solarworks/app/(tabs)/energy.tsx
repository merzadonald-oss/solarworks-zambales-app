import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, PanResponder, Platform, Modal, KeyboardAvoidingView,
  LayoutChangeEvent,
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

function nextBatterySize(kwh: number): number {
  const sizes = [5, 10, 15, 20, 25, 30];
  return sizes.find((s) => s >= kwh) ?? 30;
}

// ─── Slider ────────────────────────────────────────────────────────────────
function HourSlider({
  value, onChange, min = 1, max = 24, colors,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  colors: any;
}) {
  const [trackWidth, setTrackWidth] = useState(0);
  const trackWidthRef = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => handleX(e.nativeEvent.locationX),
      onPanResponderMove: (e) => handleX(e.nativeEvent.locationX),
    })
  ).current;

  function handleX(x: number) {
    const tw = trackWidthRef.current;
    if (tw === 0) return;
    const pct = Math.min(Math.max(x / tw, 0), 1);
    const raw = min + pct * (max - min);
    const rounded = Math.max(min, Math.min(max, Math.round(raw)));
    onChange(rounded);
    Haptics.selectionAsync();
  }

  const pct = (value - min) / (max - min);
  const thumbLeft = trackWidth > 0 ? pct * (trackWidth - 28) : 0;

  return (
    <View style={sliderStyles.wrapper}>
      <View
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          setTrackWidth(w);
          trackWidthRef.current = w;
        }}
        {...panResponder.panHandlers}
        style={[sliderStyles.track, { backgroundColor: colors.border }]}
        hitSlop={{ top: 16, bottom: 16 }}
      >
        <View style={[sliderStyles.fill, { width: `${pct * 100}%` as any, backgroundColor: colors.primary }]} />
        {trackWidth > 0 && (
          <View style={[sliderStyles.thumb, { left: thumbLeft, backgroundColor: colors.primary, borderColor: "#fff" }]} />
        )}
      </View>
      <View style={sliderStyles.tickRow}>
        {[1, 6, 12, 18, 24].map((t) => (
          <TouchableOpacity key={t} onPress={() => onChange(t)} hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}>
            <Text style={[sliderStyles.tick, { color: value === t ? colors.primary : colors.mutedForeground, fontWeight: value === t ? "700" : "400" }]}>
              {t}h
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const sliderStyles = StyleSheet.create({
  wrapper: { gap: 10 },
  track: { height: 8, borderRadius: 4, position: "relative", justifyContent: "center" },
  fill: { height: 8, borderRadius: 4, position: "absolute", left: 0 },
  thumb: {
    position: "absolute", width: 28, height: 28, borderRadius: 14, borderWidth: 3, top: -10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 4,
  },
  tickRow: { flexDirection: "row", justifyContent: "space-between" },
  tick: { fontSize: 12 },
});

// ─── Custom Appliance Modal ─────────────────────────────────────────────────
function CustomApplianceModal({
  visible, onClose, onAdd, colors,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (name: string, wattage: number) => void;
  colors: any;
}) {
  const [name, setName] = useState("");
  const [wattage, setWattage] = useState("");

  const reset = () => { setName(""); setWattage(""); };

  const handleAdd = () => {
    const w = parseInt(wattage);
    if (!name.trim() || isNaN(w) || w <= 0) return;
    onAdd(name.trim(), w);
    reset();
    onClose();
  };

  const valid = name.trim().length > 0 && parseInt(wattage) > 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => { reset(); onClose(); }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <View style={customStyles.overlay}>
          <View style={[customStyles.sheet, { backgroundColor: colors.card }]}>
            <View style={customStyles.header}>
              <Text style={[customStyles.title, { color: colors.foreground }]}>Custom Appliance</Text>
              <TouchableOpacity onPress={() => { reset(); onClose(); }}>
                <Feather name="x" size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <Text style={[customStyles.label, { color: colors.mutedForeground }]}>Appliance Name</Text>
            <TextInput
              style={[customStyles.input, { borderColor: colors.border, color: colors.foreground }]}
              placeholder="e.g. Water Dispenser"
              placeholderTextColor={colors.mutedForeground}
              value={name}
              onChangeText={setName}
            />

            <Text style={[customStyles.label, { color: colors.mutedForeground, marginTop: 12 }]}>Wattage (W)</Text>
            <View style={customStyles.wattRow}>
              <TextInput
                style={[customStyles.input, { borderColor: colors.border, color: colors.foreground, flex: 1 }]}
                placeholder="e.g. 500"
                placeholderTextColor={colors.mutedForeground}
                value={wattage}
                onChangeText={setWattage}
                keyboardType="numeric"
              />
              <Text style={[customStyles.wattUnit, { color: colors.mutedForeground }]}>W</Text>
            </View>

            {parseInt(wattage) > 0 && (
              <View style={[customStyles.hint, { backgroundColor: colors.muted }]}>
                <Feather name="info" size={12} color={colors.mutedForeground} />
                <Text style={[customStyles.hintText, { color: colors.mutedForeground }]}>
                  Running for 4h/day = {((parseInt(wattage) * 4) / 1000).toFixed(2)} kWh/day
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[customStyles.addBtn, { backgroundColor: valid ? colors.primary : colors.muted }]}
              onPress={handleAdd}
              disabled={!valid}
            >
              <Feather name="plus" size={16} color={valid ? "#fff" : colors.mutedForeground} />
              <Text style={[customStyles.addBtnText, { color: valid ? "#fff" : colors.mutedForeground }]}>Add Appliance</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const customStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 },
  sheet: { width: "100%", borderRadius: 24, padding: 24, maxWidth: 400 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  title: { fontSize: 18, fontWeight: "800" },
  label: { fontSize: 11, fontWeight: "600", marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14 },
  wattRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  wattUnit: { fontSize: 16, fontWeight: "600" },
  hint: { flexDirection: "row", alignItems: "center", gap: 6, padding: 10, borderRadius: 8, marginTop: 10 },
  hintText: { fontSize: 12 },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12, marginTop: 16 },
  addBtnText: { fontSize: 15, fontWeight: "700" },
});

// ─── Main Screen ────────────────────────────────────────────────────────────
export default function EnergyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isReady, getAppliances } = useDatabase();
  const [appliances, setAppliances] = useState<Appliance[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<Category>("all");
  const [added, setAdded] = useState<AddedItem[]>([]);
  const [backupHours, setBackupHours] = useState(4);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [bottomCardHeight, setBottomCardHeight] = useState(0);

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

  const addCustomAppliance = useCallback((name: string, wattage: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const customId = -Date.now();
    const customApp: Appliance = {
      id: customId,
      name,
      wattage,
      category: "other",
      default_hours: 4,
      icon_name: "box",
    };
    setAdded((prev) => [...prev, { appliance: customApp, qty: 1, hours: 4 }]);
  }, []);

  const updateItem = useCallback((id: number, field: "qty" | "hours", delta: number) => {
    Haptics.selectionAsync();
    setAdded((prev) =>
      prev.map((i) => {
        if (i.appliance.id !== id) return i;
        if (field === "qty") return { ...i, qty: Math.max(1, i.qty + delta) };
        return { ...i, hours: Math.max(0.5, Math.min(24, parseFloat((i.hours + delta).toFixed(1)))) };
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

  const rawBatteryKwh = totalKwh > 0 ? (totalKwh / 24 * backupHours) / 0.8 : 0;
  const batteryKwh = rawBatteryKwh > 0 ? nextBatterySize(rawBatteryKwh) : 0;
  const recSystemKw = energyResult?.recommendedKwp ?? 0;

  const sendToCalculator = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push({
      pathname: "/(tabs)/calculator",
      params: {
        systemKw: String(recSystemKw),
        systemType: batteryKwh > 0 ? "HYBRID" : "GRID_TIE",
        batteryKwh: String(batteryKwh),
      },
    });
  };

  const handleBottomLayout = (e: LayoutChangeEvent) => {
    setBottomCardHeight(e.nativeEvent.layout.height);
  };

  const categories: Category[] = ["all", "cooling", "kitchen", "water", "entertainment", "lighting", "other"];
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  // Tab bar is ~84px; scrollContent needs extra space to clear the bottom card + tab bar
  const tabBarHeight = Platform.OS === "web" ? 84 : 49 + insets.bottom;
  const scrollPaddingBottom = bottomCardHeight > 0 ? bottomCardHeight + tabBarHeight + 16 : tabBarHeight + 20;

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      {/* Search */}
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

      {/* Category chips */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={styles.catScroll} contentContainerStyle={styles.catContent}
      >
        {categories.map((c) => (
          <TouchableOpacity
            key={c}
            style={[styles.catChip, {
              backgroundColor: category === c ? colors.primary : colors.card,
              borderColor: category === c ? colors.primary : colors.border,
            }]}
            onPress={() => { setCategory(c); Haptics.selectionAsync(); }}
          >
            <Feather name={CATEGORY_ICONS[c] as any} size={12} color={category === c ? "#fff" : colors.mutedForeground} />
            <Text style={[styles.catText, { color: category === c ? "#fff" : colors.foreground }]}>
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Scrollable list */}
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingBottom: scrollPaddingBottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Appliance grid */}
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

          {/* Custom appliance card */}
          <TouchableOpacity
            style={[styles.applianceCard, styles.customCard, {
              backgroundColor: colors.orangeLight,
              borderColor: colors.primary + "40",
              borderStyle: "dashed",
            }]}
            onPress={() => setShowCustomModal(true)}
            activeOpacity={0.8}
          >
            <Feather name="edit-3" size={20} color={colors.primary} />
            <Text style={[styles.appName, { color: colors.primary, fontWeight: "700" }]}>Custom Appliance</Text>
            <Text style={[styles.appWatt, { color: colors.orange }]}>Set name & wattage</Text>
            <View style={[styles.addBtn, { backgroundColor: colors.primary }]}>
              <Feather name="plus" size={14} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Added appliances */}
        {added.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 20 }]}>
              ADDED APPLIANCES
            </Text>
            {added.map((item) => (
              <View key={item.appliance.id} style={[styles.addedRow, { backgroundColor: colors.card }]}>
                <View style={styles.addedTopRow}>
                  <Feather name={CATEGORY_ICONS[item.appliance.category || "other"] as any} size={16} color={colors.primary} />
                  <View style={styles.addedInfo}>
                    <Text style={[styles.addedName, { color: colors.foreground }]}>{item.appliance.name}</Text>
                    <Text style={[styles.addedWh, { color: colors.mutedForeground }]}>
                      {(item.appliance.wattage * item.qty * item.hours / 1000).toFixed(2)} kWh/day
                      {" "}({item.appliance.wattage}W)
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => removeItem(item.appliance.id)}
                    style={[styles.deleteBtn, { backgroundColor: colors.destructive + "15" }]}
                  >
                    <Feather name="trash-2" size={14} color={colors.destructive} />
                  </TouchableOpacity>
                </View>

                <View style={styles.steppersRow}>
                  {/* Qty stepper */}
                  <View style={styles.stepperGroup}>
                    <Text style={[styles.stepLabel, { color: colors.mutedForeground }]}>Qty</Text>
                    <View style={styles.stepper}>
                      <TouchableOpacity
                        onPress={() => updateItem(item.appliance.id, "qty", -1)}
                        style={[styles.stepperBtn, { borderColor: colors.border }]}
                      >
                        <Feather name="minus" size={12} color={colors.foreground} />
                      </TouchableOpacity>
                      <Text style={[styles.stepperVal, { color: colors.foreground }]}>{item.qty}</Text>
                      <TouchableOpacity
                        onPress={() => updateItem(item.appliance.id, "qty", 1)}
                        style={[styles.stepperBtn, { borderColor: colors.border }]}
                      >
                        <Feather name="plus" size={12} color={colors.foreground} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Hours stepper */}
                  <View style={styles.stepperGroup}>
                    <Text style={[styles.stepLabel, { color: colors.mutedForeground }]}>Hrs/day</Text>
                    <View style={styles.stepper}>
                      <TouchableOpacity
                        onPress={() => updateItem(item.appliance.id, "hours", -0.5)}
                        style={[styles.stepperBtn, { borderColor: colors.border }]}
                      >
                        <Feather name="minus" size={12} color={colors.foreground} />
                      </TouchableOpacity>
                      <Text style={[styles.stepperVal, { color: colors.foreground }]}>{item.hours}h</Text>
                      <TouchableOpacity
                        onPress={() => updateItem(item.appliance.id, "hours", 0.5)}
                        style={[styles.stepperBtn, { borderColor: colors.border }]}
                      >
                        <Feather name="plus" size={12} color={colors.foreground} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Per-unit kWh display */}
                  <View style={[styles.kwhChip, { backgroundColor: colors.muted }]}>
                    <Text style={[styles.kwhChipText, { color: colors.mutedForeground }]}>
                      {(item.appliance.wattage * item.hours / 1000).toFixed(2)} kWh/unit
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Sticky bottom card — measured so scroll content can clear it */}
      {loads.length > 0 && (
        <View
          onLayout={handleBottomLayout}
          style={[styles.bottomCard, {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            paddingBottom: bottomPad + 84,
          }]}
        >
          <View style={styles.kwhRow}>
            <View>
              <Text style={[styles.kwhLabel, { color: colors.mutedForeground }]}>Total Daily Load</Text>
              <View style={styles.kwhValueRow}>
                <Text style={[styles.kwhValue, { color: colors.primary }]}>{totalKwh.toFixed(2)}</Text>
                <Text style={[styles.kwhUnit, { color: colors.primary }]}> kWh/day</Text>
              </View>
              {energyResult && (
                <Text style={[styles.kwhSub, { color: colors.mutedForeground }]}>
                  Recommended: {recSystemKw} kWp
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={[styles.calcBtn, { backgroundColor: colors.primary }]}
              onPress={sendToCalculator}
            >
              <Feather name="sliders" size={16} color="#fff" />
              <Text style={styles.calcBtnText}>Price It</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.sliderSection, { borderTopColor: colors.border }]}>
            <View style={styles.sliderHeaderRow}>
              <View style={styles.sliderTitleGroup}>
                <Feather name="battery-charging" size={14} color={colors.primary} />
                <Text style={[styles.sliderTitle, { color: colors.foreground }]}>Backup Duration</Text>
              </View>
              <View style={styles.batteryDisplay}>
                <Text style={[styles.batteryHours, { color: colors.primary }]}>{backupHours}h</Text>
                <Text style={[styles.batteryKwh, { color: colors.mutedForeground }]}>
                  → {batteryKwh} kWh battery
                </Text>
              </View>
            </View>
            <HourSlider value={backupHours} onChange={setBackupHours} min={1} max={24} colors={colors} />
          </View>
        </View>
      )}

      <CustomApplianceModal
        visible={showCustomModal}
        onClose={() => setShowCustomModal(false)}
        onAdd={addCustomAppliance}
        colors={colors}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    margin: 12, paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14 },
  catScroll: { maxHeight: 44 },
  catContent: { paddingHorizontal: 12, gap: 8, paddingVertical: 4 },
  catChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
  },
  catText: { fontSize: 12, fontWeight: "600" },
  content: { paddingHorizontal: 12, paddingTop: 8 },
  applianceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  applianceCard: {
    width: "47%", padding: 14, borderRadius: 12, gap: 6,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  customCard: { borderWidth: 2 },
  appName: { fontSize: 12, fontWeight: "600", lineHeight: 16 },
  appWatt: { fontSize: 11 },
  addBtn: { width: 26, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center", alignSelf: "flex-end" },
  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, marginBottom: 10 },
  addedRow: {
    borderRadius: 12, padding: 14, marginBottom: 8,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 1, gap: 12,
  },
  addedTopRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  addedInfo: { flex: 1 },
  addedName: { fontSize: 14, fontWeight: "600" },
  addedWh: { fontSize: 12, marginTop: 2 },
  steppersRow: { flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap" },
  stepperGroup: { gap: 4 },
  stepLabel: { fontSize: 10, fontWeight: "600" },
  stepper: { flexDirection: "row", alignItems: "center", gap: 8 },
  stepperBtn: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  stepperVal: { fontSize: 14, fontWeight: "700", minWidth: 36, textAlign: "center" },
  kwhChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginLeft: "auto" },
  kwhChipText: { fontSize: 11, fontWeight: "600" },
  deleteBtn: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  bottomCard: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    borderTopWidth: 1, paddingHorizontal: 16, paddingTop: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 10,
  },
  kwhRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  kwhLabel: { fontSize: 11, fontWeight: "600" },
  kwhValueRow: { flexDirection: "row", alignItems: "baseline" },
  kwhValue: { fontSize: 28, fontWeight: "800" },
  kwhUnit: { fontSize: 14, fontWeight: "600" },
  kwhSub: { fontSize: 12, marginTop: 2 },
  calcBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12,
  },
  calcBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  sliderSection: { borderTopWidth: 1, paddingTop: 14, gap: 10 },
  sliderHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sliderTitleGroup: { flexDirection: "row", alignItems: "center", gap: 6 },
  sliderTitle: { fontSize: 13, fontWeight: "600" },
  batteryDisplay: { alignItems: "flex-end", gap: 2 },
  batteryHours: { fontSize: 20, fontWeight: "800" },
  batteryKwh: { fontSize: 11 },
});
