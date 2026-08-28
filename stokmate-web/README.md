# StokMate — Web Admin Panel

Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 admin panel for the
StokMate stock management assignment. Consumes the provided .NET API (see
`API.md` in the API repository).

## Setup

1. Start the .NET API (port 5080):

   ```bash
   cd /path/to/StokMate && dotnet run --project src/StokMate.Api
   ```

2. Configure and run:

   ```bash
   npm install
   cp .env.example .env.local
   npm run dev
   ```

3. Open http://localhost:3000 — login: `test@ornek.com` / `Test1234!`

`NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:5080`) lives in
`.env.local` (gitignored; `.env.example` documents it).

## Features

- Login with token persistence, 15-min access tokens, single-flight refresh rotation
- Product list: search (name/SKU/barcode), category/brand/status filters, sorting,
  pagination — all state in the URL (shareable views)
- Dashboard stats (total / out of stock / low stock)
- Product detail with quick stock update (PATCH)
- Full product edit (PUT) — supplier, cost price and description are hidden
  from the form (the API never returns their current values); saving sends
  neutral values instead
- Background refetch on window focus + every 60s while the tab is visible

## Kullanılan kütüphaneler ve gerekçeleri

| Kütüphane | Neden tercih edildi |
|---|---|
| **Next.js 16** (App Router) | Server Components, dosya bazlı routing, metadata yönetimi; API rotası gerektirmeyen statik admin paneli için tam eşleşme |
| **React 19** | Next.js 16'nın gerektirdiği sürüm |
| **Tailwind CSS 4** | Utility-first stil; zinc/teal tasarım sistemi class'larla hızlı ve tutarlı (`bg-surface`, `ring-…`) |
| **react-hook-form** + **@hookform/resolvers** | Kontrollü state olmadan performanslı formlar; resolver, Zod şemalarını forma bağlar |
| **Zod 4** | Tek doğrulama kaynağı — aynı şema hem form doğrulama hem TS tipi üretir (`z.infer`) |
| **@tanstack/react-query** | Server state: cache, `keepPreviousData`, 60s polling, mutation sonrası hedefli invalidation |
| **Axios** | Interceptor altyapısı: 401'de tek seferde token yenileme (single-flight refresh rotation), `ApiError` ile tip hataları |
| **Zustand** | Auth gibi global client state için minimal çözüm (Redux kurulum maliyeti yok) |
| **TypeScript** | API DTO'larıyla (`types/api.ts`) tip güvenli sözleşme; mobil uygulamayla aynı tipler |

Form, doğrulama, veri ve state katmanları mobil uygulamayla birebir aynı
seçilmiştir — özellikler iki platform arasında 1:1 port edilebilir.
