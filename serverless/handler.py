# -*- coding: utf-8 -*-
"""
Единый ФПЦ — приём заявок с сайта.

Функция Яндекс.Облака: принимает POST из формы лендинга и отправляет письмо
на ediniyfpc@efpts.ru через SMTP Яндекс 360. Только стандартная библиотека Python.

Точка входа: handler.handler
Переменные окружения:
  SMTP_USER       — логин SMTP: полный адрес ящика-отправителя на efpts.ru
  SMTP_PASSWORD   — пароль приложения Яндекс 360 (НЕ обычный пароль от почты)
  MAIL_TO         — кому слать заявки (по умолчанию = SMTP_USER)
  SMTP_HOST       — по умолчанию smtp.yandex.ru
  SMTP_PORT       — по умолчанию 465 (SSL)
  ALLOWED_ORIGIN  — CORS-домен, по умолчанию * (можно указать https://ефпц.рф)
"""
import base64
import json
import os
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr
from urllib.parse import parse_qs

# Поля формы: name у input -> подпись в письме (порядок сохраняется)
FIELDS = [
    ("Задача", "Задача"),
    ("Отрасль", "Отрасль"),
    ("Выручка", "Выручка в год"),
    ("Телефон", "Телефон"),
    ("Email", "Email"),
    ("Telegram", "Telegram"),
]


def _cors():
    return {
        "Access-Control-Allow-Origin": os.environ.get("ALLOWED_ORIGIN", "*"),
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    }


def _resp(code, obj):
    headers = {"Content-Type": "application/json"}
    headers.update(_cors())
    return {"statusCode": code, "headers": headers, "body": json.dumps(obj, ensure_ascii=False)}


def _header(event, name):
    for k, v in (event.get("headers") or {}).items():
        if k.lower() == name.lower():
            return v or ""
    return ""


def _parse_body(event):
    body = event.get("body") or ""
    if event.get("isBase64Encoded"):
        body = base64.b64decode(body).decode("utf-8", "replace")
    ctype = _header(event, "Content-Type").lower()
    if "application/json" in ctype:
        try:
            data = json.loads(body or "{}")
            return data if isinstance(data, dict) else {}
        except ValueError:
            return {}
    return {k: v[0] for k, v in parse_qs(body).items()}


def handler(event, context):
    event = event or {}
    method = (event.get("httpMethod") or "").upper()

    # CORS preflight
    if method == "OPTIONS":
        return {"statusCode": 204, "headers": _cors(), "body": ""}
    if method != "POST":
        return _resp(405, {"success": False, "message": "Method not allowed"})

    data = _parse_body(event)

    # Ловушка для ботов: скрытое поле botcheck должно быть пустым
    if str(data.get("botcheck") or "").strip():
        return _resp(200, {"success": True})

    phone = str(data.get("Телефон") or "").strip()
    consent = str(data.get("Согласие") or "").strip()
    if sum(ch.isdigit() for ch in phone) < 5:
        return _resp(400, {"success": False, "message": "Укажите корректный телефон"})
    if not consent:
        return _resp(400, {"success": False, "message": "Нужно согласие на обработку данных"})

    smtp_user = os.environ.get("SMTP_USER")
    smtp_password = os.environ.get("SMTP_PASSWORD")
    if not smtp_user or not smtp_password:
        return _resp(500, {"success": False, "message": "Сервер не настроен"})
    mail_to = os.environ.get("MAIL_TO", smtp_user)
    smtp_host = os.environ.get("SMTP_HOST", "smtp.yandex.ru")
    smtp_port = int(os.environ.get("SMTP_PORT", "465"))

    lines = []
    for key, label in FIELDS:
        val = str(data.get(key) or "").strip()
        if val:
            lines.append(u"{}: {}".format(label, val))
    text = u"Новая заявка с сайта «Единый ФПЦ»\n\n" + u"\n".join(lines)

    msg = EmailMessage()
    msg["Subject"] = "Новая заявка с сайта Единый ФПЦ"
    msg["From"] = formataddr(("Сайт Единый ФПЦ", smtp_user))
    msg["To"] = mail_to
    lead_email = str(data.get("Email") or "").strip()
    if lead_email:
        msg["Reply-To"] = lead_email
    msg.set_content(text)

    try:
        ctx = ssl.create_default_context()
        with smtplib.SMTP_SSL(smtp_host, smtp_port, context=ctx, timeout=15) as server:
            server.login(smtp_user, smtp_password)
            server.send_message(msg)
    except Exception:
        return _resp(502, {"success": False, "message": "Не удалось отправить письмо"})

    return _resp(200, {"success": True})
