# Stage 1: Build Frontend
FROM node:20 AS frontend-builder
WORKDIR /app
COPY modern-frontend/package*.json ./modern-frontend/
RUN cd modern-frontend && npm install
COPY modern-frontend/ ./modern-frontend/
RUN cd modern-frontend && npm run build

# Stage 2: Build Backend & Setup Python
FROM node:20-slim
WORKDIR /app

# Install Python and SQLite dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Setup Python Virtual Environment and install dependencies
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install pdfplumber

# Copy backend dependencies
COPY modern-backend/package*.json ./modern-backend/
RUN cd modern-backend && npm install --production

# Copy backend source
COPY modern-backend/ ./modern-backend/

# Copy pdf parser script to the root as backend expects it (or backend directory)
# The backend index.js uses `./pdfParser`, which calls `python ../pdf_import.py`. 
# Wait, let's copy it to root where the backend expects it.
COPY pdf_import.py ./

# Copy built frontend
COPY --from=frontend-builder /app/modern-frontend/dist ./modern-frontend/dist

# Generate Prisma Client
RUN cd modern-backend && npx prisma generate

# Expose port and start
EXPOSE 3001
ENV PORT=3001
ENV NODE_ENV=production

WORKDIR /app/modern-backend

# Run migrations and start server
CMD npx prisma db push && node index.js
