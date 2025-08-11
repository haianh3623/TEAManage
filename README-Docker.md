# TEAManage Docker Setup

Hướng dẫn chạy toàn bộ project TEAManage bằng Docker Compose.

## 🚀 Cách sử dụng

### 1. Chuẩn bị

```bash
# Clone repository
git clone <repository-url>
cd TEAManage

# Copy file cấu hình môi trường
cp .env.example .env
```

### 2. Cấu hình môi trường

Chỉnh sửa file `.env` với thông tin thực tế:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_actual_google_client_id
GOOGLE_CLIENT_SECRET=your_actual_google_client_secret

# Database Configuration (optional)
MYSQL_ROOT_PASSWORD=your_secure_password
MYSQL_USER=teamuser
MYSQL_PASSWORD=your_secure_password
```

### 3. Khởi chạy

#### Chạy tự động (Recommended):
```bash
# Linux/Mac
./start.sh

# Windows
start.bat
```

#### Chạy thủ công:
```bash
# Chỉ backend + database
docker-compose up --build -d

# Bao gồm cả frontend
docker-compose --profile frontend up --build -d
```

## 📊 Services

| Service | URL | Port | Description |
|---------|-----|------|-------------|
| Backend API | http://localhost:8080/api | 8080 | Spring Boot REST API |
| MySQL Database | localhost:3307 | 3307 | MySQL Database |
| Frontend | http://localhost | 80 | Static HTML/JS (optional) |

## 🗄️ Database

- **Host**: localhost:3307
- **Database**: teamwork_management  
- **Username**: teamuser
- **Password**: teampassword (or your custom password)
- **Root Password**: rootpassword (or your custom password)

## 📁 Volumes

- `mysql_data`: Lưu trữ dữ liệu MySQL
- `backend_uploads`: Lưu trữ file upload (./uploads)
- `./teamwork_management/logs`: Log files của backend

## 🔧 Useful Commands

```bash
# Xem logs tất cả services
docker-compose logs -f

# Xem logs của một service cụ thể
docker-compose logs -f backend
docker-compose logs -f mysql

# Dừng tất cả services
docker-compose down

# Dừng và xóa volumes (CẢNH BÁO: sẽ xóa data)
docker-compose down -v

# Restart services
docker-compose restart

# Build lại images
docker-compose build --no-cache

# Scale backend (nếu cần)
docker-compose up --scale backend=2 -d
```

## 🔍 Health Checks

```bash
# Kiểm tra health của backend
curl http://localhost:8080/api/actuator/health

# Kiểm tra database connection
docker-compose exec mysql mysqladmin ping -h localhost
```

## 🛠️ Development

```bash
# Chỉ chạy database để dev local
docker-compose up mysql -d

# Mount code để hot reload (development mode)
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

## 🚨 Troubleshooting

### Backend không start:
```bash
# Xem logs chi tiết
docker-compose logs backend

# Kiểm tra database connection
docker-compose exec mysql mysql -u teamuser -p teamwork_management
```

### Port bị conflict:
```bash
# Thay đổi port mapping trong docker-compose.yml
ports:
  - "8081:8080"  # Thay vì 8080:8080
  - "3308:3306"  # Thay vì 3307:3306
```

### Reset toàn bộ:
```bash
docker-compose down -v
docker system prune -f
docker-compose up --build -d
```

## 📦 Production Deployment

Tham khảo file `docker-compose.prod.yml` cho cấu hình production với:
- SSL/TLS certificates
- Load balancer
- Health checks nâng cao
- Monitoring và logging

## 🔐 Security Notes

- Thay đổi mật khẩu mặc định trước khi deploy production
- Sử dụng Docker secrets cho sensitive data
- Enable firewall và chỉ expose ports cần thiết
- Regular updates của base images
