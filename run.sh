#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

echo "▶ Verificando ambiente..."
if ! command -v python3 >/dev/null 2>&1; then
  echo "✗ python3 ausente. No Mint: sudo apt install python3 python3-venv"
  exit 1
fi
if ! python3 -c "import venv" 2>/dev/null; then
  echo "✗ módulo venv ausente. No Mint: sudo apt install python3-venv"
  exit 1
fi

if [[ ! -d .venv ]]; then
  echo "▶ Criando ambiente virtual..."
  python3 -m venv .venv
fi
source .venv/bin/activate
python3 -m pip install -q --upgrade pip
python3 -m pip install -q -r requirements.txt

echo "▶ http://localhost:5000  (Ctrl+C para encerrar)"
exec python3 app.py
