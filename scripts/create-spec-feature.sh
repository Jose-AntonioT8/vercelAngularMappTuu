#!/usr/bin/env bash
# Crea una nueva carpeta de feature SDD a partir de las plantillas en .specify/templates/
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEMPLATES="${ROOT}/.specify/templates"
SPECS="${ROOT}/specs"

usage() {
  echo "Uso: $0 <NNN-nombre-feature>"
  echo "Ejemplo: $0 001-filtro-planes-guardados"
  exit 1
}

[[ $# -eq 1 ]] || usage

FEATURE_SLUG="$1"
TARGET="${SPECS}/${FEATURE_SLUG}"

if [[ ! "$FEATURE_SLUG" =~ ^[0-9]{3}-[a-z0-9]+(-[a-z0-9]+)*$ ]]; then
  echo "Error: el nombre debe ser NNN-slug-kebab (ej. 001-mi-feature)"
  exit 1
fi

if [[ -d "$TARGET" ]]; then
  echo "Error: ya existe ${TARGET}"
  exit 1
fi

mkdir -p "${TARGET}/contracts"

copy_template() {
  local src_name="$1"
  local dest_name="$2"
  local src="${TEMPLATES}/${src_name}"
  local dest="${TARGET}/${dest_name}"
  if [[ -f "$src" ]]; then
    sed "s/\[NNN-nombre-feature\]/${FEATURE_SLUG}/g; s/\[NOMBRE DE LA FEATURE\]/${FEATURE_SLUG}/g" "$src" > "$dest"
    echo "  creado: specs/${FEATURE_SLUG}/${dest_name}"
  fi
}

echo "Creando feature SDD: ${FEATURE_SLUG}"
copy_template "spec-template.md" "spec.md"
copy_template "plan-template.md" "plan.md"
copy_template "tasks-template.md" "tasks.md"
copy_template "research-template.md" "research.md"
copy_template "data-model-template.md" "data-model.md"
copy_template "quickstart-template.md" "quickstart.md"
copy_template "api-contract-template.md" "contracts/api-contract.md"

echo ""
echo "Listo. Edita specs/${FEATURE_SLUG}/spec.md y sigue el flujo en specs/README.md"
