#!/bin/bash
# ClickTwo — Deploy com QA Gate
# Uso: bash deploy/deploy.sh
# Roda local, faz push, build no VPS, valida e reporta

set -euo pipefail

# Config
VPS_HOST="46.202.148.138"
VPS_USER="root"
VPS_PASS="@869574Phe2studio"
APP_DIR="/opt/clicktwo"
DOMAIN="clicktwo.e2creativestudio.com.br"
SSH_CMD="sshpass -p '$VPS_PASS' ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_HOST"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

ERRORS=0
STEP=0

step() {
  STEP=$((STEP + 1))
  echo ""
  echo -e "${CYAN}[$STEP] $1${NC}"
}

pass() {
  echo -e "  ${GREEN}✓ $1${NC}"
}

fail() {
  echo -e "  ${RED}✗ $1${NC}"
  ERRORS=$((ERRORS + 1))
}

warn() {
  echo -e "  ${YELLOW}⚠ $1${NC}"
}

# ============================================
# FASE 1: QA LOCAL (pre-push)
# ============================================

echo ""
echo -e "${CYAN}══════════════════════════════════════${NC}"
echo -e "${CYAN}  CLICKTWO DEPLOY + QA GATE${NC}"
echo -e "${CYAN}══════════════════════════════════════${NC}"

step "Build local"
cd "$(dirname "$0")/.."

BUILD_OUTPUT=$(npm run build 2>&1)
if echo "$BUILD_OUTPUT" | grep -q "Compiled successfully"; then
  pass "Next.js compilou sem erros"
else
  fail "Build falhou"
  echo "$BUILD_OUTPUT" | tail -20
  exit 1
fi

# Check for TypeScript errors
if echo "$BUILD_OUTPUT" | grep -q "Type error"; then
  fail "Erros de TypeScript encontrados"
  echo "$BUILD_OUTPUT" | grep "Type error" | head -5
  exit 1
else
  pass "TypeScript OK"
fi

# Check for ESLint errors
if echo "$BUILD_OUTPUT" | grep -q "Failed to compile"; then
  fail "ESLint falhou"
  exit 1
else
  pass "ESLint OK"
fi

step "Verificar git status"
if git diff --quiet && git diff --cached --quiet; then
  warn "Nenhuma mudanca local para commitar"
else
  CHANGED=$(git diff --name-only | wc -l | tr -d ' ')
  STAGED=$(git diff --cached --name-only | wc -l | tr -d ' ')
  warn "$CHANGED arquivos modificados, $STAGED staged — commit antes de deployar"
  exit 1
fi

# Check if we're ahead of remote
AHEAD=$(git rev-list --count origin/main..HEAD 2>/dev/null || echo "0")
if [ "$AHEAD" -gt 0 ]; then
  step "Push para GitHub ($AHEAD commits)"
  git push origin main 2>&1
  if [ $? -eq 0 ]; then
    pass "Push OK"
  else
    fail "Push falhou"
    exit 1
  fi
else
  pass "Ja esta sincronizado com remote"
fi

# ============================================
# FASE 2: DEPLOY NO VPS
# ============================================

step "Pull no VPS"
PULL_OUT=$(eval $SSH_CMD "'cd $APP_DIR && git pull origin main 2>&1'")
if echo "$PULL_OUT" | grep -qE "Already up to date|Fast-forward|files changed"; then
  pass "Git pull OK"
  echo "$PULL_OUT" | grep -E "files changed|Already" | head -2 | sed 's/^/  /'
else
  fail "Git pull falhou"
  echo "$PULL_OUT" | tail -5
  exit 1
fi

step "Build no VPS"
BUILD_VPS=$(eval $SSH_CMD "'cd $APP_DIR && npm run build 2>&1'")
if echo "$BUILD_VPS" | grep -q "Compiled successfully"; then
  pass "Build no VPS OK"
else
  fail "Build no VPS falhou"
  echo "$BUILD_VPS" | tail -20
  exit 1
fi

step "Copiar static files para standalone"
eval $SSH_CMD "'cd $APP_DIR && cp -r .next/static .next/standalone/.next/static && cp -r public .next/standalone/public 2>/dev/null; echo OK'"
pass "Static files copiados"

step "Restart PM2"
RESTART_OUT=$(eval $SSH_CMD "'pm2 restart clicktwo 2>&1'")
if echo "$RESTART_OUT" | grep -q "✓"; then
  pass "PM2 restart OK"
else
  fail "PM2 restart falhou"
  echo "$RESTART_OUT"
  exit 1
fi

# Esperar o app subir
sleep 5

# ============================================
# FASE 3: QA POS-DEPLOY (smoke tests)
# ============================================

step "Health check — pagina de login"
HTTP_CODE=$(eval $SSH_CMD "'curl -s -o /dev/null -w \"%{http_code}\" http://localhost:3001/login'")
if [ "$HTTP_CODE" = "200" ]; then
  pass "GET /login → 200"
else
  fail "GET /login → $HTTP_CODE (esperado 200)"
fi

step "Health check — API jobs (auth required)"
HTTP_CODE=$(eval $SSH_CMD "'curl -s -o /dev/null -w \"%{http_code}\" http://localhost:3001/api/jobs'")
if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "405" ]; then
  pass "GET /api/jobs → $HTTP_CODE (auth gate OK)"
else
  fail "GET /api/jobs → $HTTP_CODE (esperado 401)"
fi

step "Health check — API membros (auth required)"
HTTP_CODE=$(eval $SSH_CMD "'curl -s -o /dev/null -w \"%{http_code}\" http://localhost:3001/api/membros'")
if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "405" ]; then
  pass "GET /api/membros → $HTTP_CODE (auth gate OK)"
else
  fail "GET /api/membros → $HTTP_CODE (esperado 401)"
fi

step "Health check — API notificacoes (auth required)"
HTTP_CODE=$(eval $SSH_CMD "'curl -s -o /dev/null -w \"%{http_code}\" http://localhost:3001/api/notificacoes'")
if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "405" ]; then
  pass "GET /api/notificacoes → $HTTP_CODE (auth gate OK)"
else
  fail "GET /api/notificacoes → $HTTP_CODE (esperado 401)"
fi

step "Health check — dominio externo"
EXT_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN/login" --max-time 10 2>/dev/null || echo "000")
if [ "$EXT_CODE" = "200" ]; then
  pass "GET https://$DOMAIN/login → 200"
elif [ "$EXT_CODE" = "000" ]; then
  warn "Timeout no dominio externo (pode ser DNS/SSL)"
else
  warn "GET https://$DOMAIN/login → $EXT_CODE"
fi

step "Verificar PM2 estavel (sem crash loop)"
PM2_RESTARTS=$(eval $SSH_CMD "'pm2 jlist 2>/dev/null'" | grep -o '"restart_time":[0-9]*' | grep -o '[0-9]*')
PM2_STATUS=$(eval $SSH_CMD "'pm2 jlist 2>/dev/null'" | grep -o '"status":"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"')
if [ "$PM2_STATUS" = "online" ]; then
  pass "PM2 status: online (restarts: $PM2_RESTARTS)"
else
  fail "PM2 status: $PM2_STATUS"
fi

step "Verificar logs de erro pos-restart"
ERROR_COUNT=$(eval $SSH_CMD "'pm2 logs clicktwo --lines 10 --nostream 2>&1'" | grep -ci "error\|unhandled\|ECONNREFUSED" || echo "0")
if [ "$ERROR_COUNT" -lt 2 ]; then
  pass "Logs limpos ($ERROR_COUNT warnings)"
else
  warn "$ERROR_COUNT erros nos logs recentes"
  eval $SSH_CMD "'pm2 logs clicktwo --lines 5 --nostream 2>&1'" | grep -i "error" | head -3 | sed 's/^/  /'
fi

# ============================================
# RESULTADO FINAL
# ============================================

echo ""
echo -e "${CYAN}══════════════════════════════════════${NC}"
if [ "$ERRORS" -eq 0 ]; then
  echo -e "${GREEN}  ✓ DEPLOY OK — 0 erros${NC}"
  echo -e "${GREEN}  https://$DOMAIN${NC}"
else
  echo -e "${RED}  ✗ DEPLOY COM $ERRORS ERRO(S)${NC}"
  echo -e "${RED}  Verifique os itens acima${NC}"
fi
echo -e "${CYAN}══════════════════════════════════════${NC}"
echo ""

exit $ERRORS
