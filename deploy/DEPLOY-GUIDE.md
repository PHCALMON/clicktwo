# ClickTwo — Deploy Guide (Hostinger VPS)

**Domain:** clicktwo.e2creativestudio.com.br
**Server:** srv1385352.hstgr.cloud (46.202.148.138)
**Port:** 3000 (interno, Nginx faz proxy)

---

## Passo 1: DNS

No painel de DNS do seu dominio (e2creativestudio.com.br):

| Tipo | Nome | Valor | TTL |
|------|------|-------|-----|
| A | clicktwo | 46.202.148.138 | 3600 |

> Pode levar ate 24h para propagar, mas geralmente 5-30 minutos.

---

## Passo 2: Upload do pacote

1. Abra o **Hostinger hPanel** → **File Manager**
2. Navegue ate `/tmp/`
3. Faça upload do arquivo `clicktwo-deploy.tar.gz` (4.6MB)

> O arquivo esta em: `/tmp/clicktwo-deploy.tar.gz` no seu Mac

---

## Passo 3: Rodar o setup

No **hPanel → Terminal** (ou SSH):

```bash
# Dar permissao e rodar o setup
chmod +x /tmp/setup-vps.sh
bash /tmp/setup-vps.sh
```

Isso vai:
- Instalar Node.js 20 (se nao tiver)
- Instalar PM2
- Extrair o app em /opt/clicktwo
- Criar o .env com as credenciais
- Iniciar o app via PM2

---

## Passo 4: Configurar Nginx

```bash
# Copiar config do Nginx
cp /tmp/nginx-clicktwo.conf /etc/nginx/sites-available/clicktwo
ln -sf /etc/nginx/sites-available/clicktwo /etc/nginx/sites-enabled/clicktwo

# Testar e recarregar
nginx -t
systemctl reload nginx
```

Teste: `curl http://clicktwo.e2creativestudio.com.br` (deve redirecionar para /login)

---

## Passo 5: SSL (Let's Encrypt)

```bash
# Instalar Certbot (se nao tiver)
apt-get install -y certbot python3-certbot-nginx

# Gerar certificado SSL
certbot --nginx -d clicktwo.e2creativestudio.com.br

# Renovacao automatica (ja vem configurada)
certbot renew --dry-run
```

---

## Passo 6: Supabase Auth

No **Supabase Dashboard** → Authentication → URL Configuration:

1. **Site URL:** `https://clicktwo.e2creativestudio.com.br`
2. **Redirect URLs:** adicionar `https://clicktwo.e2creativestudio.com.br/**`

> Sem isso, o login nao vai funcionar em producao!

---

## Comandos uteis

```bash
# Ver status do app
pm2 status

# Ver logs
pm2 logs clicktwo

# Reiniciar
pm2 restart clicktwo

# Parar
pm2 stop clicktwo

# Ver uso de CPU/memoria
pm2 monit
```

---

## Atualizar o deploy (com QA Gate)

Para futuras atualizacoes, use o script com QA Gate integrado:

```bash
cd apps/clicktwo
bash deploy/deploy.sh
```

O script faz automaticamente:
1. **QA Local** — Build (TypeScript + ESLint), verifica git limpo
2. **Push** — Envia para GitHub se tem commits locais
3. **Deploy VPS** — Pull, build, copia static para standalone, restart PM2
4. **Smoke Tests** — Login page 200, API auth gates 401, dominio externo
5. **Estabilidade** — PM2 online, sem crash loop, logs limpos
6. **Resultado** — Pass/fail com contagem de erros

### Deploy manual (fallback)

```bash
# 1. No Mac: rebuild + tarball
cd apps/clicktwo
npm run build
cp -r .next/static .next/standalone/.next/static
cd .next/standalone && tar czf /tmp/clicktwo-deploy.tar.gz .

# 2. Upload novo tar.gz para /tmp/ no VPS

# 3. No VPS:
cd /opt/clicktwo
tar xzf /tmp/clicktwo-deploy.tar.gz
pm2 restart clicktwo
```
