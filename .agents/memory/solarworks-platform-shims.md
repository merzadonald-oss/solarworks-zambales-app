---
name: SolarWorks platform shims
description: How to handle native-only packages (react-native-maps, expo-sqlite) in the SolarWorks Expo app to allow web bundling
---

## Rule

Any package that imports native-only React Native internals (e.g. `codegenNativeCommands`) or WASM will fail the web bundler. Use platform-specific files to shim them.

**Why:** react-native-maps and expo-sqlite both break the Expo web bundler (Metro) when imported directly.

## react-native-maps

- `components/NativeMap.native.tsx` — real MapView with OpenStreetMap UrlTile and Marker (native only)
- `components/NativeMap.tsx` — stub with a grey placeholder box (web)
- Never import `react-native-maps` anywhere except `NativeMap.native.tsx`

## expo-sqlite

- `context/DatabaseContext.native.tsx` — full SQLite implementation using `expo-sqlite` async API
- `context/DatabaseContext.tsx` — AsyncStorage-backed in-memory fallback for web preview
- Both export the same `DatabaseContextType` interface and `useDatabase()` hook

## expo-sensors (Magnetometer)

- Use dynamic `import("expo-sensors")` inside a `useEffect` guarded by `Platform.OS !== "web"` to avoid web bundler errors.

## metro.config.js

- Add `config.resolver.assetExts.push("wasm")` to allow expo-sqlite web worker to load its WASM module.
