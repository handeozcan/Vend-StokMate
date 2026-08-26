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
