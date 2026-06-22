import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Alert, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useDatabase, BOQDocument } from "@/context/DatabaseContext";
import { useApp } from "@/context/AppContext";
import { SyncStatusChip } from "@/components/SyncStatusChip";
import { QuickActionCard } from "@/components/QuickActionCard";
import { BOQListItem } from "@/components/BOQListItem";
import * as Haptics from "expo-haptics";

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isReady, getBOQDocuments, deleteBOQDocument } = useDatabase();
  const { syncStatus, triggerSync, isOnline } = useApp();
  const [recentBOQs, setRecentBOQs] = useState<BOQDocument[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadBOQs = useCallback(async () => {
    if (!isReady) return;
    const docs = await getBOQDocuments();
    setRecentBOQs(docs.slice(0, 10));
  }, [isReady, getBOQDocuments]);

  useEffect(() => { loadBOQs(); }, [loadBOQs]);

  const onRefresh = async () => {
    setRefreshing(true);
    await triggerSync();
    await loadBOQs();
    setRefreshing(false);
  };

  const handleDeleteBOQ = (doc: BOQDocument) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert("Delete BOQ", `Delete ${doc.boq_number}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          await deleteBOQDocument(doc.id);
          loadBOQs();
        },
      },
    ]);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <LinearGradient colors={["#E87C27", "#C96A1A"]} style={[styles.header, { paddingTop: topPad + 12 }]}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>SolarWorks</Text>
            <Text style={styles.headerSubtitle}>Zambales</Text>
          </View>
          <View style={styles.headerRight}>
            <SyncStatusChip />
            <TouchableOpacity
              style={styles.settingsBtn}
              onPress={() => router.push("/settings")}
            >
              <Feather name="settings" size={20} color="rgba(255,255,255,0.9)" />
            </TouchableOpacity>
          </View>
        </View>
        {!isOnline && (
          <View style={styles.offlineBanner}>
            <Feather name="wifi-off" size={12} color="#FF9500" />
            <Text style={styles.offlineText}>
              Offline — Using cached prices
              {syncStatus.lastSyncTs ? ` from ${new Date(syncStatus.lastSyncTs).toLocaleDateString()}` : ""}
            </Text>
          </View>
        )}
      </LinearGradient>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>QUICK ACTIONS</Text>
        <View style={styles.cardGrid}>
          <View style={styles.cardRow}>
            <QuickActionCard
              icon="sun"
              title="Panel Optimizer"
              subtitle="GPS tilt & direction"
              onPress={() => router.push("/(tabs)/optimizer")}
            />
            <QuickActionCard
              icon="sliders"
              title="Price Calculator"
              subtitle="Live system pricing"
              onPress={() => router.push("/(tabs)/calculator")}
            />
          </View>
          <View style={styles.cardRow}>
            <QuickActionCard
              icon="zap"
              title="Energy Calculator"
              subtitle="Appliance load sizing"
              onPress={() => router.push("/(tabs)/energy")}
              accent="#FF9500"
            />
            <QuickActionCard
              icon="file-text"
              title="Generate BOQ"
              subtitle="PDF bill of quantities"
              onPress={() => router.push("/(tabs)/boq")}
              accent="#34C759"
            />
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, marginTop: 24 }]}>RECENT BOQs</Text>
        {recentBOQs.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: colors.card }]}>
            <Feather name="file-text" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No BOQs generated yet</Text>
            <Text style={[styles.emptySubtext, { color: colors.mutedForeground }]}>
              Tap "Generate BOQ" to create your first quote
            </Text>
          </View>
        ) : (
          recentBOQs.map((doc) => (
            <BOQListItem
              key={doc.id}
              doc={doc}
              onPress={() => router.push("/(tabs)/boq")}
              onLongPress={() => handleDeleteBOQ(doc)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: { gap: 0 },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  headerSubtitle: { color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: "500", marginTop: -2 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  settingsBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  offlineBanner: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(0,0,0,0.2)", borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6, marginTop: 10,
  },
  offlineText: { color: "#FF9500", fontSize: 12 },
  content: { padding: 16 },
  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, marginBottom: 12 },
  cardGrid: { gap: 10 },
  cardRow: { flexDirection: "row", gap: 10 },
  empty: {
    borderRadius: 16, padding: 32, alignItems: "center", gap: 8,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  emptyText: { fontSize: 15, fontWeight: "600", marginTop: 8 },
  emptySubtext: { fontSize: 13, textAlign: "center" },
});
