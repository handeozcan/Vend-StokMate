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

3. Install and run (Expo Go on an emulator or device):

   ```bash
   npm install
   npx expo start
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
- Full product edit (PUT): supplier, cost price and description are re-entered
  because the API never returns their current values
