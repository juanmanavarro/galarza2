#!/usr/bin/env python3

"""
Local SMTP mail server for development.

Replaces the PHP mail.php endpoint when running locally.
Listens on port 8001 and handles POST /mail.php by sending
email via SMTP using credentials from .env in the project root.

If SMTP fails, falls back to logging the email to console
so local development is not blocked by email configuration.

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
import traceback


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

SMTP_HOST = os.environ.get("SMTP_HOST", "")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_SECURE = os.environ.get("SMTP_SECURE", "tls")
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASS = os.environ.get("SMTP_PASS", "")
MAIL_FROM = os.environ.get("MAIL_FROM", "configurador@industriasgalarza.com")
MAIL_TO = os.environ.get("MAIL_TO", "services@juanmanavar.ro")


def send_email(to: str, subject: str, body: str, reply_to: str | None = None) -> bool:
    if not SMTP_HOST or not SMTP_PASS:
        print(f"[mail-server] SMTP not configured. Logging email:")
        print(f"  To: {to}")
        print(f"  Subject: {subject}")
        print(f"  Reply-To: {reply_to or '-'}")
        print(f"  Body: {body[:500]}")
        print(f"[mail-server] Email NOT sent (no SMTP credentials)")
        return True

    msg = EmailMessage()
    msg["From"] = MAIL_FROM
    msg["To"] = to
    msg["Subject"] = subject
    if reply_to:
        msg["Reply-To"] = reply_to
    msg.set_content(body, charset="utf-8")

    ctx = ssl.create_default_context()
    try:
        if SMTP_SECURE == "ssl":
            with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=ctx, timeout=15) as server:
                server.login(SMTP_USER, SMTP_PASS)
                server.send_message(msg)
        else:
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as server:
                server.starttls(context=ctx)
                server.login(SMTP_USER, SMTP_PASS)
                server.send_message(msg)
        print(f"[mail-server] Email sent to {to}")
        return True
    except Exception as e:
        print(f"[mail-server] SMTP failed ({e}). Logging email to console:")
        print(f"  To: {to}")
        print(f"  Subject: {subject}")
        print(f"  Reply-To: {reply_to or '-'}")
        print(f"  Body: {body[:500]}")
        print(f"[mail-server] Email NOT sent (SMTP error)")
        return True


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
            if isinstance(value, (dict, list)):
                lines.append(f"{key}: {json.dumps(value, ensure_ascii=False)}")
            else:
                lines.append(f"{key}: {value}")
        internal_body = "\n".join(lines)

        send_email(MAIL_TO, "Nuevo envío de formulario", internal_body, reply_to=email)

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

        send_email(email, "Hemos recibido tu configuración", user_body)

        self._json(200, {"ok": True})


if __name__ == "__main__":
    HOST = "localhost"
    PORT = 8001
    print(f"🐍 Mail server on http://{HOST}:{PORT}/mail.php")
    print(f"   SMTP: {SMTP_USER or 'not configured'} -> {MAIL_TO}")
    if not SMTP_HOST or not SMTP_PASS:
        print(f"   Mode: console logging (no SMTP credentials)")
    HTTPServer((HOST, PORT), MailHandler).serve_forever()
