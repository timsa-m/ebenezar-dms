# Next.js to Expo Router Migration Blueprint
**Phase 1: Architecture Mapping**

## 1. Route Mapping Table

| Next.js Web Route Path | Expo Router Mobile Path | Navigation Component Type |
| :--- | :--- | :--- |
| `app/layout.tsx` | `mobile-app/app/_layout.tsx` | **Stack / Slot** (Root Configuration) |
| `app/(auth)/layout.tsx` | `mobile-app/app/(auth)/_layout.tsx` | **Stack** (Auth Flow) |
| `app/(auth)/sign-in/page.tsx` | `mobile-app/app/(auth)/sign-in.tsx` | None |
| `app/(auth)/sign-up/page.tsx` | `mobile-app/app/(auth)/sign-up.tsx` | None |
| `app/(auth)/forgot-password/page.tsx` | `mobile-app/app/(auth)/forgot-password.tsx` | None |
| `app/(auth)/reset-password/page.tsx` | `mobile-app/app/(auth)/reset-password.tsx` | None |
| `app/(auth)/pending-approval/page.tsx` | `mobile-app/app/(auth)/pending-approval.tsx` | None |
| `app/(root)/layout.tsx` | `mobile-app/app/(root)/_layout.tsx` | **Drawer / Tabs** (Replaces Web Sidebar) |
| `app/(root)/page.tsx` | `mobile-app/app/(root)/index.tsx` | None |
| `app/(root)/clients/page.tsx` | `mobile-app/app/(root)/clients/index.tsx` | **Stack** (Nested Flow) |
| `app/(root)/clients/create/page.tsx` | `mobile-app/app/(root)/clients/create.tsx` | None |
| `app/(root)/clients/[id]/page.tsx` | `mobile-app/app/(root)/clients/[id]/index.tsx` | None |
| `app/(root)/clients/[id]/edit/page.tsx` | `mobile-app/app/(root)/clients/[id]/edit.tsx` | None |
| `app/(root)/communications/page.tsx` | `mobile-app/app/(root)/communications.tsx` | None |
| `app/(root)/loans/page.tsx` | `mobile-app/app/(root)/loans/index.tsx` | **Stack** (Nested Flow) |
| `app/(root)/loans/create/page.tsx` | `mobile-app/app/(root)/loans/create.tsx` | None |
| `app/(root)/loans/[id]/page.tsx` | `mobile-app/app/(root)/loans/[id]/index.tsx` | None |
| `app/(root)/loans/[id]/edit/page.tsx` | `mobile-app/app/(root)/loans/[id]/edit.tsx` | None |
| `app/(root)/loans/[id]/statement/page.tsx` | `mobile-app/app/(root)/loans/[id]/statement.tsx`| None |
| `app/(root)/reports/page.tsx` | `mobile-app/app/(root)/reports/index.tsx` | **Stack** (Nested Flow) |
| `app/(root)/reports/*/page.tsx` | `mobile-app/app/(root)/reports/*.tsx` | None |
| `app/(root)/users/page.tsx` | `mobile-app/app/(root)/users/index.tsx` | None |

---

## 2. Architecture Blockers

- **React Server Components (RSC):** Heavy usage of direct database operations inside `page.tsx` and `layout.tsx` across the `app/(root)/*` directory. Native code cannot execute RSCs directly.
- **Server Actions:** Usage of `"use server"` for mutations (e.g. creating clients, updating loans) embedded into components. These need to be converted to REST endpoints or Supabase client-side API requests.
- **Next.js Caching & Navigation:** Relying on `revalidatePath` and `redirect` from `next/cache` and `next/navigation`. Expo Router relies on `router.push()`, `router.replace()`, and client-side caching (e.g., React Query or Supabase local caching).
- **DOM Dependencies:** Usage of `window`, `document`, and web-specific packages (e.g., potential PDF generators or standard web UI libraries like Radix/Tailwind CSS via direct DOM manipulation) will crash React Native.

---

## 3. Phase 2 Task List

- [ ] **Task 1:** Initialize the Expo Router bare-bones structure inside `/mobile-app`.
- [ ] **Task 2:** Replicate the structural routing folders: `(auth)` and `(root)`.
- [ ] **Task 3:** Create the Root `_layout.tsx` and configure global providers (Supabase Auth Context, Theme).
- [ ] **Task 4:** Create the `(auth)` Stack navigator (`_layout.tsx`) and dummy `.tsx` screens.
- [ ] **Task 5:** Create the `(root)` Drawer/Tabs navigator (`_layout.tsx`) to replace the Next.js Sidebar.
- [ ] **Task 6:** Abstract Server Actions into a client-compatible service layer mapping directly to the Supabase JS Client.
- [ ] **Task 7:** Convert dynamic Next.js routes (`[id]`) to use `useLocalSearchParams` from Expo Router.
- [ ] **Task 8:** Replace native web imports (`next/link`, `next/image`, `next/navigation`) with Expo equivalents (`Link`, `Image`, `useRouter`).
