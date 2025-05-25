# Dockerfile located at GitRoot/dockflare/Dockerfile
# GitHub Action context: ./dockflare

# --- Frontend Builder Stage ---
FROM node:20-alpine as frontend-builder
LABEL stage=frontend-builder
WORKDIR /buildstage # WORKDIR for this stage

# 1. Copy package files
COPY package.json ./package.json
COPY package-lock.json* ./
RUN npm install

# 2. Copy Tailwind/PostCSS configs
COPY tailwind.config.js ./tailwind.config.js
COPY postcss.config.js ./postcss.config.js

# 3. Create 'app/templates' and copy inputs
RUN mkdir -p ./app/templates
COPY app/templates/input.css ./app/templates/input.css
COPY app/templates ./app/templates

# 4. DEBUG: List files before build
RUN echo ">>> [DEBUG] Current directory before npm run build:css is $(pwd)" && \
    echo ">>> [DEBUG] Listing WORKDIR (/buildstage) contents:" && \
    ls -la . && \
    echo ">>> [DEBUG] Listing ./app/templates/ contents:" && \
    ls -la ./app/templates/

# 5. Run the build script (which now outputs to ./dist/output.css)
RUN echo ">>> [DEBUG] Running npm run build:css..." && \
    npm run build:css

# 6. DEBUG: Verify output after build in the new ./dist directory
RUN echo ">>> [DEBUG] CSS build supposedly complete. Verifying output..." && \
    echo ">>> [DEBUG] Listing /buildstage/dist/ :" && \
    ls -la /buildstage/dist/ && \
    echo ">>> [DEBUG] Checking for /buildstage/dist/output.css existence:" && \
    (test -f /buildstage/dist/output.css && echo "output.css FOUND at /buildstage/dist/output.css" || echo "output.css NOT FOUND at /buildstage/dist/output.css")
# End of frontend-builder stage

# --- Runtime Stage ---
FROM python:3.13-slim as runtime
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
WORKDIR /app
ENV CLOUDFLARED_VERSION="2024.1.5"
# ... (cloudflared install section) ...
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && ARCH=$(dpkg --print-architecture) && \
    if [ "$ARCH" = "amd64" ]; then \
        CLOUDFLARED_ARCH="linux-amd64"; \
    elif [ "$ARCH" = "arm64" ]; then \
        CLOUDFLARED_ARCH="linux-arm64"; \
    else \
        echo "Unsupported architecture: $ARCH" && exit 1; \
    fi && \
    wget -q https://github.com/cloudflare/cloudflared/releases/download/${CLOUDFLARED_VERSION}/cloudflared-$CLOUDFLARED_ARCH.deb && \
    dpkg -i cloudflared-$CLOUDFLARED_ARCH.deb && \
    rm cloudflared-$CLOUDFLARED_ARCH.deb && \
    cloudflared --version && \
    mkdir -p /root/.cloudflared

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

RUN mkdir -p /app/static/css && mkdir -p /app/static/images

# Copy from the new output location in frontend-builder
COPY --from=frontend-builder /buildstage/dist/output.css /app/static/css/output.css

COPY app /app
COPY images /app/static/images/

EXPOSE 5000
CMD ["python", "main.py"]