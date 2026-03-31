# Hospital-Doctor Platform Backend

Production-ready backend built with Node.js, Express, MongoDB, Mongoose, JWT, and MVC-style domain modules.

## Folder Structure

```text
.
├── app.js
├── server.js
├── config/
├── middleware/
│   ├── auth.middleware.js
│   ├── error.middleware.js
│   ├── role.middleware.js
│   └── validation.middleware.js
├── modules/
│   ├── admin/
│   ├── auth/
│   ├── department/
│   ├── doctor/
│   ├── hospital/
│   ├── subscription/
│   ├── superadmin/
│   └── user/
├── postman/
│   └── Hospital-Doctor-Platform.postman_collection.json
├── routes/
└── shared/
    └── utils/
```

## Implemented Features

- Admin approval workflow for doctors and hospitals with `pending`, `approved`, and `rejected`
- Login restriction for non-approved users via the existing JWT auth flow
- Doctor profile creation and retrieval
- Hospital profile creation and retrieval
- Doctor to hospital selection flow with hospital-side approve/reject actions
- Default and hospital-specific subscription pricing
- Admin filtering, sorting, and pagination for doctor and hospital review queues
- Role-based route protection and request validation using `express-validator`

## Core API Summary

### Admin

- `GET /api/admin/doctors?status=pending&sort=-createdAt&page=1&limit=10`
- `GET /api/admin/hospitals?status=approved&sort=name&page=1&limit=10`
- `PATCH /api/admin/doctors/:id/status`
- `PATCH /api/admin/hospitals/:id/status`
- `POST /api/admin/subscription/default`
- `POST /api/admin/subscription/hospital`

### Doctor

- `POST /api/doctors`
- `GET /api/doctors/:id`
- `POST /api/doctors/:id/select-hospital`

### Hospital

- `POST /api/hospitals`
- `GET /api/hospitals/:id`
- `GET /api/hospitals/:id/pending-doctors`
- `PATCH /api/hospitals/:id/approve-doctor`
- `PATCH /api/hospitals/:id/reject-doctor`
- `GET /api/hospitals/:id/subscription`

## Example Requests

### Create Doctor Profile

```http
POST /api/doctors
Authorization: Bearer <doctor_jwt>
Content-Type: application/json

{
  "name": "Dr. Priya Sharma",
  "gender": "female",
  "dob": "1990-04-12",
  "blood_group": "O+",
  "phone": "+91-9876543210",
  "department": "Cardiology"
}
```

### Create Hospital Profile

```http
POST /api/hospitals
Authorization: Bearer <hospital_jwt>
Content-Type: application/json

{
  "name": "Metro Care Hospital",
  "location": "Bengaluru",
  "phone": "+91-9988776655",
  "departments": ["Cardiology", "Orthopedics", "Neurology"]
}
```

### Update Doctor Approval Status

```http
PATCH /api/admin/doctors/67f0b2a8360d88b6e145df81/status
Authorization: Bearer <admin_jwt>
Content-Type: application/json

{
  "status": "approved"
}
```

### Set Default Subscription

```http
POST /api/admin/subscription/default
Authorization: Bearer <admin_jwt>
Content-Type: application/json

{
  "amount": 500
}
```

## Sample Responses

### Success

```json
{
  "success": true,
  "message": "Doctor status updated successfully",
  "data": {
    "id": "67f0b2a8360d88b6e145df81",
    "userId": "67f0b2a8360d88b6e145df01",
    "profileId": "67f0b2a8360d88b6e145df81",
    "name": "Dr. Priya Sharma",
    "email": "priya@example.com",
    "role": "doctor",
    "status": "approved"
  }
}
```

### Validation Error

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "status",
      "message": "Status must be pending, approved or rejected"
    }
  ]
}
```

### Approval Blocked Login

```json
{
  "success": false,
  "message": "Your account is still pending admin approval",
  "errors": null
}
```

## Notes

- Existing auth was extended, not replaced.
- Registration now supports `doctor`, `hospital`, `common_user`, and `admin`.
- Approval state is exposed as lowercase (`pending`, `approved`, `rejected`) while the existing auth system still uses its internal login status values.
- Hospital subscription lookup returns hospital override first and falls back to the default amount.
