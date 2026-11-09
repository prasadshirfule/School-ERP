# Vidyora — Multi-Tenant Isolation & Security Architecture

**Author**: Vidyora Security Engineering  
**Scope**: Defense-in-depth isolation between schools  

---

## 1. Principles of Tenant Isolation

In Vidyora, every school operates as an independent tenant. Multi-tenancy is enforced through **Defense in Depth**:

1. **Untrusted Input Rule**: `schoolId` is never accepted from client-side query parameters, URL path variables, or request bodies. In authenticated operations, `schoolId` originates strictly from the verified, cryptographically signed server-side session token.
2. **Double Enforcement**: Isolation is enforced at the Application Layer (Prisma query scoping) AND the PostgreSQL Storage Layer (Row-Level Security).
3. **Fail-Closed Default**: Queries executed without an explicit, valid `schoolId` fail immediately with a `TenantIsolationError` or return 0 rows under RLS.

---

## 2. Layer 1: Application-Level Enforcement

Implemented in `src/lib/tenant/index.ts`.

### A. Tenant Client Factory (`createTenantClient`)
The tenant client wraps Prisma operations to automatically merge `{ schoolId: cleanSchoolId }` into queries:

```ts
const tenantClient = createTenantClient(session.user.schoolId);

// Automatically executes: WHERE "schoolId" = session.user.schoolId
const students = await tenantClient.student.findMany();
```

### B. Cross-Tenant Mutation Guards
Any attempt to query, update, or delete a record belonging to another school throws `TenantIsolationError`:

```ts
// Throws TenantIsolationError if student.schoolId !== tenantClient.schoolId
await tenantClient.student.update({
  where: { id: targetStudentId },
  data: { fullName: "New Name" },
});
```

### C. Cross-Tenant Relationship Guard (`assertSameTenant`)
Before linking two entities (e.g., student and class), their school IDs are validated:

```ts
assertSameTenant(student.schoolId, classObj.schoolId, "Student and Class");
```

---

## 3. Layer 2: PostgreSQL Row-Level Security (RLS)

Implemented in `prisma/rls/enable_rls.sql`.

### A. The BypassRLS Threat & Runtime Role Separation
The administrative Neon database user (`neondb_owner`) owns the database tables and has the `rolbypassrls: true` attribute by default in PostgreSQL. If the application connects directly as `neondb_owner` without role switching, PostgreSQL bypasses RLS policies even with `FORCE ROW LEVEL SECURITY`.

To eliminate this vulnerability, Vidyora provisions a dedicated runtime role:
- **Role Name**: `vidyora_app`
- **Attribute**: `NOBYPASSRLS`
- **Permissions**: `SELECT, INSERT, UPDATE, DELETE` on all public tables and sequences.

### B. Transaction-Local Tenant Scoping
The `withTenantContext` helper switches transaction-locally to `vidyora_app` and sets the session variable `app.current_school_id`:

```ts
export async function withTenantContext<T>(
  schoolId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    // 1. Switch to non-bypass runtime role
    await tx.$executeRawUnsafe(`SET LOCAL ROLE vidyora_app;`);
    // 2. Set transaction-local session variable
    await tx.$executeRaw`SELECT set_config('app.current_school_id', ${schoolId}, true)`;
    // 3. Execute tenant-bounded query
    return fn(tx);
  });
}
```

### C. PostgreSQL Engine Policy Definition
Applied across all 33 tenant-owned tables:

```sql
CREATE POLICY tbl_tenant_isolation ON "tbl"
FOR ALL
USING ("schoolId" = NULLIF(current_setting('app.current_school_id', true), ''))
WITH CHECK ("schoolId" = NULLIF(current_setting('app.current_school_id', true), ''));
```

When `app.current_school_id` is missing or does not match the row's `schoolId`, PostgreSQL returns 0 rows and blocks any insert/update/delete.

---

## 4. Automated Verification Results

The automated tenant isolation test suite (`tests/tenant/`) executes against real staging PostgreSQL:

- `✓ Multi-tenant query read scoping verified` (School 1 never sees School 2 rows).
- `✓ Cross-tenant unique lookup blocked by TenantIsolationError`.
- `✓ Cross-tenant update blocked by TenantIsolationError`.
- `✓ Cross-tenant delete blocked by TenantIsolationError`.
- `✓ Cross-tenant relationship validation verified`.
- `✓ Missing tenant context fails closed`.
- `✓ PostgreSQL RLS transaction-local scoping verified for School 1`.
- `✓ PostgreSQL RLS transaction-local scoping verified for School 2`.
- `✓ PostgreSQL RLS fails closed when tenant context is empty or unmatched`.
