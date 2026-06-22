import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Modal, Platform, ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as SecureStore from "expo-secure-store";
import { useColors } from "@/hooks/useColors";
import { useDatabase } from "@/context/DatabaseContext";
import { useApp } from "@/context/AppContext";

const PIN_KEY = "solarworks_admin_pin";

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isReady, getSetting, setSetting, resetPricesToDefault } = useDatabase();
  const { syncStatus, triggerSync, usdRate, setUsdRate } = useApp();

  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);

  const [csvUrl, setCsvUrl] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companySocial, setCompanySocial] = useState("");
  const [usdInput, setUsdInput] = useState(String(usdRate));
  const [syncing, setSyncing] = useState(false);
  const [savingAdmin, setSavingAdmin] = useState(false);

  useEffect(() => {
    if (!isReady) return;
    (async () => {
      const url = await getSetting("sheets_csv_url");
      const name = await getSetting("company_name");
      const addr = await getSetting("company_address");
      const phone = await getSetting("company_phone");
      const social = await getSetting("company_social");
      if (url) setCsvUrl(url);
      if (name) setCompanyName(name);
      if (addr) setCompanyAddress(addr);
      if (phone) setCompanyPhone(phone);
      if (social) setCompanySocial(social);
    })();
  }, [isReady]);

  useEffect(() => { setUsdInput(String(usdRate)); }, [usdRate]);

  const verifyPin = async () => {
    const stored = Platform.OS !== "web"
      ? await SecureStore.getItemAsync(PIN_KEY) ?? "0000"
      : (await getSetting("admin_pin")) ?? "0000";
    if (pinInput === stored) {
      setAdminUnlocked(true);
      setShowPinModal(false);
      setPinInput("");
      setPinError(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      setPinError(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    await triggerSync();
    setSyncing(false);
    Alert.alert("Sync Complete",
      syncStatus.status === "success"
        ? `Updated ${syncStatus.rowCount} price items`
        : "Could not sync — using cached prices"
    );
  };

  const handleSaveAdmin = async () => {
    if (!isReady) return;
    setSavingAdmin(true);
    await setSetting("sheets_csv_url", csvUrl);
    await setSetting("company_name", companyName);
    await setSetting("company_address", companyAddress);
    await setSetting("company_phone", companyPhone);
    await setSetting("company_social", companySocial);
    setSavingAdmin(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Saved", "Admin settings saved.");
  };

  const handleChangePIN = () => {
    Alert.prompt("Change PIN", "Enter new 4-digit PIN:", async (newPin) => {
      if (!newPin || !/^\d{4}$/.test(newPin)) {
        Alert.alert("Invalid PIN", "Must be exactly 4 digits.");
        return;
      }
      if (Platform.OS !== "web") {
        await SecureStore.setItemAsync(PIN_KEY, newPin);
      } else {
        await setSetting("admin_pin", newPin);
      }
      Alert.alert("PIN Updated", "Admin PIN changed successfully.");
    }, "plain-text", "", "numeric");
  };

  const handleResetPrices = () => {
    Alert.alert("Reset Prices", "This will reset all prices to factory defaults. Continue?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reset", style: "destructive",
        onPress: async () => {
          await resetPricesToDefault();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert("Done", "Prices reset to defaults.");
        },
      },
    ]);
  };

  const lastSyncText = syncStatus.lastSyncTs
    ? new Date(syncStatus.lastSyncTs).toLocaleString()
    : "Never";

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border, paddingTop: topPad + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Settings</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 40 }]} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>GENERAL</Text>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: colors.foreground }]}>USD Exchange Rate</Text>
              <View style={styles.rateRow}>
                <Text style={[styles.rateLabel, { color: colors.mutedForeground }]}>1 USD = ₱</Text>
                <TextInput
                  style={[styles.rateInput, { borderColor: colors.border, color: colors.primary }]}
                  value={usdInput}
                  onChangeText={setUsdInput}
                  onBlur={() => { const v = parseFloat(usdInput); if (!isNaN(v) && v > 0) setUsdRate(v); }}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: colors.foreground }]}>Price Sync Status</Text>
              <Text style={[styles.settingSubtitle, { color: colors.mutedForeground }]}>
                Last sync: {lastSyncText}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.syncBtn, { backgroundColor: colors.primary }]}
              onPress={handleSyncNow}
              disabled={syncing}
            >
              {syncing
                ? <ActivityIndicator color="#fff" size="small" />
                : <><Feather name="refresh-cw" size={14} color="#fff" /><Text style={styles.syncBtnText}>Sync</Text></>
              }
            </TouchableOpacity>
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 20 }]}>ADMIN</Text>

        {!adminUnlocked ? (
          <TouchableOpacity
            style={[styles.lockCard, { backgroundColor: colors.card }]}
            onPress={() => setShowPinModal(true)}
          >
            <Feather name="lock" size={24} color={colors.mutedForeground} />
            <Text style={[styles.lockText, { color: colors.mutedForeground }]}>Tap to unlock admin settings</Text>
            <Text style={[styles.lockSub, { color: colors.mutedForeground }]}>PIN required</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Google Sheets CSV URL</Text>
            <TextInput
              style={[styles.textInput, { borderColor: colors.border, color: colors.foreground }]}
              placeholder="https://docs.google.com/spreadsheets/..."
              placeholderTextColor={colors.mutedForeground}
              value={csvUrl}
              onChangeText={setCsvUrl}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={[styles.cardTitle, { color: colors.foreground, marginTop: 8 }]}>Company Information</Text>
            <TextInput style={[styles.textInput, { borderColor: colors.border, color: colors.foreground }]} placeholder="Company Name" placeholderTextColor={colors.mutedForeground} value={companyName} onChangeText={setCompanyName} />
            <TextInput style={[styles.textInput, { borderColor: colors.border, color: colors.foreground }]} placeholder="Address" placeholderTextColor={colors.mutedForeground} value={companyAddress} onChangeText={setCompanyAddress} />
            <TextInput style={[styles.textInput, { borderColor: colors.border, color: colors.foreground }]} placeholder="Phone" placeholderTextColor={colors.mutedForeground} value={companyPhone} onChangeText={setCompanyPhone} keyboardType="phone-pad" />
            <TextInput style={[styles.textInput, { borderColor: colors.border, color: colors.foreground }]} placeholder="Website / Social" placeholderTextColor={colors.mutedForeground} value={companySocial} onChangeText={setCompanySocial} autoCapitalize="none" />

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
              onPress={handleSaveAdmin}
              disabled={savingAdmin}
            >
              {savingAdmin ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Settings</Text>}
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.border, marginVertical: 12 }]} />

            <TouchableOpacity style={[styles.dangerRow, { borderColor: colors.border }]} onPress={handleChangePIN}>
              <Feather name="key" size={16} color={colors.foreground} />
              <Text style={[styles.dangerText, { color: colors.foreground }]}>Change Admin PIN</Text>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} style={{ marginLeft: "auto" }} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.dangerRow, { borderColor: colors.destructive + "40" }]} onPress={handleResetPrices}>
              <Feather name="refresh-cw" size={16} color={colors.destructive} />
              <Text style={[styles.dangerText, { color: colors.destructive }]}>Reset Prices to Default</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={[styles.versionCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.versionText, { color: colors.mutedForeground }]}>SolarWorks Zambales v1.0.0</Text>
          <Text style={[styles.versionText, { color: colors.mutedForeground }]}>Offline-capable solar PV design tool</Text>
        </View>
      </ScrollView>

      <Modal visible={showPinModal} transparent animationType="fade" onRequestClose={() => { setShowPinModal(false); setPinInput(""); setPinError(false); }}>
        <View style={styles.modalOverlay}>
          <View style={[styles.pinModal, { backgroundColor: colors.card }]}>
            <Feather name="lock" size={28} color={colors.primary} />
            <Text style={[styles.pinTitle, { color: colors.foreground }]}>Admin PIN</Text>
            <View style={styles.pinDots}>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={[styles.pinDot, { backgroundColor: i < pinInput.length ? colors.primary : colors.border }]} />
              ))}
            </View>
            {pinError && <Text style={[styles.pinError, { color: colors.destructive }]}>Incorrect PIN</Text>}
            <View style={styles.numpad}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <TouchableOpacity key={n} style={[styles.numKey, { backgroundColor: colors.muted }]}
                  onPress={() => { if (pinInput.length < 4) { setPinInput(p => p + n); setPinError(false); } }}>
                  <Text style={[styles.numText, { color: colors.foreground }]}>{n}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={[styles.numKey, { backgroundColor: colors.muted }]}
                onPress={() => { setShowPinModal(false); setPinInput(""); setPinError(false); }}>
                <Feather name="x" size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.numKey, { backgroundColor: colors.muted }]}
                onPress={() => { if (pinInput.length < 4) { setPinInput(p => p + "0"); setPinError(false); } }}>
                <Text style={[styles.numText, { color: colors.foreground }]}>0</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.numKey, { backgroundColor: colors.muted }]}
                onPress={() => { setPinInput(p => p.slice(0, -1)); setPinError(false); }}>
                <Feather name="delete" size={18} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={[styles.pinConfirm, { backgroundColor: colors.primary }]} onPress={verifyPin}>
              <Text style={styles.pinConfirmText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, gap: 8 },
  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, marginBottom: 6 },
  card: { borderRadius: 16, padding: 16, gap: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontSize: 14, fontWeight: "700" },
  settingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  settingInfo: { flex: 1, gap: 4 },
  settingTitle: { fontSize: 14, fontWeight: "600" },
  settingSubtitle: { fontSize: 12 },
  rateRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  rateLabel: { fontSize: 13 },
  rateInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, fontSize: 14, fontWeight: "700", width: 70, textAlign: "center" },
  syncBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  syncBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  divider: { height: 1 },
  lockCard: { borderRadius: 16, padding: 32, alignItems: "center", gap: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  lockText: { fontSize: 15, fontWeight: "600" },
  lockSub: { fontSize: 12 },
  textInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13 },
  saveBtn: { borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  dangerRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14 },
  dangerText: { fontSize: 14, fontWeight: "600" },
  versionCard: { borderRadius: 16, padding: 16, alignItems: "center", gap: 4, marginTop: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  versionText: { fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  pinModal: { width: 300, borderRadius: 24, padding: 28, alignItems: "center", gap: 16 },
  pinTitle: { fontSize: 18, fontWeight: "700" },
  pinDots: { flexDirection: "row", gap: 12 },
  pinDot: { width: 14, height: 14, borderRadius: 7 },
  pinError: { fontSize: 13, fontWeight: "600" },
  numpad: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "center", width: 220 },
  numKey: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" },
  numText: { fontSize: 20, fontWeight: "600" },
  pinConfirm: { paddingHorizontal: 40, paddingVertical: 12, borderRadius: 12 },
  pinConfirmText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
