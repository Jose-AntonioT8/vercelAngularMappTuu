#!/usr/bin/env bash
# Inyecta contexto SDD al iniciar sesión del agente
set -euo pipefail

cat <<'EOF'
{
  "additional_context": "MapTuu: lee AGENTS.md y .specify/memory/constitution.md antes de implementar. Specs en specs/NNN-feature/. Reglas en .cursor/rules/."
}
EOF
exit 0
