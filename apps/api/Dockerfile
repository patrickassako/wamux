# Multi-stage build for Python FastAPI service
FROM python:3.12-alpine AS builder

# Install build dependencies
RUN apk add --no-cache gcc musl-dev libffi-dev

# Set working directory
WORKDIR /build

# Copy dependency files
COPY pyproject.toml ./

# Install dependencies
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -e .[dev]

# ============================================
# Runtime stage
# ============================================
FROM python:3.12-alpine

# Install runtime dependencies only
RUN apk add --no-cache libffi

# Create non-root user
RUN addgroup -g 1000 appuser && \
    adduser -D -u 1000 -G appuser appuser

# Set working directory
WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code
COPY src/ ./src/

# Change ownership to non-root user
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# Run the application
CMD sh -c "uvicorn src.main:app --host 0.0.0.0 --port ${PORT:-8000}"
