# TEAManage — Hướng dẫn khởi chạy dự án

> FE **HTML/CSS/JS thuần** serve qua **Nginx** (port 80), API **Spring Boot** chạy trong container `backend` (port nội bộ 8080), DB **MySQL** (map port `3307:3306`). Docker Compose điều phối toàn bộ.

## 1) Yêu cầu
- **Docker Desktop** (Windows/macOS) hoặc **Docker Engine** (Linux)
- **Docker Compose v2** (`docker compose` hoặc `docker-compose`)
- Port **80** và **3307** đang **rảnh**
- (Tuỳ chọn) `curl` để test nhanh

## 2) Cấu trúc thư mục 
TEAManage/
├─ docker-compose.yml
├─ docker-compose.dev.yml            # (tuỳ chọn) profile dev
├─ Dockerfile                        # build Spring Boot backend
├─ start.bat                         # script cũ của bạn
├─ nginx/
│  └─ nginx.conf                     # cấu hình nginx (đã chuẩn hoá)
├─ front_end/                        # FE tĩnh: index.html, css/, js/, images/...
│  ├─ index.html
│  ├─ css/...
│  ├─ js/...
│  └─ images/...
├─ mysql/
│  └─ init/                          # (tuỳ chọn) script init .sql
└─ teamwork_management/
   └─ logs/                          # (tuỳ chọn) thư mục log backend
```

> **Lưu ý đường dẫn mount**:  
> - FE: `./front_end:/usr/share/nginx/html:ro`  
> - Nginx conf: `./nginx/nginx.conf:/etc/nginx/nginx.conf:ro`

## 3) Thiết lập ban đầu
1. (Nếu có) Tạo file `.env` từ `.env.example` và điền giá trị cần thiết.
2. Tạo thư mục nếu chưa có:
   - `teamwork_management/logs`
   - `mysql/data` (nếu bạn muốn bind volume dữ liệu trên host)
3. Đảm bảo `front_end/index.html` tồn tại, CSS/JS dùng **đường dẫn tuyệt đối từ gốc** (ví dụ: `/css/style.css`, `/js/app.js`).

## 4) Cấu hình Nginx (đã tối ưu cho FE tĩnh + API + WebSocket)
File: `nginx/nginx.conf`
- **root**: `/usr/share/nginx/html`
- **static first**: ưu tiên file `.css/.js/...` (tránh fallback nuốt file)
- **SPA fallback** (nếu có routing phía FE): `try_files $uri $uri/ /index.html;`
- **API proxy**: `/api/` → `backend:8080`
- **WS proxy**: `/ws/` → `backend` (nếu dùng SockJS/STOMP)

> Nếu bạn không dùng SPA routing, có thể đổi `location / { try_files $uri =404; }`.

## 5) Khởi động nhanh

### Cách 1 — Windows (khuyên dùng): `start_with_nginx.bat`
Double–click hoặc chạy trong PowerShell/CMD:
```
start_with_nginx.bat
```
Script sẽ:
- `docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d --build`
- Đợi Nginx sẵn sàng (`http://localhost/`) và Backend (`/api/actuator/health`)
- Mở trình duyệt vào **http://localhost**

> Chế độ có FE container riêng (nếu bạn dùng profile `frontend`):
```
start_with_nginx.bat --frontend
```

### Cách 2 — Thủ công (Windows/macOS/Linux)
Tại thư mục gốc dự án:
```
docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d --build
```
Truy cập:
- FE: **http://localhost/**
- API (qua Nginx): **http://localhost/api/actuator/health**
- Health Nginx: **http://localhost/nginx/health** (nếu bật trong conf)

> Chạy dev compose (nếu bạn muốn):
```
docker-compose -f docker-compose.dev.yml up -d --build
```

## 6) Tắt/Khởi động lại/Xem log
```
docker-compose ps
docker-compose logs -f nginx
docker-compose logs -f backend
docker-compose logs -f mysql

docker-compose restart nginx
docker-compose restart backend
docker-compose down    # dừng & xoá container (giữ volume)
docker-compose down -v # dừng & xoá cả volume (xoá dữ liệu DB)
```

## 7) Kiểm tra nhanh (sanity checks)
- Liệt kê file FE trong container:
  ```
  docker-compose exec nginx ls -la /usr/share/nginx/html
  docker-compose exec nginx ls -la /usr/share/nginx/html/css
  ```
- Kiểm tra Content-Type của CSS/JS:
  ```
  curl -I http://localhost/css/style.css
  curl -I http://localhost/js/app.js
  ```
  Kỳ vọng: `200 OK`, `Content-Type: text/css` hoặc `application/javascript`.

## 8) Lỗi thường gặp & cách xử lý

### A) Nginx không start: `not a directory` khi mount `nginx.conf`
- Kiểm tra đường mount **file → file** đúng chưa:
  ```yaml
  volumes:
    - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
  ```
- Đảm bảo `nginx/nginx.conf` **tồn tại** và bạn chạy lệnh **tại đúng thư mục** chứa compose.

### B) Vòng lặp `/index.html` → 500 `rewrite or internal redirection cycle`
- Do không có `index.html` trong root hoặc fallback cấu hình sai.  
- Fix:
  - Đảm bảo `front_end/index.html` có thật (`ls -la` trong container)
  - `location / { try_files $uri $uri/ /index.html; }`
  - **Không** đặt `error_page 404 /index.html;`

### C) FE không áp dụng CSS/JS
- Đường dẫn trong HTML phải bắt đầu bằng `/` (tuyệt đối từ gốc).
- Ưu tiên file tĩnh trong Nginx (block `location ~*\.(css|js|...)` đứng **trước** `location /`).
- Test bằng curl: nếu `Content-Type: text/html` → bạn đang nhận `index.html` (sai đường dẫn).

### D) Đã sửa FE nhưng vẫn thấy bản cũ
- Có thể do **cache** (bạn có cấu hình `immutable`).  
- Cách nhanh:
  - Thêm query phá cache: `style.css?v=20250811-1`  
  - Hoặc tắt cache dev trong Nginx:
    ```nginx
    location ~* \.(css|js|...) {
      expires -1;
      add_header Cache-Control "no-store, no-cache, must-revalidate, max-age=0";
    }
    ```
  - `docker-compose restart nginx` và **Ctrl+F5** trong trình duyệt.

### E) .bat “Waiting for backend…” mãi
- Trong .bat, **ping `http://localhost/...`**, **không** dùng `http://backend:8080` (chỉ dùng được **bên trong** Docker network).
- Endpoint health qua Nginx: `/api/actuator/health`.

### F) Windows CMD báo lỗi dấu nháy khi `docker-compose exec`
- Dùng nháy kép hoặc chạy trực tiếp:
  ```
  docker-compose exec nginx ls -la /usr/share/nginx/html
  docker-compose exec nginx sh -c "ls -la /usr/share/nginx/html"
  ```

## 9) Ghi chú cấu hình
- MySQL (mặc định trong compose): `localhost:3307`, user `teamuser` (hoặc `root`), pass `1234` (tuỳ compose).
- Backend Spring Boot: profile `docker`, health `/api/actuator/health` (không cần auth nếu bạn đã mở trong filter).
- Nginx:
  - FE root: `/usr/share/nginx/html` (bind từ `./front_end`)
  - Proxy API: `/api/` → `backend:8080`
  - WebSocket (nếu dùng): `/ws/` → `backend`
  - MIME types bật sẵn, Gzip cho text assets.

---

### Quick Start tóm tắt (3 dòng)
```bash
# Tại thư mục gốc dự án
docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d --build
curl -I http://localhost/
curl -I http://localhost/api/actuator/health
```

Nếu cần mình xuất kèm **bộ file mẫu** `docker-compose.override.yml` và `nginx.conf` đã khớp với `front_end/` của bạn, nói mình biết — mình đính kèm luôn.
