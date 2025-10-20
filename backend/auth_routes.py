"""
Endpoints для авторизации и регистрации
"""
from fastapi import APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timedelta
from typing import Optional
import logging

from models import (
    User, UserRegister, UserLogin, UserUpdate, 
    Token, SMSVerification
)
from auth import (
    hash_password, verify_password,
    create_access_token, create_refresh_token,
    verify_token, get_current_user, generate_sms_code
)

logger = logging.getLogger(__name__)

auth_router = APIRouter(prefix="/auth", tags=["authentication"])

# Временное хранилище SMS кодов (в продакшене использовать Redis)
sms_codes_storage = {}


def get_db():
    """Dependency для получения БД - будет переопределен в main"""
    pass


@auth_router.post("/send-sms", summary="Отправка SMS кода")
async def send_sms_code(phone: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    """
    Генерация и отправка SMS кода для регистрации/входа
    В реальной версии здесь будет интеграция с SMS провайдером
    """
    # Генерируем 6-значный код
    code = generate_sms_code()
    
    # Сохраняем код с временем истечения (5 минут)
    sms_codes_storage[phone] = {
        "code": code,
        "expires_at": datetime.utcnow() + timedelta(minutes=5),
        "created_at": datetime.utcnow()
    }
    
    # В продакшене здесь будет отправка через Twilio/Firebase
    logger.info(f"📱 SMS код для {phone}: {code}")
    
    return {
        "success": True,
        "message": "SMS код отправлен",
        "phone": phone,
        "code_for_testing": code,  # В продакшене убрать!
        "expires_in_seconds": 300
    }


@auth_router.post("/register", response_model=Token, summary="Регистрация")
async def register(
    user_data: UserRegister,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Регистрация нового пользователя
    Поддерживает 3 способа: phone, email, nickname
    """
    
    # Проверка уникальности никнейма
    existing_nickname = await db.users.find_one({"nickname": user_data.nickname})
    if existing_nickname:
        raise HTTPException(400, "Никнейм уже занят")
    
    # Регистрация по телефону
    if user_data.auth_method == "phone":
        if not user_data.phone or not user_data.sms_code:
            raise HTTPException(400, "Укажите номер телефона и SMS код")
        
        # Проверка уникальности телефона
        existing_phone = await db.users.find_one({"phone": user_data.phone})
        if existing_phone:
            raise HTTPException(400, "Этот номер уже зарегистрирован")
        
        # Проверка SMS кода
        stored_code = sms_codes_storage.get(user_data.phone)
        if not stored_code:
            raise HTTPException(400, "SMS код не найден. Запросите новый")
        
        if stored_code["expires_at"] < datetime.utcnow():
            del sms_codes_storage[user_data.phone]
            raise HTTPException(400, "SMS код истек. Запросите новый")
        
        if stored_code["code"] != user_data.sms_code:
            raise HTTPException(400, "Неверный SMS код")
        
        # Удаляем использованный код
        del sms_codes_storage[user_data.phone]
        
        # Создаем пользователя
        user = User(
            nickname=user_data.nickname,
            phone=user_data.phone,
            language="ru"  # по умолчанию
        )
    
    # Регистрация по email
    elif user_data.auth_method == "email":
        if not user_data.email or not user_data.password:
            raise HTTPException(400, "Укажите email и пароль")
        
        # Проверка уникальности email
        existing_email = await db.users.find_one({"email": user_data.email})
        if existing_email:
            raise HTTPException(400, "Этот email уже зарегистрирован")
        
        # Хэшируем пароль
        password_hash = hash_password(user_data.password)
        
        # Создаем пользователя
        user = User(
            nickname=user_data.nickname,
            email=user_data.email,
            password_hash=password_hash,
            language="ru"
        )
    
    # Регистрация по никнейму
    elif user_data.auth_method == "nickname":
        if not user_data.password:
            raise HTTPException(400, "Укажите пароль")
        
        # Хэшируем пароль
        password_hash = hash_password(user_data.password)
        
        # Создаем пользователя
        user = User(
            nickname=user_data.nickname,
            password_hash=password_hash,
            language="ru"
        )
    
    else:
        raise HTTPException(400, "Неверный метод авторизации")
    
    # Сохраняем в базу
    await db.users.insert_one(user.dict())
    
    # Добавляем пользователя в глобальный чат
    await db.conversations.update_one(
        {"type": "global"},
        {"$addToSet": {"participants": user.id}},
        upsert=False
    )
    
    # Создаем токены
    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)
    
    logger.info(f"✅ Новый пользователь зарегистрирован: {user.nickname} ({user.id})")
    
    return Token(
        access_token=access_token,
        refresh_token=refresh_token
    )


@auth_router.post("/login", response_model=Token, summary="Вход")
async def login(
    login_data: UserLogin,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Вход в систему
    Поддерживает все 3 способа: phone, email, nickname
    """
    
    user = None
    
    # Вход по телефону
    if login_data.auth_method == "phone":
        if not login_data.sms_code:
            raise HTTPException(400, "Укажите SMS код")
        
        # Проверка SMS кода
        stored_code = sms_codes_storage.get(login_data.identifier)
        if not stored_code:
            raise HTTPException(400, "SMS код не найден. Запросите новый")
        
        if stored_code["expires_at"] < datetime.utcnow():
            del sms_codes_storage[login_data.identifier]
            raise HTTPException(400, "SMS код истек. Запросите новый")
        
        if stored_code["code"] != login_data.sms_code:
            raise HTTPException(400, "Неверный SMS код")
        
        # Удаляем использованный код
        del sms_codes_storage[login_data.identifier]
        
        # Ищем пользователя
        user_data = await db.users.find_one({"phone": login_data.identifier})
        if not user_data:
            raise HTTPException(404, "Пользователь не найден")
        
        user = User(**user_data)
    
    # Вход по email
    elif login_data.auth_method == "email":
        if not login_data.password:
            raise HTTPException(400, "Укажите пароль")
        
        # Ищем пользователя
        user_data = await db.users.find_one({"email": login_data.identifier})
        if not user_data:
            raise HTTPException(404, "Пользователь не найден")
        
        user = User(**user_data)
        
        # Проверяем пароль
        if not user.password_hash or not verify_password(login_data.password, user.password_hash):
            raise HTTPException(401, "Неверный пароль")
    
    # Вход по никнейму
    elif login_data.auth_method == "nickname":
        if not login_data.password:
            raise HTTPException(400, "Укажите пароль")
        
        # Ищем пользователя
        user_data = await db.users.find_one({"nickname": login_data.identifier})
        if not user_data:
            raise HTTPException(404, "Пользователь не найден")
        
        user = User(**user_data)
        
        # Проверяем пароль
        if not user.password_hash or not verify_password(login_data.password, user.password_hash):
            raise HTTPException(401, "Неверный пароль")
    
    else:
        raise HTTPException(400, "Неверный метод авторизации")
    
    # Обновляем статус онлайн
    await db.users.update_one(
        {"id": user.id},
        {"$set": {"is_online": True, "last_seen": datetime.utcnow()}}
    )
    
    # Создаем токены
    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)
    
    logger.info(f"✅ Пользователь вошел: {user.nickname} ({user.id})")
    
    return Token(
        access_token=access_token,
        refresh_token=refresh_token
    )


@auth_router.post("/refresh", response_model=Token, summary="Обновление токена")
async def refresh_access_token(refresh_token: str):
    """Обновление access токена через refresh токен"""
    user_id = verify_token(refresh_token, "refresh")
    
    if not user_id:
        raise HTTPException(401, "Недействительный refresh токен")
    
    # Создаем новые токены
    new_access_token = create_access_token(user_id)
    new_refresh_token = create_refresh_token(user_id)
    
    return Token(
        access_token=new_access_token,
        refresh_token=new_refresh_token
    )


@auth_router.get("/me", response_model=User, summary="Текущий пользователь")
async def get_current_user_profile(
    user_id: str = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Получение профиля текущего пользователя"""
    user_data = await db.users.find_one({"id": user_id})
    
    if not user_data:
        raise HTTPException(404, "Пользователь не найден")
    
    if '_id' in user_data:
        del user_data['_id']
    
    return User(**user_data)


@auth_router.put("/me", response_model=User, summary="Обновление профиля")
async def update_user_profile(
    update_data: UserUpdate,
    user_id: str = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Обновление профиля текущего пользователя"""
    
    # Собираем только те поля, которые были переданы
    update_dict = update_data.dict(exclude_unset=True)
    
    if not update_dict:
        raise HTTPException(400, "Нет данных для обновления")
    
    # Если меняем никнейм - проверяем уникальность
    if "nickname" in update_dict:
        existing = await db.users.find_one({
            "nickname": update_dict["nickname"],
            "id": {"$ne": user_id}
        })
        if existing:
            raise HTTPException(400, "Этот никнейм уже занят")
    
    # Обновляем профиль
    await db.users.update_one(
        {"id": user_id},
        {"$set": update_dict}
    )
    
    # Получаем обновленные данные
    user_data = await db.users.find_one({"id": user_id})
    if '_id' in user_data:
        del user_data['_id']
    
    return User(**user_data)


@auth_router.post("/logout", summary="Выход")
async def logout(
    user_id: str = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Выход из системы (обновление статуса)"""
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_online": False, "last_seen": datetime.utcnow()}}
    )
    
    return {"success": True, "message": "Вы вышли из системы"}
