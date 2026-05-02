# KiriNet Internet Deployment Guide

This guide prepares KiriNet for work outside the local network (mobile internet + APK).

## 1) Deploy backend (FastAPI) to Railway/Render

For this monorepo set backend service root directory to:

- `/backend`

Backend start command:

```bash
uvicorn server:app --host 0.0.0.0 --port $PORT
```

Already added in codebase:

- `backend/Procfile`
- `backend/server.py` startup with `PORT` fallback (`8000`) for local runs
- CORS config via `CORS_ALLOW_ORIGINS` env (defaults to `*` for development)

Recommended backend env vars:

- `MONGO_URL=<your_mongodb_atlas_uri>`
- `DB_NAME=kirinet`
- `CORS_ALLOW_ORIGINS=*` (temporary dev mode)

After deploy, verify:

- `https://YOUR_BACKEND_URL/api/`
- `https://YOUR_BACKEND_URL/docs`

## 2) Configure frontend for public backend

Frontend now reads backend URL from:

- `Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL`
- `process.env.EXPO_PUBLIC_BACKEND_URL`

And prefers public HTTPS URL for APK/runtime.

Set before build:

```bash
cd frontend
EXPO_PUBLIC_BACKEND_URL=https://YOUR_BACKEND_URL eas build --platform android --profile preview
```

If using EAS dashboard, set `EXPO_PUBLIC_BACKEND_URL` in project env variables.

## 3) WebSocket over internet

WebSocket URL is built from backend URL automatically:

- `https://...` -> `wss://...`
- `http://...` -> `ws://...`

So for public backend with HTTPS, chat uses `wss://`.

## 4) Android cleartext fallback (only if HTTP backend)

Project config enables cleartext traffic for Android builds as fallback.

Important:

- Prefer HTTPS in production.
- Use HTTP/cleartext only for temporary testing.

## 5) Final mobile test (outside Wi-Fi)

On phone with mobile internet:

1. Install APK.
2. Register/login.
3. Open chats list.
4. Send message.
5. Confirm message receipt on another client in real time.

If you see `Network request failed`, verify first:

- backend URL is public HTTPS
- `EXPO_PUBLIC_BACKEND_URL` is embedded in the build
- backend is up and `/docs` opens
