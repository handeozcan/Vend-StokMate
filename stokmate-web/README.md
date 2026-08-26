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
- Full product edit (PUT) — supplier, cost price and description are re-entered
  because the API never returns their current values
- Background refetch on window focus + every 60s while the tab is visible
