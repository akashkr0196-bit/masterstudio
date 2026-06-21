# MASTER STUDIO

AI face-search and client-selection platform for event photographers.

## Local Development

Install frontend dependencies:

```powershell
npm install
npm run dev
```

Run the backend locally with SQLite:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
$env:APP_ENV="development"
$env:DATABASE_URL="sqlite:///./masterstudio.db"
$env:AUTO_CREATE_TABLES="true"
$env:JWT_SECRET="local-dev-secret-change-me"
$env:SUPER_ADMIN_PASSWORD="local-admin-password"
.\.venv\Scripts\uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

SQLite is only for development/testing.

## Production Database

Production must use PostgreSQL. Do not run production with SQLite.

Example production environment:

```env
APP_ENV=production
DATABASE_URL=postgresql+psycopg2://masterstudio_user:strong-password@localhost:5432/masterstudio
AUTO_CREATE_TABLES=false
ENABLE_PGVECTOR=1
JWT_SECRET=change-this-to-a-long-random-secret
SUPER_ADMIN_PASSWORD=change-this-before-launch
```

Run migrations before starting the API:

```powershell
.\backend\.venv\Scripts\alembic.exe upgrade head
```

The initial migration creates users, events, photos, faces, search logs, guest leads, downloads, payments, support messages, client selections, system settings, audit logs, tenant indexes, and the PostgreSQL `vector` extension when pgvector is enabled.

## Production Notes

- Set `CORS_ALLOWED_ORIGINS` to your real frontend domain.
- Set `VITE_API_BASE_URL` to your backend `/api` URL.
- Keep `AUTO_CREATE_TABLES=false` in production so schema changes happen through Alembic migrations.
- Keep uploaded originals/previews in durable storage and back up PostgreSQL daily before launch traffic.
