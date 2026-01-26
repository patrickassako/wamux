.PHONY: help dev test format clean logs install build stop restart ps

# Default target
help:
	@echo "WhatsApp API Gateway - Available Commands"
	@echo "=========================================="
	@echo "make dev        - Start all Docker services"
	@echo "make test       - Run pytest + vitest"
	@echo "make format     - Run Ruff + Prettier"
	@echo "make clean      - Stop containers and clean volumes"
	@echo "make logs       - Tail all service logs"
	@echo "make install    - Install dependencies (Python + Node.js)"
	@echo "make build      - Build Docker images"
	@echo "make stop       - Stop all services"
	@echo "make restart    - Restart all services"
	@echo "make ps         - Show running containers"

# Start all services
dev:
	@echo "🚀 Starting WhatsApp API Gateway..."
	docker-compose up -d
	@echo "✅ Services started!"
	@echo "📡 API: http://localhost:8000"
	@echo "📡 Web: http://localhost:3000"
	@echo "📡 API Docs: http://localhost:8000/docs"
	@echo "📡 Redis: localhost:6379"

# Run all tests
test:
	@echo "🧪 Running tests..."
	@echo "📝 Python tests (pytest)..."
	cd apps/api && python -m pytest
	@echo "📝 Node.js tests (vitest)..."
	cd apps/engine && npm test
	@echo "✅ All tests passed!"

# Format code
format:
	@echo "🎨 Formatting code..."
	@echo "📝 Python (Ruff)..."
	cd apps/api && ruff format src/
	cd apps/api && ruff check --fix src/
	@echo "📝 Node.js (Prettier)..."
	cd apps/engine && npm run format
	@echo "✅ Code formatted!"

# Clean up
clean:
	@echo "🧹 Cleaning up..."
	docker-compose down -v
	@echo "✅ Cleanup complete!"

# View logs
logs:
	@echo "📋 Tailing logs..."
	docker-compose logs -f

# Install dependencies
install:
	@echo "📦 Installing dependencies..."
	@echo "📝 Python dependencies..."
	cd apps/api && pip install -e .[dev]
	@echo "📝 Node.js dependencies (engine)..."
	cd apps/engine && npm install
	@echo "📝 Frontend dependencies (web)..."
	cd apps/web && npm install
	@echo "✅ Dependencies installed!"

# Build Docker images
build:
	@echo "🔨 Building Docker images..."
	docker-compose build
	@echo "✅ Build complete!"

# Stop services
stop:
	@echo "⏸️  Stopping services..."
	docker-compose stop
	@echo "✅ Services stopped!"

# Restart services
restart:
	@echo "🔄 Restarting services..."
	docker-compose restart
	@echo "✅ Services restarted!"

# Show running containers
ps:
	@echo "📊 Running containers:"
	docker-compose ps
