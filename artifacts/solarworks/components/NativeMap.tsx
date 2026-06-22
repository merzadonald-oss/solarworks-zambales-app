import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface MarkerData {
  latitude: number;
  longitude: number;
}

interface Props {
  latitude: number;
  longitude: number;
  onPress?: (lat: number, lng: number) => void;
}

export function NativeMap({ latitude, longitude }: Props) {
  const colors = useColors();
  return (
    <View style={[styles.placeholder, { backgroundColor: colors.muted }]}>
      <Feather name="map" size={48} color={colors.mutedForeground} />
      <Text style={[styles.text, { color: colors.mutedForeground }]}>
        Map available on device
      </Text>
      <Text style={[styles.coords, { color: colors.mutedForeground }]}>
        {latitude.toFixed(5)}, {longitude.toFixed(5)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    minHeight: 280,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  text: { fontSize: 14, fontWeight: "500" },
  coords: { fontSize: 12 },
});
