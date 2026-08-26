const rawBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!rawBaseUrl) {
  throw new Error(
    'NEXT_PUBLIC_API_BASE_URL tanımlı değil. .env.example dosyasını .env.local olarak kopyalayın.',
  );
}

// Strip trailing slashes so "http://localhost:5080/" + "/products" can never
// produce "//products".
const baseUrl = rawBaseUrl.replace(/\/+$/, '');

export const env = {
  API_BASE_URL: baseUrl,
} as const;
