import React from "react";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { BOQDocument } from "@/context/DatabaseContext";
import { formatPhp } from "@/utils/currencyFormatter";
import { useColors } from "@/hooks/useColors";

interface Props {
  doc: BOQDocument;
  onPress: () => void;
  onLongPress: () => void;
}

function systemLabel(t: string): string {
  if (t === "HYBRID") return "Hybrid";
  if (t === "GRID_TIE") return "Grid-Tie";
  return "Off-Grid";
}

export function BOQListItem({ doc, onPress, onLongPress }: Props) {
  const colors = useColors();
  const date = new Date(doc.created_at);
  const dateStr = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;

  return (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: colors.card }]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.75}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.orangeLight }]}>
        <Feather name="file-text" size={20} color={colors.primary} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.boqNum, { color: colors.primary }]}>{doc.boq_number}</Text>
        <Text style={[styles.desc, { color: colors.foreground }]}>
          {doc.system_kw}kWp {systemLabel(doc.system_type)}
          {doc.location ? ` • ${doc.location}` : ""}
        </Text>
        <Text style={[styles.date, { color: colors.mutedForeground }]}>{dateStr}</Text>
      </View>
      <View style={styles.right}>
        <Text style={[styles.total, { color: colors.primary }]}>{formatPhp(doc.total_php)}</Text>
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    gap: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  info: { flex: 1, gap: 2 },
  boqNum: { fontSize: 12, fontWeight: "700" },
  desc: { fontSize: 13, fontWeight: "500" },
  date: { fontSize: 11 },
  right: { alignItems: "flex-end", gap: 4 },
  total: { fontSize: 13, fontWeight: "700" },
});
