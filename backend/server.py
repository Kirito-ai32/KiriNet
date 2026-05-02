import json
import logging
import os
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Set
from uuid import uuid4

from dotenv import load_dotenv
from fastapi import APIRouter, Body, FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.encoders import jsonable_encoder
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import ConfigurationError, DuplicateKeyError
from starlette.middleware.cors import CORSMiddleware

from models import Conversation, Message, MessageCreate, User

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# MongoDB connection (with dev fallback)
using_in_memory_db = False
try:
    mongo_url = os.environ["MONGO_URL"]
    db_name = os.environ.get("DB_NAME", "kirinet")

    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    messages_collection = db["messages"]
except (KeyError, ConfigurationError, ValueError) as exc:
    from dev_db import create_in_memory_database

    client, db = create_in_memory_database()
    messages_collection = db["messages"]
    using_in_memory_db = True
    logger.warning(
        "MongoDB is unavailable (%s). Using in-memory database for development.",
        exc,
    )

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Store active WebSocket connections by user id.
user_connections: Dict[str, Set[WebSocket]] = defaultdict(set)


def _parse_cors_origins(raw_origins: str | None) -> List[str]:
    if not raw_origins:
        return ["*"]

    origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
    return origins or ["*"]


def _strip_mongo_id(document: Dict[str, Any]) -> Dict[str, Any]:
    if "_id" in document:
        del document["_id"]
    return document


def _normalize_message_document(document: Dict[str, Any]) -> Dict[str, Any]:
    normalized = _strip_mongo_id(document)
    normalized.setdefault("status", "sent")
    return normalized


async def _mark_user_online(user_id: str, is_online: bool) -> None:
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_online": is_online, "last_seen": datetime.utcnow()}},
    )


async def _register_connection(user_id: str, websocket: WebSocket) -> None:
    user_connections[user_id].add(websocket)
    await _mark_user_online(user_id, True)
    logger.info("WebSocket connected for user %s", user_id)


async def _unregister_connection(user_id: str, websocket: WebSocket) -> None:
    sockets = user_connections.get(user_id)
    if sockets and websocket in sockets:
        sockets.remove(websocket)

    if sockets and len(sockets) > 0:
        return

    user_connections.pop(user_id, None)
    await _mark_user_online(user_id, False)
    logger.info("WebSocket disconnected for user %s", user_id)


async def _send_to_user(user_id: str, payload: Dict[str, Any]) -> None:
    sockets = list(user_connections.get(user_id, set()))
    for socket in sockets:
        try:
            await socket.send_json(payload)
        except Exception:
            await _unregister_connection(user_id, socket)


async def _broadcast_new_message(message_data: Dict[str, Any]) -> None:
    conversation_id = message_data.get("conversation_id")
    if not conversation_id:
        return

    conversation = await db.conversations.find_one({"id": conversation_id})
    if not conversation:
        return

    socket_payload = {
        "event": "new_message",
        "data": jsonable_encoder(message_data),
    }

    for participant_id in conversation.get("participants", []):
        await _send_to_user(participant_id, socket_payload)


async def _update_conversation_last_message(message_data: Dict[str, Any]) -> None:
    await db.conversations.update_one(
        {"id": message_data["conversation_id"]},
        {
            "$set": {
                "last_message": message_data["content"],
                "last_message_time": message_data["timestamp"],
            }
        },
    )


async def _ensure_message_indexes() -> None:
    if not hasattr(db.messages, "create_index"):
        return

    try:
        await db.messages.create_index("client_id", unique=True, sparse=True)
    except Exception as exc:
        logger.warning("Unable to create unique index on messages.client_id: %s", exc)


@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await websocket.accept()
    await _register_connection(user_id, websocket)

    try:
        while True:
            raw_message = await websocket.receive_text()

            try:
                payload = json.loads(raw_message)
            except json.JSONDecodeError:
                logger.warning("Invalid WebSocket payload from user %s", user_id)
                continue

            if not isinstance(payload, dict):
                continue

            event = payload.get("event") or payload.get("type")
            if event == "ping":
                await websocket.send_json({"event": "pong"})
    except WebSocketDisconnect:
        pass
    except Exception as exc:
        logger.exception("WebSocket error for user %s: %s", user_id, exc)
    finally:
        await _unregister_connection(user_id, websocket)


@api_router.get("/")
async def root():
    return {"message": "KiriNet API"}


@api_router.post("/users", response_model=User, deprecated=True)
async def create_user_legacy(nickname: str):
    existing = await db.users.find_one({"nickname": nickname})
    if existing:
        return User(**_strip_mongo_id(existing))

    user = User(nickname=nickname, language="ru")
    await db.users.insert_one(user.dict())

    global_conv = await db.conversations.find_one({"type": "global"})
    if not global_conv:
        global_conversation = Conversation(
            type="global",
            participants=[],
            name="KiriNet Global",
        )
        await db.conversations.insert_one(global_conversation.dict())

    await db.conversations.update_one(
        {"type": "global"},
        {"$addToSet": {"participants": user.id}},
    )

    return user


@api_router.get("/users", response_model=List[User])
async def get_users():
    users = await db.users.find().to_list(1000)
    return [User(**_strip_mongo_id(user)) for user in users]


@api_router.get("/users/{user_id}", response_model=User)
async def get_user(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**_strip_mongo_id(user))


@api_router.get("/conversations")
async def get_conversations(user_id: str):
    conversations = await db.conversations.find({"participants": user_id}).to_list(1000)

    result = []
    for conv in conversations:
        conv = _strip_mongo_id(conv)

        last_msg = None
        if conv.get("last_message"):
            last_msg_data = await db.messages.find_one(
                {"conversation_id": conv["id"]},
                sort=[("timestamp", -1)],
            )
            if last_msg_data:
                last_msg = _strip_mongo_id(last_msg_data)

        other_user = None
        if conv["type"] == "direct":
            others = [participant for participant in conv["participants"] if participant != user_id]
            if others:
                other_user_data = await db.users.find_one({"id": others[0]})
                if other_user_data:
                    other_user = User(**_strip_mongo_id(other_user_data))

        result.append(
            {
                **conv,
                "last_message_obj": last_msg,
                "other_user": other_user.dict() if other_user else None,
            }
        )

    return result


@api_router.post("/conversations")
async def create_conversation(conversation_data: Dict[str, Any]):
    if conversation_data["type"] == "direct":
        existing = await db.conversations.find_one(
            {
                "type": "direct",
                "participants": {"$all": conversation_data["participants"]},
            }
        )
        if existing:
            return _strip_mongo_id(existing)

    conversation = Conversation(**conversation_data)
    await db.conversations.insert_one(conversation.dict())
    return conversation.dict()


@api_router.get("/messages/{conversation_id}")
async def get_messages(conversation_id: str, limit: int = 100):
    messages = (
        await db.messages.find({"conversation_id": conversation_id})
        .sort("timestamp", 1)
        .to_list(limit)
    )
    return [_normalize_message_document(message) for message in messages]


@api_router.post("/messages", response_model=Message)
async def create_message(message_input: MessageCreate):
    client_id = message_input.client_id or str(uuid4())

    existing_message = await db.messages.find_one({"client_id": client_id})
    if existing_message:
        normalized_existing = _normalize_message_document(existing_message)
        await _update_conversation_last_message(normalized_existing)
        return Message(**normalized_existing)

    message_payload_input = message_input.dict()
    message_payload_input["client_id"] = client_id
    message = Message(**message_payload_input)
    message_payload = message.dict()
    try:
        await db.messages.insert_one(message_payload)
    except DuplicateKeyError:
        existing_after_duplicate = await db.messages.find_one(
            {"client_id": client_id}
        )
        if existing_after_duplicate:
            return Message(**_normalize_message_document(existing_after_duplicate))
        raise

    normalized_message = _normalize_message_document(message_payload)

    await _update_conversation_last_message(normalized_message)

    await _broadcast_new_message(normalized_message)

    return Message(**normalized_message)


@app.post("/api/messages/send")
async def send_message(data: Dict[str, Any] = Body(...)):
    username = data.get("username")
    text = data.get("text")

    if not username or not text:
        return {"error": "Missing username or text"}

    message = {
        "username": username,
        "text": text,
        "timestamp": datetime.utcnow().isoformat(),
    }

    await messages_collection.insert_one(message)
    return {"status": "ok"}


@app.get("/api/messages")
async def get_legacy_messages():
    messages = []
    cursor = messages_collection.find().sort("timestamp", -1).limit(50)

    async for message in cursor:
        message["_id"] = str(message["_id"])
        messages.append(message)

    return messages[::-1]


@app.on_event("startup")
async def ensure_global_conversation():
    await _ensure_message_indexes()

    global_conversation = await db.conversations.find_one({"type": "global"})
    if not global_conversation:
        conversation = Conversation(
            type="global",
            participants=[],
            name="KiriNet Global",
        )
        await db.conversations.insert_one(conversation.dict())


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()


app.include_router(api_router)

from auth_routes import auth_router  # noqa: E402

app.include_router(auth_router, prefix="/api")

cors_origins = _parse_cors_origins(os.environ.get("CORS_ALLOW_ORIGINS"))
allow_credentials = "*" not in cors_origins

app.add_middleware(
    CORSMiddleware,
    allow_credentials=allow_credentials,
    allow_origins=cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("server:app", host="0.0.0.0", port=port)
