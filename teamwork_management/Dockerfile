# Stage 1: Build application
FROM eclipse-temurin:21-jdk AS build

WORKDIR /app

# Copy project files
COPY . .

# Build the Spring Boot application using Maven
RUN ./mvnw clean package -DskipTests

# Stage 2: Run application
FROM eclipse-temurin:21-jre

WORKDIR /app

# Copy the built JAR from the previous stage
COPY --from=build /app/target/*.jar app.jar

# Expose port (adjust as needed)
EXPOSE 8080

# Run the app
ENTRYPOINT ["java", "-jar", "app.jar"]
