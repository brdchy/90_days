"""
FastAPI backend для веб-платформы игры "90 дней - 10 целей"
"""
import sys
import os

# Добавляем корневую директорию в путь для импортов
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import secrets
import logging
from datetime import datetime, timedelta
import asyncio
import json
import hashlib
import hmac
import os

from services.game_data import GameDataManager
from config_reader import config

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Создаем FastAPI приложение
app = FastAPI(
    title="90 Days Game API",
    description="API для веб-платформы игры '90 дней - 10 целей'",
    version="1.0.0"
)

# CORS middleware для работы с фронтендом
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # В продакшене заменить на конкретный домен
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# HTTP Basic Auth для админки
security = HTTPBasic()

# Менеджер данных игры
game_data = GameDataManager()

# Хранилище токенов для аутентификации (в продакшене использовать Redis или БД)
# Формат: {token: {"user_id": int, "expires_at": datetime}}
auth_tokens: Dict[str, Dict[str, Any]] = {}

# Валидация админских данных
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin"  # В продакшене использовать переменную окружения

def verify_admin(credentials: HTTPBasicCredentials = Depends(security)):
    """Проверяет админские учетные данные"""
    is_correct_username = secrets.compare_digest(credentials.username, ADMIN_USERNAME)
    is_correct_password = secrets.compare_digest(credentials.password, ADMIN_PASSWORD)
    
    if not (is_correct_username and is_correct_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверные учетные данные",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username


# Pydantic модели
class ParticipantResponse(BaseModel):
    user_id: int
    username: str
    full_name: str
    game_name: str
    registered_date: str
    status: str
    goals: List[str]

class ParticipantUpdate(BaseModel):
    game_name: Optional[str] = None
    status: Optional[str] = None
    goals: Optional[List[str]] = None

class ParticipantCreate(BaseModel):
    user_id: int
    username: str
    full_name: str
    game_name: str
    goals: List[str] = [""] * 10

class ReportResponse(BaseModel):
    user_id: int
    day: int
    date: str
    progress: List[str]
    rest_day: bool

class ReportUpdate(BaseModel):
    progress: Optional[List[str]] = None
    rest_day: Optional[bool] = None

class ReportCreate(BaseModel):
    user_id: int
    day: int
    date: str
    progress: List[str]
    rest_day: bool = False

class GoalStats(BaseModel):
    goal_num: int
    goal_text: str
    progress_days: int
    progress_percent: float
    last_progress_day: int

class UserStats(BaseModel):
    user_id: int
    game_name: str
    current_day: int
    reports_count: int
    goals_stats: List[GoalStats]
    has_today_report: bool

class SettingsResponse(BaseModel):
    chat_id: Optional[int] = None
    thread_id: Optional[int] = None
    reminder_time: Optional[str] = None
    removal_time: Optional[str] = None
    current_day: Optional[int] = None
    time_offset_hours: Optional[int] = None

class SettingsUpdate(BaseModel):
    reminder_time: Optional[str] = None
    removal_time: Optional[str] = None
    current_day: Optional[int] = None
    time_offset_hours: Optional[int] = None

class GameDayUpdate(BaseModel):
    day: int

class CommunityStatsResponse(BaseModel):
    current_day: int
    active_participants: int
    total_participants: int
    participants_ranking: List[Dict[str, Any]]


# API Endpoints

@app.get("/")
async def root():
    """Корневой endpoint"""
    return {"message": "90 Days Game API", "version": "1.0.0"}


@app.get("/api/participants", response_model=List[ParticipantResponse])
async def get_participants():
    """Получить список всех участников"""
    try:
        data = await game_data.get_all_data()
        participants = []
        for p in data.get("participants", []):
            participants.append(ParticipantResponse(**p))
        return participants
    except Exception as e:
        logger.error(f"Ошибка при получении участников: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/participants/{user_id}", response_model=ParticipantResponse)
async def get_participant(user_id: int):
    """Получить информацию о конкретном участнике"""
    try:
        data = await game_data.get_all_data()
        for p in data.get("participants", []):
            if p["user_id"] == user_id:
                return ParticipantResponse(**p)
        raise HTTPException(status_code=404, detail="Участник не найден")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка при получении участника: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/reports", response_model=List[ReportResponse])
async def get_reports(user_id: Optional[int] = None):
    """Получить отчеты (все или конкретного пользователя)"""
    try:
        data = await game_data.get_all_data()
        reports = []
        for r in data.get("reports", []):
            if user_id is None or r["user_id"] == user_id:
                reports.append(ReportResponse(**r))
        return reports
    except Exception as e:
        logger.error(f"Ошибка при получении отчетов: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/stats/{user_id}", response_model=UserStats)
async def get_user_stats(user_id: int):
    """Получить статистику пользователя"""
    try:
        data = await game_data.get_all_data()
        current_day = await game_data.get_current_day_async()
        
        participant = None
        for p in data.get("participants", []):
            if p["user_id"] == user_id:
                participant = p
                break
        
        if not participant:
            raise HTTPException(status_code=404, detail="Участник не найден")
        
        user_reports = [r for r in data.get("reports", []) if r["user_id"] == user_id]
        reports_count = len(user_reports)
        has_today_report = any(r["day"] == current_day for r in user_reports)
        
        goals_stats = []
        goals = participant.get("goals", [""] * 10)
        
        for i, goal in enumerate(goals):
            if not goal.strip():
                continue
            
            progress_days = 0
            last_progress_day = 0
            
            for report in user_reports:
                progress = report["progress"][i] if i < len(report["progress"]) else ""
                if progress and progress.strip() and progress not in ["Отдых", "❌ Не выполнено"]:
                    progress_days += 1
                    last_progress_day = max(last_progress_day, report["day"])
            
            progress_percent = (progress_days / max(current_day, 1)) * 100
            
            goals_stats.append(GoalStats(
                goal_num=i + 1,
                goal_text=goal,
                progress_days=progress_days,
                progress_percent=progress_percent,
                last_progress_day=last_progress_day
            ))
        
        return UserStats(
            user_id=user_id,
            game_name=participant.get("game_name", ""),
            current_day=current_day,
            reports_count=reports_count,
            goals_stats=goals_stats,
            has_today_report=has_today_report
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка при получении статистики: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/current-day")
async def get_current_day():
    """Получить текущий день игры"""
    try:
        current_day = await game_data.get_current_day_async()
        return {"current_day": current_day}
    except Exception as e:
        logger.error(f"Ошибка при получении текущего дня: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/community/stats", response_model=CommunityStatsResponse)
async def get_community_stats():
    """Получить статистику комьюнити (рейтинг участников, прогресс и т.д.)"""
    try:
        data = await game_data.get_all_data()
        current_day = await game_data.get_current_day_async()
        
        active_participants = [p for p in data.get("participants", []) if p.get("status") == "active"]
        total_participants = len(data.get("participants", []))
        
        # Создаем рейтинг участников
        participants_ranking = []
        
        for participant in active_participants:
            user_id = participant["user_id"]
            user_reports = [r for r in data.get("reports", []) if r["user_id"] == user_id]
            
            # Подсчитываем статистику
            reports_count = len(user_reports)
            has_today_report = any(r["day"] == current_day for r in user_reports)
            
            # Считаем средний прогресс по целям
            goals = participant.get("goals", [""] * 10)
            total_progress_days = 0
            active_goals = 0
            
            for i, goal in enumerate(goals):
                if not goal.strip():
                    continue
                active_goals += 1
                
                for report in user_reports:
                    progress = report["progress"][i] if i < len(report["progress"]) else ""
                    if progress and progress.strip() and progress not in ["Отдых", "❌ Не выполнено"]:
                        total_progress_days += 1
            
            avg_progress = (total_progress_days / max(active_goals * current_day, 1)) * 100 if active_goals > 0 else 0
            
            # Подсчитываем дни активности (количество отчетов)
            activity_score = reports_count
            
            participants_ranking.append({
                "user_id": user_id,
                "game_name": participant.get("game_name", participant.get("full_name", f"ID {user_id}")),
                "username": participant.get("username", ""),
                "reports_count": reports_count,
                "has_today_report": has_today_report,
                "avg_progress": round(avg_progress, 1),
                "activity_score": activity_score,
                "active_goals": active_goals,
            })
        
        # Сортируем по активности (количество отчетов) и среднему прогрессу
        participants_ranking.sort(key=lambda x: (x["activity_score"], x["avg_progress"]), reverse=True)
        
        # Добавляем позицию в рейтинге
        for idx, p in enumerate(participants_ranking):
            p["rank"] = idx + 1
        
        return CommunityStatsResponse(
            current_day=current_day,
            active_participants=len(active_participants),
            total_participants=total_participants,
            participants_ranking=participants_ranking
        )
    except Exception as e:
        logger.error(f"Ошибка при получении статистики комьюнити: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Админские endpoints
@app.get("/api/admin/settings", response_model=SettingsResponse)
async def get_settings(admin: str = Depends(verify_admin)):
    """Получить настройки бота (только для админа)"""
    try:
        settings = await game_data.get_settings()
        chat_config = await game_data.get_chat_config()
        current_day = await game_data.get_current_day_async()
        
        return SettingsResponse(
            chat_id=chat_config.get("chat_id"),
            thread_id=chat_config.get("thread_id"),
            reminder_time=settings.get("reminder_time"),
            removal_time=settings.get("removal_time"),
            current_day=current_day,
            time_offset_hours=settings.get("time_offset_hours", 0)
        )
    except Exception as e:
        logger.error(f"Ошибка при получении настроек: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/admin/settings")
async def update_settings(settings_update: SettingsUpdate, admin: str = Depends(verify_admin)):
    """Обновить настройки бота (только для админа)"""
    try:
        settings = await game_data.get_settings()
        
        if settings_update.reminder_time is not None:
            settings["reminder_time"] = settings_update.reminder_time
        if settings_update.removal_time is not None:
            settings["removal_time"] = settings_update.removal_time
        if settings_update.current_day is not None:
            # Сохраняем текущий день в настройках
            settings["current_day"] = settings_update.current_day
        if settings_update.time_offset_hours is not None:
            # Сохраняем смещение времени в часах
            settings["time_offset_hours"] = settings_update.time_offset_hours
        
        await game_data.save_settings(settings)
        return {"message": "Настройки обновлены", "settings": settings}
    except Exception as e:
        logger.error(f"Ошибка при обновлении настроек: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/admin/bot-status")
async def get_bot_status(admin: str = Depends(verify_admin)):
    """Текущее время бота, расписание и список участников без отчета (предварительный просмотр)."""
    try:
        settings = await game_data.get_settings()
        chat_config = await game_data.get_chat_config()
        data = await game_data.get_all_data()
        current_day = await game_data.get_current_day_async()

        # Локально вычисляем время бота (без импорта из services.reminders)
        now = datetime.now()
        try:
            offset = int(settings.get("time_offset_hours", 0) or 0)
        except Exception:
            offset = 0
        from datetime import timedelta
        bot_time = now + timedelta(hours=offset)
        reminder_time = settings.get("reminder_time", "18:00")
        removal_time = settings.get("removal_time", "23:30")

        # Кто без отчета на текущий момент
        users_without_report = []
        for participant in data.get("participants", []):
            if participant.get("status") != "active":
                continue
            uid = participant.get("user_id")
            if not any(r.get("user_id") == uid and r.get("day") == current_day for r in data.get("reports", [])):
                users_without_report.append({
                    "user_id": uid,
                    "game_name": participant.get("game_name", participant.get("full_name", f"ID {uid}")),
                    "username": participant.get("username", "")
                })

        return {
            "bot_time": bot_time.strftime("%Y-%m-%d %H:%M:%S"),
            "time_offset_hours": settings.get("time_offset_hours", 0),
            "reminder_time": reminder_time,
            "removal_time": removal_time,
            "current_day": current_day,
            "chat_id": chat_config.get("chat_id"),
            "thread_id": chat_config.get("thread_id"),
            "users_without_report_count": len(users_without_report),
            "users_without_report": users_without_report[:50],
        }
    except Exception as e:
        logger.error(f"Ошибка при получении статуса бота: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/admin/stats")
async def get_admin_stats(admin: str = Depends(verify_admin)):
    """Получить общую статистику игры (только для админа)"""
    try:
        data = await game_data.get_all_data()
        current_day = await game_data.get_current_day_async()
        
        active_users = sum(1 for p in data.get("participants", []) if p.get("status") == "active")
        total_users = len(data.get("participants", []))
        reports_today = sum(1 for r in data.get("reports", []) if r.get("day") == current_day)
        
        return {
            "current_day": current_day,
            "active_users": active_users,
            "total_users": total_users,
            "reports_today": reports_today,
            "reports_percentage": (reports_today / active_users * 100) if active_users > 0 else 0
        }
    except Exception as e:
        logger.error(f"Ошибка при получении статистики: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/admin/remind")
async def trigger_remind(admin: str = Depends(verify_admin)):
    """Отправить напоминания всем участникам (только для админа)"""
    try:
        # Импортируем необходимые модули
        from aiogram import Bot
        from services.reminders import check_and_remind_users, get_bot_thread_id
        from handlers.group import get_game_chat_id
        
        # Создаем экземпляр бота для отправки напоминаний
        bot = Bot(token=config.bot_token.get_secret_value())
        
        try:
            chat_id = await get_game_chat_id()
            thread_id = await get_bot_thread_id()
            
            # Отправляем напоминания
            await check_and_remind_users(bot, chat_id, thread_id)
            
            return {"message": "Напоминания отправлены всем участникам"}
        finally:
            # Закрываем сессию бота
            await bot.session.close()
    except Exception as e:
        logger.error(f"Ошибка при отправке напоминаний: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/admin/test-chat")
async def test_chat(admin: str = Depends(verify_admin)):
    """Проверить работу чата (только для админа)"""
    try:
        chat_config = await game_data.get_chat_config()
        chat_id = chat_config.get("chat_id")
        thread_id = chat_config.get("thread_id")
        
        if not chat_id or not thread_id:
            raise HTTPException(
                status_code=400,
                detail="Чат не настроен. Добавьте бота в чат для проверки."
            )
        
        return {
            "message": "Чат настроен корректно",
            "chat_id": chat_id,
            "thread_id": thread_id
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка при проверке чата: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class TokenGenerateRequest(BaseModel):
    user_id: int

# Аутентификация через Telegram
@app.post("/api/auth/generate-token")
async def generate_auth_token(request: TokenGenerateRequest):
    """Генерирует токен аутентификации для пользователя"""
    try:
        user_id = request.user_id
        
        # Проверяем, что пользователь существует
        data = await game_data.get_all_data()
        user_exists = any(p["user_id"] == user_id for p in data.get("participants", []))
        
        if not user_exists:
            raise HTTPException(status_code=404, detail="Пользователь не найден")
        
        # Генерируем токен
        token = secrets.token_urlsafe(32)
        expires_at = datetime.now() + timedelta(hours=24)  # Токен действителен 24 часа
        
        # Сохраняем токен
        auth_tokens[token] = {
            "user_id": user_id,
            "expires_at": expires_at
        }
        
        # Очищаем старые токены
        now = datetime.now()
        expired_tokens = [t for t, data in auth_tokens.items() if data["expires_at"] < now]
        for t in expired_tokens:
            del auth_tokens[t]
        
        # Получаем URL сайта из переменной окружения или используем дефолтный
        web_url = os.getenv("WEB_URL", "http://192.168.3.2:3000")
        
        return {
            "token": token,
            "url": f"{web_url}/auth?token={token}",
            "expires_at": expires_at.isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка при генерации токена: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/auth/verify-token")
async def verify_auth_token(token: str):
    """Проверяет токен аутентификации и возвращает данные пользователя"""
    try:
        if token not in auth_tokens:
            raise HTTPException(status_code=401, detail="Токен не найден или истек")
        
        token_data = auth_tokens[token]
        
        # Проверяем срок действия
        if token_data["expires_at"] < datetime.now():
            del auth_tokens[token]
            raise HTTPException(status_code=401, detail="Токен истек")
        
        # Получаем данные пользователя
        data = await game_data.get_all_data()
        user_id = token_data["user_id"]
        
        participant = None
        for p in data.get("participants", []):
            if p["user_id"] == user_id:
                participant = p
                break
        
        if not participant:
            raise HTTPException(status_code=404, detail="Пользователь не найден")
        
        return {
            "user_id": user_id,
            "username": participant.get("username", ""),
            "game_name": participant.get("game_name", participant.get("full_name", "")),
            "valid": True
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка при проверке токена: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Управление участниками
@app.post("/api/admin/participants", response_model=ParticipantResponse)
async def create_participant(participant: ParticipantCreate, admin: str = Depends(verify_admin)):
    """Создать нового участника (только для админа)"""
    try:
        data = await game_data.get_all_data()
        
        # Проверяем, не существует ли уже участник с таким user_id
        for p in data.get("participants", []):
            if p["user_id"] == participant.user_id:
                raise HTTPException(status_code=400, detail="Участник с таким ID уже существует")
        
        new_participant = {
            "user_id": participant.user_id,
            "username": participant.username,
            "full_name": participant.full_name,
            "game_name": participant.game_name,
            "registered_date": datetime.now().strftime("%Y-%m-%d"),
            "status": "active",
            "goals": participant.goals if len(participant.goals) == 10 else participant.goals + [""] * (10 - len(participant.goals))
        }
        
        data["participants"].append(new_participant)
        await game_data.save_data(data, sync_to_main=True)
        
        return ParticipantResponse(**new_participant)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка при создании участника: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/admin/participants/{user_id}", response_model=ParticipantResponse)
async def update_participant(user_id: int, participant_update: ParticipantUpdate, admin: str = Depends(verify_admin)):
    """Обновить данные участника (только для админа)"""
    try:
        data = await game_data.get_all_data()
        
        participant = None
        for i, p in enumerate(data.get("participants", [])):
            if p["user_id"] == user_id:
                participant = p
                if participant_update.game_name is not None:
                    p["game_name"] = participant_update.game_name
                if participant_update.status is not None:
                    p["status"] = participant_update.status
                if participant_update.goals is not None:
                    p["goals"] = participant_update.goals if len(participant_update.goals) == 10 else participant_update.goals + [""] * (10 - len(participant_update.goals))
                break
        
        if not participant:
            raise HTTPException(status_code=404, detail="Участник не найден")
        
        await game_data.save_data(data, sync_to_main=True)
        return ParticipantResponse(**participant)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка при обновлении участника: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/admin/participants/{user_id}")
async def delete_participant(user_id: int, admin: str = Depends(verify_admin)):
    """Удалить участника (только для админа)"""
    try:
        data = await game_data.get_all_data()
        
        # Считаем, был ли участник в исходном списке до фильтрации
        original_count = len(data.get("participants", []))
        data["participants"] = [p for p in data.get("participants", []) if p["user_id"] != user_id]
        participant_found = len(data["participants"]) < original_count
        
        # Удаляем также все отчеты участника
        data["reports"] = [r for r in data.get("reports", []) if r["user_id"] != user_id]
        
        if not participant_found:
            raise HTTPException(status_code=404, detail="Участник не найден")
        
        await game_data.save_data(data, sync_to_main=True)
        return {"message": "Участник удален"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка при удалении участника: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Управление отчетами
@app.post("/api/admin/reports", response_model=ReportResponse)
async def create_report(report: ReportCreate, admin: str = Depends(verify_admin)):
    """Создать отчет (только для админа)"""
    try:
        data = await game_data.get_all_data()
        
        # Проверяем, существует ли участник
        participant_exists = any(p["user_id"] == report.user_id for p in data.get("participants", []))
        if not participant_exists:
            raise HTTPException(status_code=404, detail="Участник не найден")
        
        # Проверяем, нет ли уже отчета за этот день
        for r in data.get("reports", []):
            if r["user_id"] == report.user_id and r["day"] == report.day:
                raise HTTPException(status_code=400, detail="Отчет за этот день уже существует")
        
        new_report = {
            "user_id": report.user_id,
            "day": report.day,
            "date": report.date,
            "progress": report.progress if len(report.progress) == 10 else report.progress + [""] * (10 - len(report.progress)),
            "rest_day": report.rest_day
        }
        
        data["reports"].append(new_report)
        await game_data.save_data(data, sync_to_main=True)
        
        return ReportResponse(**new_report)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка при создании отчета: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/admin/reports/{user_id}/{day}", response_model=ReportResponse)
async def update_report(user_id: int, day: int, report_update: ReportUpdate, admin: str = Depends(verify_admin)):
    """Обновить отчет (только для админа)"""
    try:
        data = await game_data.get_all_data()
        
        report = None
        for r in data.get("reports", []):
            if r["user_id"] == user_id and r["day"] == day:
                report = r
                if report_update.progress is not None:
                    r["progress"] = report_update.progress if len(report_update.progress) == 10 else report_update.progress + [""] * (10 - len(report_update.progress))
                if report_update.rest_day is not None:
                    r["rest_day"] = report_update.rest_day
                break
        
        if not report:
            raise HTTPException(status_code=404, detail="Отчет не найден")
        
        await game_data.save_data(data, sync_to_main=True)
        return ReportResponse(**report)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка при обновлении отчета: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/admin/reports/{user_id}/{day}")
async def delete_report(user_id: int, day: int, admin: str = Depends(verify_admin)):
    """Удалить отчет (только для админа)"""
    try:
        data = await game_data.get_all_data()
        
        report_found = False
        original_count = len(data.get("reports", []))
        data["reports"] = [r for r in data.get("reports", []) if not (r["user_id"] == user_id and r["day"] == day)]
        report_found = len(data["reports"]) < original_count
        
        if not report_found:
            raise HTTPException(status_code=404, detail="Отчет не найден")
        
        await game_data.save_data(data, sync_to_main=True)
        return {"message": "Отчет удален"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка при удалении отчета: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Экспорт/импорт данных
@app.get("/api/admin/export")
async def export_data(admin: str = Depends(verify_admin)):
    """Экспортировать все данные в JSON (только для админа)"""
    try:
        data = await game_data.get_all_data()
        return JSONResponse(content=data)
    except Exception as e:
        logger.error(f"Ошибка при экспорте данных: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/admin/import")
async def import_data(data: Dict[str, Any], admin: str = Depends(verify_admin)):
    """Импортировать данные из JSON (только для админа)"""
    try:
        # Валидация структуры данных
        if "participants" not in data or "reports" not in data:
            raise HTTPException(status_code=400, detail="Неверный формат данных")
        
        await game_data.save_data(data, sync_to_main=True)
        return {"message": "Данные импортированы успешно"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка при импорте данных: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Управление днем игры
@app.post("/api/admin/game-day")
async def set_game_day(day_update: GameDayUpdate, admin: str = Depends(verify_admin)):
    """Установить текущий день игры (только для админа)"""
    try:
        if day_update.day < 1 or day_update.day > 90:
            raise HTTPException(status_code=400, detail="День должен быть от 1 до 90")
        
        settings = await game_data.get_settings()
        settings["current_day"] = day_update.day
        await game_data.save_settings(settings)
        
        return {"message": f"День игры установлен: {day_update.day}", "current_day": day_update.day}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка при установке дня: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
