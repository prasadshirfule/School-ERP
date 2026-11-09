# Vidyora — Security Baseline & Cryptographic Standards

**Product**: Vidyora  
**Phase**: 1B Foundation  

---

## 1. Cryptography Standards

### A. PII Encryption at Rest
- **Algorithm**: `AES-256-GCM` (Galois/Counter Mode)
- **Key Derivation**: SHA-256 derivation from `PII_ENCRYPTION_KEY`
- **Initialization Vector (IV)**: Cryptographically secure 12-byte (96-bit) IV generated uniquely per encryption via `crypto.randomBytes(12)`
- **Authentication Tag**: 16-byte (128-bit) GCM authentication tag
- **Storage Format**: `iv:authTag:cipherText` (colon-delimited base64 strings)
- **Tamper Protection**: Any modification to the ciphertext or authentication tag immediately throws an authentication failure exception upon decryption.

### B. Password Hashing
- **Algorithm**: `bcryptjs`
- **Cost Factor**: 12 salt rounds
- **Timing Attacks**: Token verification and secret comparisons use `crypto.timingSafeEqual`.

---

## 2. Multi-Tenant Security Baseline

- **Tenant Scoping**: All tenant-owned queries incorporate trusted `schoolId` extracted server-side.
- **Fail-Closed Design**: Blank, empty, or unverified tenant IDs reject execution.
- **PostgreSQL Row-Level Security**:
  - Enforced across 33 tenant tables.
  - Runtime role `vidyora_app` provisioned with `NOBYPASSRLS` so table owner bypass attributes do not breach isolation.
  - Context scoped per transaction using `SET LOCAL app.current_school_id`.

---

## 3. Role-Based Access Control Baseline

- **Five Permitted Roles**:
  - `ADMIN`
  - `PRINCIPAL`
  - `ACCOUNTANT`
  - `TEACHER`
  - `PARENT`
- **Zero School-Level Superadmin**: Central Superadmin is reserved as a separate future owner-only platform.
- **Session Revocation**: `sessionVersion` integer on `User` table allows instant invalidation of compromised credentials.

---

## 4. Phase 1B Status vs Future Phase Roadmap

| Capability | Phase 1B Status | Roadmap Phase |
| :--- | :---: | :---: |
| PostgreSQL RLS & Tenant Client | **Implemented & Verified** | Phase 1B |
| PII Encryption & Password Hashing | **Implemented & Verified** | Phase 1B |
| Offline Fee & Attendance Invariants | **Implemented & Verified** | Phase 1B |
| Schema & Synthetic Seed | **Implemented & Verified** | Phase 1B |
| NextAuth Credentials Flow | Planned | Phase 2 |
| Password Reset & Email Verification | Planned | Phase 2 |
| MFA Setup & Verification | Planned | Phase 2 |
| Full User Portals & UI Dashboards | Planned | Phase 3 |
| Android Staging APK Build | Planned | Mobile Phase |
