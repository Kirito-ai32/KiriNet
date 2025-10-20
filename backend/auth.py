"""
Модуль аутентификации и авторизации
"""
import os
import bcrypt
import jwt
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError
from datetime import datetime, timedelta
from typing import Optional
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from models import User, TokenData

# Секретные ключи (в продакшене хранить в .env)
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "kirinet-secret-key-change-in-production")
REFRESH_SECRET_KEY = os.getenv("JWT_REFRESH_SECRET_KEY", "kirinet-refresh-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60  # 1 час
REFRESH_TOKEN_EXPIRE_DAYS = 30  # 30 дней

security = HTTPBearer()


def hash_password(password: str) -> str:
    """Хэширование пароля с использованием bcrypt"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Проверка пароля"""
    return bcrypt.checkpw(
        plain_password.encode('utf-8'),
        hashed_password.encode('utf-8')
    )


def create_access_token(user_id: str) -> str:
    """Создание access токена"""
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {
        "sub": user_id,
        "exp": expire,
        "type": "access"
    }
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def create_refresh_token(user_id: str) -> str:
    """Создание refresh токена"""
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode = {
        "sub": user_id,
        "exp": expire,
        "type": "refresh"
    }
    encoded_jwt = jwt.encode(to_encode, REFRESH_SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str, token_type: str = "access") -> Optional[str]:
    """Проверка токена и извлечение user_id"""
    try:
        secret = SECRET_KEY if token_type == "access" else REFRESH_SECRET_KEY
        payload = jwt.decode(token, secret, algorithms=[ALGORITHM])
        
        if payload.get("type") != token_type:
            return None
            
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
            
        return user_id
    except ExpiredSignatureError:
        return None
    except InvalidTokenError:
        return None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> str:
    """Dependency для получения текущего пользователя из токена"""
    token = credentials.credentials
    user_id = verify_token(token, "access")
    
    if user_id is None:
        raise HTTPException(
            status_code=401,
            detail="Недействительный токен или сессия истекла"
        )
    
    return user_id


def generate_sms_code() -> str:
    """Генерация 6-значного SMS кода"""
    import random
    return str(random.randint(100000, 999999))
