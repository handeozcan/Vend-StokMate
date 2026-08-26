const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!baseUrl) {
  throw new Error(
    'NEXT_PUBLIC_API_BASE_URL tanımlı değil. .env.example dosyasını .env.local olarak kopyalayın.',
  );
}

export const env = {
  API_BASE_URL: baseUrl,
} as const;
