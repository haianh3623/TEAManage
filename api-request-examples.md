/**
 * API Request Examples cho Enhanced Project Endpoints
 * 
 * IMPORTANT: {id} endpoints now use regex pattern {id:[0-9]+} 
 * to avoid conflicts with named endpoints like /managed, /member
 */

// ===== BASIC REQUESTS =====

// 1. Get all projects (default)
GET /api/projects?page=0&size=12

// 2. Get specific project by ID
GET /api/projects/123

// 3. Get projects with search
GET /api/projects?page=0&size=12&search=website

// 4. Get projects with status filter
GET /api/projects?page=0&size=12&status=IN_PROGRESS

// 5. Get projects with sorting
GET /api/projects?page=0&size=12&sort=name,asc
GET /api/projects?page=0&size=12&sort=startDate,desc

// ===== ADVANCED FILTERING =====

// 5. Multiple filters combined
GET /api/projects?page=0&size=10&search=mobile&status=IN_PROGRESS&sort=endDate,asc

// 6. Role-based filtering
GET /api/projects?page=0&size=10&role=managed&search=app
GET /api/projects?page=0&size=10&role=member&status=COMPLETED

// 7. Complex filtering with role and status
GET /api/projects?page=1&size=5&role=managed&status=IN_PROGRESS&sort=progress,desc

// ===== DEDICATED ENDPOINTS =====

// 8. Get only managed projects
GET /api/projects/managed?page=0&size=10&sort=name,asc

// 9. Get only member projects
GET /api/projects/member?page=0&size=10&status=IN_PROGRESS

// 10. Search specific endpoint
GET /api/projects/search?query=backend&page=0&size=10

// 11. Filter by status specific endpoint
GET /api/projects/by-status/OVERDUE?page=0&size=10

// ===== SORTING OPTIONS =====

// Available sort fields:
// - name (project name)
// - startDate (project start date)
// - endDate (project end date)  
// - progress (project progress percentage)
// - createdAt (creation date)
// - updatedAt (last modified date)

// Sort directions: asc, desc

// Examples:
GET /api/projects?sort=name,asc           // A-Z
GET /api/projects?sort=name,desc          // Z-A
GET /api/projects?sort=startDate,desc     // Newest first
GET /api/projects?sort=endDate,asc        // Deadline approaching
GET /api/projects?sort=progress,desc      // High progress first

// ===== STATUS VALUES =====

// Available status values:
// - NOT_STARTED
// - IN_PROGRESS  
// - ON_HOLD
// - COMPLETED
// - CANCELED
// - OVERDUE

// ===== ROLE VALUES =====

// Available role values:
// - managed (user is LEADER or VICE_LEADER)
// - member (user is MEMBER)

// ===== RESPONSE FORMAT =====

// All endpoints return paginated response:
{
  "content": [
    {
      "id": 1,
      "name": "Project Name",
      "description": "Project Description",
      "startDate": "2025-01-01T00:00:00",
      "endDate": "2025-12-31T23:59:59",
      "status": "IN_PROGRESS",
      "progress": 75,
      "createdAt": "2025-01-01T10:00:00",
      "updatedAt": "2025-08-06T15:30:00",
      "members": [...],
      "tasks": [...]
    }
  ],
  "pageable": {
    "sort": {
      "sorted": true,
      "direction": "ASC",
      "field": "name"
    },
    "pageNumber": 0,
    "pageSize": 10
  },
  "totalElements": 25,
  "totalPages": 3,
  "last": false,
  "first": true,
  "numberOfElements": 10
}

// ===== ERROR HANDLING =====

// Invalid sort field - falls back to default (startDate,desc)
GET /api/projects?sort=invalidField,asc

// Invalid status - ignored, returns all statuses
GET /api/projects?status=INVALID_STATUS

// Invalid role - falls back to all projects
GET /api/projects?role=invalid_role

// Empty search - ignored, returns all projects
GET /api/projects?search=

// Invalid page/size - uses defaults (page=0, size=10)
GET /api/projects?page=-1&size=0
