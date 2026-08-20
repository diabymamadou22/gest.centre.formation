# Security Specification for Nurul Quran Manager

## 1. Data Invariants
- Students must have `firstName`, `lastName`, and `status`.
- Courses must have `name` and `price`.
- Payments must reference an existing `studentId`.
- Enrollments must reference existing `studentId` and `courseId`.
- All timestamps must be server-generated.
- String sizes must be strictly bounded.

## 2. The "Dirty Dozen" Payloads

### Payload 1: Create student without first name
- Target: `/students/new_id`
- Payload: `{ "lastName": "Doe", "status": "active" }`
- Expected: PERMISSION_DENIED (Missing required field `firstName`)

### Payload 2: Create student with massive first name
- Target: `/students/new_id`
- Payload: `{ "firstName": "A".repeat(2000), "lastName": "Doe", "status": "active" }`
- Expected: PERMISSION_DENIED (String size limit exceeded)

### Payload 3: Spoof ownerId
- Target: `/students/new_id`
- Payload: `{ "firstName": "John", "lastName": "Doe", "status": "active", "ownerId": "some_other_uid" }`
- Expected: PERMISSION_DENIED (Identity integrity: ownerId must match request.auth.uid)

### Payload 4: Update immutable createdAt
- Target: `/students/existing_id`
- Payload: `{ "createdAt": "2020-01-01T00:00:00Z" }`
- Expected: PERMISSION_DENIED (Immutability check failed)

### Payload 5: Unauthenticated write
- Target: `/courses/new_id`
- Payload: `{ "name": "Tajweed", "price": 50 }`
- Auth: null
- Expected: PERMISSION_DENIED (Authentication required)

### Payload 6: Non-admin write (if admin check implemented)
- Target: `/courses/new_id`
- Payload: `{ "name": "Tajweed", "price": 50 }`
- Auth: `{ uid: 'normal_user' }` (not in admins collection)
- Expected: PERMISSION_DENIED

### Payload 7: Payment with negative amount
- Target: `/payments/new_id`
- Payload: `{ "studentId": "id123", "amount": -50, "paymentDate": "2026-05-06" }`
- Expected: PERMISSION_DENIED (Validation failed: amount must be > 0)

### Payload 8: Injection in ID
- Target: `/students/invalid@ID!`
- Payload: `{ "firstName": "John", "lastName": "Doe", "status": "active" }`
- Expected: PERMISSION_DENIED (Regex guard on ID failed)

### Payload 9: Orphaned Enrollment (Course doesn't exist)
- Target: `/enrollments/new_id`
- Payload: `{ "studentId": "s1", "courseId": "non_existent_c1", "status": "active" }`
- Expected: PERMISSION_DENIED (Relational verification `exists()` failed)

### Payload 10: State shortcut (Set status to 'completed' directly)
- Target: `/enrollments/new_id`
- Payload: `{ "studentId": "s1", "courseId": "c1", "status": "completed" }`
- Expected: PERMISSION_DENIED (Only 'active' allowed on creation)

### Payload 11: Cross-user read (if restricted)
- Target: `/students/user_a_id`
- Auth: `{ uid: 'user_b' }`
- Expected: PERMISSION_DENIED

### Payload 12: Updating whitelisted key with invalid type
- Target: `/courses/c1`
- Payload: `{ "price": "free" }`
- Expected: PERMISSION_DENIED (Type safety check failed)

## 3. Test Runner (Conceptual)
The `firestore.rules.test.ts` would use `@firebase/rules-unit-testing` to verify these payloads.
