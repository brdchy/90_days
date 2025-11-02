import asyncio
import logging
import sys
from aiogram import Bot, Dispatcher
from aiogram.fsm.storage.memory import MemoryStorage
from config_reader import config
from handlers import common, registration, goals, reports, admin, group
from handlers.group import get_game_chat_id
from services.reminders import get_bot_thread_id, reminder_loop

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(name)s - %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
    ]
)


async def main():
    # Создаем бота и диспетчер
    bot = Bot(token=config.bot_token.get_secret_value())
    dp = Dispatcher(storage=MemoryStorage())
    
    # Подключаем роутеры
    dp.include_router(common.router)
    dp.include_router(registration.router)
    dp.include_router(goals.router)
    dp.include_router(reports.router)
    dp.include_router(admin.router)
    dp.include_router(group.router)
    
    # Удаляем вебхук и пропускаем накопленные обновления
    await bot.delete_webhook(drop_pending_updates=True)
    
    # Проверяем, есть ли уже настроенный чат и тред (загружаем из файла)
    chat_id = await get_game_chat_id()
    thread_id = await get_bot_thread_id()
    if chat_id and thread_id:
        logging.info(f"Найден настроенный чат {chat_id} и тред {thread_id}")
        # Запускаем цикл напоминаний в фоне
        asyncio.create_task(reminder_loop(bot, chat_id, thread_id))
    
    # Запускаем поллинг
    logging.info("Бот запущен!")
    await dp.start_polling(bot)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logging.info("Бот остановлен пользователем.")
    except Exception as e:
        logging.error(f"Ошибка при запуске бота: {e}", exc_info=True)

