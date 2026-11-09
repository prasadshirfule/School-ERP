# NEXUS Platform Admin API — Specification & Contract (v1)

This specification defines the machine-to-machine (M2M) API contract between **NEXUS Platform Management** and the **School ERP Cloud SaaS Engine**.

---

## 1. Authentication & Security

All requests to `/api/nexus/v1/*` must be authenticated using an API key.

### Headers
| Header | Description | Example |
| :--- | :--- | :--- |
| `Authorization` | Bearer token authorization | `Bearer nex_live_7fa83d9...` |
| `x-nexus-api-key` | Alternative direct header | `nex_live_7fa83d9...` |
| `Content-Type` | Required for POST/PUT requests | `application/json` |

### Environment Configuration
The platform server validates requests against:
```env
NEXUS_API_KEY=nex_live_...
```
Requests failing API key validation return `401 Unauthorized` with error code `NEXUS_INVALID_CREDENTIALS`.

---

## 2. API Endpoints

### 2.1 List Schools
**`GET /api/nexus/v1/schools`**

Retrieves all institutional tenants with their current status, plan, student count, and administrative details.

#### Query Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `status` | string | No | Filter by `PENDING`, `APPROVED`, `SUSPENDED`, `REJECTED`, or `ALL` (default: `ALL`). |
| `search` | string | No | Search query matching school name, email, or principal. |
| `page` | number | No | Page number (default: 1). |
| `limit` | number | No | Page limit between 1 and 100 (default: 25). |

#### Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": "sch_123456",
      "name": "Delhi Public Academy",
      "code": "DPA01",
      "email": "admin@dpa.edu",
      "phone": "+91 98765 43210",
      "status": "APPROVED",
      "isActive": true,
      "studentCount": 420,
      "createdAt": "2026-09-01T00:00:00.000Z",
      "subscription": {
        "status": "TRIALING",
        "planName": "Professional Plan",
        "trialEndsAt": "2026-12-09T00:00:00.000Z",
        "isExpired": false
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 1,
    "totalPages": 1
  }
}
```

---

### 2.2 Get School Details
**`GET /api/nexus/v1/schools/:id`**

Fetches detailed metrics for a specific school tenant, including active student count, staff count, and subscription period.

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "sch_123456",
    "name": "Delhi Public Academy",
    "status": "APPROVED",
    "isActive": true,
    "subscription": {
      "id": "sub_987",
      "status": "ACTIVE",
      "plan": { "id": "plan_pro", "name": "Professional Plan", "price": 4999 },
      "currentPeriodEnd": "2027-09-01T00:00:00.000Z"
    },
    "metrics": {
      "totalStudents": 420,
      "totalClasses": 14,
      "totalInvoices": 1260
    }
  }
}
```

---

### 2.3 Suspend School Tenant
**`POST /api/nexus/v1/schools/:id/suspend`**

Immediately suspends school operations. When suspended, all tenant users are rejected at authentication and session validation (`401 Unauthorized` / `TENANT_SUSPENDED`).

#### Request Body
```json
{
  "reason": "Non-payment of SaaS license fees after 15-day grace period"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Tenant Delhi Public Academy has been suspended.",
  "school": {
    "id": "sch_123456",
    "status": "SUSPENDED",
    "isActive": false
  }
}
```

---

### 2.4 Reactivate School Tenant
**`POST /api/nexus/v1/schools/:id/reactivate`**

Restores access to a suspended school tenant.

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Tenant Delhi Public Academy has been restored.",
  "school": {
    "id": "sch_123456",
    "status": "APPROVED",
    "isActive": true
  }
}
```

---

### 2.5 Extend Trial
**`POST /api/nexus/v1/subscriptions/:id/extend-trial`**

Extends a school's trial subscription by a specified number of days without requiring immediate payment.

#### Request Body
```json
{
  "additionalDays": 30,
  "reason": "Granted extension by regional account executive"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Trial extended by 30 days.",
  "subscription": {
    "id": "sub_987",
    "status": "TRIALING",
    "trialEndsAt": "2027-01-08T00:00:00.000Z"
  }
}
```

---

## 3. Error Standard

All error responses adhere to the standard format:
```json
{
  "success": false,
  "error": "Human-readable error description",
  "code": "NEXUS_TENANT_NOT_FOUND"
}
```

| HTTP Status | Code | Description |
| :--- | :--- | :--- |
| `401` | `NEXUS_UNAUTHORIZED` | Missing or invalid API key |
| `403` | `NEXUS_FORBIDDEN` | Insufficient permissions |
| `404` | `NEXUS_NOT_FOUND` | School or subscription entity not found |
| `429` | `NEXUS_RATE_LIMITED` | Rate limit of 60 req/min exceeded |
| `500` | `NEXUS_INTERNAL_ERROR` | Internal server or database error |
