# WhatsApp API Gateway

A production-ready WhatsApp Business API Gateway built with Python (FastAPI) and Node.js (Baileys).

## 🚀 Quick Start

```bash
# Clone the repository
git clone &lt;repository-url&gt;
cd whatsappAPI

# Copy environment template
cp .env.example .env
# Edit .env with your configuration

# Start all services
make dev

# Run tests
make test
```

## 📋 Prerequisites

- Docker & Docker Compose
- Make
- Git

## 🏗️ Architecture

This is a monorepo containing two main services:

- **`apps/api`** (Python/FastAPI): REST API, authentication, database access
- **`apps/engine`** (Node.js/TypeScript): WhatsApp socket management via Baileys
- **Redis Streams**: Communication layer between services
- **Supabase**: PostgreSQL database with Row Level Security

### Service Communication

```
Client → FastAPI → Redis Streams → Node.js Engine → WhatsApp
                                        ↓
                                   Redis Streams
                                        ↓
                                    FastAPI → Client (Webhooks)
```

## 🛠️ Development

### Available Commands

```bash
make dev      # Start all Docker services
make test     # Run pytest + vitest
make format   # Run Ruff + Prettier
make clean    # Stop containers and clean volumes
make logs     # Tail all service logs
```

### Project Structure

```
whatsappAPI/
├── apps/
│   ├── api/          # Python FastAPI service
│   └── engine/       # Node.js Baileys worker
├── infra/
│   └── redis/        # Redis configuration
├── docker-compose.yml
├── Makefile
└── .env.example
```

## 🧪 Testing

- **Python**: `pytest` with async support
- **Node.js**: `vitest` with TypeScript
- **Integration**: Docker Compose test environment

## 📝 Code Quality

- **Python**: Ruff (linting + formatting)
- **Node.js**: ESLint + Prettier
- **Pre-commit hooks**: Automatic code quality checks

## 🔒 Security

- Row Level Security (RLS) on all database tables
- API key authentication
- Webhook signature validation
- Rate limiting and anti-ban protection

## 📚 Documentation

See `/docs` for detailed documentation on:
- API endpoints
- Architecture decisions
- Deployment guides
- Contributing guidelines

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make your changes
3. Run tests: `make test`
4. Format code: `make format`
5. Commit with conventional commits: `feat(api): add new endpoint`
6. Push and create a Pull Request

## 📄 License

[Your License Here]

## 🆘 Support

For issues and questions, please open a GitHub issue.
