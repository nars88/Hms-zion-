# ER Phase 3 Endpoint Contract Matrix

Unified task lifecycle for nursing + diagnostics + bed usage.

## 1) Create Task

- **Endpoint**: `POST /api/er/tasks/create`
- **Purpose**: Create normalized `EmergencyTask` row with `serviceCode`.

### Request JSON

```json
{
  "visitId": "clx_visit_123",
  "category": "DIAGNOSTIC_RADIOLOGY",
  "title": "Chest X-Ray AP/LAT",
  "serviceCode": "RAD_XRAY_CHEST",
  "type": "NURSE_TASK",
  "billQuantity": 1,
  "meta": {
    "priority": "NORMAL",
    "requestedDepartment": "Radiology"
  }
}
```

### Response JSON

```json
{
  "success": true,
  "task": {
    "id": "9f54f7b4-1ce8-497c-bef3-b05d7bfa8a7d",
    "visitId": "clx_visit_123",
    "category": "DIAGNOSTIC_RADIOLOGY",
    "status": "CREATED",
    "serviceCode": "RAD_XRAY_CHEST",
    "billingStatus": "NOT_BILLED"
  }
}
```

---

## 2) Start Task

- **Endpoint**: `PATCH /api/er/tasks/start`
- **Purpose**: Move task state to `IN_PROGRESS`.

### Request JSON

```json
{
  "taskId": "9f54f7b4-1ce8-497c-bef3-b05d7bfa8a7d"
}
```

### Response JSON

```json
{
  "success": true,
  "task": {
    "id": "9f54f7b4-1ce8-497c-bef3-b05d7bfa8a7d",
    "status": "IN_PROGRESS",
    "startedAt": "2026-04-26T20:10:11.000Z"
  }
}
```

---

## 3) Complete Task

- **Endpoint**: `PATCH /api/er/tasks/complete`
- **Purpose**: Mark technical completion before doctor release.

### Request JSON

```json
{
  "taskId": "9f54f7b4-1ce8-497c-bef3-b05d7bfa8a7d",
  "resultText": "No acute pulmonary infiltrate.",
  "resultAttachmentUrl": "https://storage.example.com/xray/chest-123.png",
  "resultMeta": {
    "technicianNotes": "Patient cooperative. Mild motion artifact."
  }
}
```

### Response JSON

```json
{
  "success": true,
  "task": {
    "id": "9f54f7b4-1ce8-497c-bef3-b05d7bfa8a7d",
    "status": "COMPLETED",
    "completedAt": "2026-04-26T20:14:32.000Z",
    "billingStatus": "NOT_BILLED"
  }
}
```

---

## 4) Release Task (Atomic Billing Trigger)

- **Endpoint**: `PATCH /api/er/tasks/release`
- **Purpose**: Doctor-facing release + single billing point.

### Request JSON

```json
{
  "taskId": "9f54f7b4-1ce8-497c-bef3-b05d7bfa8a7d"
}
```

### Server-side atomic behavior

1. Validate task is releasable (`COMPLETED` or policy-allowed state).
2. Resolve active `ServiceCatalog` price by `serviceCode`.
3. Upsert bill line item with `sourceTaskId = task.id`.
4. Mark task:
   - `status = RELEASED`
   - `billingStatus = BILLED`
   - `billedAt = now`
   - `releasedAt = now`

### Response JSON

```json
{
  "success": true,
  "task": {
    "id": "9f54f7b4-1ce8-497c-bef3-b05d7bfa8a7d",
    "status": "RELEASED",
    "billingStatus": "BILLED",
    "billedAt": "2026-04-26T20:15:08.000Z",
    "releasedAt": "2026-04-26T20:15:08.000Z"
  },
  "billing": {
    "serviceCode": "RAD_XRAY_CHEST",
    "unitPrice": 30000,
    "quantity": 1,
    "lineTotal": 30000
  }
}
```

---

## Notes

- `sourceTaskId` in bill items is mandatory for idempotency.
- `serviceCode` must exist and be active in `ServiceCatalog` for billable release.
- `status` transitions should be strictly validated server-side.
