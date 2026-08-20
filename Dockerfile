# Multi-stage Dockerfile for Monolithic App

# Stage 1: Build React Frontend
FROM node:20-alpine AS build-frontend
WORKDIR /app/frontend
COPY package.json ./
RUN npm install
COPY . ./
RUN npm run build

# Stage 2: Build Spring Boot Backend
FROM maven:3.9-eclipse-temurin-17 AS build-backend
WORKDIR /app/backend
COPY backend/pom.xml ./
COPY backend/src ./src
RUN mvn clean package -DskipTests

# Stage 3: Runtime image (Serves React UI + Spring Boot API)
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Copy React built dist to Spring Boot static resources folder inside the JAR/app
COPY --from=build-frontend /app/frontend/dist /app/static

# Copy built jar from backend build
COPY --from=build-backend /app/backend/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-Dspring.web.resources.static-locations=file:/app/static/", "-jar", "app.jar"]
