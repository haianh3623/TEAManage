# TEAManage Docker Troubleshooting

## 🚨 Common Issues & Solutions

### ❌ Issue 1: Profile Configuration Error

**Error:**
```
Property 'spring.profiles.active' imported from location 'class path resource [application-docker.yml]' is invalid in a profile specific resource
```

**Solution:**
- ✅ **FIXED**: Removed `spring.profiles.active: docker` from `application-docker.yml`
- Profile is set in Dockerfile: `-Dspring.profiles.active=docker`
- Profile-specific files (`application-docker.yml`) should NOT contain `spring.profiles.active`

### ❌ Issue 2: MySQL Connection Failed

**Error:**
```
java.sql.SQLException: Access denied for user 'teamuser'@'172.x.x.x'
```

**Solutions:**
```bash
# 1. Check if MySQL is ready
docker-compose logs mysql

# 2. Wait for MySQL initialization
docker-compose exec mysql mysqladmin ping -h localhost

# 3. Reset MySQL data if corrupted
docker-compose down -v
docker-compose up mysql -d
```

### ❌ Issue 3: Port Already in Use

**Error:**
```
ERROR: for tea-manage-backend  Cannot start service backend: Ports are not available: port is already allocated
```

**Solutions:**
```yaml
# Option 1: Change ports in docker-compose.yml
services:
  backend:
    ports:
      - "8081:8080"  # Instead of 8080:8080
  mysql:
    ports:
      - "3308:3306"  # Instead of 3307:3306
```

```bash
# Option 2: Kill processes using the ports
netstat -ano | findstr :8080
taskkill /PID <PID_NUMBER> /F
```

### ❌ Issue 4: Build Context Too Large

**Error:**
```
failed to build: fileset excluded by .dockerignore but not excluded by .gitignore
```

**Solution:**
Check `.dockerignore` file excludes unnecessary files:
```dockerignore
logs/
*.log
target/
mysql/data/
node_modules/
.git/
```

### ❌ Issue 5: Health Check Failing

**Error:**
```
Health check failed: curl command not found
```

**Solution 1 - Install curl in Dockerfile:**
```dockerfile
# Add before HEALTHCHECK
RUN apt-get update && apt-get install -y curl
```

**Solution 2 - Use wget instead:**
```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/actuator/health || exit 1
```

**Solution 3 - Remove health check temporarily:**
```yaml
# Comment out in docker-compose.yml
# healthcheck:
#   test: ["CMD", "curl", "-f", "http://localhost:8080/api/actuator/health"]
```

### ❌ Issue 6: Environment Variables Not Loading

**Error:**
```
GOOGLE_CLIENT_ID value is: your_google_client_id
```

**Solutions:**
```bash
# 1. Create .env file
cp .env.example .env

# 2. Edit .env with real values
GOOGLE_CLIENT_ID=your_actual_google_client_id
GOOGLE_CLIENT_SECRET=your_actual_google_client_secret

# 3. Restart containers
docker-compose down
docker-compose up -d
```

### ❌ Issue 7: Volume Permission Issues (Linux/Mac)

**Error:**
```
Permission denied: '/app/uploads'
```

**Solutions:**
```bash
# Option 1: Fix folder permissions
sudo chown -R $USER:$USER ./uploads
chmod -R 755 ./uploads

# Option 2: Run containers with current user
docker-compose run --user $(id -u):$(id -g) backend
```

### ❌ Issue 8: Maven Build Failed in Docker

**Error:**
```
[ERROR] Failed to execute goal org.springframework.boot:spring-boot-maven-plugin:3.5.3:run
```

**Solutions:**
```bash
# 1. Clean build locally first
cd teamwork_management
./mvnw clean package -DskipTests

# 2. Build with more memory
docker-compose build --build-arg MAVEN_OPTS="-Xmx1024m" backend

# 3. Use local built JAR
# Comment out build stage in Dockerfile, copy local JAR instead
```

## 🔧 Debug Commands

```bash
# View all container logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f mysql

# Check container status
docker-compose ps

# Access container shell
docker-compose exec backend bash
docker-compose exec mysql bash

# Test database connection
docker-compose exec mysql mysql -u teamuser -p teamwork_management

# Check environment variables
docker-compose exec backend env | grep SPRING

# Test backend health
curl http://localhost:8080/api/actuator/health

# Check listening ports
docker-compose exec backend netstat -tlnp
```

## 🔄 Reset Everything

```bash
# Nuclear option - reset everything
docker-compose down -v
docker system prune -a -f
docker volume prune -f
docker-compose up --build -d
```

## 📞 Need Help?

1. Check logs first: `docker-compose logs -f`
2. Verify .env file has correct values
3. Ensure ports are not used by other applications
4. Try the reset commands above
5. Check this troubleshooting guide for similar issues
