import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Linking } from "react-native";
import { Feather } from "@expo/vector-icons";

interface Props {
  latitude: number;
  longitude: number;
  onPress?: (lat: number, lng: number) => void;
}

export function NativeMap({ latitude, longitude }: Props) {
  const openMaps = () => {
    const url = `geo:${latitude},${longitude}?q=${latitude},${longitude}(Site)`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
      );
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconRow}>
        <View style={styles.iconBg}>
          <Feather name="map-pin" size={28} color="#E87C27" />
        </View>
      </View>
      <Text style={styles.coordText}>
        {latitude.toFixed(5)}°N, {longitude.toFixed(5)}°E
      </Text>
      <Text style={styles.hint}>
        Use the GPS button or edit coordinates below
      </Text>
      <TouchableOpacity style={styles.mapsBtn} onPress={openMaps} activeOpacity={0.8}>
        <Feather name="external-link" size={14} color="#fff" />
        <Text style={styles.mapsBtnText}>Open in Google Maps</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 260,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f4f8",
    gap: 10,
    padding: 24,
  },
  iconRow: {
    marginBottom: 4,
  },
  iconBg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  coordText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1F36",
    letterSpacing: 0.3,
  },
  hint: {
    fontSize: 12,
    color: "#888",
    textAlign: "center",
  },
  mapsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E87C27",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 4,
  },
  mapsBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
});
