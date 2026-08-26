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
