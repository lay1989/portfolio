"""Idempotent local setup. Never replace content or create default credentials."""

import os
import subprocess
import sys
import venv
from pathlib import Path

root = Path(__file__).resolve().parents[1]
os.chdir(root)
if sys.version_info < (3, 12):
    raise SystemExit("Use Python 3.12 or newer.")
python = root / ".venv" / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
if not python.exists():
    venv.create(root / ".venv", with_pip=True)
for command in [
    [str(python), "-m", "pip", "install", "-r", "requirements-dev.txt"],
    ["npm", "run", "build"],
    [str(python), "-m", "flask", "--app", "app", "db", "upgrade"],
    [str(python), "-m", "flask", "--app", "app", "import-content"],
    [str(python), "-m", "flask", "--app", "app", "import-media"],
]:
    subprocess.run(command, check=True)
print(
    "Ready. Run npm run dev, then open http://127.0.0.1:5001/admin/setup to create your private owner account."
)
