#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APPS_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
VENVDIR="${APPS_ROOT}/.venv"
PYTHON="${PYTHON:-python3}"

if [[ ! -d "${VENVDIR}" ]]; then
  "${PYTHON}" -m venv "${VENVDIR}"
fi

echo "==> pip install (simulator + satnogs_adapter + pytest)"
"${VENVDIR}/bin/pip" install -q pytest \
  -r "${APPS_ROOT}/simulator/requirements.txt" \
  -r "${APPS_ROOT}/satnogs_adapter/requirements.txt"

export PYTHONPATH="${APPS_ROOT}"
echo "==> pytest simulator/tests satnogs_adapter/tests"
exec "${VENVDIR}/bin/pytest" "${APPS_ROOT}/simulator/tests" "${APPS_ROOT}/satnogs_adapter/tests" "$@"
