/**
 * API Response Format Documentation
 * Based on actual backend responses
 */

// 1. Login Response Format (POST /auth/login)
const loginResponse = {
    "expiresIn": 1754332077000,           // Timestamp khi token hết hạn
    "accessToken": "eyJhbGciOiJIUzI1NiJ9...", // JWT Access Token
    "tokenType": "Bearer",                // Loại token
    "user": {                            // Thông tin user
        "firstName": "Le",
        "lastName": "Anh", 
        "id": 1,
        "email": "leanh123@example.com"
    }
};

// 2. Register Response Format (POST /users/register)
const registerResponse = {
    "id": 8,                             // ID của user mới tạo
    "createdAt": 1754328423021,          // Timestamp tạo
    "updatedAt": 1754328423021,          // Timestamp cập nhật
    "firstName": "Nguyen",               // Tên
    "lastName": "Kiet",                  // Họ
    "password": "$2a$10$VCUSbIJgSr4cED/gt9n7fugRKeB4vt2ntrv1LvFUaRw/jtoQOD82y", // Mật khẩu đã hash
    "email": "nguyenkiet1223@example.com", // Email
    "dob": 1041379200000,                // Ngày sinh (timestamp)
    "phoneNumber": "0987654321",         // Số điện thoại
    "projectMembers": null,              // Danh sách project (null khi mới tạo)
    "tasks": null                        // Danh sách task (null khi mới tạo)
};

const projectListResponse = {
    "content": [
        {
            "id": 3,
            "name": "Dự án move on",
            "description": "Tôi muốn move on",
            "status": "NOT_STARTED",
            "progress": 0,
            "startDate": 1754611200000,
            "endDate": 1755475200000,
            "members": [
                {
                    "firstName": "Le",
                    "lastName": "Anh",
                    "email": "leanh123@example.com",
                    "role": "LEADER"
                }
            ],
            "tasks": []
        },
        {
            "id": 4,
            "name": "Dự án đi du lịch",
            "description": "Toi chán quá toi muốn đi chơi",
            "status": "NOT_STARTED",
            "progress": 0,
            "startDate": 1754611200000,
            "endDate": 1755475200000,
            "members": [
                {
                    "firstName": "Le",
                    "lastName": "Anh",
                    "email": "leanh123@example.com",
                    "role": "LEADER"
                }
            ],
            "tasks": []
        },
        {
            "id": 1,
            "name": "Dự án TEAManage",
            "description": "Dự án phát triển ứng dụng để quản lý các đầu việc trong dự án",
            "status": "NOT_STARTED",
            "progress": 0,
            "startDate": 1754524800000,
            "endDate": 1755388800000,
            "members": [
                {
                    "firstName": "Le",
                    "lastName": "Anh",
                    "email": "leanh123@example.com",
                    "role": "LEADER"
                }
            ],
            "tasks": [
                {
                    "id": 1,
                    "title": "Khởi tạo dự án",
                    "description": "Tạo base cho dự án",
                    "priority": 3,
                    "progress": 0,
                    "level": 1,
                    "createdById": 1,
                    "assignedUsers": null,
                    "projectId": 1,
                    "parentId": null,
                    "status": "OVERDUE",
                    "deadline": 1755277200000
                },
                {
                    "id": 2,
                    "title": "Khởi tạo be",
                    "description": "Tạo be cho dự án",
                    "priority": 1,
                    "progress": 0,
                    "level": 2,
                    "createdById": 1,
                    "assignedUsers": null,
                    "projectId": 1,
                    "parentId": 1,
                    "status": "OVERDUE",
                    "deadline": 1755277200000
                },
                {
                    "id": 3,
                    "title": "Khởi tạo fe",
                    "description": "Tạo fe cho dự án",
                    "priority": 1,
                    "progress": 0,
                    "level": 2,
                    "createdById": 1,
                    "assignedUsers": null,
                    "projectId": 1,
                    "parentId": 1,
                    "status": "OVERDUE",
                    "deadline": 1755277200000
                },
                {
                    "id": 4,
                    "title": "Khởi tạo entity",
                    "description": "Tạo entity cho dự án",
                    "priority": 1,
                    "progress": 0,
                    "level": 3,
                    "createdById": 1,
                    "assignedUsers": null,
                    "projectId": 1,
                    "parentId": 2,
                    "status": "OVERDUE",
                    "deadline": 1755277200000
                },
                {
                    "id": 5,
                    "title": "Khởi tạo entity",
                    "description": "Tạo entity cho dự án",
                    "priority": 1,
                    "progress": 0,
                    "level": 2,
                    "createdById": 1,
                    "assignedUsers": null,
                    "projectId": 1,
                    "parentId": 1,
                    "status": "OVERDUE",
                    "deadline": 1754438400000
                }
            ]
        },
        {
            "id": 2,
            "name": "Dự án TEAManage",
            "description": "Dự án phát triển ứng dụng để quản lý các đầu việc trong dự án",
            "status": "NOT_STARTED",
            "progress": 0,
            "startDate": 1754524800000,
            "endDate": 1755388800000,
            "members": [
                {
                    "firstName": "Le",
                    "lastName": "Anh",
                    "email": "leanh123@example.com",
                    "role": "LEADER"
                }
            ],
            "tasks": []
        },
        {
            "id": 5,
            "name": "Dự án gì gì đó",
            "description": "Tôi đang test chức năng tạo dự án",
            "status": "NOT_STARTED",
            "progress": 0,
            "startDate": 1754524800000,
            "endDate": 1755129600000,
            "members": [
                {
                    "firstName": "Le",
                    "lastName": "Anh",
                    "email": "leanh123@example.com",
                    "role": "LEADER"
                }
            ],
            "tasks": []
        },
        {
            "id": 6,
            "name": "Dự án của tôi",
            "description": "I wish it will be success",
            "status": "NOT_STARTED",
            "progress": 0,
            "startDate": 1754524800000,
            "endDate": 1754870400000,
            "members": [
                {
                    "firstName": "Le",
                    "lastName": "Anh",
                    "email": "leanh123@example.com",
                    "role": "LEADER"
                }
            ],
            "tasks": []
        },
        {
            "id": 9,
            "name": "Dự án 002",
            "description": "Dự án này không được tao xoá mẹ app",
            "status": "NOT_STARTED",
            "progress": 0,
            "startDate": 1754524800000,
            "endDate": 1754697600000,
            "members": [
                {
                    "firstName": "Le",
                    "lastName": "Anh",
                    "email": "leanh123@example.com",
                    "role": "LEADER"
                }
            ],
            "tasks": []
        },
        {
            "id": 7,
            "name": "Dự án nhớ tới em",
            "description": "Tôi nhớ cô ấy quá",
            "status": "NOT_STARTED",
            "progress": 0,
            "startDate": 1754438400000,
            "endDate": 1755561600000,
            "members": [
                {
                    "firstName": "Le",
                    "lastName": "Anh",
                    "email": "leanh123@example.com",
                    "role": "LEADER"
                }
            ],
            "tasks": []
        },
        {
            "id": 8,
            "name": "Dự án 001",
            "description": "0010100101",
            "status": "NOT_STARTED",
            "progress": 0,
            "startDate": 1754438400000,
            "endDate": 1754697600000,
            "members": [
                {
                    "firstName": "Le",
                    "lastName": "Anh",
                    "email": "leanh123@example.com",
                    "role": "LEADER"
                }
            ],
            "tasks": []
        }
    ],
    "pageable": {
        "pageNumber": 0,
        "pageSize": 10,
        "sort": {
            "empty": false,
            "sorted": true,
            "unsorted": false
        },
        "offset": 0,
        "paged": true,
        "unpaged": false
    },
    "last": true,
    "totalPages": 1,
    "totalElements": 9,
    "size": 10,
    "number": 0,
    "sort": {
        "empty": false,
        "sorted": true,
        "unsorted": false
    },
    "numberOfElements": 9,
    "first": true,
    "empty": false
}

/**
 * Notes for Frontend Integration:
 * 
 * 1. Login API:
 *    - Use response.accessToken instead of response.token
 *    - Calculate expiresIn seconds: (response.expiresIn - Date.now()) / 1000
 *    - Store user info from response.user
 * 
 * 2. Register API:
 *    - Check for response.id to confirm success
 *    - Can display user's full name: response.firstName + " " + response.lastName
 *    - No need to store password (it's hashed anyway)
 * 
 * 3. Token Management:
 *    - Store accessToken in localStorage as 'auth_token'
 *    - Calculate and store expiry time
 *    - Use Bearer token type for Authorization header
 */
