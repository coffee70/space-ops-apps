#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APPS_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
VENVDIR="${APPS_ROOT}/.venv"
PYTHON="${PYTHON:-python3}"

if [[ ! -d "${VENVDIR}" ]]; then
  "${PYTHON}" -m venv "${VENVDIR}"
fi

echo "==> pip install (simulator + pytest)"
"${VENVDIR}/bin/pip" install -q pytest \
  -r "${APPS_ROOT}/simulator/requirements.txt"

export PYTHONPATH="${APPS_ROOT}"
echo "==> pytest simulator/tests"
exec "${VENVDIR}/bin/pytest" "${APPS_ROOT}/simulator/tests" "$@"
