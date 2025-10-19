from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from typing import List, Optional
from datetime import datetime
import socketio

from models import User, UserCreate, Message, MessageCreate, Conversation

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create Socket.IO server
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    logger=True,
    engineio_logger=True
)

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Store user socket mappings
user_sockets = {}

# Socket.IO event handlers
@sio.event
async def connect(sid, environ):
    logger.info(f"Client connected: {sid}")
    await sio.emit('connected', {'socket_id': sid}, room=sid)

@sio.event
async def disconnect(sid):
    logger.info(f"Client disconnected: {sid}")
    # Update user status to offline
    user = await db.users.find_one({"socket_id": sid})
    if user:
        await db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {"is_online": False, "socket_id": None, "last_seen": datetime.utcnow()}}
        )
        # Broadcast user offline status
        await sio.emit('user_status', {
            'user_id': user['id'],
            'is_online': False
        })
        if user['id'] in user_sockets:
            del user_sockets[user['id']]

@sio.event
async def user_online(sid, data):
    user_id = data.get('user_id')
    logger.info(f"User {user_id} is online with socket {sid}")
    
    # Update user status
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_online": True, "socket_id": sid, "last_seen": datetime.utcnow()}}
    )
    
    user_sockets[user_id] = sid
    
    # Broadcast user online status to all clients
    await sio.emit('user_status', {
        'user_id': user_id,
        'is_online': True
    })

@sio.event
async def send_message(sid, data):
    logger.info(f"Received message from {sid}: {data}")
    
    # Create message in database
    message = Message(**data)
    await db.messages.insert_one(message.dict())
    
    # Update conversation last message
    await db.conversations.update_one(
        {"id": data['conversation_id']},
        {
            "$set": {
                "last_message": data['content'],
                "last_message_time": message.timestamp
            }
        }
    )
    
    # Get conversation to determine recipients
    conversation = await db.conversations.find_one({"id": data['conversation_id']})
    
    if conversation:
        # Emit to all participants
        for participant_id in conversation['participants']:
            if participant_id in user_sockets:
                participant_sid = user_sockets[participant_id]
                await sio.emit('new_message', message.dict(), room=participant_sid)
        
        # Also emit to global room for global conversations
        if conversation['type'] == 'global':
            await sio.emit('new_message', message.dict())

@sio.event
async def typing(sid, data):
    conversation_id = data.get('conversation_id')
    user_id = data.get('user_id')
    nickname = data.get('nickname')
    
    # Get conversation participants
    conversation = await db.conversations.find_one({"id": conversation_id})
    
    if conversation:
        # Emit typing event to all participants except sender
        for participant_id in conversation['participants']:
            if participant_id != user_id and participant_id in user_sockets:
                participant_sid = user_sockets[participant_id]
                await sio.emit('user_typing', {
                    'conversation_id': conversation_id,
                    'user_id': user_id,
                    'nickname': nickname
                }, room=participant_sid)

# REST API endpoints
@api_router.get("/")
async def root():
    return {"message": "KiriNet API - キリネット"}

@api_router.post("/users", response_model=User)
async def create_user(user_input: UserCreate):
    # Check if nickname already exists
    existing = await db.users.find_one({"nickname": user_input.nickname})
    if existing:
        return User(**existing)
    
    user = User(**user_input.dict())
    await db.users.insert_one(user.dict())
    
    # Create or get global conversation
    global_conv = await db.conversations.find_one({"type": "global"})
    if not global_conv:
        global_conversation = Conversation(
            type="global",
            participants=[],
            name="キリネット Global"
        )
        await db.conversations.insert_one(global_conversation.dict())
        global_conv = global_conversation.dict()
    
    # Add user to global conversation
    await db.conversations.update_one(
        {"type": "global"},
        {"$addToSet": {"participants": user.id}}
    )
    
    return user

@api_router.get("/users", response_model=List[User])
async def get_users():
    users = await db.users.find().to_list(1000)
    return [User(**user) for user in users]

@api_router.get("/users/{user_id}", response_model=User)
async def get_user(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**user)

@api_router.get("/conversations")
async def get_conversations(user_id: str):
    conversations = await db.conversations.find(
        {"participants": user_id}
    ).to_list(1000)
    
    result = []
    for conv in conversations:
        # Remove MongoDB _id
        if '_id' in conv:
            del conv['_id']
            
        # Get last message
        last_msg = None
        if conv.get('last_message'):
            last_msg = await db.messages.find_one(
                {"conversation_id": conv['id']},
                sort=[("timestamp", -1)]
            )
            if last_msg and '_id' in last_msg:
                del last_msg['_id']
        
        # Get other participant info for direct conversations
        other_user = None
        if conv['type'] == 'direct':
            other_participant_id = [p for p in conv['participants'] if p != user_id][0]
            other_user_data = await db.users.find_one({"id": other_participant_id})
            if other_user_data:
                if '_id' in other_user_data:
                    del other_user_data['_id']
                other_user = User(**other_user_data)
        
        result.append({
            **conv,
            'last_message_obj': last_msg,
            'other_user': other_user.dict() if other_user else None
        })
    
    return result

@api_router.post("/conversations")
async def create_conversation(conversation_data: dict):
    # Check if direct conversation already exists
    if conversation_data['type'] == 'direct':
        existing = await db.conversations.find_one({
            "type": "direct",
            "participants": {"$all": conversation_data['participants']}
        })
        if existing:
            return existing
    
    conversation = Conversation(**conversation_data)
    await db.conversations.insert_one(conversation.dict())
    return conversation.dict()

@api_router.get("/messages/{conversation_id}")
async def get_messages(conversation_id: str, limit: int = 100):
    messages = await db.messages.find(
        {"conversation_id": conversation_id}
    ).sort("timestamp", 1).to_list(limit)
    return messages

@api_router.post("/messages", response_model=Message)
async def create_message(message_input: MessageCreate):
    message = Message(**message_input.dict())
    await db.messages.insert_one(message.dict())
    
    # Update conversation
    await db.conversations.update_one(
        {"id": message.conversation_id},
        {
            "$set": {
                "last_message": message.content,
                "last_message_time": message.timestamp
            }
        }
    )
    
    return message

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Socket.IO
socket_app = socketio.ASGIApp(sio, app)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
