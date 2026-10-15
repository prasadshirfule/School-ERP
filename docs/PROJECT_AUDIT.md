# School ERP — Comprehensive Codebase & System Audit

**Date:** October 2026  
**Auditor:** Antigravity Senior Full-Stack, Security, QA & UI/UX Engineering Team  
**Repository:** https://github.com/prasadshirfule/School-ERP.git  
**Production URL:** https://school-erp-wb73.vercel.app/  

---

## 1. Executive Summary

This audit establishes the baseline technical, functional, security, and UI/UX state of the School ERP application. The system is a multi-tenant School Management System built on Next.js 16 (App Router), React 19, Prisma ORM 6, NextAuth v4, and Tailwind CSS v4.

While core multi-tenant scoping and Prisma model extensions (`src/lib/tenant.ts`) are well-architected with 21 tenant-scoped models and 29 passing tenant isolation tests, the system suffers from **critical authentication failures on production**, **session race conditions during and after login**, **API route misdirection in edge middleware**, **an inappropriate dark-mode aesthetic that does not fit school staff**, and **a lack of responsive navigation (sidebar hardcoded at 250px with no mobile drawer or collapsible toggle)**.

---

## 2. Technology & Architecture Baseline

| Component | Verified Technology | Version | Notes |
| :--- | :--- | :--- | :--- |
| **Framework** | Next.js (App Router, Turbopack) | `16.3.5` | React 19.2.8, Server Components + Client Boundaries |
| **Authentication** | NextAuth.js | `4.24.15` | Credentials provider with JWT session strategy |
| **Database ORM** | Prisma Client & CLI | `6.19.3` | PostgreSQL, 22 schema models |
| **Tenant Scoping** | Custom Prisma `$extends` extension | `src/lib/tenant.ts` | 21 tenant models protected |
| **Cryptography** | AES-256-GCM / bcryptjs | Node `crypto` / `bcryptjs 3.0.3` | PII encryption for Aadhaar & medical records |
| **Styling** | Tailwind CSS v4 + Vanilla CSS tokens | `4.x` | Currently styled in harsh `#0e1118` dark theme |
| **Icons** | Lucide React | `1.45.0` | Comprehensive icon library |
| **Deployment** | Vercel Edge / Serverless | Node.js runtime | Production live at `school-erp-wb73.vercel.app` |

---

## 3. Verified Critical Bugs & Root Causes

### 3.1 NextAuth Server Configuration Crash on Vercel (`NO_SECRET`) [P0]
* **Observed Behavior:** Calling `https://school-erp-wb73.vercel.app/api/auth/csrf` and `/api/auth/callback/credentials` returns HTTP 500 with `{"message":"There is a problem with the server configuration. Check the server logs for more information."}`. Users cannot log in on the live site.
* **Root Cause:** In `src/lib/auth.ts`, `authOptions` did NOT explicitly declare `secret: process.env.NEXTAUTH_SECRET`. In NextAuth v4 with Next.js App Router route handlers, NextAuth throws `NO_SECRET` when `authOptions.secret` is undefined and platform environment injection is delayed or missing.
* **Corrective Action:** Provide explicit fallback secret in `authOptions.secret: process.env.NEXTAUTH_SECRET || "..."`, add `trustHost: true`, and ensure cookie name detection accommodates both standard and `__Secure-` cookie prefixes.

### 3.2 Login Page Race Condition & Role Misdirection [P0]
* **Observed Behavior:** After entering credentials, users report login loops, being kicked back to `/login`, or flickering onto the wrong dashboard.
* **Root Cause:** In `src/app/(auth)/login/page.tsx`, `signIn("credentials", { redirect: false })` was followed immediately by `fetch("/api/auth/session")`. The cookie from `signIn` is often not yet set or readable in that subsequent millisecond fetch. When `session?.user?.role` evaluated to `undefined`, the code defaulted to `"ADMIN"` and pushed to `/admin/dashboard` via client-side `router.push()`. For non-admin users (Teachers, Parents, Accountants), edge middleware detected a role mismatch and bounced them back to `/login`. Furthermore, client-side `router.push()` did not reload server layout components with the fresh session.
* **Corrective Action:** Implement clean document navigation (`window.location.href`) to the role-specific dashboard or `callbackUrl`, allowing server layout components to mount with full session state. Support `callbackUrl` query parameter.

### 3.3 Middleware Redirecting API Endpoints to HTML Login [P0]
* **Observed Behavior:** When a user's session expires or is missing during API requests (e.g., `/api/students`), the client encounters `SyntaxError: Unexpected token '<'` and pages crash.
* **Root Cause:** In `src/middleware.ts`, unauthenticated requests were uniformly redirected to `/login` via `NextResponse.redirect(loginUrl)` without checking if `pathname.startsWith("/api/")`.
* **Corrective Action:** For any pathname starting with `/api/`, return `NextResponse.json({ error: "Unauthorized" }, { status: 401 })`.

### 3.4 Public Health Check Route Blocked [P1]
* **Observed Behavior:** Calling `https://school-erp-wb73.vercel.app/api/health` returned the HTML login page.
* **Root Cause:** `/api/health` was omitted from `PUBLIC_PATHS` in `src/middleware.ts`.
* **Corrective Action:** Add `/api/health` to `PUBLIC_PATHS`.

### 3.5 Demo Credential Mismatch on Login Screen [P1]
* **Observed Behavior:** Login screen displayed `Demo: admin@greenfield.edu / password123`, while `prisma/seed.ts` seeded `admin@dpa.edu.in`. Users following the prompt could not log in.
* **Root Cause:** Disconnect between `seed.ts` updates and `login/page.tsx`.
* **Corrective Action:** Add an interactive 1-click Demo Role Selector to the login page supporting Admin, Principal, Teacher, Accountant, and Parent roles.

---

## 4. UI/UX & Information Architecture Deficiencies

1. **Aesthetic Misalignment:** The application currently employs an ultra-dark theme (`#0e1118` canvas, `#151a24` surfaces) with purple accents. School administrators, teachers, and parents require a clean, high-contrast, professional palette with deep navy primary (`#1e3a8a` / `#0f172a`), clean white and neutral backgrounds (`#f8fafc` / `#ffffff`), and restrained accents (emerald `#059669` / teal `#0d9488`).
2. **Layout & Responsive Failure:**
   - Sidebar is fixed at `250px` width; `main-content` hardcodes `margin-left: 250px`.
   - On screens `< 768px`, the sidebar permanently obscures content, causing horizontal overflow and unclickable elements.
   - No mobile hamburger drawer exists.
   - Desktop has no collapsible toggle to maximize table viewport space.
3. **Navigation Clutter:**
   - 15 flat menu items with no logical groupings (e.g. Core Academics, People & Attendance, Finance, Communications, Settings).
   - Missing breadcrumbs and active route indicators.
4. **Dashboard Under-utilization:**
   - Admin dashboard displays only 4 raw count cards.
   - Teacher dashboard contains only a single link button.
   - Accountant dashboard lacks fee collection summaries and overdue tracking charts.

---

## 5. Security & Multi-Tenancy Review

- **Tenant Scoping:** Implemented via Prisma `$extends` query middleware in `src/lib/tenant.ts`. All 21 models with `schoolId` are strictly checked in both queries and mutations.
- **Tenant Isolation Tests:** 29 tests verified passing in `scripts/test-tenant-isolation.ts`.
- **Sensitive PII:** Aadhaar numbers and medical conditions are encrypted using AES-256-GCM via `src/lib/security.ts`.
- **Rate Limiting:** Sliding-window rate limiting in `src/lib/rateLimit.ts` guards login and sensitive operations.
