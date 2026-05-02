from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime
import uuid


class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nickname: str
    email: Optional[str] = None
    phone: Optional[str] = None
    password_hash: Optional[str] = None
    avatar: Optional[str] = None  # base64 или URL
    status: Optional[str] = "Hey! I'm using KiriNet"
    about: Optional[str] = None
    language: str = "en"
    theme: str = "dark"
    socket_id: Optional[str] = None
    is_online: bool = False
    is_premium: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_seen: datetime = Field(default_factory=datetime.utcnow)
    settings: dict = Field(default_factory=dict)


class UserRegister(BaseModel):
    auth_method: str  # "phone", "email", "nickname"
    nickname: str
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    sms_code: Optional[str] = None  # для верификации телефона


class UserLogin(BaseModel):
    auth_method: str  # "phone", "email", "nickname"
    identifier: str  # номер телефона, email или никнейм
    password: Optional[str] = None
    sms_code: Optional[str] = None


class UserUpdate(BaseModel):
    nickname: Optional[str] = None
    avatar: Optional[str] = None
    status: Optional[str] = None
    about: Optional[str] = None
    language: Optional[str] = None
    theme: Optional[str] = None
    settings: Optional[dict] = None


class SMSVerification(BaseModel):
    phone: str
    code: str = Field(default_factory=lambda: str(uuid.uuid4().int)[:6])
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime = Field(default_factory=lambda: datetime.utcnow())


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: str


class Message(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_id: str
    conversation_id: str
    sender_id: str
    sender_nickname: str
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    is_read: bool = False
    status: str = "sent"


class MessageCreate(BaseModel):
    client_id: Optional[str] = None
    conversation_id: str
    sender_id: str
    sender_nickname: str
    content: str


class Conversation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str  # "global" or "direct"
    participants: List[str]  # user IDs
    name: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_message: Optional[str] = None
    last_message_time: Optional[datetime] = None
