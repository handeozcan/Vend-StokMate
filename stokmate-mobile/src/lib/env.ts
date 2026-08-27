const rawBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

// Development'ta değişken yoksa emulator varsayılanı — `npx expo start` sıfır
// konfigürasyonla çalışır. Physical device için .env.local'da LAN IP tanımlanır.
// Production build'lerinde (EAS) değer .env.production / profil env'inden gelir;
// eksikse burada düşmek yerine derleme anında patlasın:
const devFallback = __DEV__ ? 'http://10.0.2.2:5080' : undefined;

const resolved = rawBaseUrl ?? devFallback;

if (!resolved) {
  throw new Error(
    'EXPO_PUBLIC_API_BASE_URL tanımlı değil. .env.example dosyasını inceleyin.',
  );
}

// Strip trailing slashes so "http://10.0.2.2:5080/" + "/products" can never
// produce "//products".
const baseUrl = resolved.replace(/\/+$/, '');

export const env = {
  API_BASE_URL: baseUrl,
} as const;
