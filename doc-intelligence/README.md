# AI Document Intelligence Platform

Full-stack RAG platform: upload documents, chat with them using AI.

---

## Prerequisites — install these first

### 1. Docker Desktop
This is the only thing you need to install manually. It gives you both `docker` and `docker compose`.

- **Windows / Mac:** Download from https://www.docker.com/products/docker-desktop
  - Install it like any normal app (double-click the installer)
  - After installing, open Docker Desktop and wait for it to say "Docker is running" (green icon in taskbar)
- **Linux (Ubuntu/Debian):**
  ```bash
  sudo apt update
  sudo apt install docker.io docker-compose-plugin -y
  sudo systemctl start docker
  sudo usermod -aG docker $USER   # lets you run docker without sudo (re-login after)
  ```

### 2. Verify the install
Open a terminal and run:
```bash
docker --version        # should print: Docker version 24.x or higher
docker compose version  # should print: Docker Compose version 2.x or higher
```

If both print version numbers, you're ready.

---

## First-time setup (do this once)

### Step 1 — Clone / create your project folder
```bash
# If you're starting from scratch, just navigate to where you want the project
cd ~/Projects   # or wherever you keep code
# The project folder is already here if you cloned it
cd doc-intelligence
```

### Step 2 — Create your .env file
```bash
cp .env.example .env
```
Then open `.env` in any text editor and fill in your real API key:
```
ANTHROPIC_API_KEY=sk-ant-your-actual-key-here
```
Leave everything else as-is for local development.

### Step 3 — Start all services
```bash
docker compose up -d
```
What happens:
- Docker downloads the images (Postgres, Redis, MinIO, pgAdmin) — takes 1-2 minutes on first run
- It starts all 4 containers
- Postgres automatically runs `infra/init.sql` to create your tables
- MinIO automatically creates the `documents` and `thumbnails` buckets
- The `-d` flag means "detached" — runs in the background so your terminal is free

You'll see output like:
```
✔ Container doc_postgres   Started
✔ Container doc_redis      Started
✔ Container doc_minio      Started
✔ Container doc_minio_init Started
✔ Container doc_pgadmin    Started
```

### Step 4 — Verify everything is healthy
```bash
docker compose ps
```
All services should show `healthy` or `running` in the STATUS column.

---

## What's running and how to access it

| Service    | What it is                        | URL / Port                         |
|------------|-----------------------------------|------------------------------------|
| PostgreSQL | Your main database + vector store | `localhost:5432`                   |
| Redis      | Cache and rate limiting           | `localhost:6379`                   |
| MinIO      | File storage (like S3)            | API: `localhost:9000`              |
| MinIO UI   | Browser UI to browse files        | http://localhost:9001 (user: `minioadmin` / `minioadmin123`) |
| pgAdmin    | Browser UI to browse the database | http://localhost:5050 (user: `admin@local.dev` / `admin`) |

### Connecting pgAdmin to your database (one-time setup)
1. Open http://localhost:5050
2. Log in with `admin@local.dev` / `admin`
3. Right-click "Servers" → Register → Server
4. **General tab:** Name = `DocDB`
5. **Connection tab:**
   - Host: `postgres` (not localhost — containers talk to each other by service name)
   - Port: `5432`
   - Database: `docdb`
   - Username: `docuser`
   - Password: `docpassword`
6. Click Save — you should see your tables in the left panel

---

## Daily workflow

```bash
# Start everything (morning)
docker compose up -d

# Stop everything (end of day) — data is saved
docker compose stop

# View logs from all containers
docker compose logs -f

# View logs from just one service
docker compose logs -f postgres

# Restart a single service (after config change)
docker compose restart redis

# Full stop and remove containers (keeps your data in volumes)
docker compose down

# Nuclear option — remove everything including stored data
docker compose down -v    # WARNING: deletes your database!
```

---

## Troubleshooting

**Port already in use error:**
```
Error: Bind for 0.0.0.0:5432 failed: port is already allocated
```
You have something else running on that port (maybe a local Postgres install).
Solution: stop the conflicting service, or change the port in `docker-compose.yml`:
```yaml
ports:
  - "5433:5432"   # now your app connects to localhost:5433
```

**Container stuck in "starting" — not becoming healthy:**
```bash
docker compose logs postgres   # read the logs to see the error
```

**Reset the database (wipe all data and re-run init.sql):**
```bash
docker compose down -v         # removes volumes (deletes data)
docker compose up -d           # fresh start, init.sql runs again
```

---

## Project structure

```
doc-intelligence/
├── docker-compose.yml      ← All infrastructure defined here
├── .env.example            ← Template — copy to .env and fill in secrets
├── .env                    ← Your real secrets (never commit this)
├── .gitignore
├── infra/
│   └── init.sql            ← DB schema: tables, indexes, pgvector setup
├── backend/                ← Spring Boot (Java) — to be created next
└── frontend/               ← React + TypeScript — to be created next
```

---

## What's in the database

After `docker compose up`, your database has these tables ready:

- **users** — authentication
- **documents** — metadata for every uploaded file
- **document_chunks** — text split into ~500 token pieces, each with a 1536-dim embedding vector
- **chat_sessions** — conversation threads
- **chat_messages** — individual messages with source chunk references
- **usage_events** — analytics (tokens used, latency, event types)

The `document_chunks.embedding` column uses pgvector, enabling similarity search:
```sql
-- Find the 5 chunks most similar to a query embedding
SELECT content, 1 - (embedding <=> '[0.1, 0.2, ...]'::vector) AS similarity
FROM document_chunks
WHERE document_id = 'your-doc-id'
ORDER BY embedding <=> '[0.1, 0.2, ...]'::vector
LIMIT 5;
```
This is the core of your RAG pipeline.

---

## Next steps

1. ✅ **Infrastructure running** (you are here)
2. **Backend:** Scaffold Spring Boot with a `/health` endpoint + file upload to MinIO
3. **Ingestion pipeline:** PDF parsing → chunking → embedding → store in pgvector
4. **RAG endpoint:** Accept a question → embed it → vector search → call Claude API → stream response
5. **Frontend:** React app with file uploader and chat UI
