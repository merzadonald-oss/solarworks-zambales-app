import React from "react";
import { StyleSheet } from "react-native";
import MapView, { Marker, UrlTile } from "react-native-maps";

interface Props {
  latitude: number;
  longitude: number;
  onPress?: (lat: number, lng: number) => void;
}

export function NativeMap({ latitude, longitude, onPress }: Props) {
  return (
    <MapView
      style={styles.map}
      region={{
        latitude,
        longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }}
      onPress={(e) => {
        const { latitude: lat, longitude: lng } = e.nativeEvent.coordinate;
        onPress?.(lat, lng);
      }}
    >
      <UrlTile
        urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maximumZ={19}
      />
      <Marker coordinate={{ latitude, longitude }} pinColor="#E87C27" />
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1, minHeight: 280 },
});
