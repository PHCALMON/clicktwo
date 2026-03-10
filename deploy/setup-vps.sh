#!/bin/bash
# ClickTwo VPS Deploy Script
# Server: Hostinger VPS (srv1385352.hstgr.cloud)
# Domain: clicktwo.e2creativestudio.com.br
# Run this script via Hostinger hPanel terminal

set -e

DOMAIN="clicktwo.e2creativestudio.com.br"
APP_DIR="/opt/clicktwo"
PORT=3001
REPO="https://github.com/PHCALMON/clicktwo.git"

echo "=== ClickTwo Deploy ==="
echo "Domain: $DOMAIN"
echo "App dir: $APP_DIR"
echo "Port: $PORT"
echo ""

# 1. Check Node.js
if ! command -v node &> /dev/null; then
    echo "Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi
echo "Node.js: $(node --version)"

# 2. Install PM2 globally
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
fi
echo "PM2: $(pm2 --version)"

# 3. Clone or pull repo
if [ -d "$APP_DIR/.git" ]; then
    echo "Updating existing repo..."
    cd $APP_DIR
    git pull
else
    echo "Cloning repo..."
    rm -rf $APP_DIR
    git clone $REPO $APP_DIR
    cd $APP_DIR
fi

# 4. Install dependencies
echo "Installing dependencies..."
npm ci --production=false

# 5. Build
echo "Building Next.js..."
npm run build

# 6. Create .env file (EDIT THIS with your actual secrets)
if [ ! -f $APP_DIR/.env ]; then
    echo ""
    echo "!!! IMPORTANT: Create .env file manually !!!"
    echo "Run: nano /opt/clicktwo/.env"
    echo "And paste the environment variables."
    echo ""
else
    echo ".env already exists"
fi

# 7. Start with PM2 (standalone mode)
cd $APP_DIR
cp -r .next/static .next/standalone/.next/static 2>/dev/null || true

pm2 delete clicktwo 2>/dev/null || true
cd $APP_DIR/.next/standalone
pm2 start server.js --name clicktwo
pm2 save
pm2 startup 2>/dev/null || true

echo ""
echo "=== PM2 Status ==="
pm2 status

echo ""
echo "=== ClickTwo running on port $PORT ==="
echo "Test: curl http://localhost:$PORT"
echo ""
echo "Next steps:"
echo "1. Create .env file: nano /opt/clicktwo/.env"
echo "2. Configure Nginx: see deploy/nginx-clicktwo.conf"
echo "3. SSL: certbot --nginx -d $DOMAIN"
