# Cadence

## Getting Started

Clone this template and rename it for your project:

```bash
git clone <repo-url> my-project
cd my-project
node scripts/rename.js "My Project"
```

The rename script will update all references throughout the codebase and reinitialize git with a fresh history.

---

A production-ready full-stack web application with:

- **Client**: React + TypeScript + Vite + Tailwind CSS
- **Server**: Bun + TypeScript + Express + OpenAPI
- **Database**: PostgreSQL with migrations
- **CLI**: Rust + Cargo
- **Auth**: Auth0

## Prerequisites

- Bun
- Node.js 20+ and Yarn (for client)
- Rust (for CLI)
- Docker (for local database)

## Quick Start

```bash
# Start the database
docker-compose up -d

# Server setup
cd server
cp .env.example .env
bun install
bun run migrate:up
bun dev

# Client setup (new terminal)
cd client
cp .env.example .env
yarn install
yarn dev

# CLI setup (new terminal)
cd cli
cargo build
./target/debug/cadence -l login
```

## Project Structure

```
.
├── client/          # React frontend
├── server/          # Express backend
├── cli/             # Rust CLI
├── .github/         # CI workflows
└── docker-compose.yaml
```

## Available Scripts

### Client

| Script | Description |
|--------|-------------|
| `yarn dev` | Start dev server |
| `yarn build` | Build for production |
| `yarn preview` | Preview production build |
| `yarn lint` | Run ESLint |
| `yarn test` | Run tests |

### Server

| Script | Description |
|--------|-------------|
| `bun dev` | Start dev server |
| `bun run build` | Build for production |
| `bun start` | Run production server |
| `bun run lint` | Run ESLint |
| `bun test` | Run tests |
| `bun run migrate:up` | Run migrations |
| `bun run migrate:down` | Rollback migration |
| `bun run migrate:create` | Create new migration |

### CLI

```bash
cargo build           # Build
cargo run -- login    # Run login command
cargo run -- whoami   # Show current user
cargo run -- logout   # Clear credentials
```

## Configuration

### Auth0 Setup

1. Create an Auth0 application (Single Page Application for client, Machine to Machine for CLI)
2. Configure the callback URLs and allowed origins
3. Update the environment variables in `.env` files
