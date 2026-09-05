# DreamRugsCreation — Deployment Guide (Hostinger KVM 2)

> **Database transition:** PostgreSQL is now the primary runtime database.
> `migrate_v*.py` scripts are for the legacy SQLite database only. For the
> one-time cutover, apply those scripts to SQLite through v44, stop the service,
> then run `backend/migrate_sqlite_to_postgres.py` with `POSTGRES_DATABASE_URL`
> pointing to an empty PostgreSQL database. After verification, set `.env`:
>
> `DATABASE_URL=postgresql+psycopg://dreamrugsapp:PASSWORD@127.0.0.1:5432/dreamrugscreation`
>
> Then establish the PostgreSQL migration baseline once:
>
> `alembic stamp 20260830_0001`
>
> Every later backend deployment runs `alembic upgrade head`; do not rerun the
> one-time importer or the historical SQLite migrations.

## Prerequisites
- Hostinger KVM 2 VPS with Ubuntu 22.04
- A domain name with DNS pointed to your server IP
- Gmail App Password for SMTP (see Phase 7)

---

## Phase 1 — Access Your VPS

1. Buy **KVM 2** on Hostinger, select **Ubuntu 22.04** as the OS
2. Go to **hPanel → VPS → your server → Overview**
3. Copy your **root password** from there (or click "Reset root password" to set a new one)
4. Connect via browser terminal in hPanel **or** from your Mac:

```bash
ssh root@YOUR_SERVER_IP
```

> If SSH says "Permission denied" — use the **Browser Terminal** in hPanel to log in directly.

---

## Phase 2 — Create User & Secure Server

Run these on the VPS as root:

```bash
# Update packages
apt update && apt upgrade -y

# Create a non-root user
adduser dreamrugscreation
usermod -aG sudo dreamrugscreation

# Set up app directories (as root, no sudo needed)
mkdir -p /var/www/dreamrugscreation/innovation-projects/backend /var/www/dreamrugscreation/innovation-projects/frontend
chown -R dreamrugscreation:dreamrugscreation /var/www/dreamrugscreation

# Basic firewall
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw enable
```

---

## Phase 3 — Install Dependencies on VPS

```bash
# Check what Python version is available
python3 --version

# Install Python, nginx, certbot
sudo apt install -y python3-venv python3-dev python3-pip \
  build-essential libssl-dev libffi-dev \
  nginx certbot python3-certbot-nginx \
  libopencv-dev python3-opencv ffmpeg
```

> **ffmpeg** is required for the showcase-video upload endpoint to remux `.mov` uploads to `.mp4` (browsers often refuse to play `video/quicktime` even with a compatible codec). Without it, `.mov` uploads still work but keep their original container and may not play in Chrome/Firefox.

> If Python 3.x is lower than 3.9, add the deadsnakes PPA:
> ```bash
> sudo apt install -y software-properties-common
> sudo add-apt-repository ppa:deadsnakes/ppa -y
> sudo apt update
> sudo apt install -y python3.11 python3.11-venv python3.11-dev
> ```

---

## Phase 4 — Build Frontend (on your Mac)

```bash
cd /Applications/RugManufactureCustomApp/frontend
npm install
npm run build
# Output: frontend/dist/
```

`npm run build` also runs `scripts/prerender.js`, which bakes route-specific
`<title>`/meta/OG/JSON-LD into a static `.html` per public route (home, about,
catalog, pricing, and one per published rug) so non-JS crawlers and link-preview
bots see real metadata instead of the generic SPA shell — see the comment at the
top of that script for why. It needs a reachable backend to look up rug
names/images and your business name:

```bash
SITE_URL=https://yourdomain.com \
PRERENDER_API_URL=http://127.0.0.1:8000 \
REQUIRE_PRERENDER_API=true \
npm run build
```

`SITE_URL` defaults to `https://dreamrugscreation.in`; `PRERENDER_API_URL` defaults to
`http://127.0.0.1:8000` (a local dev backend running on this machine). If no
backend is reachable at that URL, the per-rug and business-name pages are silently
skipped (a warning is logged) and the rest of the build still succeeds — but note
this means catalog page metadata goes stale as soon as rugs are added, edited, or
removed, until the next `npm run build` + redeploy with a reachable backend.

---

## Phase 5 — Upload Files to Server (on your Mac)

```bash
# Upload backend (excludes venv, cache, .env)
rsync -avz --exclude '__pycache__' --exclude '*.pyc' \
  --exclude 'venv' --exclude '.env' \
  /Applications/RugManufactureCustomApp/backend/ \
  root@YOUR_SERVER_IP:/var/www/dreamrugscreation/innovation-projects/backend/

# Upload built frontend
rsync -avz /Applications/RugManufactureCustomApp/frontend/dist/ \
  root@YOUR_SERVER_IP:/var/www/dreamrugscreation/frontend/

# Upload public assets (rug images, icons etc.)
rsync -avz /Applications/RugManufactureCustomApp/frontend/public/ \
  root@YOUR_SERVER_IP:/var/www/dreamrugscreation/frontend/
```

---

## Phase 6 — Set Up Python Virtual Environment (on VPS)

```bash
cd /var/www/dreamrugscreation/innovation-projects/backend

# Create virtual environment
python3 -m venv venv

# Activate and install dependencies
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
deactivate
```

---

## Phase 7 — Create Production .env (on VPS)

```bash
nano /var/www/dreamrugscreation/innovation-projects/backend/.env
```

Paste and fill in your values (use your **rotated** Anthropic key — the one that was previously committed in `backend/.env.example` should be treated as compromised and never used again):

```env
ANTHROPIC_API_KEY=sk-ant-api03-YOUR-KEY-HERE
OPENAI_API_KEY=sk-YOUR-OPENAI-KEY-HERE
CATALOG_API_KEY=rug_live_YOUR-EXISTING-CATALOG-KEY
MCP_CONNECTOR_TOKEN=REPLACE_WITH-A-SEPARATE-RANDOM-TOKEN
MCP_TENANT_ID=1
MCP_OAUTH_ACCESS_TOKEN_MINUTES=60
MCP_OAUTH_REFRESH_TOKEN_DAYS=30
DATABASE_URL=sqlite:////var/www/dreamrugscreation/innovation-projects/backend/rug_manufacture.db
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-gmail@gmail.com
SMTP_PASSWORD=your-16-char-gmail-app-password
SMTP_FROM_EMAIL=your-gmail@gmail.com
SMTP_FROM_NAME=DreamRugsCreation
JWT_SECRET=REPLACE_WITH_RANDOM_STRING
FRONTEND_URL=https://yourdomain.com
```

> **FRONTEND_URL** must be your real production domain (with `https://`, no trailing slash) — it's used to build the link inside customer email-verification emails. Left as the default `localhost:5173`, verification emails sent from production would contain broken links.

Generate a strong JWT secret:

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

Secure the file:

```bash
chmod 600 /var/www/dreamrugscreation/innovation-projects/backend/.env
```

> **Gmail App Password:** Google Account → Security → 2-Step Verification (enable) → App Passwords → create one for "Mail". Use the 16-character code as SMTP_PASSWORD.

---

## Phase 8 — Seed the Database (on VPS)

```bash
cd /var/www/dreamrugscreation/innovation-projects/backend
source venv/bin/activate
python3 seed_data.py
python3 seed_showcase_videos.py
deactivate
```

This creates:
- Admin login: `admin@dreamrugscreation.demo` / `demo1234`
- 6 materials, 8 rugs, 3 customers, 3 quotes, 1 order
- 5 homepage showcase videos (2 rotating in the hero slot, 3 in the "Behind the Craft" grid) — requires the video/poster files under `backend/static/showcase/` to already be synced (Phase 5)

> `seed_showcase_videos.py` is idempotent (skips any `video_url` already in the table), so it's also safe to run again after adding more videos to the repo, or on a server that already has some showcase videos from the admin panel.

> **Migrating your existing local data instead of seeding fresh:** if you'd rather bring over your local `backend/rug_manufacture.db` (real quotes/customers) instead of starting with demo data, `scp` it to the server in place of running `seed_data.py`, then run the migration scripts once to add columns added after that db was first created:
> ```bash
> cd /var/www/dreamrugscreation/innovation-projects/backend && source venv/bin/activate
> python3 migrate_v2_customer_auth.py
> python3 migrate_v3_manual_discount.py
> python3 migrate_v4_verification_and_delivery.py
> python3 migrate_v5_ai_assistant_toggles.py
> python3 migrate_v6_vendor_notification_email.py
> python3 migrate_v7_showcase_video_intro.py
> python3 migrate_v8_default_size_unit.py
> python3 migrate_v9_quote_email_link_breakdown.py
> python3 migrate_v10_contact_details.py
> python3 migrate_v11_refresh_tokens.py
> deactivate
> ```
> Each script is idempotent (skips columns/tables that already exist), so running all of them is safe even if some already applied.

---

## Phase 9 — Create systemd Service (on VPS)

```bash
sudo nano /etc/systemd/system/dreamrugscreation.service
```

Paste:

```ini
[Unit]
Description=DreamRugsCreation - FastAPI Backend
After=network.target

[Service]
User=dreamrugscreation
Group=dreamrugscreation
WorkingDirectory=/var/www/dreamrugscreation/innovation-projects/backend
EnvironmentFile=/var/www/dreamrugscreation/innovation-projects/backend/.env
ExecStart=/var/www/dreamrugscreation/innovation-projects/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8001 --workers 2
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable dreamrugscreation
sudo systemctl start dreamrugscreation

# Verify it is running
sudo systemctl status dreamrugscreation
curl http://127.0.0.1:8001/health
# Should return: {"status":"healthy"}
```

---

## Phase 10 — Configure nginx (on VPS)

> First, point your domain's **A record** to your server IP in hPanel → Domains → DNS.

```bash
sudo nano /etc/nginx/sites-available/dreamrugscreation
```

Paste (replace `yourdomain.com`):

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # React frontend
    root /var/www/dreamrugscreation/frontend;
    index index.html;

    location / {
        # $uri.html before $uri/: the frontend build's prerender step (see
        # frontend/scripts/prerender.js) writes route-specific meta as e.g.
        # dist/catalog/42.html rather than dist/catalog/42/index.html — a *file*
        # match, not a directory match. This matters because a directory match
        # ($uri/) makes nginx 301-redirect bare URLs like /catalog/42 to
        # /catalog/42/ before serving anything, and plenty of non-JS crawlers and
        # link-preview bots (Bing, WhatsApp, LinkedIn, Slack) won't reliably follow
        # that hop, which would defeat the point of prerendering their meta tags.
        auth_request /internal/access-check;
        auth_request_set $access_cookie $upstream_http_set_cookie;
        add_header Set-Cookie $access_cookie always;
        # A blocked India visitor sees the token-entry page instead of a bare
        # 403 — see frontend/public/access-required.html. `= ` (no code after
        # it) rewrites the response to 200 so the page renders normally rather
        # than as a browser error page; the redirect param round-trips the
        # originally-requested URL so a valid token lands the visitor back on
        # the page they wanted instead of always bouncing to the homepage.
        error_page 403 = /access-required.html?redirect=$request_uri;
        try_files $uri $uri.html $uri/ /index.html;
    }

    # Serves the India-gate token-entry page itself — deliberately NOT behind
    # auth_request (a blocked visitor must be able to reach the page that lets
    # them submit a token in the first place, or they'd be locked in a loop).
    location = /access-required.html {
        try_files $uri =404;
    }

    # API -> FastAPI backend
    location /api/ {
        auth_request /internal/access-check;
        auth_request_set $access_cookie $upstream_http_set_cookie;
        add_header Set-Cookie $access_cookie always;
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 55M;
        proxy_read_timeout 120s;
    }

    # ChatGPT/Codex remote MCP connector. Do not apply the India visitor gate
    # here: the backend validates the connector's Authorization bearer token.
    # Streaming must remain unbuffered for MCP's Streamable HTTP transport.
    location /mcp/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Authorization $http_authorization;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 900s;
        proxy_send_timeout 900s;
        client_max_body_size 55M;
    }

    # OAuth discovery documents used by ChatGPT before it starts login.
    location ^~ /.well-known/oauth- {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # OAuth registration, staff consent, token exchange, and revocation.
    location ^~ /oauth/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_buffering off;
        proxy_cache off;
    }

    # Internal-only: backs the auth_request calls above. `internal;` means
    # nginx refuses this location for any request that didn't originate from
    # an auth_request subrequest — it's not reachable directly from outside.
    # See INDIA_ACCESS_KEYS in the backend's .env / access_check() in
    # app/main.py for what actually decides allow/block. No-op (never blocks
    # anything) whenever INDIA_ACCESS_KEYS isn't set.
    location = /internal/access-check {
        internal;
        proxy_pass http://127.0.0.1:8001/internal/access-check$is_args$args;
        proxy_pass_request_body off;
        proxy_set_header Content-Length "";
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Host $host;
    }

    # Sitemap -> FastAPI backend (mounted unprefixed at /sitemap.xml, not under /api,
    # so it lives at the conventional root URL search engines expect)
    location = /sitemap.xml {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Backend static files (admin-uploaded rug images). nosniff is defense-in-depth on
    # top of the backend's own upload validation (uploads are re-encoded to .jpg server
    # side) — it stops the browser from ever executing a served file as HTML/script
    # regardless of its extension.
    location /static/ {
        alias /var/www/dreamrugscreation/innovation-projects/backend/static/;
        add_header X-Content-Type-Options nosniff;
    }

    location /outputs/ {
        alias /var/www/dreamrugscreation/innovation-projects/backend/outputs/;
        add_header X-Content-Type-Options nosniff;
    }
}
```

Enable and test:

```bash
sudo ln -s /etc/nginx/sites-available/dreamrugscreation /etc/nginx/sites-enabled/
sudo nginx -t
# Must print: configuration file test is successful
sudo systemctl reload nginx
```

`auth_request` needs to actually be compiled into nginx — Ubuntu's `nginx`
apt package includes it by default, but worth confirming before relying on
it:
```bash
nginx -V 2>&1 | grep -o with-http_auth_request_module
# should print: with-http_auth_request_module
```

### Using the India access gate (optional)

Off by default — nothing above blocks anything unless `INDIA_ACCESS_KEYS` is
set in the backend's `.env` (Phase 7). It's comma-separated so each person
who needs access from India gets their own personal token rather than a
shared secret. To turn it on:

```bash
# generate one key per person, e.g. for 2 people:
openssl rand -hex 24   # token for person A
openssl rand -hex 24   # token for person B
# add both to /var/www/dreamrugscreation/innovation-projects/backend/.env:
#   INDIA_ACCESS_KEYS=<token-a>,<token-b>
sudo systemctl restart dreamrugscreation
```

Once set: a visitor browsing from India who doesn't hold one of the keys
never reaches any page of the site — every route lands them on
`frontend/public/access-required.html` (a token-entry form, wired up via
`error_page 403` in Phase 10's nginx config — that config block must be in
place, and a frontend deploy must have shipped this file, for the gate to
show anything other than a bare error). Submitting a valid token there
redirects back to the page they originally requested with `?key=<token>`
appended, which the backend accepts and turns into a 30-day cookie — from
then on they can browse anywhere on the site without re-entering it. An
invalid token redirects back to the same form with an inline error instead
of silently doing nothing. You can still share
`https://yourdomain.com/?key=<their token>` directly with each person
instead of making them type it in, if you prefer — same 30-day cookie either
way. Everyone browsing from outside India (including Googlebot, Bing, and
link-preview bots) is unaffected either way and never sees this page.

To revoke one person's access without affecting the other, remove just their
token from the comma-separated list and restart the service — their existing
30-day cookie stops working on their next request since it no longer matches
any allowed key.

To turn the gate back off entirely, clear `INDIA_ACCESS_KEYS` in `.env` and
restart the service — no nginx changes needed, the check endpoint itself
just starts allowing everything again.

---

## Phase 11 — Free SSL Certificate

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Certbot automatically updates nginx config for HTTPS and sets up auto-renewal.

Verify auto-renewal works:

```bash
sudo certbot renew --dry-run
```

---

## Phase 12 — Smoke Test

```bash
# API health check
curl https://yourdomain.com/api/health

# MCP is private: no token must be rejected; an authenticated initialize
# request can then be tested from ChatGPT developer mode.
curl -o /dev/null -s -w '%{http_code}\n' -X POST https://yourdomain.com/mcp/

# Public catalog (should return 8 rugs)
curl https://yourdomain.com/api/customer/catalog | python3 -m json.tool | head -30

# Admin login
curl -s -X POST https://yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@dreamrugscreation.demo","password":"demo1234"}'
```

Open `https://yourdomain.com` in browser — app should load fully.

---

## Phase 13 — CDN for Videos and Images (recommended before going live)

This setup serves everything under `/static/` — catalog photos, showcase
videos, workshop photos, branding — directly from the VPS via nginx. Every
upload there (`catalog.py`, `showcase.py`, `workshop.py`, `auth.py`'s
favicon endpoint) gets a fresh UUID filename, so a given URL's content
never changes. That means it's safe to cache aggressively, and video files
in particular are large enough that it's worth doing before any real
traffic — otherwise a handful of visitors watching the homepage intro video
at once each pull the full file straight from the KVM 2's bandwidth
allowance.

The app already sends the right signal for this: the `/static` mount in
`app/main.py` sets `Cache-Control: public, max-age=31536000, immutable` on
every file it serves. Cloudflare (and browsers) respect that header on its
own, so putting Cloudflare in front of the domain is mostly DNS + SSL
setup, not cache-rule authoring:

1. Add the site to Cloudflare (free plan) and update your domain's
   nameservers to the two Cloudflare assigns.
2. Once DNS is active in Cloudflare, set the SSL/TLS mode to **Full (strict)**
   — certbot's cert on the VPS already covers this.
3. Under **Caching → Configuration**, leave the default **Standard** cache
   level — Cloudflare will honor the `immutable` header automatically. Only
   add an explicit **Cache Rule** for `/static/*` (`Cache Level: Cache
   Everything`) if you want edge caching even for requests that skip
   standard caching for some other reason (e.g. cookies present).
4. No app changes needed — `video_url`/`image_url`/`poster_url` values
   returned by the public endpoints (`/api/customer/showcase-videos`,
   `/customer/workshop-photos`, `/customer/catalog`, etc.) are already
   relative paths (`/static/...`), so they resolve through whichever host
   serves the domain, Cloudflare included.

If you ever need to force-replace a file at the *same* URL (rather than
uploading a new one with a new UUID), purge that path from Cloudflare's
cache manually — the `immutable` header means it won't otherwise re-check
the origin until the year-long `max-age` expires.

---

## Ongoing Maintenance

### View live backend logs
```bash
sudo journalctl -u dreamrugscreation -f
```

### Restart backend
```bash
sudo systemctl restart dreamrugscreation
```

### Deploy frontend update (from Mac)
```bash
cd /Applications/RugManufactureCustomApp/frontend
npm run build
rsync -avz frontend/dist/ root@YOUR_SERVER_IP:/var/www/dreamrugscreation/frontend/
```

### Deploy backend update (from Mac)
```bash
rsync -avz --exclude '__pycache__' --exclude '*.pyc' --exclude 'venv' --exclude '.env' \
  /Applications/RugManufactureCustomApp/backend/ \
  root@YOUR_SERVER_IP:/var/www/dreamrugscreation/innovation-projects/backend/

ssh root@YOUR_SERVER_IP "sudo systemctl restart dreamrugscreation"
```

### Backup the database
```bash
# From Mac
scp root@YOUR_SERVER_IP:/var/www/dreamrugscreation/innovation-projects/backend/rug_manufacture.db \
  ~/Desktop/dreamrugscreation-backup-$(date +%Y%m%d).db
```

---

## Troubleshooting

| Problem | Command to diagnose |
|---|---|
| Backend not responding | `sudo systemctl status dreamrugscreation` |
| nginx 502 Bad Gateway | `sudo journalctl -u dreamrugscreation -n 50` |
| nginx config error | `sudo nginx -t` |
| SSL not working | `sudo certbot certificates` |
| Permission error on uploads | `sudo chown -R dreamrugscreation:dreamrugscreation /var/www/dreamrugscreation/innovation-projects/backend/uploads` |

---

## Cost Summary

| Item | Cost |
|---|---|
| Hostinger KVM 2 VPS | ~$7.99/mo |
| Domain name | ~$1/mo (~$12/yr) |
| SSL certificate | Free (Let's Encrypt) |
| Anthropic API | Pay per use |
| **Total fixed** | **~$9/mo** |
