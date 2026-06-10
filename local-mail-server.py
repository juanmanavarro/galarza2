#!/usr/bin/env python3

"""
Local SMTP mail server for development.

Replaces the PHP mail.php endpoint when running locally.
Listens on port 8001 and handles POST /mail.php by sending
email via SMTP using credentials from .env in the project root.

Usage:
  python3 local-mail-server.py
"""

from http.server import BaseHTTPRequestHandler, HTTPServer
from email.message import EmailMessage
from pathlib import Path
from urllib.parse import urlparse
import json
import os
import smtplib
import ssl


ENV_PATH = Path(__file__).resolve().parent / ".env"


def load_env(path: Path) -> None:
    if not path.is_file():
        return
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()
        if (value.startswith('"') and value.endswith('"')) or (
            value.startswith("'") and value.endswith("'")
        ):
            value = value[1:-1]
        os.environ[key] = value


load_env(ENV_PATH)

SMTP_HOST = os.environ.get("SMTP_HOST", "industriasgalarza.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "465"))
SMTP_USER = os.environ.get("SMTP_USER", "configurador@industriasgalarza.com")
SMTP_PASS = os.environ.get("SMTP_PASS", "")
MAIL_FROM = os.environ.get("MAIL_FROM", "configurador@industriasgalarza.com")
MAIL_TO = os.environ.get("MAIL_TO", "configurador@industriasgalarza.com")


def send_email(to: str, subject: str, body: str, reply_to: str | None = None) -> None:
    if not SMTP_PASS:
        raise RuntimeError("SMTP_PASS not set. Add SMTP_PASS to .env")

    msg = EmailMessage()
    msg["From"] = MAIL_FROM
    msg["To"] = to
    msg["Subject"] = subject
    if reply_to:
        msg["Reply-To"] = reply_to
    msg.set_content(body, charset="utf-8")

    ctx = ssl.create_default_context()
    with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=ctx, timeout=30) as server:
        server.login(SMTP_USER, SMTP_PASS)
        server.send_message(msg)


class MailHandler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        print(f"[mail-server] {args[0]} {args[1]} {args[2]}")

    def _json(self, status: int, payload: dict):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path != "/mail.php":
            self._json(404, {"ok": False, "error": "Not found"})
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
            raw = self.rfile.read(length)
            data = json.loads(raw) if raw else {}
        except Exception:
            self._json(400, {"ok": False, "error": "Invalid JSON body"})
            return

        name = str(data.get("name", "")).strip()
        location = str(data.get("location", "")).strip()
        email = str(data.get("email", "")).strip()

        if not name or not location or not email:
            self._json(422, {"ok": False, "error": "Campos obligatorios: name, location, email"})
            return

        result = data.get("result") or {}
        if not isinstance(result, dict):
            self._json(422, {"ok": False, "error": "No hay resultados calculados para enviar"})
            return
        has_power = bool(result.get("totalPowerWatts", 0) or result.get("totalPowerAmps", 0))
        if not result or not has_power:
            self._json(422, {"ok": False, "error": "No hay resultados calculados para enviar"})
            return

        lines = [
            f"Nombre: {name}",
            f"Provincia / País: {location}",
            f"Email: {email}",
        ]
        for key, value in data.items():
            if key in ("name", "location", "email"):
                continue
            lines.append(f"{key}: {json.dumps(value, ensure_ascii=False) if isinstance(value, (dict, list)) else value}")
        internal_body = "\n".join(lines)

        try:
            send_email(MAIL_TO, "Nuevo envío de formulario", internal_body, reply_to=email)
        except Exception as e:
            self._json(500, {"ok": False, "error": f"Error al enviar email: {e}"})
            return

        user_body = "\n".join([
            f"Hola {name},",
            "",
            "Hemos recibido tu configuración. Pronto nos pondremos en contacto contigo.",
            "Gracias.",
            "",
            "Resumen:",
            f"Nombre: {name}",
            f"Provincia / País: {location}",
            f"Email: {email}",
            "",
            "Configuración:",
            json.dumps(data.get("config", {}), ensure_ascii=False, indent=2),
        ])

        try:
            send_email(email, "Hemos recibido tu configuración", user_body)
        except Exception as e:
            self._json(500, {"ok": False, "error": f"Error al enviar confirmación: {e}"})
            return

        self._json(200, {"ok": True})


if __name__ == "__main__":
    HOST = "localhost"
    PORT = 8001
    print(f"🐍 Mail server listening on http://{HOST}:{PORT}/mail.php")
    HTTPServer((HOST, PORT), MailHandler).serve_forever()
