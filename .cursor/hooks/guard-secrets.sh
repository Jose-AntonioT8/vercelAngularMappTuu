#!/usr/bin/env bash
# Bloquea git add/commit de archivos sensibles (.env, env.js con secretos)
set -euo pipefail

input=$(cat)
command=$(echo "$input" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('command',''))" 2>/dev/null || echo "")

if echo "$command" | grep -qE '\.env(\s|$)|src/assets/env\.js|/env\.js'; then
  echo '{
    "permission": "deny",
    "user_message": "No se pueden añadir al commit archivos de entorno (.env, env.js). Usa .env.example y variables en Vercel/CI.",
    "agent_message": "El hook bloqueó un comando git que incluye archivos sensibles de entorno."
  }'
  exit 2
fi

echo '{ "permission": "allow" }'
exit 0
