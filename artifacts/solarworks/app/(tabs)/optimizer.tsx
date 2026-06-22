import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Platform, ActivityIndicator, Alert,
} from "react-native";
import * as Location from "expo-location";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { CompassView } from "@/components/CompassView";
import { NativeMap } from "@/components/NativeMap";
import { EngCalc } from "@/utils/engCalc";

type TiltMode = "year_round" | "summer" | "winter";

export default function OptimizerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [lat, setLat] = useState<number>(15.5);
  const [lng, setLng] = useState<number>(120.0);
  const [latInput, setLatInput] = useState("15.5");
  const [lngInput, setLngInput] = useState("120.0");
  const [tiltMode, setTiltMode] = useState<TiltMode>("year_round");
  const [heading, setHeading] = useState(0);
  const [locating, setLocating] = useState(false);
  const [magnetometerAvail, setMagnetometerAvail] = useState(false);
  const subscriptionRef = useRef<any>(null);

  const declination = EngCalc.magDeclination(lat, lng);
  const bearing = EngCalc.compassBearing(declination);
  const tiltAngle = EngCalc.optimalTilt(lat, tiltMode);
  const psh = 5.5;

  useEffect(() => {
    if (Platform.OS === "web") return;
    let mounted = true;
    (async () => {
      try {
        const { Magnetometer } = await import("expo-sensors");
        const avail = await Magnetometer.isAvailableAsync();
        if (!mounted) return;
        setMagnetometerAvail(avail);
        if (avail) {
          Magnetometer.setUpdateInterval(200);
          subscriptionRef.current = Magnetometer.addListener((data: { x: number; y: number }) => {
            const { x, y } = data;
            let angle = Math.atan2(y, x) * (180 / Math.PI);
            if (angle < 0) angle += 360;
            setHeading(angle);
          });
        }
      } catch {}
    })();
    return () => {
      mounted = false;
      subscriptionRef.current?.remove();
    };
  }, []);

  const locateMe = async () => {
    if (Platform.OS === "web") {
      Alert.alert("GPS", "GPS is available on device via Expo Go app.");
      return;
    }
    setLocating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Location permission denied", "Please enable location in settings.");
      setLocating(false);
      return;
    }
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    const { latitude, longitude } = pos.coords;
    setLat(latitude);
    setLng(longitude);
    setLatInput(latitude.toFixed(6));
    setLngInput(longitude.toFixed(6));
    setLocating(false);
  };

  const applyCoords = () => {
    const newLat = parseFloat(latInput);
    const newLng = parseFloat(lngInput);
    if (!isNaN(newLat) && !isNaN(newLng)) {
      setLat(newLat);
      setLng(newLng);
    }
  };

  const modes: Array<{ key: TiltMode; label: string }> = [
    { key: "year_round", label: "Year-Round" },
    { key: "summer", label: "Summer" },
    { key: "winter", label: "Winter" },
  ];

  const compassDisplay = magnetometerAvail ? heading : bearing;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <View style={styles.mapContainer}>
        <NativeMap
          latitude={lat}
          longitude={lng}
          onPress={(newLat, newLng) => {
            setLat(newLat); setLng(newLng);
            setLatInput(newLat.toFixed(6)); setLngInput(newLng.toFixed(6));
          }}
        />
        <TouchableOpacity
          style={[styles.gpsBtn, { backgroundColor: colors.primary }]}
          onPress={locateMe}
          disabled={locating}
        >
          {locating
            ? <ActivityIndicator color="#fff" size="small" />
            : <Feather name="crosshair" size={20} color="#fff" />}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={[styles.bottomSheet, { backgroundColor: colors.card }]}
        contentContainerStyle={[styles.sheetContent, { paddingBottom: bottomPad + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

        <View style={styles.coordRow}>
          <View style={styles.coordField}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Latitude</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }]}
              value={latInput}
              onChangeText={setLatInput}
              onBlur={applyCoords}
              keyboardType="numeric"
              returnKeyType="done"
              onSubmitEditing={applyCoords}
            />
          </View>
          <View style={styles.coordField}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Longitude</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }]}
              value={lngInput}
              onChangeText={setLngInput}
              onBlur={applyCoords}
              keyboardType="numeric"
              returnKeyType="done"
              onSubmitEditing={applyCoords}
            />
          </View>
        </View>

        <View style={styles.segRow}>
          {modes.map((m) => (
            <TouchableOpacity
              key={m.key}
              style={[styles.seg, {
                backgroundColor: tiltMode === m.key ? colors.primary : colors.muted,
                borderColor: tiltMode === m.key ? colors.primary : colors.border
              }]}
              onPress={() => { setTiltMode(m.key); Haptics.selectionAsync(); }}
            >
              <Text style={[styles.segText, { color: tiltMode === m.key ? "#fff" : colors.foreground }]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.compassSection}>
          <CompassView bearing={compassDisplay} />
          <Text style={[styles.compassNote, { color: colors.mutedForeground }]}>
            {magnetometerAvail ? "Live compass reading" : `Optimal azimuth: ${bearing.toFixed(1)}° (due South)`}
          </Text>
        </View>

        <View style={styles.resultsGrid}>
          <ResultCard label="Tilt Angle" value={`${tiltAngle}°`} icon="trending-up" colors={colors} />
          <ResultCard label="Face Direction" value={`${bearing.toFixed(1)}° mag`} icon="compass" colors={colors} />
          <ResultCard label="Peak Sun Hours" value={`${psh} h/day`} icon="sun" colors={colors} />
          <ResultCard label="Declination" value={`${declination > 0 ? "+" : ""}${declination}°`} icon="activity" colors={colors} />
        </View>

        <View style={[styles.noteBox, { backgroundColor: colors.orangeLight }]}>
          <Text style={[styles.noteText, { color: colors.orange }]}>
            Optimal tilt for Zambales ({lat.toFixed(2)}°N): {tiltAngle}° facing True South (180°).
            Magnetic declination: {declination}°. PSH: {psh} h/day.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function ResultCard({ label, value, icon, colors }: any) {
  return (
    <View style={[styles.resultCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <Feather name={icon} size={16} color={colors.primary} />
      <Text style={[styles.resultValue, { color: colors.primary }]}>{value}</Text>
      <Text style={[styles.resultLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  mapContainer: { flex: 1, minHeight: 260, position: "relative" },
  gpsBtn: {
    position: "absolute", bottom: 16, right: 16,
    width: 48, height: 48, borderRadius: 24,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  bottomSheet: {
    maxHeight: "58%",
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 8,
  },
  sheetContent: { padding: 20 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  coordRow: { flexDirection: "row", gap: 12, marginBottom: 14 },
  coordField: { flex: 1 },
  label: { fontSize: 11, fontWeight: "600", marginBottom: 4 },
  input: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 12,
    paddingVertical: 8, fontSize: 14,
  },
  segRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  seg: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, alignItems: "center" },
  segText: { fontSize: 12, fontWeight: "600" },
  compassSection: { alignItems: "center", marginBottom: 16, gap: 8 },
  compassNote: { fontSize: 11 },
  resultsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  resultCard: {
    width: "47%", padding: 14, borderRadius: 12, gap: 4,
    borderWidth: 1,
  },
  resultValue: { fontSize: 20, fontWeight: "800" },
  resultLabel: { fontSize: 11 },
  noteBox: { borderRadius: 10, padding: 12 },
  noteText: { fontSize: 11, lineHeight: 17 },
});
