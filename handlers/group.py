from typing import Optional
from aiogram import Router, Bot
from aiogram.filters import KICKED, LEFT, ADMINISTRATOR, MEMBER
from aiogram.types import ChatMemberUpdated
from aiogram.filters.chat_member_updated import ChatMemberUpdatedFilter, IS_MEMBER, IS_NOT_MEMBER
from services.game_data import GameDataManager
from services.reminders import set_bot_thread_id, reminder_loop
from config_reader import config
import asyncio
import logging

router = Router()
game_data = GameDataManager()

# Глобальное хранилище для ID чата (можно улучшить, добавив в БД)
_game_chat_id: int | None = None


async def set_game_chat_id(chat_id: int):
    """Устанавливает ID чата игры и сохраняет в файл"""
    global _game_chat_id
    _game_chat_id = chat_id
    # Сохраняем в файл
    try:
        thread_id = await get_bot_thread_id_async()
        await game_data.save_chat_config(chat_id, thread_id)
        logging.info(f"Сохранен chat_id: {chat_id}, thread_id: {thread_id}")
    except Exception as e:
        logging.error(f"Ошибка при сохранении конфигурации чата: {e}")


async def get_game_chat_id() -> int | None:
    """Получает ID чата игры из памяти или файла"""
    global _game_chat_id
    
    # Сначала пробуем из памяти
    if _game_chat_id:
        return _game_chat_id
    
    # Загружаем из файла
    try:
        config_data = await game_data.get_chat_config()
        chat_id = config_data.get("chat_id")
        if chat_id:
            _game_chat_id = chat_id
            return chat_id
    except Exception as e:
        logging.warning(f"Не удалось загрузить chat_id из файла: {e}")
    
    # Если не найдено, используем admin_chat_id из конфига
    return config.admin_chat_id if config.admin_chat_id else None


async def get_bot_thread_id_async() -> Optional[int]:
    """Асинхронная версия получения thread_id (загружает из файла если нужно)"""
    from services.reminders import get_bot_thread_id
    thread_id = await get_bot_thread_id()
    
    if thread_id:
        return thread_id
    
    # Загружаем из файла
    try:
        config_data = await game_data.get_chat_config()
        return config_data.get("thread_id")
    except Exception as e:
        logging.warning(f"Не удалось загрузить thread_id из файла: {e}")
    
    return None


async def get_or_create_bot_thread(bot: Bot, chat_id: int) -> int | None:
    """Получает ID треда бота или создает его"""
    bot_thread_id: int | None = None
    
    try:
        # Проверяем, является ли чат форумом
        chat = await bot.get_chat(chat_id)
        if not chat.is_forum:
            logging.warning(f"Чат {chat_id} не является форумом. Невозможно создать тред.")
            return None
        
        # Проверяем, есть ли уже сохраненный тред
        saved_thread_id = await get_bot_thread_id_async()
        if saved_thread_id:
            # Проверяем, существует ли тред, отправляя тестовое сообщение
            try:
                await bot.send_message(
                    chat_id=chat_id,
                    message_thread_id=saved_thread_id,
                    text="✅ Тред бота активен"
                )
                logging.info(f"Используется существующий тред бота: {saved_thread_id}")
                return saved_thread_id
            except Exception:
                # Тред не существует или недоступен, создаем новый
                logging.info(f"Сохраненный тред {saved_thread_id} недоступен, создаем новый")
                pass
        
        # Создаем новый тред
        result = await bot.create_forum_topic(
            chat_id=chat_id,
            name="🤖 Обновления от бота"
        )
        
        bot_thread_id = result.message_thread_id
        logging.info(f"Создан новый тред бота с ID: {bot_thread_id}")
        
        # Сохраняем ID треда
        from services.reminders import set_bot_thread_id
        await set_bot_thread_id(bot_thread_id)
        
        # Отправляем приветственное сообщение в тред
        try:
            await bot.send_message(
                chat_id=chat_id,
                message_thread_id=bot_thread_id,
                text="👋 Привет! Я буду отправлять сюда важные обновления по игре:\n\n"
                     "• Напоминания о необходимости отправить отчет\n"
                     "• Статистику по игре\n"
                     "• Важные объявления\n"
                     "• Уведомления об исключении участников"
            )
        except Exception as e:
            logging.warning(f"Не удалось отправить приветственное сообщение в тред: {e}")
        
        return bot_thread_id
            
    except Exception as e:
        logging.error(f"Ошибка при создании/получении треда бота: {e}")
        return None


@router.my_chat_member(ChatMemberUpdatedFilter(IS_NOT_MEMBER >> IS_MEMBER))
async def bot_added_to_chat(event: ChatMemberUpdated, bot: Bot):
    """Обработчик добавления бота в чат"""
    chat_id = event.chat.id
    
    # Проверяем, что это группа/супергруппа
    if event.chat.type not in ["group", "supergroup"]:
        logging.info(f"Бот добавлен в чат типа {event.chat.type}, пропускаем")
        return
    
    # Проверяем, что это группа/супергруппа с форумом
    try:
        chat = await bot.get_chat(chat_id)
        
        if not chat.is_forum:
            logging.warning(f"Чат {chat_id} не является форумом. Бот может работать только в супергруппах с форумами.")
            try:
                await bot.send_message(
                    chat_id=chat_id,
                    text="⚠️ Для полноценной работы бота необходимо:\n"
                         "1. Преобразовать группу в супергруппу (если еще не сделано)\n"
                         "2. Включить темы (форумы) в настройках группы\n"
                         "3. Добавить бота с правами администратора\n\n"
                         "После настройки добавьте бота снова."
                )
            except:
                pass
            return
        
        # Создаем или получаем тред бота
        thread_id = await get_or_create_bot_thread(bot, chat_id)
        
        if thread_id:
            logging.info(f"Бот добавлен в чат {chat_id}, тред бота: {thread_id}")
            
            # Сохраняем информацию о чате и треде
            await set_game_chat_id(chat_id)
            await set_bot_thread_id(thread_id)
            
            # Запускаем цикл напоминаний для этого чата (если еще не запущен)
            asyncio.create_task(reminder_loop(bot, chat_id, thread_id))
        else:
            logging.error(f"Не удалось создать тред бота в чате {chat_id}")
    except Exception as e:
        logging.error(f"Ошибка при обработке добавления бота в чат: {e}")


@router.my_chat_member(ChatMemberUpdatedFilter(IS_MEMBER >> (KICKED | LEFT)))
async def bot_removed_from_chat(event: ChatMemberUpdated):
    """Обработчик удаления бота из чата"""
    chat_id = event.chat.id
    logging.info(f"Бот удален из чата {chat_id}")

