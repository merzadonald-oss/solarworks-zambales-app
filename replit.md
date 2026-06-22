# SolarWorks Zambales

A production-ready offline-capable solar PV design and quoting mobile app built with Expo/React Native for the Philippines market.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- Main app: `artifacts/solarworks/` — Expo React Native app
- API server: `artifacts/api-server/` — Express API
- App screens: `artifacts/solarworks/app/(tabs)/` — 5-tab navigation
- DB context: `artifacts/solarworks/context/DatabaseContext.tsx` (web/AsyncStorage), `DatabaseContext.native.tsx` (iOS/Android/SQLite)
- Calculations: `artifacts/solarworks/utils/engCalc.ts`
- PDF generation: `artifacts/solarworks/utils/pdfGenerator.ts`
- Seed data: `artifacts/solarworks/constants/seeds.ts`

## Architecture decisions

- **Platform-specific DB**: `DatabaseContext.native.tsx` uses expo-sqlite (full offline SQLite); `DatabaseContext.tsx` uses AsyncStorage (web preview). Same API surface, different backends.
- **Maps shim**: `NativeMap.native.tsx` uses react-native-maps (native only); `NativeMap.tsx` shows a placeholder on web (react-native-maps doesn't support web).
- **PDF via expo-print**: BOQ PDFs are HTML-rendered via expo-print, saved to FileSystem, shared via expo-sharing.
- **Price sync**: Admin sets a Google Sheets CSV URL in Settings. App fetches it on launch and upserts prices into SQLite. Falls back to cached prices when offline.
- **Admin PIN**: Stored in expo-secure-store on native, fallback to DB settings on web. Default PIN: `0000`.

## Product

- **Home**: Dashboard with quick-action cards, recent BOQ list, sync status chip
- **Panel Optimizer**: GPS location, OpenStreetMap (native), optimal tilt angle calculator (year-round/summer/winter), SVG compass with live magnetometer
- **Price Calculator**: System type (Hybrid/Grid-Tie/Off-Grid), kW sizing, panel wattage, battery capacity → live price breakdown with PHP/USD toggle
- **Energy Calculator**: Appliance picker from seeded library (19 appliances, 6 categories), qty/hours steppers, load summary, system sizing recommendation with battery options
- **BOQ Generator**: Project details form, PDF generation (HTML → expo-print → share), history with long-press delete
- **Settings**: USD rate, price sync, admin PIN modal (numpad), company info for PDF letterhead, price reset

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- `react-native-maps` must stay at pinned version and **must NOT be added to plugins in app.json**
- `expo-sqlite` requires `DatabaseContext.native.tsx` for native; web uses AsyncStorage fallback in `DatabaseContext.tsx`
- Expo sensors (Magnetometer) loaded via dynamic `import()` on native to avoid web bundling issues
- Metro config adds `.wasm` to asset extensions for expo-sqlite web support
- Package versions must match Expo SDK 54 expected versions (see expo start warnings)
- All amounts stored in PHP internally; USD is display-only conversion
- Default admin PIN is `0000`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See the `expo` skill for Expo-specific patterns
