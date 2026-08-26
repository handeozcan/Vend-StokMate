# StokMate Mobile Implementation Plan (Expo + React Native)

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the StokMate field-staff mobile app (login, product list with search/filters/infinite pagination, detail, quick stock update, full edit, profile) against the fixed .NET API, shipped as an installable Android APK.

**Architecture:** Expo (managed) + Expo Router file-based navigation with group-based auth gating; the SAME thin typed API layer as the web app (axios + interceptors, single-flight 401 refresh) ported verbatim; TanStack Query as the data layer; Zustand session store persisted to Expo SecureStore (Keychain/Keystore); filters in screen state (spec §4.2). Spec: `stokmate-web/docs/superpowers/specs/2026-08-26-stokmate-architecture-design.md` (mobile sections §3, §6, §9–§16, §18).

**Tech Stack:** Expo (current SDK from create-expo-app), expo-router, TypeScript, React Native Paper (MD3), TanStack Query v5, Axios, React Hook Form, Zod, Zustand + expo-secure-store, expo-image.

**Skill references:** implementers of UI tasks should invoke `building-native-ui`; the APK task invokes `expo-deployment`.

**Deviations from skills, per approved spec (user instructions > skills):**
- `native-data-fetching` prefers `expo/fetch`; the spec mandates axios with interceptors in BOTH apps (§3, §7) — identical, battle-tested pipeline from the web app. Keep axios.
- `building-native-ui` leans iOS-native (SF Symbols, NativeTabs, formSheet). Target is an **Android APK** with RN Paper (spec §3) — use expo-router's cross-platform JS `Tabs`, Paper components, and inline styles.

**Dev loop:** Expo Go on an Android emulator (`npx expo start`, press `a`). The .NET API runs on the host: base URL `http://10.0.2.2:5080` for the emulator (`localhost` from inside the emulator is the emulator itself); physical device needs the LAN IP. Cleartext HTTP is enabled in `app.json` (spec §18).

**Verification approach (no test framework by approved spec):** every task ends with `npx tsc --noEmit` (must be clean) or a full type-check/lint run, plus emulator smoke checks where noted. Emulator checks require:
1. The .NET API running on the host (see plan header of the web plan, or `cd /Users/handeozcan/Desktop/StokMate && dotnet run --project src/StokMate.Api` → port 5080)
2. An Android emulator booted (Android Studio Device Manager) with Expo Go installed — **user-assisted setup if missing; ask, don't guess.**

**API contract quick reference (verified):** all errors are Turkish `text/plain` strings (never JSON); prices are kuruş ints (1999 = 19,99 ₺); no `GET /products/{id}`; `PUT /products/{id}` is full-replace requiring `supplierId`, `costPrice`, `description` which no GET returns; access tokens expire in 15 min; refresh tokens are single-use with rotation. Test user: `test@ornek.com` / `Test1234!`. Seed: 80 products / 8 categories / 12 brands / 6 suppliers.

**Ported-from-web code:** `types/api.ts`, `lib/enums.ts` (minus STATUS_STYLES → RN Paper chip colors), `lib/format.ts`, `api/*` are near-verbatim ports of the web app's files (same names, same shapes — spec §4.1). The web app lives at `../stokmate-web/`; when a step says "port verbatim from the web app", copy from there and apply only the diffs written in the step.

**Approved deviations from spec §6's tree:** `api/`, `types/`, `lib/`, `store/`, `features/` sit at the PROJECT ROOT (matching the Expo scaffold's root-level `app/`) rather than under `src/`; product routes live inside the `(app)` group as siblings of `(tabs)` (not at `app/product/` as sketched) so they stay behind the auth gate while hiding the tab bar.

**Working directory:** unless a step shows an explicit `cd`, all `npx`/`npm`/`git add` commands inside tasks run from `stokmate-mobile/`.

**SDK 57 layout note (discovered at implementation):** the create-expo-app SDK 57 default template places ALL app code under `src/` — routes at `src/app/`, and every shared directory (`lib/`, `api/`, `types/`, `store/`, `features/`, `components/`, `theme.ts`) lives at `src/…` too. Wherever a task below writes a path like `app/(auth)/login.tsx` or `lib/env.ts` or `features/products/…`, the ACTUAL path is `src/app/(auth)/login.tsx`, `src/lib/env.ts`, `src/features/products/…` (env.ts already lives at `src/lib/env.ts`, commit 39621cd). Only `app.json`, `eas.json`, `tsconfig.json`, `.env*` stay at the project root. `tsconfig` paths map `@/*` → `./src/*` (no baseUrl — TS 6 deprecates it).

---

## Chunk 1: Scaffold, config, data layer

### Task 1: Expo scaffold + native config + dependencies

**Files:**
- Create: `stokmate-mobile/` (via create-expo-app)
- Modify: `stokmate-mobile/app.json` (name, cleartext HTTP, package id)
- Create: `stokmate-mobile/eas.json` (build profiles for the APK deliverable)

- [ ] **Step 1: Scaffold the app**

Run from `/Users/handeozcan/Desktop/Vend-Stokmate/`:

```bash
npx create-expo-app@latest stokmate-mobile
```

Default template (expo-router + TypeScript included). Record the Expo SDK version it installs (`node -e "console.log(require('./stokmate-mobile/node_modules/expo/package.json').version)"` — print it in the commit-report; do NOT assume a specific SDK from prior knowledge).

- [ ] **Step 2: Install libraries**

From `stokmate-mobile/`:

```bash
# Expo-native packages via expo install (version-matched to the SDK)
npx expo install expo-secure-store expo-image react-native-safe-area-context

# JS libraries
npm install @tanstack/react-query axios react-hook-form zod @hookform/resolvers zustand react-native-paper
```

- [ ] **Step 2b: Ensure the `@/*` tsconfig alias** — the create-expo-app default template typically does NOT define `paths`, and every ported file imports via `@/`. Check `tsconfig.json`; it must extend `expo/tsconfig.base` AND contain:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": { "@/*": ["./*"] }
  }
}
```

(Keep any other scaffold compilerOptions; the required additions are `baseUrl` + `paths`. Without them `npx tsc --noEmit` fails on every `@/` import even though Metro bundles fine.)

- [ ] **Step 3: Configure `app.json`**

Apply these edits to the generated `app.json` (keep all other scaffold fields — EXPO SDK placeholders like `scheme`, `newArchEnabled`, plugins MUST stay):

```json
{
  "expo": {
    "name": "StokMate",
    "slug": "stokmate-mobile",
    "version": "1.0.0",
    "orientation": "portrait",
    "userInterfaceStyle": "light",
    "android": {
      "package": "com.stokmate.mobile",
      "usesCleartextTraffic": true,
      "adaptiveIcon": { "backgroundColor": "#0f766e" }
    },
    "ios": {
      "bundleIdentifier": "com.stokmate.mobile",
      "infoPlist": {
        "NSAppTransportSecurity": {
          "NSAllowsArbitraryLoads": true
        }
      }
    },
    "plugins": []
  }
}
```

(Overlay `name`/`slug`/`android`/`ios`/`userInterfaceStyle` onto the scaffold config; do not delete scaffold-only keys like `scheme`, `web`, `newArchEnabled`. `usesCleartextTraffic` + the ATS exception allow plain HTTP to the local API — spec §18.)

- [ ] **Step 4: Create `eas.json`** — APK deliverable profiles

```json
{
  "cli": {
    "version": ">= 16.0.1"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "autoIncrement": true,
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
```

(`preview` → installable APK via `eas build -p android --profile preview` — the assignment deliverable. Task 13 executes the build.)

- [ ] **Step 5: Root `.gitignore` additions**

Append to `/Users/handeozcan/Desktop/Vend-Stokmate/.gitignore` (the create-expo-app scaffold also writes `stokmate-mobile/.gitignore` — keep it; verify it exists):

```gitignore
# Expo
*.orig.*
*.jks
*.p8
*.p12
*.key
*.mobileprovision
```

- [ ] **Step 6: Verify**

```bash
cd /Users/handeozcan/Desktop/Vend-Stokmate/stokmate-mobile
npx tsc --noEmit
```

Expected: exit 0 (untouched scaffold type-checks).

- [ ] **Step 7: Commit**

```bash
cd /Users/handeozcan/Desktop/Vend-Stokmate
git add .gitignore stokmate-mobile
git commit -m "chore: expo scaffold, native config and eas build profiles"
```

Expected: commit succeeds; `git status` clean.

### Task 2: Environment config

**Files:**
- Create: `stokmate-mobile/.env` (gitignored — per-device host addresses)
- Create: `stokmate-mobile/.env.example` (committed)
- Modify: `stokmate-mobile/.gitignore` (un-ignore `.env.example`)
- Create: `stokmate-mobile/lib/env.ts`

- [ ] **Step 1: Create `.env`** (emulator default — switch to the LAN IP for a physical device)

```dotenv
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:5080
```

- [ ] **Step 2: Create `.env.example`**

```dotenv
# The .NET API base URL as seen from the device.
# Android emulator: http://10.0.2.2:5080  (host machine's localhost)
# Physical device:  http://<YOUR-LAN-IP>:5080  (same Wi-Fi network as the API)
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:5080
```

- [ ] **Step 3: Un-ignore `.env.example`** — add to `stokmate-mobile/.gitignore` after the scaffold's ignore list:

```gitignore
!.env.example
```

- [ ] **Step 4: Create `lib/env.ts`** — the single `process.env` touchpoint

```ts
const rawBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

if (!rawBaseUrl) {
  throw new Error(
    'EXPO_PUBLIC_API_BASE_URL tanımlı değil. .env.example dosyasını .env olarak kopyalayın.',
  );
}

// Strip trailing slashes so "http://10.0.2.2:5080/" + "/products" can never
// produce "//products".
const baseUrl = rawBaseUrl.replace(/\/+$/, '');

export const env = {
  API_BASE_URL: baseUrl,
} as const;
```

- [ ] **Step 5: Verify types compile**

```bash
npx tsc --noEmit
```

Expected: exit 0. (Env values inline at bundle time — restart `expo start` after any `.env` change.)

- [ ] **Step 6: Commit**

```bash
git add .env.example .gitignore lib/env.ts
git commit -m "feat: environment configuration"
```

(`.env` must NOT be staged — verify with `git status`.)

### Task 3: API types, enum maps, formatting helpers (port from web)

**Files:**
- Create: `stokmate-mobile/types/api.ts`
- Create: `stokmate-mobile/lib/enums.ts`
- Create: `stokmate-mobile/lib/format.ts`

- [ ] **Step 1: Port `types/api.ts` verbatim** from `stokmate-web/types/api.ts` — byte-identical (no `@/` imports needed in this file).

- [ ] **Step 2: Create `lib/enums.ts`** — web port with Paper chip colors instead of Tailwind classes

```ts
import type { ProductStatus, ProductUnit } from '@/types/api';

export const UNIT_LABELS: Record<ProductUnit, string> = {
  1: 'Adet',
  2: 'Kg',
  3: 'Lt',
  4: 'Paket',
};

export const STATUS_LABELS: Record<ProductStatus, string> = {
  1: 'Aktif',
  2: 'Pasif',
  3: 'Üretim Durduruldu',
};

/** React Native Paper Chip props for status display. */
export const STATUS_CHIP_PROPS: Record<
  ProductStatus,
  { mode: 'flat' | 'outlined'; selectedColor: string; textStyle: { color: string } }
> = {
  1: { mode: 'flat', selectedColor: '#059669', textStyle: { color: '#065f46' } },
  2: { mode: 'outlined', selectedColor: '#52525b', textStyle: { color: '#52525b' } },
  3: { mode: 'flat', selectedColor: '#dc2626', textStyle: { color: '#991b1b' } },
};

export const unitLabel = (unit: ProductUnit): string => UNIT_LABELS[unit] ?? String(unit);
export const statusLabel = (status: ProductStatus): string =>
  STATUS_LABELS[status] ?? String(status);
```

(The exact chip tinting can be adjusted when the list screen lands in Task 9 — what matters now is the map shape.)

- [ ] **Step 3: Port `lib/format.ts` verbatim** from `stokmate-web/lib/format.ts` (formatKurus / toKurus / formatDateTime — byte-identical).

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add types/api.ts lib/enums.ts lib/format.ts
git commit -m "feat: api contract types, enum maps, money/date formatting"
```

### Task 4: Session store (SecureStore-backed)

**Files:**
- Create: `stokmate-mobile/store/auth.ts`

- [ ] **Step 1: Create `store/auth.ts`**

```ts
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import type { AuthResponse, UserDto } from '@/types/api';

// Tokens live in the iOS Keychain / Android Keystore — never AsyncStorage.
const secureStorage = {
  getItem: (name: string) => SecureStore.getItemAsync(name).then((value) => value ?? null),
  setItem: (name: string, value: string) => SecureStore.setItemAsync(name, value),
  removeItem: (name: string) => SecureStore.deleteItemAsync(name),
};

interface AuthState {
  user: UserDto | null;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: string | null;
  /** SecureStore reads are ASYNC on native — the guard must wait for this. */
  hydrated: boolean;
  setSession: (session: AuthResponse) => void;
  setHydrated: () => void;
  clearSession: () => void;
}

/**
 * Session is the only global client state (spec §9). Unlike the web store
 * there is no SSR, so no skipHydration is needed — persist rehydrates from
 * SecureStore asynchronously on launch and `onRehydrateStorage` flips the
 * `hydrated` flag the route gate waits on.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      hydrated: false,
      setSession: (session) =>
        set({
          user: session.user,
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          expiresAt: session.expiresAt,
        }),
      setHydrated: () => set({ hydrated: true }),
      clearSession: () =>
        set({ user: null, accessToken: null, refreshToken: null, expiresAt: null }),
    }),
    {
      name: 'stokmate-auth',
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        expiresAt: state.expiresAt,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add store/auth.ts
git commit -m "feat: zustand session store persisted to secure store"
```

### Task 5: Axios client, error normalization, auth/product/lookup API (port from web)

**Files:**
- Create: `stokmate-mobile/api/errors.ts`
- Create: `stokmate-mobile/api/client.ts`
- Create: `stokmate-mobile/api/auth.ts`
- Create: `stokmate-mobile/api/products.ts`
- Create: `stokmate-mobile/api/lookups.ts`

- [ ] **Step 1: Port `api/errors.ts` verbatim** from `stokmate-web/api/errors.ts` (byte-identical — axios error normalization, text/plain bodies, Turkish messages).

- [ ] **Step 2: Port `api/client.ts` verbatim** from `stokmate-web/api/client.ts` (byte-identical: module augmentation, Bearer injection, single-flight refresh with stale-token replay short-circuit, 401 pipeline, `clearSession` on failure).

- [ ] **Step 3: Port `api/auth.ts`, `api/products.ts`, `api/lookups.ts` verbatim** from the web app.

Note for the implementer: the ONLY acceptable diff vs the web files is the import path style — the web files already use `@/...` aliases, which the Expo scaffold's tsconfig also maps to the project root. After porting, `git diff --no-index stokmate-web/api stokmate-mobile/api` should show zero output.

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add api
git commit -m "feat: axios client with bearer injection and single-flight 401 refresh"
```

---

## Chunk 2: Providers, auth gate, tabs, login, profile, query hooks

### Task 6: Theme, providers, route groups, auth gate, screen stubs

**Files:**
- Create: `stokmate-mobile/theme.ts`
- Create: `stokmate-mobile/components/splash.tsx`
- Modify: `stokmate-mobile/app/_layout.tsx` (replace scaffold entirely)
- Create: `stokmate-mobile/app/(auth)/login.tsx` (stub — Task 7 replaces)
- Create: `stokmate-mobile/app/(app)/_layout.tsx` (auth gate + stack)
- Create: `stokmate-mobile/app/(app)/(tabs)/_layout.tsx` (bottom tabs)
- Create: `stokmate-mobile/app/(app)/(tabs)/index.tsx` (list stub — Task 9)
- Create: `stokmate-mobile/app/(app)/(tabs)/profile.tsx` (stub — Task 8)
- Create: `stokmate-mobile/app/(app)/product/[id]/index.tsx` (detail stub — Task 10)
- Create: `stokmate-mobile/app/(app)/product/[id]/edit.tsx` (edit stub — Task 12)
- Delete: any scaffold example routes (e.g. `app/tabs/`, `app/+not-found.tsx` keep, `app/modal.tsx`, `app/index.tsx` if present) — remove everything not listed above except `_layout.tsx` and `+not-found.tsx`

Route map (expo-router groups):
- `(auth)` — unauthenticated area (only `login`)
- `(app)` — gated area: its `_layout` is the guard; contains `(tabs)` (Ürünler/Profil) and the `product/[id]` stack screens. Product screens live OUTSIDE `(tabs)` so they push above the tab bar (tab bar hidden on detail/edit) while staying behind the gate.
- `/` resolves to `(app)/(tabs)/index` — the product list.

- [ ] **Step 1: Create `theme.ts`** — Paper MD3 theme matching the web brand

```ts
import { MD3LightTheme } from 'react-native-paper';

export const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#0f766e',
    onPrimary: '#ffffff',
    primaryContainer: '#ccfbf1',
    onPrimaryContainer: '#042f2e',
    secondary: '#52525b',
    background: '#f4f5f7',
    surface: '#ffffff',
  },
};
```

- [ ] **Step 2: Create `components/splash.tsx`**

```tsx
import { ActivityIndicator, View } from 'react-native';
import { useTheme } from 'react-native-paper';

/** Shown while the session rehydrates from SecureStore (async on native). */
export function Splash() {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );
}
```

- [ ] **Step 3: Replace `app/_layout.tsx`** — providers + root stack

```tsx
import { Stack } from 'expo-router/stack';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppState } from 'react-native';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { ApiError } from '@/api/errors';
import { theme } from '@/theme';

// "Focus" on native = the app is in the foreground (spec §11: mobile uses
// standard mount/focus refetching; the web-only 60s interval bonus is not ported).
focusManager.setEventListener((setFocused) => {
  const subscription = AppState.addEventListener('change', (state) => {
    setFocused(state === 'active');
  });
  return () => subscription.remove();
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Retry only network-level failures (ApiError without status), max once.
      retry: (failureCount, error) =>
        error instanceof ApiError && error.status === undefined && failureCount < 1,
    },
    mutations: { retry: false },
  },
});

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <QueryClientProvider client={queryClient}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(app)" />
            <Stack.Screen name="(auth)" />
          </Stack>
        </QueryClientProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
```

(The focusManager listener registration runs once at module scope — no React lifecycle involved.)

- [ ] **Step 4: Create `app/(auth)/login.tsx` stub**

```tsx
export default function Login() {
  return null; // STUB — replaced in Task 7
}
```

- [ ] **Step 5: Create `app/(app)/_layout.tsx`** — the auth gate

```tsx
import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/store/auth';
import { Splash } from '@/components/splash';

/**
 * Guard for the whole authed area (spec §14). SecureStore rehydration is
 * async → splash until `hydrated`; tokenless → /login. The interceptor's
 * failed-refresh path calls clearSession() and this layout reacts by
 * redirecting on the next render — the API layer never touches the router.
 */
export default function AppLayout() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const accessToken = useAuthStore((s) => s.accessToken);

  if (!hydrated) return <Splash />;
  if (!accessToken) return <Redirect href="/login" />;

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="product/[id]/index" options={{ title: 'Ürün Detayı' }} />
      <Stack.Screen name="product/[id]/edit" options={{ title: 'Ürünü Düzenle' }} />
    </Stack>
  );
}
```

- [ ] **Step 6: Create `app/(app)/(tabs)/_layout.tsx`** — bottom tabs

```tsx
import { Tabs } from 'expo-router/tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#0f766e',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Ürünler',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="format-list-bulleted" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
```

- [ ] **Step 7: Create the four screen stubs**

`app/(app)/(tabs)/index.tsx`:
```tsx
export default function ProductList() {
  return null; // STUB — replaced in Task 9
}
```

`app/(app)/(tabs)/profile.tsx`:
```tsx
export default function Profile() {
  return null; // STUB — replaced in Task 8
}
```

`app/(app)/product/[id]/index.tsx`:
```tsx
export default function ProductDetail() {
  return null; // STUB — replaced in Task 10
}
```

`app/(app)/product/[id]/edit.tsx`:
```tsx
export default function ProductEdit() {
  return null; // STUB — replaced in Task 12
}
```

- [ ] **Step 8: Remove scaffold example routes**

Delete everything under `app/` not in the list above (keep `_layout.tsx`, `+not-found.tsx` if the scaffold created it). Typical create-expo-app leftovers: `app/index.tsx` (scaffold welcome), `app/tabs/`, `app/modal.tsx`, `app/(tabs)/` scaffold content. `git rm` them.

- [ ] **Step 9: Verify type-check**

```bash
npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 10: Emulator smoke check (API + emulator must be running)**

```bash
npx expo start
```

Press `a` (Android emulator). Expected: app launches to a blank/login stub — NOT a red error screen. With SecureStore empty, the gate shows Splash briefly then redirects to the login stub (blank screen). Check the Metro logs for route errors like "unmatched route".

- [ ] **Step 11: Commit**

```bash
git add -A app theme.ts components
git commit -m "feat: paper theme, providers, auth gate and tab navigation"
```

### Task 7: Login screen

**Files:**
- Create: `stokmate-mobile/features/auth/schema.ts`
- Create: `stokmate-mobile/features/auth/use-login.ts`
- Modify: `stokmate-mobile/app/(auth)/login.tsx` (replace stub)

- [ ] **Step 1: Create `features/auth/schema.ts`**

```ts
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, 'E-posta zorunludur.').email('Geçerli bir e-posta girin.'),
  password: z.string().min(1, 'Şifre zorunludur.'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
```

- [ ] **Step 2: Create `features/auth/use-login.ts`**

```ts
import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/store/auth';

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authApi.login(email, password),
    onSuccess: setSession,
  });
}
```

- [ ] **Step 3: Replace the login stub** — RHF `Controller` + Paper inputs (Paper components are custom, so `register()` cannot attach — Controller is the correct integration)

```tsx
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Redirect } from 'expo-router';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { Button, HelperText, Surface, Text, TextInput } from 'react-native-paper';
import { useAuthStore } from '@/store/auth';
import { loginSchema, type LoginFormValues } from '@/features/auth/schema';
import { useLogin } from '@/features/auth/use-login';

export default function Login() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const login = useLogin();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  // Already authed → straight to the products list.
  if (hydrated && accessToken) return <Redirect href="/" />;

  const onSubmit = handleSubmit((values) => {
    // Guard: no double-fire while pending (each login rotates a refresh token).
    if (!login.isPending) login.mutate(values);
  });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, gap: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ gap: 4 }}>
          <Text variant="headlineMedium">StokMate</Text>
          <Text variant="bodyMedium">Saha personeli girişi</Text>
        </View>

        <Surface mode="elevated" elevation={1} style={{ borderRadius: 16, padding: 20, gap: 16 }}>
          <Controller
            control={control}
            name="email"
            render={({ field, fieldState }) => (
              <View>
                <TextInput
                  label="E-posta"
                  autoComplete="email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={Boolean(fieldState.error)}
                />
                {fieldState.error && (
                  <HelperText type="error" visible>
                    {fieldState.error.message}
                  </HelperText>
                )}
              </View>
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field, fieldState }) => (
              <View>
                <TextInput
                  label="Şifre"
                  autoComplete="password"
                  secureTextEntry
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={Boolean(fieldState.error)}
                />
                {fieldState.error && (
                  <HelperText type="error" visible>
                    {fieldState.error.message}
                  </HelperText>
                )}
              </View>
            )}
          />

          {login.isError && (
            <HelperText type="error" visible style={{ fontSize: 14 }}>
              {login.error.message}
            </HelperText>
          )}

          <Button
            mode="contained"
            onPress={onSubmit}
            disabled={login.isPending}
            contentStyle={{ paddingVertical: 6 }}
          >
            {login.isPending ? 'Giriş yapılıyor…' : 'Giriş yap'}
          </Button>
          <Text variant="labelSmall" style={{ textAlign: 'center', opacity: 0.7 }}>
            Test hesabı: test@ornek.com / Test1234!
          </Text>
        </Surface>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
```

(The screen inherits its styling from the PaperProvider theme.)

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 5: Emulator verification (API running, emulator booted)**

1. App opens on the login screen (gate redirected from `/`)
2. Submit empty form → both fields show Zod messages, no request sent
3. `test@ornek.com` / `wrong` → error helper shows exactly `E-posta veya şifre hatalı.`
4. Correct credentials → redirected to the Ürünler tab (still stubs)
5. Kill the app, relaunch → still logged in (SecureStore persistence), straight to tabs
6. Profil tab (stub) → relaunch persists

- [ ] **Step 6: Commit**

```bash
git add features app/(auth)/login.tsx
git commit -m "feat: login screen with zod validation and secure session persistence"
```

### Task 8: Query hooks (port) + profile screen

**Files:**
- Create: `stokmate-mobile/features/lookups/hooks.ts`
- Create: `stokmate-mobile/features/products/hooks.ts`
- Modify: `stokmate-mobile/app/(app)/(tabs)/profile.tsx` (replace stub)

- [ ] **Step 1: Port `features/lookups/hooks.ts` verbatim** from `stokmate-web/features/lookups/hooks.ts`.

- [ ] **Step 2: Port `features/products/hooks.ts` from the web app with ONE diff** — remove the web-only background polling:

```ts
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { productApi } from '@/api/products';
import type {
  PagedResult,
  ProductDto,
  ProductQueryParams,
  UpdateProductRequest,
} from '@/types/api';

/** List — key is the full filter object. NO refetchInterval: the 60s polling
 *  bonus is web-only (spec §11); native refetches on mount/focus. */
export function useProducts(params: ProductQueryParams) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => productApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useProductStats() {
  return useQuery({
    queryKey: ['product-stats'],
    queryFn: productApi.stats,
  });
}

/**
 * NO GET /products/{id} exists (verified). Resolution order: scan cached
 * ['products'] pages; cold cache → one bounded pageSize=100 fetch (seed is 80
 * rows); else null = confirmed missing.
 */
export function useProduct(id: number) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['products', 'detail', id],
    staleTime: Infinity,
    // Invalid route param (NaN/-1): fetch nothing — id must also be positive.
    enabled: Number.isFinite(id) && id > 0,
    queryFn: async (): Promise<ProductDto | null> => {
      for (const [key, data] of queryClient.getQueriesData<PagedResult<ProductDto>>({
        queryKey: ['products'],
      })) {
        if (key[1] === 'detail' || !Array.isArray(data?.items)) continue;
        const hit = data.items.find((p) => p.id === id);
        if (hit) return hit;
      }
      const page = await productApi.list({ pageSize: 100 });
      return page.items.find((p) => p.id === id) ?? null;
    },
  });
}

/** Same cache policy as web: write detail, invalidate lists (predicate
 *  excludes detail) + stats. */
function useApplyProductMutationResult() {
  const queryClient = useQueryClient();

  return (updated: ProductDto) => {
    queryClient.setQueryData(['products', 'detail', updated.id], updated);
    queryClient.invalidateQueries({
      queryKey: ['products'],
      predicate: (query) => query.queryKey[1] !== 'detail',
    });
    queryClient.invalidateQueries({ queryKey: ['product-stats'] });
  };
}

export function useUpdateStock() {
  const apply = useApplyProductMutationResult();
  return useMutation({
    mutationFn: ({ id, stock }: { id: number; stock: number }) =>
      productApi.updateStock(id, stock),
    onSuccess: apply,
  });
}

export function useUpdateProduct() {
  const apply = useApplyProductMutationResult();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateProductRequest }) =>
      productApi.update(id, body),
    onSuccess: (updated) => apply(updated),
  });
}
```

(Also added vs web: the `enabled` guard from the web app's later review fix, strengthened to `id > 0` so a disabled query never fires for garbage route params — screens must therefore render their invalid-id state from `Number.isFinite(id)` directly, never from query state.)

- [ ] **Step 3: Replace the profile stub**

```tsx
import { Redirect, useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { Button, Card, Divider, List, Text } from 'react-native-paper';
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/store/auth';
import { formatDateTime } from '@/lib/format';

export default function Profile() {
  const router = useRouter();
  const hydrated = useAuthStore((s) => s.hydrated);
  const user = useAuthStore((s) => s.user);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const expiresAt = useAuthStore((s) => s.expiresAt);
  const clearSession = useAuthStore((s) => s.clearSession);

  if (!hydrated) return null;
  if (!user) return <Redirect href="/login" />;

  const handleLogout = async () => {
    try {
      // Best-effort server-side revocation — clear locally regardless.
      if (refreshToken) await authApi.logout(refreshToken);
    } catch {
      // ignore: session is cleared below anyway
    }
    clearSession();
    router.replace('/login');
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Card mode="elevated">
        <Card.Title title={user.fullName} subtitle={user.email} />
        <Card.Content>
          <Divider />
          <List.Item
            title="Oturum bitişi"
            description={expiresAt ? formatDateTime(expiresAt) : '—'}
            left={(props) => <List.Icon {...props} icon="clock-outline" />}
          />
          <Divider />
          <List.Item
            title="Erişim anahtarı yenileme"
            description="Oturum düşerse otomatik yenilenir (15 dk)."
            left={(props) => <List.Icon {...props} icon="refresh" />}
          />
        </Card.Content>
      </Card>

      <Button mode="contained" onPress={handleLogout} contentStyle={{ paddingVertical: 6 }}>
        Çıkış yap
      </Button>
      <Text variant="labelSmall" style={{ textAlign: 'center', opacity: 0.6 }}>
        StokMate — saha personeli
      </Text>
    </ScrollView>
  );
}
```

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 5: Emulator verification**

1. Login → Profil tab shows `Deniz Yılmaz` / `test@ornek.com` + session expiry
2. "Çıkış yap" → back at login; relaunch → login (session gone from SecureStore)
3. Login again → works (refresh token revocation didn't poison the new session)

- [ ] **Step 6: Commit**

```bash
git add features app/(app)/(tabs)/profile.tsx
git commit -m "feat: query hooks and profile screen with logout"
```

---

## Chunk 3: Product list and detail

### Task 9: Product list screen (search, filter chips, infinite pagination, stats)

**Files:**
- Modify: `stokmate-mobile/features/products/hooks.ts` (add `useProductsInfinite`)
- Create: `stokmate-mobile/features/products/product-card.tsx`
- Create: `stokmate-mobile/features/products/stats-cards.tsx`
- Modify: `stokmate-mobile/app/(app)/(tabs)/index.tsx` (replace stub)

Mobile list UX (spec §6): stats cards atop the list; search box; filter CHIPS (filters live in screen state, spec §4.2 — NOT the URL); FlatList with `onEndReached` infinite pagination ("sayfalama" requirement).

- [ ] **Step 1: Add `useProductsInfinite` to `features/products/hooks.ts`** (append; keep the Task 8 hooks untouched)

```ts
/** Infinite list for the mobile FlatList — pageParam follows API pagination. */
export function useProductsInfinite(params: ProductQueryParams) {
  return useInfiniteQuery({
    queryKey: ['products', 'infinite', params],
    queryFn: ({ pageParam }) => productApi.list({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const totalPages = Math.max(1, Math.ceil(lastPage.total / lastPage.pageSize));
      return lastPage.page < totalPages ? lastPage.page + 1 : undefined;
    },
    placeholderData: keepPreviousData,
  });
}
```

(Add `useInfiniteQuery` to the existing `@tanstack/react-query` import. Note the extra `'infinite'` key segment — the shared `['products', params]` list cache from Task 8 stays untouched; invalidation's `queryKey[1] !== 'detail'` predicate already includes these.)

- [ ] **Step 2: Create `features/products/stats-cards.tsx`**

```tsx
import { Card, Text } from 'react-native-paper';
import { StyleSheet, View } from 'react-native';
import { useProductStats } from './hooks';

export function StatsCards() {
  const stats = useProductStats();

  const cards = [
    { label: 'Toplam', value: stats.data?.total },
    { label: 'Tükenen', value: stats.data?.outOfStock },
    { label: 'Kritik', value: stats.data?.lowStock },
  ];

  return (
    <View style={styles.row}>
      {cards.map((card) => (
        <Card key={card.label} mode="elevated" style={styles.card}>
          <Card.Content>
            <Text variant="labelMedium">{card.label}</Text>
            <Text variant="headlineSmall" style={{ fontVariant: ['tabular-nums'] }}>
              {stats.isError ? '—' : (card.value ?? '…')}
            </Text>
          </Card.Content>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  card: { flex: 1 },
});
```

- [ ] **Step 3: Create `features/products/product-card.tsx`** — one list row

```tsx
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { TouchableRipple, Text, Chip } from 'react-native-paper';
import { StyleSheet, View } from 'react-native';
import type { ProductDto } from '@/types/api';
import { STATUS_CHIP_PROPS, statusLabel, unitLabel } from '@/lib/enums';
import { formatKurus } from '@/lib/format';

function StockBadge({ product }: { product: ProductDto }) {
  if (product.stock === 0) {
    return <Chip compact textStyle={{ color: '#991b1b' }} style={{ backgroundColor: '#fee2e2' }}>Tükendi</Chip>;
  }
  if (product.stock <= product.minStock) {
    return (
      <Chip compact textStyle={{ color: '#92400e' }} style={{ backgroundColor: '#fef3c7' }}>
        {product.stock} {unitLabel(product.unit)} (kritik)
      </Chip>
    );
  }
  return <Text variant="bodySmall">{product.stock} {unitLabel(product.unit)}</Text>;
}

export function ProductCard({ product }: { product: ProductDto }) {
  const chip = STATUS_CHIP_PROPS[product.status];
  return (
    <TouchableRipple
      onPress={() => router.push(`/product/${product.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`Ürün: ${product.name}`}
      style={styles.touch}
    >
      <View style={styles.row}>
        {product.imageUrl ? (
          <Image
            source={{ uri: product.imageUrl }}
            style={styles.image}
            contentFit="cover"
            recyclingKey={String(product.id)}
          />
        ) : (
          <View style={[styles.image, { backgroundColor: '#e4e4e7' }]} />
        )}
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text variant="titleSmall" numberOfLines={1} style={{ flexShrink: 1 }}>
              {product.name}
            </Text>
            {product.isFeatured && <Text style={{ color: '#d97706' }}>★</Text>}
          </View>
          <Text variant="bodySmall" style={{ opacity: 0.6 }}>
            {product.sku} · {product.categoryName}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
            <Text variant="labelLarge" style={{ fontVariant: ['tabular-nums'] }}>
              {formatKurus(product.price)}
            </Text>
            <StockBadge product={product} />
            <Chip compact mode={chip.mode} selectedColor={chip.selectedColor} textStyle={chip.textStyle}>
              {statusLabel(product.status)}
            </Chip>
          </View>
        </View>
      </View>
    </TouchableRipple>
  );
}

const styles = StyleSheet.create({
  touch: { borderRadius: 12 },
  row: { flexDirection: 'row', gap: 12, padding: 12, alignItems: 'center' },
  image: { width: 48, height: 48, borderRadius: 8 },
});
```

- [ ] **Step 4: Replace the list stub `app/(app)/(tabs)/index.tsx`**

```tsx
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  View,
} from 'react-native';
import { Chip, Surface, Text, TextInput } from 'react-native-paper';
import type { ProductQueryParams, ProductStatus } from '@/types/api';
import { STATUS_LABELS } from '@/lib/enums';
import { useCategories } from '@/features/lookups/hooks';
import { ProductCard } from '@/features/products/product-card';
import { StatsCards } from '@/features/products/stats-cards';
import { useProductsInfinite } from '@/features/products/hooks';

function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function ProductList() {
  const [q, setQ] = useState('');
  const debouncedQ = useDebouncedValue(q);
  const [status, setStatus] = useState<ProductStatus | undefined>(undefined);
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const categories = useCategories();

  // Filters live in SCREEN STATE on mobile (spec §4.2) — no URL params.
  const filters = useMemo<ProductQueryParams>(
    () => ({ q: debouncedQ || undefined, status, categoryId, sort: 'name', dir: 'asc' }),
    [debouncedQ, status, categoryId],
  );
  const products = useProductsInfinite(filters);

  const items = products.data?.pages.flatMap((page) => page.items) ?? [];
  const total = products.data?.pages[0]?.total ?? 0;
  const hasFilters = Boolean(debouncedQ || status !== undefined || categoryId !== undefined);

  const reset = () => {
    setQ('');
    setStatus(undefined);
    setCategoryId(undefined);
  };

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => <ProductCard product={item} />}
      onEndReached={() => {
        if (products.hasNextPage && !products.isFetchingNextPage && !products.isError) {
          products.fetchNextPage();
        }
      }}
      onEndReachedThreshold={0.4}
      contentContainerStyle={{ padding: 12, gap: 8 }}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={{ gap: 8 }}>
          <StatsCards />
          <TextInput
            mode="outlined"
            label="Ara (ad, stok kodu, barkod)"
            value={q}
            onChangeText={setQ}
            left={<TextInput.Icon icon="magnify" />}
            dense
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            <Chip selected={status === undefined && categoryId === undefined} onPress={hasFilters ? reset : undefined}>
              Tümü
            </Chip>
            {(Object.keys(STATUS_LABELS) as unknown as string[]).map((key) => (
              <Chip
                key={key}
                selected={status === Number(key)}
                onPress={() => setStatus(status === Number(key) ? undefined : (Number(key) as ProductStatus))}
              >
                {STATUS_LABELS[Number(key) as ProductStatus]}
              </Chip>
            ))}
            {(categories.data ?? []).map((category) => (
              <Chip
                key={category.id}
                selected={categoryId === category.id}
                onPress={() => setCategoryId(categoryId === category.id ? undefined : category.id)}
              >
                {category.name}
              </Chip>
            ))}
          </ScrollView>
          {hasFilters && <Text variant="labelSmall" style={{ opacity: 0.6 }}>{total} ürün</Text>}
          {products.isPending && <ActivityIndicator style={{ padding: 8 }} />}
        </View>
      }
      ListEmptyComponent={
        products.isError ? (
          <Surface style={{ borderRadius: 12, padding: 24, gap: 8, alignItems: 'center' }}>
            <Text variant="bodyMedium" style={{ color: '#dc2626' }}>{products.error.message}</Text>
            <Chip onPress={() => products.refetch()}>Tekrar dene</Chip>
          </Surface>
        ) : products.isPending ? null : (
          <Surface style={{ borderRadius: 12, padding: 24, gap: 8, alignItems: 'center' }}>
            <Text variant="bodyMedium" style={{ opacity: 0.7 }}>
              {hasFilters ? 'Aramanıza uygun ürün bulunamadı.' : 'Görüntülenecek ürün yok.'}
            </Text>
            {hasFilters && <Chip onPress={reset}>Filtreleri temizle</Chip>}
          </Surface>
        )
      }
      ListFooterComponent={
        products.isFetchingNextPage ? (
          <ActivityIndicator style={{ padding: 12 }} />
        ) : products.isError && items.length > 0 ? (
          // A failed fetchNextPage leaves loaded pages visible — surface the
          // error here (ListEmptyComponent never renders when items exist).
          <View style={{ padding: 12, gap: 4, alignItems: 'center' }}>
            <Text variant="bodySmall" style={{ color: '#dc2626' }}>{products.error.message}</Text>
            <Chip onPress={() => products.fetchNextPage()}>Tekrar dene</Chip>
          </View>
        ) : items.length > 0 && !products.hasNextPage ? (
          <Text variant="labelSmall" style={{ textAlign: 'center', opacity: 0.5, padding: 12 }}>
            {total} ürünün tamamı listelendi
          </Text>
        ) : null
      }
    />
  );
}
```

(Initial load shows the stats placeholders plus a centered ActivityIndicator under the header — spec §16 calls for Paper skeletons; if the installed Paper version ships a `Skeleton` component, the implementer may swap the indicator for 6 shimmer rows, but the indicator is the safe baseline.)

- [ ] **Step 5: Verify**

```bash
npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 6: Emulator verification (API running)**

1. Login → Ürünler tab: stats `80 / 10 / 14` atop the list; first 20 rows render; verify price/date rendering looks correct (Hermes Intl smoke: `formatKurus` shows `₺19,99`-style, not NaN/garbage)
2. Scroll to the bottom → next pages load automatically up to all 80 ("tamamı listelendi" footer)
3. Type `cola` → after ~300ms list filters (3 results on the seed)
4. Toggle `Aktif` chip → combined filter; toggle a category chip → narrows further; "Tümü" resets everything including the search input
5. Pull a row → detail stub opens (header title `Ürün Detayı`, tab bar hidden)
6. Error state: stop the API, pull-to-refresh territory (or reload filters) → Turkish error + Tekrar dene; restart API, retry recovers

- [ ] **Step 7: Commit**

```bash
git add features app/(app)/(tabs)/index.tsx
git commit -m "feat: product list with search, filter chips and infinite pagination"
```

### Task 10: Product detail screen + quick stock update dialog

**Files:**
- Create: `stokmate-mobile/features/products/stock-dialog.tsx`
- Modify: `stokmate-mobile/app/(app)/product/[id]/index.tsx` (replace stub)

- [ ] **Step 1: Create `features/products/stock-dialog.tsx`** — Paper Portal dialog, RHF Controller, Zod (same schema as web)

```tsx
import { useEffect, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { View } from 'react-native';
import { Button, Dialog, HelperText, Portal, Text, TextInput } from 'react-native-paper';
import type { ProductDto } from '@/types/api';
import { unitLabel } from '@/lib/enums';
import { useUpdateStock } from './hooks';

// Zod v4: `{ message }` customizes type errors.
const stockSchema = z.object({
  stock: z
    .number({ message: 'Stok girin.' })
    .int('Tam sayı girin.')
    .min(0, 'Stok negatif olamaz.'),
});

type StockFormValues = z.infer<typeof stockSchema>;

interface Props {
  product: ProductDto;
  /** Called with `true` after a successful save, `undefined` otherwise. */
  onClose: (updated?: boolean) => void;
}

export function StockDialog({ product, onClose }: Props) {
  const updateStock = useUpdateStock();
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<StockFormValues>({
    resolver: zodResolver(stockSchema),
    // Fresh defaults per product: the parent conditionally mounts this dialog.
    defaultValues: { stock: product.stock },
  });

  const onSubmit = handleSubmit((values) => {
    if (!updateStock.isPending) {
      updateStock.mutate(
        { id: product.id, stock: values.stock },
        { onSuccess: () => onCloseRef.current(true) },
      );
    }
  });

  return (
    <Portal>
      <Dialog visible onDismiss={() => onClose()} style={{ backgroundColor: 'white' }}>
        <Dialog.Title>Stok Güncelle — {product.name}</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodySmall" style={{ opacity: 0.6, marginBottom: 12 }}>
            Mevcut stok: {product.stock} {unitLabel(product.unit)} · Kritik eşik: {product.minStock}
          </Text>
          {updateStock.isError && (
            <HelperText type="error" visible style={{ fontSize: 14 }}>
              {updateStock.error.message}
            </HelperText>
          )}
          <Controller
            control={control}
            name="stock"
            render={({ field, fieldState }) => (
              <View>
                <TextInput
                  label="Yeni stok"
                  keyboardType="number-pad"
                  value={field.value === undefined ? '' : String(field.value)}
                  onChangeText={(text) => field.onChange(text === '' ? undefined : Number(text.replace(/[^0-9]/g, '')))}
                  onBlur={field.onBlur}
                  error={Boolean(fieldState.error)}
                />
                {fieldState.error && (
                  <HelperText type="error" visible>
                    {fieldState.error.message}
                  </HelperText>
                )}
              </View>
            )}
          />
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => onClose()}>Vazgeç</Button>
          <Button onPress={onSubmit} disabled={updateStock.isPending} loading={updateStock.isPending}>
            Kaydet
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
```

Note: the numeric input stores `undefined` when empty so Zod's `{ message }` type error fires (`number-pad` keyboards can still deliver junk on some devices — the regex strip is belt-and-braces).

- [ ] **Step 2: Replace the detail stub**

```tsx
import { useState } from 'react';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { Button, Card, Chip, Snackbar, Surface, Text } from 'react-native-paper';
import { STATUS_CHIP_PROPS, statusLabel, unitLabel } from '@/lib/enums';
import { formatDateTime, formatKurus } from '@/lib/format';
import { useProduct } from '@/features/products/hooks';
import { StockDialog } from '@/features/products/stock-dialog';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
      <Text variant="bodyMedium" style={{ opacity: 0.6 }}>{label}</Text>
      <Text variant="bodyMedium" style={{ fontWeight: '600' }}>{value}</Text>
    </View>
  );
}

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const productId = Number(id);
  const product = useProduct(Number.isFinite(productId) ? productId : -1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  // Invalid route param short-circuits BEFORE query state: with the enabled
  // guard in useProduct, a disabled query never resolves, so invalid-id must
  // be its own branch (never derived from pending/null).
  if (!Number.isFinite(productId)) {
    return (
      <Surface style={{ margin: 16, borderRadius: 12, padding: 24, alignItems: 'center' }}>
        <Text variant="bodyMedium" style={{ opacity: 0.7 }}>Ürün bulunamadı.</Text>
      </Surface>
    );
  }

  if (product.isPending) {
    return <Text style={{ padding: 16, opacity: 0.6 }}>Yükleniyor…</Text>;
  }

  if (product.isError) {
    return (
      <Surface style={{ margin: 16, borderRadius: 12, padding: 24, gap: 8, alignItems: 'center' }}>
        <Text variant="bodyMedium" style={{ color: '#dc2626' }}>{product.error.message}</Text>
        <Chip onPress={() => product.refetch()}>Tekrar dene</Chip>
      </Surface>
    );
  }

  const data = product.data;
  const chip = STATUS_CHIP_PROPS[data.status];

  return (
    <>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Card mode="elevated">
          <Card.Content style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', gap: 16 }}>
              {data.imageUrl ? (
                <Image source={{ uri: data.imageUrl }} style={{ width: 96, height: 96, borderRadius: 12 }} contentFit="cover" />
              ) : (
                <View style={{ width: 96, height: 96, borderRadius: 12, backgroundColor: '#e4e4e7' }} />
              )}
              <View style={{ flex: 1, gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <Text variant="titleMedium">{data.name}</Text>
                  {data.isFeatured && <Text style={{ color: '#d97706' }}>★</Text>}
                  <Chip compact mode={chip.mode} selectedColor={chip.selectedColor} textStyle={chip.textStyle}>
                    {statusLabel(data.status)}
                  </Chip>
                </View>
                <Text variant="bodySmall" style={{ opacity: 0.6 }}>
                  {data.sku} · Barkod: {data.barcode || '—'}
                </Text>
              </View>
            </View>
            <Row label="Kategori" value={data.categoryName} />
            <Row label="Marka" value={data.brandName} />
            <Row label="Fiyat" value={formatKurus(data.price)} />
            <Row label="Stok" value={`${data.stock} ${unitLabel(data.unit)} (kritik: ${data.minStock})`} />
            <Row label="Son güncelleme" value={formatDateTime(data.updatedAt)} />
          </Card.Content>
        </Card>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button mode="contained" style={{ flex: 1 }} onPress={() => setDialogOpen(true)}>
            Stoğu Güncelle
          </Button>
          <Button mode="outlined" style={{ flex: 1 }} onPress={() => router.push(`/product/${data.id}/edit`)}>
            Düzenle
          </Button>
        </View>
      </ScrollView>

      {dialogOpen && (
        <StockDialog
          product={data}
          onClose={(updated) => {
            setDialogOpen(false);
            if (updated) setSnackbar('Stok güncellendi.');
          }}
        />
      )}

      <Snackbar visible={snackbar !== null} onDismiss={() => setSnackbar(null)} duration={4000}>
        {snackbar}
      </Snackbar>
    </>
  );
}
```

(One deliberate simplification vs the web app: invalid-id/pending collapse into one "Yükleniyor…" / "Ürün bulunamadı." surface.)

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 4: Emulator verification (API running)**

1. From the list, open a product → all fields render; image loads (expo-image)
2. Cold start on a detail URL (kill app, `npx expo start` deep link `stokmate://product/5`, or navigate from list after cache clear) → fallback fetch resolves the product
3. "Stoğu Güncelle" → type `-5` impossible on number-pad; paste/enter junk → stripped or `Stok girin.`; enter `7` → Kaydet → dialog closes, Snackbar `Stok güncellendi.`, detail shows 7
4. Back to the list → the row badge and stats recalculated (cache invalidation verified)
5. `/product/99999` (deep link or edit URL) → "Ürün bulunamadı."

- [ ] **Step 5: Commit**

```bash
git add features app/(app)/product/[id]/index.tsx
git commit -m "feat: product detail with quick stock update dialog"
```

---

## Chunk 4: Edit screen, APK build, final verification

### Task 11: Product edit screen (full PUT)

**Files:**
- Create: `stokmate-mobile/features/products/edit-schema.ts`
- Create: `stokmate-mobile/features/products/edit-form.tsx`
- Modify: `stokmate-mobile/app/(app)/product/[id]/edit.tsx` (replace stub)

Same API trap as web (spec §13): PUT is full-replace; supplierId/costPrice/description start empty with an explainer banner; TL↔kuruş conversion; 409 → SKU field error. Paper has no `<select>` — category/brand/supplier/unit/status use `Controller` + Paper `Dropdown`-style helpers via `Menu` wrapped in a small `SelectField` component (same Number() coercion discipline as web: store numbers, never strings).

- [ ] **Step 1: Create `features/products/edit-schema.ts`** — port `stokmate-web/features/products/schemas.ts` verbatim (byte-identical: positiveId/money/count helpers, `{ message }` Zod v4 style, description min(1), isFeatured boolean, `ProductEditFormValues` export).

- [ ] **Step 2: Create `features/products/select-field.tsx`** — Paper menu-select (used for the five numeric selects)

```tsx
import { useState } from 'react';
import { Controller, type Control, type FieldError } from 'react-hook-form';
import { View } from 'react-native';
import { Button, HelperText, Menu } from 'react-native-paper';
import type { ProductEditFormValues } from './edit-schema';

export interface SelectOption {
  value: number;
  label: string;
  disabled?: boolean;
}

interface Props {
  label: string;
  options: SelectOption[];
  control: Control<ProductEditFormValues>;
  name: keyof ProductEditFormValues & string;
  error?: FieldError;
}

/**
 * Menu-backed select for RHF numeric fields. Coercion contract (same as the
 * web app): values are stored as NUMBERS — pick() converts via Number()
 * before field.onChange. The selected label derives from field.value inside
 * the Controller render (public API — no _formValues peeking).
 */
export function SelectField({ label, options, control, name, error }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        const pick = (value: number) => {
          field.onChange(Number(value)); // number, never string
          setVisible(false);
        };
        const selected = options.find(
          (o) => !o.disabled && String(o.value) === String(field.value),
        );
        return (
          <View>
            <Menu
              visible={visible}
              onDismiss={() => setVisible(false)}
              anchor={
                <Button mode="outlined" onPress={() => setVisible(true)} icon="chevron-down" contentStyle={{ justifyContent: 'space-between' }}>
                  {selected ? selected.label : label}
                </Button>
              }
            >
              {options.map((option) => (
                <Menu.Item
                  key={option.value}
                  onPress={() => pick(option.value)}
                  title={option.label}
                  disabled={option.disabled}
                />
              ))}
            </Menu>
            {error && (
              <HelperText type="error" visible>
                {error.message}
              </HelperText>
            )}
          </View>
        );
      }}
    />
  );
}
```

- [ ] **Step 3: Create `features/products/edit-form.tsx`**

Port the structure of `stokmate-web/features/products/components/ProductEditForm.tsx` to Paper with these mappings (full code below):

```tsx
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { View } from 'react-native';
import {
  Banner,
  Button,
  HelperText,
  Surface,
  Switch,
  Text,
  TextInput,
} from 'react-native-paper';
import type { ProductDto, ProductStatus, ProductUnit, UpdateProductRequest } from '@/types/api';
import { STATUS_LABELS, UNIT_LABELS } from '@/lib/enums';
import { toKurus } from '@/lib/format';
import { useBrands, useCategories, useSuppliers } from '@/features/lookups/hooks';
import { useUpdateProduct } from './hooks';
import { SelectField } from './select-field';
import { productEditSchema, type ProductEditFormValues } from './edit-schema';

// Keep digits and at most the FIRST dot ("1.2.3" would Number() to NaN).
const numeric = (text: string): number | undefined => {
  if (text === '') return undefined;
  const [head, ...rest] = text.replace(/[^0-9.]/g, '').split('.');
  return Number([head, rest.join('')].filter(Boolean).join('.'));
};

interface Props {
  product: ProductDto;
  onSaved: () => void;
}

export function EditForm({ product, onSaved }: Props) {
  const categories = useCategories();
  const brands = useBrands();
  const suppliers = useSuppliers();
  const updateProduct = useUpdateProduct();

  const {
    control,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors },
  } = useForm<ProductEditFormValues>({
    resolver: zodResolver(productEditSchema),
    defaultValues: {
      name: product.name,
      sku: product.sku,
      barcode: product.barcode,
      categoryId: product.categoryId,
      brandId: product.brandId,
      // No GET returns these three — they start empty and MUST be re-entered.
      supplierId: 0,
      price: product.price / 100,
      costPrice: undefined as unknown as number, // NOT NaN: renders "NaN" in inputs
      stock: product.stock,
      minStock: product.minStock,
      unit: product.unit,
      status: product.status,
      description: '',
      isFeatured: product.isFeatured,
    },
  });

  const onSubmit = handleSubmit((values) => {
    if (updateProduct.isPending) return;
    const body: UpdateProductRequest = {
      name: values.name,
      sku: values.sku,
      barcode: values.barcode,
      categoryId: values.categoryId,
      brandId: values.brandId,
      supplierId: values.supplierId,
      price: toKurus(values.price),
      costPrice: toKurus(values.costPrice),
      stock: values.stock,
      minStock: values.minStock,
      unit: values.unit as ProductUnit,
      status: values.status as ProductStatus,
      description: values.description,
      isFeatured: values.isFeatured,
    };
    updateProduct.mutate(
      { id: product.id, body },
      {
        onSuccess: onSaved,
        onError: (error) => {
          if (error instanceof Error && (error as { status?: number }).status === 409) {
            setError('sku', { message: error.message });
            setFocus('sku');
          }
        },
      },
    );
  });

  return (
    <Surface style={{ borderRadius: 16, padding: 16, gap: 12 }} elevation={1}>
      <Text variant="titleLarge">Ürünü Düzenle</Text>

      <Banner visible icon="information">
        Tedarikçi, maliyet ve açıklama alanları önceki değerlerini API'den alamıyor (API hiçbir
        listeleme ucunda bu alanları döndürmüyor). Kaydetmek bu üç alanı girdiğiniz değerlerle
        üzerine yazar.
      </Banner>

      {updateProduct.isError &&
        (updateProduct.error as { status?: number }).status !== 409 && (
          <HelperText type="error" visible style={{ fontSize: 14 }}>
            {updateProduct.error.message}
          </HelperText>
        )}

      <Controller
        control={control}
        name="name"
        render={({ field, fieldState }) => (
          <View>
            <TextInput label="Ürün adı" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={Boolean(fieldState.error)} />
            {fieldState.error && <HelperText type="error" visible>{fieldState.error.message}</HelperText>}
          </View>
        )}
      />
      <Controller
        control={control}
        name="sku"
        render={({ field, fieldState }) => (
          <View>
            <TextInput label="Stok kodu (SKU)" autoCapitalize="none" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={Boolean(fieldState.error)} />
            {fieldState.error && <HelperText type="error" visible>{fieldState.error.message}</HelperText>}
          </View>
        )}
      />
      <Controller
        control={control}
        name="barcode"
        render={({ field, fieldState }) => (
          <View>
            <TextInput label="Barkod" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={Boolean(fieldState.error)} />
            {fieldState.error && <HelperText type="error" visible>{fieldState.error.message}</HelperText>}
          </View>
        )}
      />

      <SelectField label="Kategori" control={control} name="categoryId" error={errors.categoryId}
        options={(categories.data ?? []).map((c) => ({ value: c.id, label: c.name }))} />
      <SelectField label="Marka" control={control} name="brandId" error={errors.brandId}
        options={(brands.data ?? []).map((b) => ({ value: b.id, label: b.name }))} />
      <SelectField
        label="Tedarikçi *" control={control} name="supplierId" error={errors.supplierId}
        options={[
          { value: 0, label: 'Seçin…', disabled: true },
          ...(suppliers.data ?? []).map((s) => ({ value: s.id, label: s.name })),
        ]}
      />

      <Controller
        control={control}
        name="price"
        render={({ field, fieldState }) => (
          <View>
            <TextInput
              label="Satış fiyatı (₺)"
              keyboardType="decimal-pad"
              value={field.value === undefined ? '' : String(field.value)}
              onChangeText={(t) => field.onChange(numeric(t))}
              onBlur={field.onBlur}
              error={Boolean(fieldState.error)}
            />
            {fieldState.error && <HelperText type="error" visible>{fieldState.error.message}</HelperText>}
          </View>
        )}
      />
      <Controller
        control={control}
        name="costPrice"
        render={({ field, fieldState }) => (
          <View>
            <TextInput
              label="Alış maliyeti (₺) *"
              keyboardType="decimal-pad"
              value={field.value === undefined ? '' : String(field.value)}
              onChangeText={(t) => field.onChange(numeric(t))}
              onBlur={field.onBlur}
              error={Boolean(fieldState.error)}
            />
            {fieldState.error && <HelperText type="error" visible>{fieldState.error.message}</HelperText>}
          </View>
        )}
      />
      <Controller
        control={control}
        name="stock"
        render={({ field, fieldState }) => (
          <View>
            <TextInput
              label="Stok"
              keyboardType="number-pad"
              value={field.value === undefined ? '' : String(field.value)}
              onChangeText={(t) => field.onChange(numeric(t))}
              onBlur={field.onBlur}
              error={Boolean(fieldState.error)}
            />
            {fieldState.error && <HelperText type="error" visible>{fieldState.error.message}</HelperText>}
          </View>
        )}
      />
      <Controller
        control={control}
        name="minStock"
        render={({ field, fieldState }) => (
          <View>
            <TextInput
              label="Minimum stok"
              keyboardType="number-pad"
              value={field.value === undefined ? '' : String(field.value)}
              onChangeText={(t) => field.onChange(numeric(t))}
              onBlur={field.onBlur}
              error={Boolean(fieldState.error)}
            />
            {fieldState.error && <HelperText type="error" visible>{fieldState.error.message}</HelperText>}
          </View>
        )}
      />

      <SelectField label="Birim" control={control} name="unit" error={errors.unit}
        options={(Object.keys(UNIT_LABELS) as unknown as string[]).map((key) => ({
          value: Number(key),
          label: UNIT_LABELS[Number(key) as ProductUnit],
        }))} />
      <SelectField label="Durum" control={control} name="status" error={errors.status}
        options={(Object.keys(STATUS_LABELS) as unknown as string[]).map((key) => ({
          value: Number(key),
          label: STATUS_LABELS[Number(key) as ProductStatus],
        }))} />

      <Controller
        control={control}
        name="isFeatured"
        render={({ field }) => (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Switch value={field.value} onValueChange={field.onChange} />
            <Text variant="bodyMedium">Öne çıkan ürün</Text>
          </View>
        )}
      />

      <Controller
        control={control}
        name="description"
        render={({ field, fieldState }) => (
          <View>
            <TextInput
              label="Açıklama *"
              multiline
              numberOfLines={3}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={Boolean(fieldState.error)}
            />
            {fieldState.error && <HelperText type="error" visible>{fieldState.error.message}</HelperText>}
          </View>
        )}
      />

      <Button mode="contained" onPress={onSubmit} disabled={updateProduct.isPending} loading={updateProduct.isPending}>
        Kaydet
      </Button>
    </Surface>
  );
}
```

- [ ] **Step 4: Replace the edit stub**

```tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { Chip, Surface, Text } from 'react-native-paper';
import { useProduct } from '@/features/products/hooks';
import { EditForm } from '@/features/products/edit-form';

export default function ProductEdit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const productId = Number(id);
  const product = useProduct(Number.isFinite(productId) ? productId : -1);

  // Invalid route param is its own branch (see detail screen note: a disabled
  // query never resolves, so this must not be derived from pending/null).
  if (!Number.isFinite(productId)) {
    return (
      <Surface style={{ margin: 16, borderRadius: 12, padding: 24, alignItems: 'center' }}>
        <Text variant="bodyMedium" style={{ opacity: 0.7 }}>Ürün bulunamadı.</Text>
      </Surface>
    );
  }

  if (product.isPending) return <Text style={{ padding: 16, opacity: 0.6 }}>Yükleniyor…</Text>;

  if (product.isError) {
    return (
      <Surface style={{ margin: 16, borderRadius: 12, padding: 24, gap: 8, alignItems: 'center' }}>
        <Text variant="bodyMedium" style={{ color: '#dc2626' }}>{product.error.message}</Text>
        <Chip onPress={() => product.refetch()}>Tekrar dene</Chip>
      </Surface>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <EditForm
        product={product.data}
        onSaved={() => {
          // Toast lives on the detail screen after navigation (same pattern as web).
          router.dismissAll();
          router.push(`/product/${productId}`);
        }}
      />
    </ScrollView>
  );
}
```

Implementer note: after navigation, show the success feedback — simplest reliable approach is a Snackbar ON the edit screen shown briefly before `router.push`; if `dismissAll+push` flashes oddly, switch to a 600ms delayed push after showing the Snackbar. Pick one, verify on the emulator, note the choice in the commit.

- [ ] **Step 5: Verify**

```bash
npx tsc --noEmit
```

Expected: exit 0.

- [ ] **Step 6: Emulator verification (API running)**

1. Detail → Düzenle → form prefilled (price in TL); Tedarikçi/Maliyet/Açıklama empty + banner visible
2. Submit empty → Zod messages on the three missing fields + any touched numeric field
3. Fill them, change price to 42,50 → Kaydet → back on detail, price ₺42,50; list row updated
4. Duplicate SKU → Kaydet → SKU field error with the API's exact message
5. Change all five selects → save succeeds (Number() coercion verified)

- [ ] **Step 7: Commit**

```bash
git add features app/(app)/product/[id]/edit.tsx
git commit -m "feat: full product edit form with kuruş conversion and sku conflict mapping"
```

### Task 12: APK build, README, final verification

**Files:**
- Modify: `stokmate-mobile/README.md` (replace scaffold boilerplate)
- Uses: `eas.json` from Task 1

Implemeters: invoke the `expo-deployment` skill before running EAS commands.

- [ ] **Step 1: Replace `README.md`**

````markdown
# StokMate — Mobile (Saha Personeli)

Expo (React Native) + TypeScript app for the StokMate assignment: product
lookup and on-site stock updates against the provided .NET API.

## Setup

1. Start the .NET API on this machine (port 5080):

   ```bash
   cd /path/to/StokMate && dotnet run --project src/StokMate.Api
   ```

2. Configure the API address for your device:

   ```bash
   cp .env.example .env
   # Android emulator: http://10.0.2.2:5080 — physical device: your LAN IP
   ```

3. Install and run (Expo Go on an emulator or device):

   ```bash
   npm install
   npx expo start
   ```

4. Login: `test@ornek.com` / `Test1234!`

## APK build

```bash
npm install -g eas-cli
eas login          # any free Expo account
eas build -p android --profile preview
```

Produces an installable APK link (EAS internal distribution). For a local
build instead: `eas build -p android --profile preview --local` (requires
Android SDK + JDK on this machine).

## Features

- Secure login (tokens in Android Keystore / iOS Keychain), silent refresh with rotation
- Product list: search, status/category filter chips, infinite pagination, stats
- Product detail + quick stock update (PATCH) — the field staff main flow
- Full product edit (PUT): supplier, cost price and description are re-entered
  because the API never returns their current values
````

- [ ] **Step 2: Type-check + lint the final app**

```bash
npx tsc --noEmit
npm run lint
```

Both must exit 0 (`npx expo lint` may be the scaffold's script — use whatever `npm run lint` maps to).

- [ ] **Step 3: Build the APK (USER-ASSISTED — requires an Expo account login)**

Ask the user which path they want:
a. **EAS cloud build** (recommended, no local Android SDK): user runs `eas login` interactively (or provides a token), then `npx eas-cli@latest build -p android --profile preview --non-interactive` — takes ~10 min, produces a shareable URL.
b. **Local build**: requires Android SDK + JDK 17: `eas build -p android --profile preview --local`.

The resulting `.apk` is the assignment deliverable (Drive/WeTransfer upload — user's step). Record the build URL / artifact path.

- [ ] **Step 4: Install-and-verify pass on the emulator**

```bash
# with the built APK (or via EAS internal distribution QR):
adb install -r <path-to-apk>
```

1. Cold start → login (SecureStore empty in the fresh install)
2. Full flow: login → list (stats 80/10/14) → search cola → detail → stock 7 → list badge + stats updated → edit price round-trip → profile → logout
3. Token refresh: log in, wait 15+ min (or revoke server-side via API restart then re-login on another client) → next request recovers silently
4. No crash on airplane-mode toggling: list shows cached data or the Turkish network error with retry

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: mobile app readme and apk build instructions"
```

---

## Plan complete

After Task 12 the mobile app is feature-complete per the spec and the APK
deliverable is built. Combined with the shipped web admin panel, both
assignment clients are done.

