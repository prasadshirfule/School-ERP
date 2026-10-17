# 🛡️ School ERP — Security Test Plan & Abuse-Case Verification Matrix

**Date:** October 17, 2026  
**Target:** Multi-Tenant School ERP Application  
**Coverage:** Authentication, Tenant Isolation, RBAC Authorization, Student Privacy (PII), Payment Integrity, and File Upload Security.

---

## 1. Authentication & Session Security Test Matrix

| ID | Test Scenario | Execution Vector | Expected Result | Pass/Fail Criteria |
| :--- | :--- | :--- | :--- | :--- |
| **AUTH-01** | Missing `NEXTAUTH_SECRET` in Production | Set `NODE_ENV=production` and remove `NEXTAUTH_SECRET` | Server refuses to start with fatal configuration error | No silent fallback to default string |
| **AUTH-02** | Short `NEXTAUTH_SECRET` | Set `NEXTAUTH_SECRET=short_secret` (<32 chars) in production | Server fails startup validation | Fatal error logged; boot halted |
| **AUTH-03** | CSRF Token Generation | `GET /api/auth/csrf` | Returns HTTP 200 with JSON `{ csrfToken: "..." }` and Set-Cookie | No HTTP 500 error on local or production |
| **AUTH-04** | Valid User Authentication | `POST /api/auth/callback/credentials` with valid email & password | Returns 200/302, sets HTTP-only session cookie, role is loaded | Session token issued |
| **AUTH-05** | Invalid Password Attempt | `POST /api/auth/callback/credentials` with wrong password | Returns 401/error redirect, no session token issued | Safe failure; credentials not disclosed |
| **AUTH-06** | Inactive User Sign-In | User with `isActive = false` | Returns 401; sign-in rejected | Inactive accounts cannot authenticate |
| **AUTH-07** | Session Tampering | Manipulate JWT token signature or payload role | `getToken()` rejects token; user treated as unauthenticated | 401 Unauthorized returned on API routes |
| **AUTH-08** | API Unauthenticated Response | Call `/api/students` without session cookie | Returns HTTP 401 JSON `{ "error": "Unauthorized" }` | **No HTML 307 redirect** to `/login` |

---

## 2. Multi-Tenant Isolation & Cross-Tenant Boundary Tests

Two distinct test schools:
- **School A:** `school_dpa_cbse` (Delhi Public Academy)
- **School B:** `school_xavier_icse` (St. Xavier's High School)

| ID | Model / Operation | Attack Vector | Expected Defense Behavior |
| :--- | :--- | :--- | :--- |
| **TEN-01** | `Student` (Read) | School A admin calls `findMany(Student)` | Returns 0 students from School B |
| **TEN-02** | `Student` (Direct Read) | School A user queries `findUnique(Student)` with School B's student ID | Returns `null` or throws `P2025` Not Found |
| **TEN-03** | `Student` (Mutation) | School A admin tries `update(Student)` on School B's student ID | Throws `P2025` Not Found; update blocked |
| **TEN-04** | `Teacher` (Unscoped model read) | School A admin calls `GET /api/teachers?all=true` | Returns only School A teachers (0 School B teachers) |
| **TEN-05** | `Teacher` (Global search) | School A user searches teacher name belonging to School B | Returns 0 results from School B |
| **TEN-06** | `Marks` (Autocomplete) | School A teacher calls `GET /api/marks?examsOnly=true` with no section | Returns only exam names from School A |
| **TEN-07** | `Marks` (Upsert attack) | School A teacher attempts `marks.upsert` on School B student | Blocked by student tenant validation with 400/404 |
| **TEN-08** | `Section` (Cross-Tenant Class ID) | School A admin calls `POST /api/sections` with `classId` from School B | Rejected: Class not found in caller's school |
| **TEN-09** | `Invoice` (Cross-Tenant Student ID)| School A accountant calls `POST /api/invoices` with `studentId` from School B | Rejected: Student not found in caller's school |
| **TEN-10** | `Timetable` (Cross-Tenant Teacher) | School A admin assigns School B teacher to School A timetable slot | Rejected: Teacher not found in caller's school |
| **TEN-11** | `Department` (Cross-Tenant Member) | School A admin assigns School B teachers to School A department | Rejected: Teachers not found in caller's school |
| **TEN-12** | `SchoolId` Mutability | Ordinary update payload includes `{ schoolId: "school_attacker" }` | Throws error: Cannot modify schoolId through tenant client |

---

## 3. Role-Based Access Control (RBAC) Test Matrix

| Route | Role Under Test | Action / Endpoint | Expected Response |
| :--- | :--- | :--- | :--- |
| `/api/periods` | PARENT | `DELETE /api/periods?id=...` | **403 Forbidden** (Deletion blocked) |
| `/api/periods` | TEACHER | `POST /api/periods` | **403 Forbidden** |
| `/api/timetable` | PARENT | `POST /api/timetable` | **403 Forbidden** |
| `/api/subjects` | PARENT | `POST /api/subjects` | **403 Forbidden** |
| `/api/subjects` | PARENT | `PATCH /api/subjects` | **403 Forbidden** |
| `/api/syllabus` | PARENT | `POST /api/syllabus` | **403 Forbidden** |
| `/api/syllabus` | PARENT | `DELETE /api/syllabus?id=...` | **403 Forbidden** |
| `/api/exam-slots` | PARENT | `POST /api/exam-slots` | **403 Forbidden** |
| `/api/certificates/generate` | PARENT | `POST /api/certificates/generate` | **403 Forbidden** |
| `/api/receipt/[id]` | PARENT | `GET /api/receipt/[unrelated_id]` | **404 Not Found / 403 Forbidden** |
| `/api/leave` | PARENT | `GET /api/leave` | **403 Forbidden** (Staff records hidden) |
| `/api/leave` | TEACHER | `GET /api/leave` | Returns **only teacher's own** leave requests |
| `/api/marks` | PARENT | `GET /api/marks?sectionId=...` | **403 Forbidden** (Bulk class marks hidden) |
| `/api/notices` | PARENT | `GET /api/notices?role=ADMIN` | Returns **only PARENT-targeted** notices |
| `/api/assignments` | TEACHER | `DELETE /api/assignments?id=...` (owned by another teacher) | **403 Forbidden** |

---

## 4. Student Privacy & PII Protection Tests

| ID | Test Scenario | Attack / Inspection Vector | Expected Behavior |
| :--- | :--- | :--- | :--- |
| **PII-01** | Encryption Verification | Inspect raw database row for `Student.aadharNumber` | Stored as `iv:authTag:ciphertext` format |
| **PII-02** | Plaintext Fallback Prevention | Trigger encryption error (e.g. invalid cipher state) | Throws `EncryptionError`; does NOT write plaintext |
| **PII-03** | Decryption Failure Handling | Tamper with stored ciphertext bytes | Throws `DecryptionError` or returns `null`; does NOT return ciphertext |
| **PII-04** | Aadhaar Number Masking | Call `GET /api/students` or teacher view | Displays masked format `XXXX-XXXX-1234` |
| **PII-05** | Parent Password Hash Protection | Call `GET /api/students/[id]` | JSON response contains parent `id`, `fullName`, `email`, but **`passwordHash` is omitted** |
| **PII-06** | Student Medical Data Access | Teacher or Parent inspects student profile | Medical condition accessible only if authorized |

---

## 5. Financial Integrity & Concurrency Tests

| ID | Test Scenario | Simulation Method | Expected Outcome |
| :--- | :--- | :--- | :--- |
| **FIN-01** | Payment Overpayment Prevention | Attempt to pay ₹15,000 on invoice with balance ₹10,000 | Request rejected with 400 Bad Request |
| **FIN-02** | Zero or Negative Payment | Attempt payment of ₹0 or -₹500 | Request rejected by Zod schema validation |
| **FIN-03** | Concurrent Payment Integrity | 5 concurrent requests paying ₹2,000 on a ₹10,000 invoice | Total paid equals ₹10,000; status transitions to `PAID` |
| **FIN-04** | Concurrent Receipt Numbering | 2 concurrent payment requests in the same school | Unique sequential receipt numbers assigned; 0 collisions |
| **FIN-05** | Client Receipt Number Tampering | Client submits custom `receiptNumber: "FORGED-001"` | Server ignores client value; generates authoritative number |
| **FIN-06** | Payment Idempotency | Submit same Razorpay callback with `gatewayRef` twice | Second request rejected as already processed |
| **FIN-07** | Mock Signature Rejection | Submit `signature: mock_sig_123` with `NODE_ENV=production` | Verification rejected with 400 Bad Request |

---

## 6. File Upload & Storage Security Tests

| ID | Test Scenario | Upload Payload | Expected Defense Result |
| :--- | :--- | :--- | :--- |
| **UPL-01** | Executable Spoofed as Image | `malware.exe` renamed to `photo.jpg` with MIME `image/jpeg` | Magic byte validator inspects header, detects non-JPEG, rejects with 400 |
| **UPL-02** | Oversized Student Photo | 6MB JPEG file uploaded to `/api/upload/student-photo` | Rejected: exceeds 5MB limit |
| **UPL-03** | Oversized Assignment | 15MB file uploaded to `/api/upload/assignment` | Rejected: exceeds 10MB limit |
| **UPL-04** | Path Traversal Filename | `../../../../etc/passwd` submitted as filename | Filename sanitized to alphanumeric safe string |
| **UPL-05** | Tenant Storage Isolation | School A user uploads photo | Stored under path `uploads/school_A/...` |
