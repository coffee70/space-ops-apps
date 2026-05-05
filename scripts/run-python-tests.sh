#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APPS_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
VENVDIR="${APPS_ROOT}/.venv"
PYTHON="${PYTHON:-python3}"

echo "No Layer 3 Python test suite is currently defined."
echo "Simulator Python tests moved to ../space-ops-platform/scripts/run-backend-tests.sh backend/tests/simulator."
