# Backend Node.js — Application Entry Point & Configuration

## Overview

This document explains the structural roles of the installed packages, the Prisma database connection lifecycle, and the Git commit workflow for this step.

---

## Installed Packages and Their Roles

### Production Dependencies

| Package | Role |
|---|---|
| **express** | Web framework that handles HTTP requests/responses. Serves as the backbone of the REST API. Configured with JSON body parsing middleware to accept `application/json` payloads. |
| **cors** | Cross-Origin Resource Sharing middleware. Allows the upcoming frontend web application (served from a different origin/port) to make authenticated API calls to this backend. |
| **dotenv** | Loads environment variables from the `.env` file into `process.env`. Used to read `PORT` and `DATABASE_URL` without hardcoding sensitive values. |
| **@prisma/client** | Auto-generated, type-safe database client. Instantiated once in `src/config/prisma.ts` and reused across the entire application. |

### Development Dependencies

| Package | Role |
|---|---|
| **typescript** | Compiles TypeScript source files to JavaScript. Configured via `tsconfig.json` with strict mode enabled. |
| **ts-node-dev** | Development server with hot-reload. Restarts the Node process on file changes without manual intervention. |
| **@types/node** | TypeScript definitions for Node.js built-in modules (`process`, `http`, etc.). |
| **@types/express** | TypeScript definitions for Express. Enables type-safe request/response handling. |
| **@types/cors** | TypeScript definitions for the CORS middleware. |
| **prisma** | CLI tool for schema management, migrations, and client generation. |

---

## Application Entry Point (`src/server.ts`)

The entry point performs the following in order:

1. **Environment Loading** — `dotenv.config()` loads `.env` variables before anything else.
2. **Express Initialization** — Creates the Express application instance.
3. **Middleware Registration** — `express.json()` for body parsing, `cors()` for cross-origin requests.
4. **Health Check Endpoint** — `GET /api/health` verifies both the server and database connectivity by running a raw `SELECT 1` query against PostgreSQL via Prisma.
5. **Server Start** — Listens on the configured port (defaults to `5000` if `PORT` is not set).
6. **Graceful Shutdown** — Listens for `SIGTERM` and `SIGINT` signals. On receipt, closes the HTTP server first, then disconnects Prisma, ensuring no in-flight requests are dropped and no database connections are leaked.

---

## Prisma Client Lifecycle (`src/config/prisma.ts`)

### Why a Singleton?

PrismaClient maintains an internal connection pool. Creating multiple instances in a single process leads to:

- Connection pool exhaustion
- Memory leaks
- Erratic behaviour under load

By exporting a single instance from `src/config/prisma.ts`, every module that imports it receives the same connection pool.

### Logging Configuration

The client is configured with all four log levels (`query`, `info`, `warn`, `error`). During development this provides full SQL visibility. For production, this can be narrowed to `warn` and `error` only.

### Disconnect Cycle

The `gracefulShutdown` function in `server.ts` calls `prisma.$disconnect()` after the HTTP server closes. This ensures:

1. No new requests are accepted (server closed).
2. In-flight requests complete (server.close callback waits).
3. All Prisma connection pool connections are released cleanly.
4. Process exits with code `0` on success, `1` on error.

---

## Git Commit Instructions

Follow standard Conventional Commit format for isolated, logical commits.

### Step 1: Stage Only the New Source Files

```powershell
git add backend-node/src/config/prisma.ts backend-node/src/server.ts backend-node/EXPLANATION.md
```

### Step 2: Verify Staged Files

```powershell
git status
```

Confirm only the three intended files are staged. Nothing else (no `node_modules/`, no `.env`, no `package-lock.json` changes) should be in the staging area.

### Step 3: Commit

```powershell
git commit -m "feat(backend): add Express server entry point with Prisma client singleton and health check

- Initialize PrismaClient singleton in src/config/prisma.ts
- Configure Express server with JSON parsing, CORS, and dotenv
- Add GET /api/health endpoint with database connectivity check
- Implement graceful shutdown on SIGTERM/SIGINT
- Document architecture and package roles in EXPLANATION.md"
```

### Commit Message Breakdown

| Segment | Meaning |
|---|---|
| `feat` | New feature (not a fix, refactor, or chore) |
| `(backend)` | Scope — changes are isolated to the backend-node service |
| Subject line | Imperative mood summary of what the commit adds |
| Body | Bullet-pointed detail of each change for audit trail |
