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

## Low-Cost Private Pilot Deployment

Use this path for a friends-only 1 week pilot. Keep signup invite/approval based and do not market it as a public launch yet.

### 1. VPS Baseline

Recommended minimum:

- Ubuntu 22.04 or 24.04
- 2 vCPU
- 4 GB RAM
- 80-100 GB SSD

Install system packages:

```bash
sudo apt update
sudo apt install -y git curl nginx postgresql postgresql-contrib python3-venv python3-pip
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 2. Clone Project

```bash
cd /var/www
sudo git clone https://github.com/akashkr0196-bit/masterstudio.git
sudo chown -R $USER:$USER /var/www/masterstudio
cd /var/www/masterstudio
```

### 3. PostgreSQL

```bash
sudo -u postgres psql
```

Inside PostgreSQL:

```sql
CREATE DATABASE masterstudio;
CREATE USER masterstudio_user WITH PASSWORD 'replace-with-strong-db-password';
GRANT ALL PRIVILEGES ON DATABASE masterstudio TO masterstudio_user;
\q
```

### 4. Backend Environment

```bash
cd /var/www/masterstudio/backend
cp .env.example .env
nano .env
```

Required production values:

```env
APP_ENV=production
DATABASE_URL=postgresql+psycopg2://masterstudio_user:replace-with-strong-db-password@localhost:5432/masterstudio
AUTO_CREATE_TABLES=false
ENABLE_PGVECTOR=0
JWT_SECRET=replace-with-long-random-secret
SUPER_ADMIN_EMAIL=your-admin-email@example.com
SUPER_ADMIN_PASSWORD=replace-with-strong-admin-password
CORS_ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com
FAST2SMS_API_KEY=replace-with-fast2sms-key
SMS_PROVIDER=Fast2SMS
SMS_DAILY_LIMIT=10
OTP_DEBUG_LOGGING=false
LOCAL_STORAGE_DIR=static/uploads
MAX_UPLOAD_SIZE_MB=75
```

Create backend venv and run migrations:

```bash
python3 -m venv .venv
./.venv/bin/pip install -r requirements.txt
./.venv/bin/alembic upgrade head
```

### 5. Backend Service

Create service:

```bash
sudo nano /etc/systemd/system/masterstudio-api.service
```

Paste:

```ini
[Unit]
Description=MASTER STUDIO API
After=network.target postgresql.service

[Service]
WorkingDirectory=/var/www/masterstudio/backend
EnvironmentFile=/var/www/masterstudio/backend/.env
ExecStart=/var/www/masterstudio/backend/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable masterstudio-api
sudo systemctl start masterstudio-api
sudo systemctl status masterstudio-api
```

### 6. Frontend Build

Create frontend env before build:

```bash
cd /var/www/masterstudio
nano .env.production
```

Use:

```env
VITE_PUBLIC_APP_URL=https://your-domain.com
VITE_API_BASE_URL=https://your-domain.com/api
```

Build:

```bash
npm install
npm run build
```

### 7. Nginx

Create config:

```bash
sudo nano /etc/nginx/sites-available/masterstudio
```

Paste and replace domain:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    root /var/www/masterstudio/dist;
    index index.html;

    client_max_body_size 80M;

    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /static/ {
        proxy_pass http://127.0.0.1:8000/static/;
    }

    location / {
        try_files $uri /index.html;
    }
}
```

Enable:

```bash
sudo ln -s /etc/nginx/sites-available/masterstudio /etc/nginx/sites-enabled/masterstudio
sudo nginx -t
sudo systemctl reload nginx
```

### 8. SSL

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### 9. Daily Backup

For pilot, at least run manual backups daily:

```bash
mkdir -p ~/masterstudio-backups
pg_dump postgresql://masterstudio_user:replace-with-strong-db-password@localhost:5432/masterstudio > ~/masterstudio-backups/masterstudio-$(date +%F).sql
tar -czf ~/masterstudio-backups/uploads-$(date +%F).tar.gz -C /var/www/masterstudio/backend static/uploads
```

### 10. Pilot Smoke Test

Before sharing with friends:

- Super Admin login works.
- Create or approve photographer.
- Photographer profile setup works.
- Create event.
- Upload 10-20 JPG photos.
- AI indexing completes.
- QR link opens on mobile.
- Fast2SMS OTP arrives.
- Guest selfie search returns matches.
- Client selection link asks for OTP and saves selected photos.
- Photographer can download selected ZIP.
- Storage usage and audit logs update.
