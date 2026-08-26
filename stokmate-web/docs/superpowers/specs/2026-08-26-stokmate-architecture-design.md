# StokMate Architecture Design — Spec

Date: 2026-08-26
Status: Approved by user (design session 2026-08-26)
Amended 2026-08-26 (user decision): web foundation changed from Vite SPA + React
Router + MUI to the workspace's existing **Next.js 16.3.3 App Router scaffold +
Tailwind CSS v4** (scaffold re-created with create-next-app after the original
design session). Data-layer decisions (§7–§13, §17) are unchanged. This Next
build deviates from stock Next.js — the bundled docs at
`stokmate-web/node_modules/next/dist/docs/` are authoritative.
Projects: `stokmate-web` (Next.js App Router admin app) + `stokmate-mobile` (Expo app), siblings under `~/Desktop/Vend-Stokmate/`
Backend: provided read-only .NET 8 API at `~/Desktop/StokMate` (never modified)

## 1. Overview

StokMate is a two-client stock management assignment: a React web admin panel and a
React Native mobile app, both consuming the same .NET API. Scope: login, product list
with search/filter/sort/pagination, product detail, full product edit (PUT), quick
stock update (PATCH), dashboard stats, lookup lists.

Non-goals (excluded): product create (`POST /products`), product delete
(`DELETE /products/{id}`), dark mode, i18n library, offline sync.

## 2. Verified API contract reference

Source of truth: API.md + source code of the .NET project (verified 2026-08-26).
Base URL `http://localhost:5080` (Android emulator: `http://10.0.2.2:5080`; device:
`http://<LAN-IP>:5080`). HTTP only, CORS fully open.

### Endpoints in scope

| Method | Path | Auth | Body / Query | Success | Errors |
|---|---|---|---|---|---|
| POST | `/auth/login` | — | `{email,password}` | 200 AuthResponse | 400, 401 |
| POST | `/auth/refresh` | — | `{refreshToken}` | 200 AuthResponse (new pair) | 400, 401 |
| POST | `/auth/logout` | Bearer | `{refreshToken}` | 204 | 401 |
| GET | `/auth/me` | Bearer | — | 200 UserDto | 401, 404 |
| GET | `/products` | Bearer | query below | 200 PagedResult | 400, 401 |
| GET | `/products/stats` | Bearer | — | 200 `{total,outOfStock,lowStock}` | 401 |
| PUT | `/products/{id}` | Bearer | full UpdateProductRequest | 200 ProductDto | 400, 404, 409 |
| PATCH | `/products/{id}/stock` | Bearer | `{stock}` | 200 ProductDto | 400, 404 |
| GET | `/categories` | Bearer | — | 200 CategoryDto[] | 401 |
| GET | `/brands` | Bearer | — | 200 BrandDto[] | 401 |
| GET | `/suppliers` | Bearer | — | 200 SupplierDto[] | 401 |

Out of scope: `POST /products`, `DELETE /products/{id}`.

### Query parameters for GET /products

`q` (case-insensitive substring over name/sku/barcode) · `categoryId` · `brandId` ·
`status` (1|2|3) · `page` (default 1, <1 coerced to 1) · `pageSize` (default 20,
<1→20, >100 clamped silently) · `sort` (`name|price|stock|updatedAt`, default
`name`, invalid values silently fall back) · `dir` (`asc|desc`, default `asc`).
Tie-break on `id` keeps pages stable.

### Response models (camelCase JSON)

- `AuthResponse`: `accessToken`, `refreshToken`, `expiresAt` (UTC ISO), `user {id, email, fullName}`
- `PagedResult<ProductDto>`: `items[]`, `total`, `page`, `pageSize`
- `ProductDto`: `id, name, sku, barcode, imageUrl, categoryId, categoryName, brandId,
  brandName, price, stock, minStock, unit, status, isFeatured, updatedAt`
- Enums as numbers: `unit` 1=Adet 2=Kg 3=Lt 4=Paket; `status` 1=Aktif 2=Pasif 3=Üretim Durduruldu
- Lookup DTOs: Category `{id,name,slug,sortOrder}` · Brand `{id,name}` ·
  Supplier `{id,name,contactName,phone,email,city}`

### Contract facts that drive design (verified in source)

1. **No `GET /products/{id}` exists.** Detail screens resolve from cache; cold-cache
   fallback = one `GET /products?pageSize=100` fetch (seed dataset is 80 rows).
2. **PUT is a full replace** requiring `supplierId`, `costPrice`, `description` —
   fields **no GET response ever returns**. Edit form must collect all three.
3. **All error bodies are `text/plain`** (Turkish), never JSON. `error.response.data`
   is a string on failures. Model-binding 400 has fixed generic message.
4. **Prices are kuruş ints** (`1999` = 19,99 ₺). Divide by 100 for display,
   multiply by 100 (round) for submit.
5. **accessToken**: opaque 32-hex GUID, NOT JWT, 15-min lifetime, server-memory
   stored (API restart kills it). **refreshToken**: 7 days, single-use with rotation
   — reuse of an old refresh token returns 401. Concurrent refreshes must be
   serialized client-side.
6. **In-memory DB**: 80 products / 8 categories / 12 brands / 6 suppliers reseeded
   on every API restart; all mutations lost.
7. Test credentials: `test@ornek.com` / `Test1234!`.
8. Stats endpoint is global (ignores filters): `lowStock` = `0 < stock <= minStock`,
   `outOfStock` = `stock == 0`.

## 3. Technology stack & rationale

| Technology | Rationale |
|---|---|
| Next.js 16 App Router (web) | Workspace scaffold (user decision, replaces the originally planned Vite SPA); all screens are client components — the fixed local API offers no SSR benefit; file-based routing removes router boilerplate |
| Tailwind CSS v4 (web) | Ships with the scaffold; utility-first control over a dense admin layout without a component-library dependency weight (replaces the originally planned MUI) |
| Axios | Interceptors are the single place for Bearer injection + 401 refresh/replay pipeline |
| TanStack Query | The data layer: caching, invalidation, keepPreviousData pagination, loading/error state |
| React Hook Form + Zod | Uncontrolled forms; one Zod schema per form is also its TS type; kuruş transforms |
| RN Paper (mobile) | Material components for the mobile app |
| Zustand | Only for the session store (user + tokens + hydrated flag). ~30 lines |
| Expo Router | File-based routing; auth gate in root layout |
| Expo SecureStore | Tokens in iOS Keychain / Android Keystore |

Deliberately excluded (YAGNI): i18n lib, dark mode, axios-retry, MSW, animation
libs, monorepo tooling, codegen, test framework (unless the assignment grades
tests — to be confirmed; if required, add Vitest later).

## 4. Resolved architecture decisions

1. **Two standalone projects** (not a monorepo). API layer + types (~150 lines)
   duplicated with identical file layout in both apps. Frozen 13-endpoint contract
   makes duplication cheap; a shared package couples Vite+Metro toolchains.
2. **Zustand only for auth session.** Filters: URL search params (web), screen state
   (mobile). Server state: TanStack Query.
3. **Invalidation-only mutations** (no optimistic updates) — refetch vs localhost is
   instant; avoids walking every filtered page cache.
4. **Detail resolution order**: (a) scan cached `['products']` queries for id;
   (b) cold cache → single `pageSize=100` fetch, find by id; (c) not found state.
5. **No `/auth/me` validation on boot** — stale sessions are caught by the 401
   pipeline. `/auth/me` used on Profile screens only.
6. **UI language: Turkish** (matches API data/messages). No i18n abstraction.

## 5. Web folder structure

Root-level `app/` directory (scaffold convention; no `src/`). Route files are
thin wrappers importing feature components, so feature code stays framework-portable.

```
stokmate-web/
├── app/
│   ├── layout.tsx           # root layout: fonts, <Providers/>, metadata (server)
│   ├── providers.tsx        # 'use client' — QueryClientProvider (§11 defaults)
│   ├── error.tsx            # last-resort route error boundary (§15)
│   ├── page.tsx             # / → redirect to /products
│   ├── login/page.tsx       # login screen (outside the authed shell)
│   └── (authed)/            # route group — auth gate + app shell live here
│       ├── layout.tsx       # guard: !hydrated → splash; !accessToken → /login; else AppShell
│       ├── products/page.tsx
│       └── products/[id]/
│           ├── page.tsx     # detail
│           └── edit/page.tsx
├── api/
│   ├── client.ts            # axios instance + interceptors
│   ├── errors.ts            # ApiError
│   ├── auth.ts              # login/refresh/logout/me
│   ├── products.ts          # list/stats/updateProduct/updateStock
│   └── lookups.ts           # categories/brands/suppliers
├── types/api.ts             # DTO interfaces mirroring .NET contract
├── features/
│   ├── auth/                # LoginPage, LoginForm, useLogin
│   ├── products/
│   │   ├── ProductListView.tsx
│   │   ├── ProductDetailView.tsx
│   │   ├── ProductEditView.tsx
│   │   ├── hooks.ts         # useProducts/useProductStats/useProduct/useUpdateProduct/useUpdateStock
│   │   ├── queryParams.ts   # URL search params ↔ ProductQueryParams
│   │   ├── schemas.ts       # Zod form schemas
│   │   └── components/      # StatsCards, FilterBar, ProductTable, StockDialog, States…
│   └── lookups/             # useCategories/useBrands/useSuppliers
├── store/auth.ts            # Zustand + persist (localStorage, key "stokmate-auth")
├── lib/
│   ├── env.ts               # single process.env.NEXT_PUBLIC_* touchpoint
│   ├── format.ts            # formatKurus → "19,99 ₺" (Intl tr-TR), date formatting
│   └── enums.ts             # unit/status id↔label maps
└── app/globals.css          # Tailwind v4 (@theme tokens, light-only)
```

Routes: `/login` · `/` (redirect → `/products`) · `/products` · `/products/:id` ·
`/products/:id/edit`. All page components are client components (`'use client'`)
— auth and data live in the browser. Pages reading search params or dynamic
route params follow the bundled Next 16 docs' Suspense/params conventions.

## 6. Mobile folder structure

```
stokmate-mobile/
├── app/
│   ├── _layout.tsx          # providers (QueryClient, Paper) + auth gate + splash
│   ├── login.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx      # bottom tabs: Products | Profile
│   │   ├── index.tsx        # product list + search + filters
│   │   └── profile.tsx      # user info + logout
│   └── product/
│       ├── [id].tsx         # detail + stock quick-edit
│       └── [id]/edit.tsx    # full edit form
├── src/
│   ├── api/                 # same 5 modules, same names as web
│   ├── types/api.ts
│   ├── features/…           # same feature layout as web
│   ├── store/auth.ts        # Zustand + persist with SecureStore adapter (async)
│   ├── lib/{env,format,enums}.ts
│   └── theme.ts             # Paper theme matching web brand
├── app.json                 # ATS exception + usesCleartextTraffic (HTTP API)
└── .env / .env.example      # EXPO_PUBLIC_API_BASE_URL
```

Two tabs only (Products, Profile); stats cards sit atop the list screen.

## 7. API layer architecture (identical in both apps)

Data flow: `components → feature hooks (TanStack Query) → api modules → axios
client → .NET`. No repository/service indirection.

- `client.ts`: one axios instance; request interceptor attaches Bearer from auth
  store (skipped when request flagged `skipAuth`); response interceptor normalizes
  errors to `ApiError` and owns the 401 pipeline. `/auth/login` and `/auth/refresh`
  carry `skipAuth` so a failed refresh never triggers refresh.
- `errors.ts`: `ApiError { status?: number; message: string }`. Built from
  `error.response.data` read **as text** (plain-string bodies). Network failure →
  `status: undefined`.
- api modules: plain typed async functions, no React imports. E.g.
  `getProducts(params: ProductQuery): Promise<PagedResult<ProductDto>>`.
- `types/api.ts`: hand-written interfaces mirroring the .NET DTOs exactly
  (camelCase). No codegen — frozen 13-endpoint contract.

## 8. Axios configuration

- `baseURL` from env module; `timeout: 15_000`; default JSON content type.
- Request interceptor: attach `Authorization: Bearer <accessToken>` when present
  and not `skipAuth`.
- Response interceptor error path: map to `ApiError`; if `401` and not an
  `/auth/*` request and not already retried → 401 pipeline (§10); else reject.

## 9. Authentication architecture & token persistence

Store shape (Zustand, both apps):
`{ user, accessToken, refreshToken, expiresAt, hydrated, setSession, clearSession }`

- Login flow: `LoginForm → useLogin → authApi.login → setSession(...) → persist`.
- Persistence: web = `localStorage` via Zustand `persist`; mobile = Expo
  SecureStore via a small async storage adapter for `persist` (Keychain/Keystore).
  Both tokens persisted (rotation is single-use — newest refresh token must
  replace the old immediately).
- `expiresAt` is stored for display/debugging only; refresh is purely reactive
  (wait for 401, then refresh) — no client-side expiry scheduling.
- Boot: rehydrate; `hydrated` gates the route guard (mobile: async rehydration).
- Logout: best-effort `POST /auth/logout` with `{refreshToken}`, then
  `clearSession()` regardless of outcome.

## 10. 401 handling strategy (single-flight refresh)

1. Interceptor catches 401 on non-auth request.
2. If no refresh in flight: start `POST /auth/refresh`; other 401s **join the
   queue** — only one refresh runs concurrently (single-use refresh tokens make
   parallel refreshes fatal: reuse → 401 → dead session).
3. Refresh success → `setSession(newPair)` (rotates refresh token) → replay all
   queued requests with new access token (marked to not re-enter the pipeline).
4. Refresh failure → `clearSession()` + reject queue.
5. Redirects are decoupled: interceptor only clears the session; route guards
   react to `accessToken === null`. No router import in the API layer — same
   pattern works on web and mobile.

## 11. TanStack Query architecture

Defaults on the QueryClient:

| Option | Value | Reason |
|---|---|---|
| `staleTime` | 30s products/stats; `Infinity` lookups | Lookups are static seed data, no mutation endpoints |
| `retry` | custom: network errors only (no `status`), max 1 | API errors (400/404/409) are deterministic |
| `refetchOnWindowFocus` | true (web) | bonus requirement |
| `placeholderData` | `keepPreviousData` on products list | no flash on page/filter change |

Query keys: `['products', filterParams]` (normalized object, undefined stripped) ·
`['product-stats']` · `['categories']` · `['brands']` · `['suppliers']`.

Web bonus config: `refetchInterval: 60_000` on list + stats with
`refetchIntervalInBackground: false` (refetch only while tab visible). Background
refetch is intentionally web-only — the bonus requirement is scoped to the web
admin panel; mobile uses standard mount/focus refetching.

## 12. Product query/mutation strategy

- `useProducts(filters)` — list; filters from URL params (web) / screen state (mobile).
- Detail resolution (no GET-by-id endpoint): (a) scan cached `['products']` queries
  via `queryClient.getQueriesData` for the id; (b) cold cache → one
  `GET /products?pageSize=100` then find by id (seed dataset = 80 rows ≤ 100 —
  code must carry a comment: this fallback silently breaks if the seed grows
  past 100); (c) else "Ürün bulunamadı" state.
- `useUpdateProduct` → `PUT /products/{id}` full body (includes supplierId,
  costPrice, description — §13).
- `useUpdateStock` → `PATCH /products/{id}/stock` `{stock}` — quick stock dialog.
- `onSuccess` (both): `invalidateQueries({queryKey: ['products']})` +
  `['product-stats']` (broad prefix kills every filtered/sorted/paged variant).
- `onError`: 409 → RHF `setError('sku')`; 404 → "product no longer exists" + back;
  else snackbar with API's Turkish message.

## 13. Form validation strategy

- One Zod schema per form (colocated in feature); `zodResolver`; form types via
  `z.infer`. Forms: Login (`email`, `password`), Stock (`stock` int ≥ 0),
  ProductEdit (full PUT body).
- Money: form works in TL decimals; schema transforms via `Math.round(v * 100)` to
  kuruş on output. Display via `formatKurus` (`Intl.NumberFormat('tr-TR')`).
- ProductEditForm carries three extra required fields — `supplierId` (select from
  `/suppliers`), `costPrice`, `description` — because PUT is full-replace and no
  GET returns current values (contract trap; omitting silently zeroes them).
  These three fields are visually marked (helper text: "Önceki değer API'den
  gelmiyor; kaydetmek üzerine yazar") so the UX isn't confusing.
- Enums from `lib/enums.ts` feed selects and status chips.
- Server errors map via `setError` (409 → sku field; 400 → form root/snackbar).

## 14. Navigation & auth guards

Web (Next App Router): the `(authed)` route-group layout is the guard. On first
render the store may not be rehydrated from localStorage yet (SSR renders with
empty store), so the gate renders a splash until `hydrated`, then
`accessToken ? children : router.replace('/login')`. `/login` mirrors (authed →
`/products`). `/` redirects to `/products`. The guard never throws or imports
the API layer; it only reads the store.

Mobile: root `app/_layout.tsx` — `!hydrated` → splash; `!accessToken` →
`<Redirect href="/login"/>`. `(tabs)` group sits behind the gate. Use
`router.replace` semantics; login screen redirects authed users to `/`.

## 15. Error handling strategy (four layers)

| Layer | Mechanism | UX |
|---|---|---|
| Transport | Interceptor → `ApiError` (text body, never `.json()`) | normalized downstream |
| Query | per-screen `error` from `useQuery` | Turkish message + "Tekrar dene"; stale cached data stays visible |
| Mutation | `onError` | toast/Snackbar (web: small hand-rolled Tailwind toast); 409→SKU field; 404→back |
| Last resort | small class ErrorBoundary (no library) | crash card + reload |

Network errors (`status === undefined`) → "Sunucuya bağlanılamadı" + retry.

## 16. Loading & empty states

- Initial list load: full-page skeleton rows (web: Tailwind `animate-pulse`
  shimmer blocks; mobile: Paper `Skeleton`). Filter/page changes:
  `keepPreviousData` + subtle progress, no full skeleton.
- Stats cards: individual skeletons. Mutation buttons: `isPending` → spinner + disabled.
- Empty: (a) filters active + `total === 0` → "Sonuç yok" + "Filtreleri temizle"
  CTA; (b) no filters + `total === 0` → hint that the in-memory API may have restarted.

## 17. Cache invalidation strategy

`PUT`/`PATCH` success → invalidate `['products']` (all variants) + `['product-stats']`
(stock edits move low/out-of-stock counts). Lookups never invalidated (static).
No create/delete flows. This is the complete invalidation surface.

## 18. Environment variables

| | Web | Mobile |
|---|---|---|
| Variable | `NEXT_PUBLIC_API_BASE_URL` | `EXPO_PUBLIC_API_BASE_URL` |
| Dev default | `http://localhost:5080` | sim: localhost:5080 · Android emu: 10.0.2.2:5080 · device: LAN IP |
| Files | `.env.local` (gitignored — loaded in dev AND build; committing `.env.development` would break `next build`, which loads only production env), `.env.example` (committed, un-ignored via `!.env.example` negation) | `.env` (gitignored — needs per-device LAN IPs), `.env.example` (committed) |
| Access | single `lib/env.ts` module reading `process.env.NEXT_PUBLIC_*` | single module reading `process.env.EXPO_PUBLIC_*` |

No secrets in env (none exist; tokens come from login at runtime). Mobile
`app.json` enables cleartext HTTP (ATS exception / `usesCleartextTraffic`).

## 19. Testing

No test framework in initial scope (assignment focus). If the assignment grading
requires tests, add Vitest (web) after core features — the api/ and lib/ modules
are framework-free and testable by design.
