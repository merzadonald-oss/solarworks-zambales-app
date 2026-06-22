import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export function SyncStatusChip() {
  const { syncStatus, isOnline } = useApp();
  const colors = useColors();

  const isOffline = !isOnline || syncStatus.status === "offline";
  const bg = isOffline ? "#FF950015" : "#34C75915";
  const textColor = isOffline ? "#FF9500" : "#34C759";
  const icon = isOffline ? "wifi-off" : "check-circle";

  let label = "Prices Updated";
  if (syncStatus.status === "syncing") label = "Syncing...";
  else if (isOffline) label = "Offline Cache";
  else if (syncStatus.status === "no_url") label = "No Sync URL";

  return (
    <View style={[styles.chip, { backgroundColor: bg, borderColor: textColor + "40" }]}>
      <Feather name={icon as any} size={12} color={textColor} />
      <Text style={[styles.text, { color: textColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  text: {
    fontSize: 11,
    fontWeight: "600",
  },
});
