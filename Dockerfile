# Stage 1: Build Frontend
FROM node:20-alpine as frontend-build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Build Backend
FROM node:20-alpine as backend-build
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/ .
RUN npx prisma generate
RUN npm run build

# Stage 3: Production
FROM node:20-alpine
WORKDIR /app

# Install production dependencies only for backend if needed, 
# but here we copy node_modules from build to ensure prisma client is there
COPY --from=backend-build /app/server/package*.json ./
COPY --from=backend-build /app/server/node_modules ./node_modules
COPY --from=backend-build /app/server/dist ./dist
COPY --from=backend-build /app/server/prisma ./prisma

# Copy frontend build to 'public' folder
COPY --from=frontend-build /app/dist ./public

# Environment variables should be passed at runtime, but we define defaults
ENV PORT=3001
ENV NODE_ENV=production

EXPOSE 3001

CMD ["node", "dist/index.js"]
