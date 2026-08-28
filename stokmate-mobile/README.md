# StokMate — Mobile (Saha Personeli)

Expo (React Native) + TypeScript app for the StokMate assignment: product
lookup and on-site stock updates against the provided .NET API.

## API adresi (environment yapısı)

`EXPO_PUBLIC_API_BASE_URL` derleme anında pakete gömülür (runtime'da değişmez).
Dosya önceliği: `.env.local` > `.env` > `.env.development` / `.env.production`;
EAS Build'de ayrıca `eas.json` profilindeki `env` bloğu geçerlidir.

| Senaryo | Kaynak | Adres |
|---|---|---|
| Android emulator + `expo start` | `.env` (veya `__DEV__` fallback) | `http://10.0.2.2:5080` |
| Kendi telefonum (aynı Wi-Fi) | `.env.local` (gitignore'lı) | `http://<LAN-IP>:5080` |
| **Dağıtılan APK (her telefon)** | `.env.production` / `distribution` profili | `https://stokmate-api-6ec8.onrender.com` |

## Setup (development)

1. Start the .NET API on this machine (port 5080):

   ```bash
   cd /path/to/StokMate && dotnet run --project src/StokMate.Api
   ```

2. Android emulator needs nothing else (`10.0.2.2` fallback). For a physical
   device on the same Wi-Fi, create `.env.local` with your machine's LAN IP.

3. Install and run (Expo Go **artık çalışmaz** — `react-native-keyboard-controller`
   native modül içerir; geliştirme testi için development build gerekir):

   ```bash
   npm install
   npx expo run:android   # ya da: eas build -p android --profile development
   ```

4. Login: `test@ornek.com` / `Test1234!`

## APK build

```bash
npm install -g eas-cli
eas login
# Herhangi bir telefonda çalışan dağıtım APK'sı (hosted API):
eas build -p android --profile distribution
# Yalnızca geliştirici ağındaki cihazlar için (yerel API):
eas build -p android --profile preview
```

## Backend (production)

The .NET API is deployed from the `stokmate-api/` folder of this repository to
Render (Docker, env `ASPNETCORE_URLS`): **https://stokmate-api-6ec8.onrender.com** —
in-memory DB reseeds on every cold start; tokens live in process memory.

## Features

- Secure login (tokens in Android Keystore / iOS Keychain), silent refresh with rotation
- Product list: search, status/category filter chips, infinite pagination, stats
- Product detail + quick stock update (PATCH) — the field staff main flow
- Full product edit (PUT): supplier, cost price and description are hidden from
  the form (the API never returns their current values); saving sends neutral
  values instead
- Keyboard-aware forms: the focused input scrolls itself above the keyboard
  (`KeyboardAwareScrollView` + `KeyboardToolbar`)

## Kullanılan kütüphaneler ve gerekçeleri

| Kütüphane | Neden tercih edildi |
|---|---|
| **Expo 57** | Managed workflow: native derleme olmadan EAS Build ile APK üretimi, `app.json` ile yapılandırma (`expo-build-properties`, `expo-splash-screen` vb.) |
| **expo-router** | Dosya bazlı routing — web'deki Next.js ile aynı zihinsel model; `(auth)`/`(app)` grupları auth akışını yönetir |
| **react-native-paper** | Material 3 UI kiti: `TextInput`, `Dialog`, `Chip`, `Snackbar` — form ağır ekranlar hazır bileşenlerle hızla kurulur |
| **react-native-keyboard-controller** | Klavye-farkındalığı: `KeyboardAwareScrollView` focuslanan input'u klavyenin üstüne kaydırır, `KeyboardToolbar` alanlar arası gezinme verir. Native modül → Expo Go uyumsuz, EAS build şart |
| **react-native-screens / safe-area-context / gesture-handler** | Expo Router'ın native navigasyon altyapısı (stack/tabs) ve çentik/safe-area yönetimi |
| **react-native-reanimated + worklets** | UI thread'de 60fps animasyonlar; keyboard-controller'ın da bağımlılığı |
| **expo-secure-store** | Access/refresh token'ların Android Keystore / iOS Keychain'de güvenli saklanması |
| **@expo/vector-icons** | Sekme ikonları (`MaterialCommunityIcons`) — Expo ekosistemi standardı |
| **react-hook-form** + **@hookform/resolvers** | Web'le aynı: performanslı formlar, Zod entegrasyonu |
| **Zod 4** | Web'le aynı: tek doğrulama kaynağı + tip üretimi |
| **@tanstack/react-query** | Web'le aynı: cache, sonsuz sayfalama (`useInfiniteQuery`), mount/focus refetch |
| **Axios** | Web'le aynı: interceptor ile silent refresh, `ApiError` tip hataları |
| **Zustand** | Web'le aynı: auth state; SecureStore ile kalıcı oturum |
| **TypeScript** | Web'le aynı `types/api.ts` sözleşmesi — iki platform tek API tipinde buluşur |

Form, doğrulama, veri ve state katmanları web paneliyle bilinçli olarak aynı
seçilmiştir; yalnızca UI katmanı platforma özgüdür (web: Tailwind, mobil: Paper).
