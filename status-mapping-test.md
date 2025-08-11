// Test Cases for Status String to Enum Conversion

// Valid status strings (should work):
GET /api/projects?status=IN_PROGRESS        → Status.IN_PROGRESS
GET /api/projects?status=COMPLETED          → Status.COMPLETED  
GET /api/projects?status=not_started        → Status.NOT_STARTED (uppercase conversion)
GET /api/projects?status=on_hold            → Status.ON_HOLD

// Invalid status strings (should return null, query returns all):
GET /api/projects?status=INVALID            → null (ignores filter)
GET /api/projects?status=                   → null (empty string)
GET /api/projects?status=random_text        → null (invalid enum)

// No status parameter (should return all):
GET /api/projects                           → null (no filter)

// Database mapping:
// - DB stores status as Status enum (IN_PROGRESS, COMPLETED, etc.)  
// - Frontend sends status as String
// - Service converts String → Status enum via parseStatus()
// - Repository receives Status enum for JPQL query
// - (:status IS NULL OR p.status = :status) handles null correctly

// Flow:
// Frontend: "IN_PROGRESS" (String)
//     ↓
// Controller: status parameter (String)  
//     ↓
// Service: parseStatus("IN_PROGRESS") → Status.IN_PROGRESS
//     ↓  
// Repository: @Param("status") Status status
//     ↓
// JPQL: WHERE p.status = Status.IN_PROGRESS
//     ↓
// Database: SELECT * FROM projects WHERE status = 'IN_PROGRESS'
