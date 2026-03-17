#!/bin/bash
# Full sandbox reset: migrations + seed + test user + sample data
# Usage: bash supabase/seed-reset.sh

set -e

PROJECT_REF="eehdpdzyggzepeykdzem"
SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlaGRwZHp5Z2d6ZXBleWtkemVtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzEwNzQwNywiZXhwIjoyMDg4NjgzNDA3fQ.AUwezTBqbHhJDEapXPszWjlZzD1968OOQf3dA-4A3VY"
API_URL="https://${PROJECT_REF}.supabase.co"
H1="apikey: ${SERVICE_KEY}"
H2="Authorization: Bearer ${SERVICE_KEY}"
H3="Content-Type: application/json"

echo "=== 1. Reset database ==="
printf 'y\n' | supabase db reset --linked

echo ""
echo "=== 2. Create test user ==="
USER_ID=$(curl -s -X POST "${API_URL}/auth/v1/admin/users" \
  -H "$H1" -H "$H2" -H "$H3" \
  -d '{"email":"teste@e2.com","password":"teste123","email_confirm":true}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "User: ${USER_ID}"

sleep 2

echo "=== 3. Set roles ==="
curl -s -X PATCH "${API_URL}/rest/v1/profiles?id=eq.${USER_ID}" \
  -H "$H1" -H "$H2" -H "$H3" \
  -d "{\"roles\":[\"admin\",\"operator\",\"editor\",\"reviewer\"],\"nome\":\"PH Teste\"}" > /dev/null
echo "Roles: admin, operator, editor, reviewer"

echo "=== 4. Get column IDs ==="
COL_CHECKIN=$(curl -s "${API_URL}/rest/v1/colunas?slug=eq.check_in&select=id" -H "$H1" -H "$H2" | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['id'])")
COL_PRODUCAO=$(curl -s "${API_URL}/rest/v1/colunas?slug=eq.producao&select=id" -H "$H1" -H "$H2" | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['id'])")
COL_REVISAO=$(curl -s "${API_URL}/rest/v1/colunas?slug=eq.revisao_interna&select=id" -H "$H1" -H "$H2" | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['id'])")

echo "=== 5. Create sample jobs ==="
# Job 1: CHECK IN
J1=$(curl -s -X POST "${API_URL}/rest/v1/jobs" -H "$H1" -H "$H2" -H "$H3" -H "Prefer: return=representation" \
  -d "{\"cliente_id\":\"c1111111-1111-1111-1111-111111111111\",\"campanha\":\"Natal 2026\",\"tipo_job\":\"publicidade\",\"coluna_id\":\"${COL_CHECKIN}\",\"posicao\":0,\"data_entrega\":\"2026-04-15\",\"hora_entrega_cliente\":\"18:00\",\"margem_horas\":4,\"created_by\":\"${USER_ID}\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['id'])")
echo "Job 1 (Check In): $J1"

# Job 2: PRODUCAO (with all fields filled)
J2=$(curl -s -X POST "${API_URL}/rest/v1/jobs" -H "$H1" -H "$H2" -H "$H3" -H "Prefer: return=representation" \
  -d "{\"cliente_id\":\"c2222222-2222-2222-2222-222222222222\",\"campanha\":\"Lancamento Air Max\",\"tipo_job\":\"publicidade\",\"coluna_id\":\"${COL_PRODUCAO}\",\"posicao\":0,\"data_entrega\":\"2026-04-01\",\"hora_entrega_cliente\":\"14:00\",\"margem_horas\":4,\"assignee_id\":\"${USER_ID}\",\"drive_folder_url\":\"https://drive.google.com/drive/folders/teste\",\"briefing_texto\":\"Filme 30s para lancamento do Air Max 2026. Tom aspiracional, foco em performance urbana.\",\"created_by\":\"${USER_ID}\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['id'])")
echo "Job 2 (Producao): $J2"

# Job 3: REVISAO INTERNA
J3=$(curl -s -X POST "${API_URL}/rest/v1/jobs" -H "$H1" -H "$H2" -H "$H3" -H "Prefer: return=representation" \
  -d "{\"cliente_id\":\"c3333333-3333-3333-3333-333333333333\",\"campanha\":\"Dia das Maes\",\"tipo_job\":\"institucional\",\"coluna_id\":\"${COL_REVISAO}\",\"posicao\":0,\"data_entrega\":\"2026-05-10\",\"hora_entrega_cliente\":\"12:00\",\"margem_horas\":4,\"assignee_id\":\"${USER_ID}\",\"drive_folder_url\":\"https://drive.google.com/drive/folders/natura\",\"briefing_texto\":\"Institucional 60s Dia das Maes. Tom emocional.\",\"created_by\":\"${USER_ID}\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['id'])")
echo "Job 3 (Revisao): $J3"

echo "=== 6. Create entregas ==="
# Nike entregas
curl -s -X POST "${API_URL}/rest/v1/entregas" -H "$H1" -H "$H2" -H "$H3" \
  -d "[{\"job_id\":\"${J2}\",\"nome\":\"Filme 16x9\",\"tag\":\"edicao\",\"posicao\":0,\"data_entrega\":\"2026-04-01\",\"hora_entrega_cliente\":\"14:00\",\"margem_horas\":4},{\"job_id\":\"${J2}\",\"nome\":\"Filme 9x16 Stories\",\"tag\":\"edicao\",\"posicao\":1},{\"job_id\":\"${J2}\",\"nome\":\"Poster Key Visual\",\"tag\":\"arte\",\"posicao\":2}]" > /dev/null

# Natura entregas (some done)
curl -s -X POST "${API_URL}/rest/v1/entregas" -H "$H1" -H "$H2" -H "$H3" \
  -d "[{\"job_id\":\"${J3}\",\"nome\":\"Filme 30s TV\",\"tag\":\"edicao\",\"posicao\":0,\"concluida\":true},{\"job_id\":\"${J3}\",\"nome\":\"Corte 15s Digital\",\"tag\":\"edicao\",\"posicao\":1,\"concluida\":true},{\"job_id\":\"${J3}\",\"nome\":\"Color Grade Final\",\"tag\":\"color\",\"posicao\":2}]" > /dev/null
echo "Entregas created"

echo "=== 7. Create freelas ==="
curl -s -X POST "${API_URL}/rest/v1/job_freelas" -H "$H1" -H "$H2" -H "$H3" \
  -d "[{\"job_id\":\"${J2}\",\"nome\":\"Carlos Motion\",\"funcao\":\"Motion Designer\",\"posicao\":0},{\"job_id\":\"${J3}\",\"nome\":\"Ana Color\",\"funcao\":\"Colorista\",\"posicao\":0},{\"job_id\":\"${J3}\",\"nome\":\"Marcos Edit\",\"funcao\":\"Editor\",\"posicao\":1}]" > /dev/null
echo "Freelas created"

echo "=== 8. More clients ==="
curl -s -X POST "${API_URL}/rest/v1/clientes" -H "$H1" -H "$H2" -H "$H3" \
  -d "[
    {\"id\":\"c4444444-4444-4444-4444-444444444444\",\"nome\":\"Ambev\",\"dominio\":\"ambev.com.br\",\"cor\":\"#F59E0B\"},
    {\"id\":\"c5555555-5555-5555-5555-555555555555\",\"nome\":\"Itau\",\"dominio\":\"itau.com.br\",\"cor\":\"#FF6600\"},
    {\"id\":\"c6666666-6666-6666-6666-666666666666\",\"nome\":\"Vivo\",\"dominio\":\"vivo.com.br\",\"cor\":\"#8B5CF6\"},
    {\"id\":\"c7777777-7777-7777-7777-777777777777\",\"nome\":\"Magazine Luiza\",\"dominio\":\"magazineluiza.com.br\",\"cor\":\"#3B82F6\"}
  ]" > /dev/null
echo "More clients created"

echo "=== 9. More jobs + entregas ==="

# Ambev — Carnaval (3 entregas, producao)
J4=$(curl -s -X POST "${API_URL}/rest/v1/jobs" -H "$H1" -H "$H2" -H "$H3" -H "Prefer: return=representation" \
  -d "{\"cliente_id\":\"c4444444-4444-4444-4444-444444444444\",\"campanha\":\"Carnaval 2026\",\"tipo_job\":\"publicidade\",\"coluna_id\":\"${COL_PRODUCAO}\",\"posicao\":1,\"data_entrega\":\"2026-03-25\",\"hora_entrega_cliente\":\"18:00\",\"margem_horas\":4,\"assignee_id\":\"${USER_ID}\",\"drive_folder_url\":\"https://drive.google.com/drive/folders/ambev\",\"briefing_texto\":\"3 filmes para carnaval Brahma. Tom festivo, diversidade, musica.\",\"created_by\":\"${USER_ID}\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['id'])")
echo "Job 4 (Ambev Carnaval): $J4"
curl -s -X POST "${API_URL}/rest/v1/entregas" -H "$H1" -H "$H2" -H "$H3" \
  -d "[{\"job_id\":\"${J4}\",\"nome\":\"Filme 30s TV\",\"tag\":\"edicao\",\"posicao\":0,\"status_slug\":\"producao\",\"data_entrega\":\"2026-03-25\"},{\"job_id\":\"${J4}\",\"nome\":\"Corte 15s Reels\",\"tag\":\"edicao\",\"posicao\":1,\"status_slug\":\"producao\"},{\"job_id\":\"${J4}\",\"nome\":\"Capa Spotify\",\"tag\":\"arte\",\"posicao\":2,\"status_slug\":\"check_in\"}]" > /dev/null

# Ambev — Dia dos Pais (2 entregas, check_in)
J5=$(curl -s -X POST "${API_URL}/rest/v1/jobs" -H "$H1" -H "$H2" -H "$H3" -H "Prefer: return=representation" \
  -d "{\"cliente_id\":\"c4444444-4444-4444-4444-444444444444\",\"campanha\":\"Dia dos Pais\",\"tipo_job\":\"institucional\",\"coluna_id\":\"${COL_CHECKIN}\",\"posicao\":1,\"data_entrega\":\"2026-08-10\",\"hora_entrega_cliente\":\"12:00\",\"margem_horas\":4,\"created_by\":\"${USER_ID}\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['id'])")
echo "Job 5 (Ambev Dia dos Pais): $J5"
curl -s -X POST "${API_URL}/rest/v1/entregas" -H "$H1" -H "$H2" -H "$H3" \
  -d "[{\"job_id\":\"${J5}\",\"nome\":\"Filme 60s Emocional\",\"tag\":\"edicao\",\"posicao\":0,\"status_slug\":\"check_in\"},{\"job_id\":\"${J5}\",\"nome\":\"Making Of 2min\",\"tag\":\"edicao\",\"posicao\":1,\"status_slug\":\"check_in\"}]" > /dev/null

# Itau — Campanha Digital (4 entregas em fases diferentes)
J6=$(curl -s -X POST "${API_URL}/rest/v1/jobs" -H "$H1" -H "$H2" -H "$H3" -H "Prefer: return=representation" \
  -d "{\"cliente_id\":\"c5555555-5555-5555-5555-555555555555\",\"campanha\":\"Feito pra Voce\",\"tipo_job\":\"publicidade\",\"coluna_id\":\"${COL_PRODUCAO}\",\"posicao\":2,\"data_entrega\":\"2026-04-20\",\"hora_entrega_cliente\":\"14:00\",\"margem_horas\":6,\"assignee_id\":\"${USER_ID}\",\"drive_folder_url\":\"https://drive.google.com/drive/folders/itau\",\"briefing_texto\":\"Campanha digital multi-formato. Tom moderno, urbano, inclusivo.\",\"created_by\":\"${USER_ID}\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['id'])")
echo "Job 6 (Itau Digital): $J6"
curl -s -X POST "${API_URL}/rest/v1/entregas" -H "$H1" -H "$H2" -H "$H3" \
  -d "[{\"job_id\":\"${J6}\",\"nome\":\"Hero 16x9\",\"tag\":\"edicao\",\"posicao\":0,\"status_slug\":\"revisao_interna\",\"concluida\":true,\"data_entrega\":\"2026-04-15\"},{\"job_id\":\"${J6}\",\"nome\":\"Bumper 6s\",\"tag\":\"edicao\",\"posicao\":1,\"status_slug\":\"producao\"},{\"job_id\":\"${J6}\",\"nome\":\"Stories 9x16\",\"tag\":\"motion\",\"posicao\":2,\"status_slug\":\"producao\"},{\"job_id\":\"${J6}\",\"nome\":\"Banner Animated\",\"tag\":\"motion\",\"posicao\":3,\"status_slug\":\"check_in\"}]" > /dev/null

# Vivo — Lancamento 5G (3 entregas, mais avancadas)
J7=$(curl -s -X POST "${API_URL}/rest/v1/jobs" -H "$H1" -H "$H2" -H "$H3" -H "Prefer: return=representation" \
  -d "{\"cliente_id\":\"c6666666-6666-6666-6666-666666666666\",\"campanha\":\"Lancamento 5G+\",\"tipo_job\":\"publicidade\",\"coluna_id\":\"${COL_REVISAO}\",\"posicao\":1,\"data_entrega\":\"2026-04-05\",\"hora_entrega_cliente\":\"10:00\",\"margem_horas\":4,\"assignee_id\":\"${USER_ID}\",\"drive_folder_url\":\"https://drive.google.com/drive/folders/vivo\",\"briefing_texto\":\"Lancamento 5G+ Vivo. Tom tecnologico, futuro, conexao.\",\"created_by\":\"${USER_ID}\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['id'])")
echo "Job 7 (Vivo 5G): $J7"
curl -s -X POST "${API_URL}/rest/v1/entregas" -H "$H1" -H "$H2" -H "$H3" \
  -d "[{\"job_id\":\"${J7}\",\"nome\":\"Manifesto 45s\",\"tag\":\"edicao\",\"posicao\":0,\"status_slug\":\"pre_envio\",\"concluida\":true,\"aprovado_interno\":true,\"data_entrega\":\"2026-04-03\"},{\"job_id\":\"${J7}\",\"nome\":\"Cutdown 15s\",\"tag\":\"edicao\",\"posicao\":1,\"status_slug\":\"revisao_interna\",\"concluida\":true},{\"job_id\":\"${J7}\",\"nome\":\"Motion Logo Reveal\",\"tag\":\"motion\",\"posicao\":2,\"status_slug\":\"ajuste\"}]" > /dev/null

# Magazine Luiza — Black Friday (5 entregas espalhadas)
J8=$(curl -s -X POST "${API_URL}/rest/v1/jobs" -H "$H1" -H "$H2" -H "$H3" -H "Prefer: return=representation" \
  -d "{\"cliente_id\":\"c7777777-7777-7777-7777-777777777777\",\"campanha\":\"Black Friday 2026\",\"tipo_job\":\"varejo\",\"coluna_id\":\"${COL_PRODUCAO}\",\"posicao\":3,\"data_entrega\":\"2026-11-28\",\"hora_entrega_cliente\":\"09:00\",\"margem_horas\":8,\"assignee_id\":\"${USER_ID}\",\"drive_folder_url\":\"https://drive.google.com/drive/folders/magalu\",\"briefing_texto\":\"Kit completo Black Friday Magalu. Tom urgente, ofertas, Lu.\",\"created_by\":\"${USER_ID}\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['id'])")
echo "Job 8 (Magalu Black Friday): $J8"
curl -s -X POST "${API_URL}/rest/v1/entregas" -H "$H1" -H "$H2" -H "$H3" \
  -d "[{\"job_id\":\"${J8}\",\"nome\":\"VT Principal 30s\",\"tag\":\"edicao\",\"posicao\":0,\"status_slug\":\"producao\",\"data_entrega\":\"2026-11-20\"},{\"job_id\":\"${J8}\",\"nome\":\"Teaser 10s\",\"tag\":\"edicao\",\"posicao\":1,\"status_slug\":\"producao\"},{\"job_id\":\"${J8}\",\"nome\":\"Pack Reels x5\",\"tag\":\"motion\",\"posicao\":2,\"status_slug\":\"check_in\"},{\"job_id\":\"${J8}\",\"nome\":\"Color Grade Master\",\"tag\":\"color\",\"posicao\":3,\"status_slug\":\"revisao_interna\",\"concluida\":true},{\"job_id\":\"${J8}\",\"nome\":\"Sound Design\",\"tag\":\"mix\",\"posicao\":4,\"status_slug\":\"check_in\"}]" > /dev/null

# Nike — Copa do Mundo (2 entregas, revisao cliente)
J9=$(curl -s -X POST "${API_URL}/rest/v1/jobs" -H "$H1" -H "$H2" -H "$H3" -H "Prefer: return=representation" \
  -d "{\"cliente_id\":\"c2222222-2222-2222-2222-222222222222\",\"campanha\":\"Copa do Mundo\",\"tipo_job\":\"publicidade\",\"coluna_id\":\"${COL_REVISAO}\",\"posicao\":2,\"data_entrega\":\"2026-06-15\",\"hora_entrega_cliente\":\"16:00\",\"margem_horas\":4,\"assignee_id\":\"${USER_ID}\",\"drive_folder_url\":\"https://drive.google.com/drive/folders/nike-copa\",\"briefing_texto\":\"Filme Nike Copa. Garra, superacao, selecao.\",\"created_by\":\"${USER_ID}\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['id'])")
echo "Job 9 (Nike Copa): $J9"
curl -s -X POST "${API_URL}/rest/v1/entregas" -H "$H1" -H "$H2" -H "$H3" \
  -d "[{\"job_id\":\"${J9}\",\"nome\":\"Filme 60s Emocional\",\"tag\":\"edicao\",\"posicao\":0,\"status_slug\":\"revisao_cliente\",\"concluida\":true,\"aprovado_interno\":true,\"data_entrega\":\"2026-06-10\"},{\"job_id\":\"${J9}\",\"nome\":\"Teaser 15s Countdown\",\"tag\":\"motion\",\"posicao\":1,\"status_slug\":\"alteracoes\"}]" > /dev/null

# Coca Cola — Pascoa (2 entregas, entregue)
J10=$(curl -s -X POST "${API_URL}/rest/v1/jobs" -H "$H1" -H "$H2" -H "$H3" -H "Prefer: return=representation" \
  -d "{\"cliente_id\":\"c1111111-1111-1111-1111-111111111111\",\"campanha\":\"Pascoa 2026\",\"tipo_job\":\"institucional\",\"coluna_id\":\"${COL_CHECKIN}\",\"posicao\":2,\"data_entrega\":\"2026-04-05\",\"hora_entrega_cliente\":\"14:00\",\"margem_horas\":4,\"assignee_id\":\"${USER_ID}\",\"drive_folder_url\":\"https://drive.google.com/drive/folders/coca-pascoa\",\"briefing_texto\":\"Institucional Pascoa Coca Cola. Tom familia, compartilhar.\",\"created_by\":\"${USER_ID}\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['id'])")
echo "Job 10 (Coca Pascoa): $J10"
curl -s -X POST "${API_URL}/rest/v1/entregas" -H "$H1" -H "$H2" -H "$H3" \
  -d "[{\"job_id\":\"${J10}\",\"nome\":\"Filme 30s TV\",\"tag\":\"edicao\",\"posicao\":0,\"status_slug\":\"entregue\",\"concluida\":true,\"aprovado_interno\":true,\"aprovado_cliente\":true},{\"job_id\":\"${J10}\",\"nome\":\"Adaptacao Digital 16x9\",\"tag\":\"edicao\",\"posicao\":1,\"status_slug\":\"entregue\",\"concluida\":true,\"aprovado_interno\":true,\"aprovado_cliente\":true}]" > /dev/null

# More freelas
curl -s -X POST "${API_URL}/rest/v1/job_freelas" -H "$H1" -H "$H2" -H "$H3" \
  -d "[{\"job_id\":\"${J4}\",\"nome\":\"DJ Marlboro\",\"funcao\":\"Consultoria Musical\",\"posicao\":0},{\"job_id\":\"${J7}\",\"nome\":\"Felipe 3D\",\"funcao\":\"3D Artist\",\"posicao\":0},{\"job_id\":\"${J8}\",\"nome\":\"Bia Sound\",\"funcao\":\"Sound Designer\",\"posicao\":0},{\"job_id\":\"${J8}\",\"nome\":\"Rafa Color\",\"funcao\":\"Colorista\",\"posicao\":1}]" > /dev/null
echo "More entregas + freelas created"

echo ""
echo "========================================="
echo "  SANDBOX READY"
echo "  Login: teste@e2.com / teste123"
echo "  7 clientes, 10 jobs, ~25 entregas"
echo "  Cards espalhados por todas as colunas"
echo "========================================="
