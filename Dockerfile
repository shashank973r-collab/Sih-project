# ==============================================================================
# DepthWizard Unified Production Container
# Supports: Hugging Face Spaces (Docker SDK), Render, Koyeb, Local Docker
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build Frontend (Vite + React + Three.js)
# ------------------------------------------------------------------------------
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Python Backend & Unified Static Serving
# ------------------------------------------------------------------------------
FROM python:3.11-slim

# Install system libraries for GDAL, rasterio, and headless graphics
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgdal-dev \
    libgl1 \
    libglib2.0-0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Hugging Face Spaces requires running as non-root UID 1000
RUN useradd -m -u 1000 user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    PORT=7860

WORKDIR /app

# Install Python dependencies (Using PyTorch CPU wheels for fast, lean builds)
COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt

# Copy application backend, tools, and init files
COPY --chown=user:user __init__.py ./
COPY --chown=user:user backend/ ./backend/
COPY --chown=user:user tools/ ./tools/

# Copy compiled frontend from Stage 1
COPY --from=frontend-builder --chown=user:user /app/frontend/dist ./frontend/dist

# Ensure outputs directory exists and has write permissions
RUN mkdir -p /app/backend/outputs && chown -R user:user /app

USER user

EXPOSE 7860

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "7860"]
