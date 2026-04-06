# Vambe Challenge — Dashboard de Categorización con LLM

Dashboard analítico sobre reuniones de ventas de Vambe. Procesa ~60 transcripciones usando Google Gemini para extraer 13 dimensiones por cliente, y las expone en 5 vistas interactivas con filtros globales y exportación CSV.

**Demo:** [vambe-challenge.vercel.app](https://vambe-challenge.vercel.app) · API: [vambe-challenge-production.up.railway.app](https://vambe-challenge-production.up.railway.app)

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | FastAPI + SQLAlchemy async + asyncpg |
| Base de datos | PostgreSQL (Railway addon) |
| LLM | Google Gemini (`gemini-2.0-flash`) |
| Frontend | React + Vite + TypeScript |
| UI | Tailwind CSS v4 + shadcn/ui v4 (Base UI) |
| Gráficos | Recharts |
| Estado | TanStack React Query |
| Deploy | Railway (backend) + Vercel (frontend) |

---

## Estructura del proyecto

```
vambe-challenge/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app + CORS + lifespan (auto-populate)
│   │   ├── config.py          # Pydantic settings (env vars)
│   │   ├── database.py        # SQLAlchemy async engine + session
│   │   ├── models.py          # ORM: tabla clients
│   │   ├── schemas.py         # Pydantic I/O schemas
│   │   └── routers/
│   │       ├── clients.py     # GET /api/clients, /api/clients/all
│   │       ├── analytics.py   # GET /api/analytics/*
│   │       └── process.py     # POST /api/process
│   │   └── services/
│   │       ├── categorizer.py    # Integración Gemini
│   │       └── csv_processor.py  # Ingesta del CSV
│   ├── vambe_clients.csv      # Datos fuente (~60 clientes)
│   ├── Dockerfile             # Imagen Python 3.11-slim
│   ├── railway.json           # Configuración de deploy Railway
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── OverviewPage.tsx      # Vista 1: KPIs + AI Insights
│   │   │   ├── SalespersonPage.tsx   # Vista 2: Vendedores
│   │   │   ├── MarketPage.tsx        # Vista 3: Mercado & Producto
│   │   │   ├── ClientsPage.tsx       # Vista 4: Tabla de clientes
│   │   │   └── ExplorerPage.tsx      # Vista 5: Explorador ad-hoc
│   │   ├── components/
│   │   │   └── layout/
│   │   │       ├── Header.tsx        # Filtros globales + ExportButton
│   │   │       └── Sidebar.tsx       # Navegación
│   │   ├── contexts/
│   │   │   └── FiltersContext.tsx    # Filtros globales (vendedor, fechas)
│   │   └── lib/
│   │       ├── api.ts                # Axios client
│   │       └── export.ts             # CSV export util
│   ├── Dockerfile             # Build multi-stage: Node → Nginx
│   ├── nginx.conf             # SPA routing
│   ├── vercel.json            # SPA routing para Vercel
│   └── package.json
├── docker-compose.yml         # Postgres + backend + frontend
└── .env.example               # Solo requiere GEMINI_API_KEY
```

---

## API endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/process` | Ingesta CSV + categorización LLM (idempotente) |
| `GET` | `/api/clients` | Tabla paginada con filtros y ordenamiento |
| `GET` | `/api/clients/all` | Todos los clientes categorizados (para Explorador) |
| `GET` | `/api/clients/filter-options` | Valores distintos para cada filtro |
| `GET` | `/api/analytics/overview` | KPIs globales |
| `GET` | `/api/analytics/by-sector` | Conversión por sector |
| `GET` | `/api/analytics/by-salesperson` | Performance por vendedor |
| `GET` | `/api/analytics/by-channel` | Conversión por canal de descubrimiento |
| `GET` | `/api/analytics/by-volume` | Conversión por volumen tier |
| `GET` | `/api/analytics/by-use-case` | Distribución por caso de uso |
| `GET` | `/api/analytics/by-pain-point` | Distribución por pain point |
| `GET` | `/api/analytics/by-meeting-depth` | Distribución por profundidad de reunión |
| `GET` | `/api/analytics/by-company-size` | Conversión por tamaño de empresa |
| `GET` | `/api/analytics/by-integration-needs` | Frecuencia de necesidades de integración |
| `GET` | `/api/analytics/timeline` | Reuniones y cierres por mes |
| `POST` | `/api/analytics/insights` | Genera análisis narrativo con Gemini |

Todos los endpoints de analytics aceptan query params opcionales: `vendedor`, `date_from`, `date_to`.

---

## Dimensiones extraídas por LLM

Por cada transcripción, Gemini devuelve un JSON estructurado con:

| Campo | Tipo | Valores |
|-------|------|---------|
| `sector` | string | healthcare, retail, logistics, etc. |
| `interaction_volume_tier` | enum | small, medium, large, unknown |
| `interaction_volume_estimate` | int | interacciones/día estimadas |
| `discovery_channel` | enum | conference, google, linkedin, colleague, podcast, webinar, article, fair |
| `primary_use_case` | enum | customer_support, appointment_scheduling, order_tracking, faq_automation, lead_qualification |
| `main_pain_point` | enum | high_volume, slow_response, team_overload, repetitive_queries, scaling |
| `integration_needs` | string[] | crm, ticketing, booking, database, ecommerce, calendar |
| `client_sentiment` | enum | very_positive, positive, neutral, skeptical |
| `urgency` | enum | high, medium, low |
| `company_size` | enum | startup, small, medium, large |
| `meeting_depth` | enum | superficial, moderate, deep |
| `client_engagement` | enum | low, medium, high |
| `transcript_word_count` | int | calculado directamente del CSV, sin LLM |

---

## Decisiones de arquitectura

**PostgreSQL en Railway desde el inicio**
Se optó por PostgreSQL en lugar de SQLite para no tener que migrar al hacer deploy. La URL se normaliza en `database.py` (`postgres://` → `postgresql+asyncpg://`) para compatibilidad con Railway.

**Filtros globales como dependency injection**
`FiltersContext` en el frontend mantiene `vendedor`, `date_from`, `date_to`. Los `apiParams` derivados se pasan como query params a cada llamada. En el backend, `global_filters` es un `Depends()` reutilizado en todos los endpoints de analytics.

**Agregación en el frontend para el Explorador**
El Explorador (Vista 5) carga todos los clientes de una vez (`/api/clients/all`) y hace las agregaciones con `useMemo` en el browser. Esto evita N llamadas al backend al cambiar dimensiones/métricas y permite respuesta instantánea.

**Procesamiento LLM idempotente con rate limiting**
`POST /api/process` skipea clientes ya categorizados (a menos que `force=true`). Incluye `asyncio.sleep(0.5)` entre llamadas a Gemini para respetar el free tier. Commit único al final del batch.

**Exportación CSV en el frontend**
La exportación se genera en el browser desde los datos ya cargados (BOM UTF-8 para compatibilidad con Excel, escape de comas/comillas/saltos de línea).

---

## Desarrollo local

### Opción A — Docker (recomendado)

Requiere solo Docker Desktop y una API key de Gemini.

```bash
cp .env.example .env
# Editar .env: GEMINI_API_KEY=tu_clave

docker compose up --build
```

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:5173 |
| Backend (docs) | http://localhost:8000/docs |

La base de datos se crea y se pobla automáticamente al iniciar el backend. El proceso de categorización con Gemini corre en background (~2–3 min para ~60 clientes). Los datos persisten entre reinicios gracias al volumen `postgres_data`.

Para reprocesar forzando re-categorización:

```bash
curl -X POST "http://localhost:8000/api/process?force=true"
```

### Opción B — Manual

#### Requisitos
- Python 3.11+
- Node.js 18+
- PostgreSQL 15+ corriendo localmente

#### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .\.venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Editar .env: GEMINI_API_KEY y DATABASE_URL

uvicorn app.main:app --reload
```

La DB se crea y puebla automáticamente al iniciar. Para forzar re-categorización:

```bash
curl -X POST "http://localhost:8000/api/process?force=true"
```

#### Frontend

```bash
cd frontend
npm install

cp .env.example .env.local
# Editar .env.local: VITE_API_URL=http://localhost:8000

npm run dev
```

---

## Deploy

### Backend → Railway

1. New Project → Deploy from GitHub repo
2. Add **PostgreSQL** addon — `DATABASE_URL` se setea automáticamente
3. Add service → mismo repo → **Root Directory** = `backend`
4. Variables de entorno: `GEMINI_API_KEY`, `FRONTEND_URL`
5. Deploy — `railway.json` se detecta automáticamente
6. Poblar DB: `POST https://tu-app.railway.app/api/process`

### Frontend → Vercel

1. New Project → Import repo
2. **Root Directory** = `frontend`, Framework = Vite
3. Variable de entorno: `VITE_API_URL` = URL del backend en Railway
4. Deploy
