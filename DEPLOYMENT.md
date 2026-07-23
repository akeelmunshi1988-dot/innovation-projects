# LoomCraft AI — Deployment Guide (Hostinger KVM 2)

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
adduser loomcraft
usermod -aG sudo loomcraft

# Set up app directories (as root, no sudo needed)
mkdir -p /var/www/loomcraft/innovation-projects/backend /var/www/loomcraft/frontend
chown -R loomcraft:loomcraft /var/www/loomcraft

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
  libopencv-dev python3-opencv
```

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

---

## Phase 5 — Upload Files to Server (on your Mac)

```bash
# Upload backend (excludes venv, cache, .env)
rsync -avz --exclude '__pycache__' --exclude '*.pyc' \
  --exclude 'venv' --exclude '.env' \
  /Applications/RugManufactureCustomApp/backend/ \
  root@YOUR_SERVER_IP:/var/www/loomcraft/innovation-projects/backend/

# Upload built frontend
rsync -avz /Applications/RugManufactureCustomApp/frontend/dist/ \
  root@YOUR_SERVER_IP:/var/www/loomcraft/frontend/

# Upload public assets (rug images, icons etc.)
rsync -avz /Applications/RugManufactureCustomApp/frontend/public/ \
  root@YOUR_SERVER_IP:/var/www/loomcraft/frontend/
```

---

## Phase 6 — Set Up Python Virtual Environment (on VPS)

```bash
cd /var/www/loomcraft/innovation-projects/backend

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
nano /var/www/loomcraft/innovation-projects/backend/.env
```

Paste and fill in your values (use your **rotated** Anthropic key — the one that was previously committed in `backend/.env.example` should be treated as compromised and never used again):

```env
ANTHROPIC_API_KEY=sk-ant-api03-YOUR-KEY-HERE
DATABASE_URL=sqlite:////var/www/loomcraft/innovation-projects/backend/rug_manufacture.db
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-gmail@gmail.com
SMTP_PASSWORD=your-16-char-gmail-app-password
SMTP_FROM_EMAIL=your-gmail@gmail.com
SMTP_FROM_NAME=LoomCraft AI
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
chmod 600 /var/www/loomcraft/innovation-projects/backend/.env
```

> **Gmail App Password:** Google Account → Security → 2-Step Verification (enable) → App Passwords → create one for "Mail". Use the 16-character code as SMTP_PASSWORD.

---

## Phase 8 — Seed the Database (on VPS)

```bash
cd /var/www/loomcraft/innovation-projects/backend
source venv/bin/activate
python3 seed_data.py
deactivate
```

This creates:
- Admin login: `admin@loomcraft.demo` / `demo1234`
- 6 materials, 8 rugs, 3 customers, 3 quotes, 1 order

> **Migrating your existing local data instead of seeding fresh:** if you'd rather bring over your local `backend/rug_manufacture.db` (real quotes/customers) instead of starting with demo data, `scp` it to the server in place of running `seed_data.py`, then run the migration scripts once to add columns added after that db was first created:
> ```bash
> cd /var/www/loomcraft/innovation-projects/backend && source venv/bin/activate
> python3 migrate_v2_customer_auth.py
> python3 migrate_v3_manual_discount.py
> python3 migrate_v4_verification_and_delivery.py
> python3 migrate_v5_ai_assistant_toggles.py
> deactivate
> ```
> Each script is idempotent (skips columns that already exist), so running all of them is safe even if some already applied.

---

## Phase 9 — Create systemd Service (on VPS)

```bash
sudo nano /etc/systemd/system/loomcraft.service
```

Paste:

```ini
[Unit]
Description=LoomCraft AI - FastAPI Backend
After=network.target

[Service]
User=loomcraft
Group=loomcraft
WorkingDirectory=/var/www/loomcraft/innovation-projects/backend
EnvironmentFile=/var/www/loomcraft/innovation-projects/backend/.env
ExecStart=/var/www/loomcraft/innovation-projects/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8001 --workers 2
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
sudo systemctl enable loomcraft
sudo systemctl start loomcraft

# Verify it is running
sudo systemctl status loomcraft
curl http://127.0.0.1:8001/health
# Should return: {"status":"healthy"}
```

---

## Phase 10 — Configure nginx (on VPS)

> First, point your domain's **A record** to your server IP in hPanel → Domains → DNS.

```bash
sudo nano /etc/nginx/sites-available/loomcraft
```

Paste (replace `yourdomain.com`):

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # React frontend
    root /var/www/loomcraft/frontend;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API -> FastAPI backend
    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 20M;
        proxy_read_timeout 120s;
    }

    # Backend static files (admin-uploaded rug images)
    location /static/ {
        alias /var/www/loomcraft/innovation-projects/backend/static/;
    }

    location /outputs/ {
        alias /var/www/loomcraft/innovation-projects/backend/outputs/;
    }
}
```

Enable and test:

```bash
sudo ln -s /etc/nginx/sites-available/loomcraft /etc/nginx/sites-enabled/
sudo nginx -t
# Must print: configuration file test is successful
sudo systemctl reload nginx
```

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

# Public catalog (should return 8 rugs)
curl https://yourdomain.com/api/customer/catalog | python3 -m json.tool | head -30

# Admin login
curl -s -X POST https://yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@loomcraft.demo","password":"demo1234"}'
```

Open `https://yourdomain.com` in browser — app should load fully.

---

## Phase 13 — CDN for Homepage Videos (recommended before going live with video content)

This setup serves everything — including the homepage showcase videos under
`/static/showcase/` — directly from the VPS via nginx. That's fine for images,
but video files are large; once you upload real craftsmanship videos, put
Cloudflare (free tier) in front of the domain so videos are cached at the
edge instead of re-served from the VPS on every homepage visit.

1. Add the site to Cloudflare (free plan) and update your domain's
   nameservers to the two Cloudflare assigns.
2. Once DNS is active in Cloudflare, set the SSL/TLS mode to **Full (strict)**
   — certbot's cert on the VPS already covers this.
3. Under **Caching → Cache Rules**, add a rule to cache everything under
   `/static/*` at the edge (`Cache Level: Cache Everything`), since those
   files are immutable (each upload gets a new UUID filename).
4. No app changes needed — `video_url` values returned by
   `/api/customer/showcase-videos` are already relative paths (`/static/showcase/...`),
   so they resolve through whichever host serves the domain, Cloudflare included.

Without this, a handful of visitors streaming the intro video simultaneously
will each pull the full file straight from the KVM 2's bandwidth allowance —
fine at low traffic, worth fixing before any real promotion/launch.

---

## Ongoing Maintenance

### View live backend logs
```bash
sudo journalctl -u loomcraft -f
```

### Restart backend
```bash
sudo systemctl restart loomcraft
```

### Deploy frontend update (from Mac)
```bash
cd /Applications/RugManufactureCustomApp/frontend
npm run build
rsync -avz frontend/dist/ root@YOUR_SERVER_IP:/var/www/loomcraft/frontend/
```

### Deploy backend update (from Mac)
```bash
rsync -avz --exclude '__pycache__' --exclude '*.pyc' --exclude 'venv' --exclude '.env' \
  /Applications/RugManufactureCustomApp/backend/ \
  root@YOUR_SERVER_IP:/var/www/loomcraft/innovation-projects/backend/

ssh root@YOUR_SERVER_IP "sudo systemctl restart loomcraft"
```

### Backup the database
```bash
# From Mac
scp root@YOUR_SERVER_IP:/var/www/loomcraft/innovation-projects/backend/rug_manufacture.db \
  ~/Desktop/loomcraft-backup-$(date +%Y%m%d).db
```

---

## Troubleshooting

| Problem | Command to diagnose |
|---|---|
| Backend not responding | `sudo systemctl status loomcraft` |
| nginx 502 Bad Gateway | `sudo journalctl -u loomcraft -n 50` |
| nginx config error | `sudo nginx -t` |
| SSL not working | `sudo certbot certificates` |
| Permission error on uploads | `sudo chown -R loomcraft:loomcraft /var/www/loomcraft/innovation-projects/backend/uploads` |

---

## Cost Summary

| Item | Cost |
|---|---|
| Hostinger KVM 2 VPS | ~$7.99/mo |
| Domain name | ~$1/mo (~$12/yr) |
| SSL certificate | Free (Let's Encrypt) |
| Anthropic API | Pay per use |
| **Total fixed** | **~$9/mo** |
