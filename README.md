# Lumidocs — AI Document Intelligence Platform

A full-stack web application that lets users upload documents and have a conversation with them. Built with a Java Spring Boot backend, React/TypeScript frontend, and a RAG (Retrieval-Augmented Generation) pipeline using Gemini embeddings and Groq-hosted LLaMA 3.3.

---

## What it does

- Sign in with Google — each user's documents are private and isolated
- Upload PDF, DOCX, or CSV files
- Ask questions about your documents in natural language
- Get answers grounded in the document content, with page-level source citations
- Customize the UI — display name, accent color, light/dark/system theme

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| Backend | Java 21, Spring Boot 3.5 |
| Embeddings | Google Gemini (`text-embedding-001`, 3072 dimensions) |
| LLM | Groq API — LLaMA 3.3 70B |
| Vector DB | PostgreSQL 16 + pgvector (cosine similarity, HNSW index) |
| File Storage | MinIO (S3-compatible) |
| Auth | Google OAuth 2.0 (`@react-oauth/google`) |
| Infrastructure | Docker Compose |

---

## Architecture

```
User → React Frontend
         │
         ├─ Google OAuth 2.0 (sign in)
         │
         └─ Spring Boot API (port 8080)
                │
                ├─ Upload → MinIO (file storage)
                │         → Chunking → Gemini Embeddings → pgvector
                │
                └─ Chat  → Embed question (Gemini)
                         → Similarity search (pgvector cosine)
                         → Build prompt with context chunks
                         → LLaMA 3.3 via Groq
                         → Return answer + source citations
```

---

## Project Structure

```
Lumidocs/
├── doc-intelligence/
│   ├── backend/                  # Spring Boot API
│   │   └── src/main/java/com/docplatform/backend/
│   │       ├── controller/       # REST endpoints
│   │       ├── service/          # Business logic, RAG pipeline
│   │       ├── entity/           # JPA entities
│   │       └── repository/       # Spring Data JPA
│   │
│   ├── frontend/                 # React + Vite app
│   │   └── src/
│   │       ├── App.tsx           # All components (single file)
│   │       ├── api.ts            # Axios API client
│   │       └── index.css         # Tailwind + dark mode styles
│   │
│   └── infra/
│       └── init.sql              # Database schema (auto-runs on first start)
│
└── docker-compose.yml            # Full stack orchestration
```

---

## Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- Java 21 ([download](https://adoptium.net))
- Node.js 18+ ([download](https://nodejs.org))
- A [Google Cloud](https://console.cloud.google.com) project with OAuth 2.0 credentials
- A [Gemini API key](https://aistudio.google.com) (free tier works)
- A [Groq API key](https://console.groq.com) (free tier works)

---

### 1. Start the infrastructure

```bash
docker compose up -d
```

This starts PostgreSQL with pgvector, MinIO, Redis, and pgAdmin. The database schema in `infra/init.sql` runs automatically on first start.

Verify everything is running:
```bash
docker compose ps
```

---

### 2. Configure the backend

Create `doc-intelligence/backend/src/main/resources/application.properties`:

```properties
server.port=8080

gemini.api-key=YOUR_GEMINI_API_KEY
groq.api-key=YOUR_GROQ_API_KEY

spring.datasource.url=jdbc:postgresql://localhost:5432/docdb
spring.datasource.username=docuser
spring.datasource.password=docpassword
spring.jpa.hibernate.ddl-auto=validate

minio.endpoint=http://localhost:9000
minio.access-key=minioadmin
minio.secret-key=minioadmin123
minio.bucket.documents=documents

spring.servlet.multipart.max-file-size=50MB
spring.servlet.multipart.max-request-size=50MB
```

---

### 3. Run the backend

```bash
cd doc-intelligence/backend
./mvnw spring-boot:run          # Mac/Linux
mvnw.cmd spring-boot:run        # Windows
```

Backend starts on `http://localhost:8080`.

---

### 4. Configure the frontend

In `doc-intelligence/frontend/src/main.tsx`, replace the placeholder with your Google OAuth Client ID:

```tsx
const GOOGLE_CLIENT_ID = 'YOUR_CLIENT_ID.apps.googleusercontent.com'
```

To get a Client ID:
1. Go to [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
2. Create OAuth 2.0 Client ID → Web application
3. Add `http://localhost:5173` to Authorized JavaScript Origins

---

### 5. Run the frontend

```bash
cd doc-intelligence/frontend
npm install
npm run dev
```

Frontend starts on `http://localhost:5173`.

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/documents/upload` | Upload a document |
| `GET` | `/api/documents` | List user's documents |
| `DELETE` | `/api/documents/{id}` | Delete a document |
| `POST` | `/api/chat` | Ask a question |

All endpoints require `X-User-Id` header (sent automatically by the frontend after Google sign-in).

---

## Infrastructure Services

| Service | URL | Credentials |
|---|---|---|
| Backend API | `http://localhost:8080` | — |
| Frontend | `http://localhost:5173` | — |
| MinIO Console | `http://localhost:9001` | `minioadmin` / `minioadmin123` |
| pgAdmin | `http://localhost:5050` | `admin@local.dev` / `admin` |

---

## Environment Variables Summary

| Variable | Where | Description |
|---|---|---|
| `gemini.api-key` | `application.properties` | Gemini API key for embeddings |
| `groq.api-key` | `application.properties` | Groq API key for LLM inference |
| `GOOGLE_CLIENT_ID` | `main.tsx` | Google OAuth client ID |

> **Never commit real API keys.** Use placeholder values in version control and set real values locally only.

---

## How the RAG pipeline works

1. **Upload** — File is stored in MinIO. The document record is saved to PostgreSQL with status `uploaded`.
2. **Ingestion** — The file is split into chunks of ~500 tokens. Each chunk is sent to Gemini's embedding API to get a 3072-dimensional vector, which is stored in pgvector.
3. **Chat** — The user's question is embedded using Gemini. A cosine similarity search finds the top 5 most relevant chunks from the user's document. Those chunks are injected into a prompt sent to LLaMA 3.3 via Groq. The answer is returned with citations to the source page numbers.

---

## License

MIT
