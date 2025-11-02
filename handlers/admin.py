from aiogram import Router, F, Bot
from aiogram.filters import Command
from aiogram.types import Message
from aiogram.filters import CommandObject
from services.game_data import GameDataManager
from config_reader import config

router = Router()
game_data = GameDataManager()


def is_admin(user_id: int) -> bool:
    """Проверяет, является ли пользователь администратором"""
    # Здесь можно добавить проверку списка админов
    # Пока используем admin_chat_id из конфига
    return config.admin_chat_id == user_id if config.admin_chat_id else False


@router.message(Command("admin"))
async def cmd_admin(message: Message):
    if not is_admin(message.from_user.id):
        await message.answer("❌ У вас нет прав администратора.")
        return
    
    admin_text = """
🔧 <b>Панель администратора</b>

<b>Доступные команды:</b>
/admin_stats - Статистика по игре
/admin_users - Список участников
/admin_day - Текущий день игры
/admin_remind - Отправить напоминание всем
"""
    
    await message.answer(admin_text, parse_mode="HTML")


@router.message(Command("admin_stats"))
async def cmd_admin_stats(message: Message):
    if not is_admin(message.from_user.id):
        return
    
    data = await game_data.get_all_data()
    active_users = sum(1 for p in data["participants"] if p["status"] == "active")
    total_users = len(data["participants"])
    current_day = game_data.get_current_day()
    
    stats_text = f"""
📊 <b>Статистика игры</b>

<b>Участники:</b>
• Активных: {active_users}
• Всего: {total_users}

<b>Игра:</b>
• Текущий день: {current_day}/90

<b>Отчеты сегодня:</b>
"""
    
    # Считаем отчеты за сегодня
    reports_today = sum(1 for r in data["reports"] if r["day"] == current_day)
    stats_text += f"• Отправлено: {reports_today}/{active_users}"
    
    await message.answer(stats_text, parse_mode="HTML")


@router.message(Command("admin_users"))
async def cmd_admin_users(message: Message):
    if not is_admin(message.from_user.id):
        return
    
    data = await game_data.get_all_data()
    users_text = "👥 <b>Участники игры:</b>\n\n"
    
    for participant in data["participants"]:
        status_emoji = "✅" if participant["status"] == "active" else "❌"
        goals_count = sum(1 for g in participant["goals"] if g.strip())
        users_text += (
            f"{status_emoji} {participant.get('game_name', participant.get('full_name', 'Без имени'))}\n"
            f"   Целей: {goals_count}/10\n\n"
        )
    
    await message.answer(users_text, parse_mode="HTML")


@router.message(Command("admin_remind"))
async def cmd_admin_remind(message: Message, bot: Bot):
    if not is_admin(message.from_user.id):
        return
    
    from services.reminders import check_and_remind_users, get_bot_thread_id
    from handlers.group import get_game_chat_id
    
    chat_id = await get_game_chat_id()
    thread_id = await get_bot_thread_id()
    
    await check_and_remind_users(bot, chat_id, thread_id)
    await message.answer("✅ Напоминания отправлены всем участникам.")


@router.message(Command("startup_test"))
async def cmd_startup_test(message: Message, bot: Bot):
    """Скрытая команда для тестирования всех функций бота"""
    if not is_admin(message.from_user.id):
        return
    
    test_results = []
    
    try:
        # 1. Проверка работы с данными
        test_results.append("🔍 Тестирование работы с данными...")
        data = await game_data.get_all_data()
        test_results.append(f"✅ Данные загружены: {len(data.get('participants', []))} участников")
        
        # 2. Проверка получения целей
        user_id = message.from_user.id
        if game_data.is_user_registered(user_id, data):
            goals = game_data.get_user_goals(user_id, data)
            test_results.append(f"✅ Цели получены: {sum(1 for g in goals if g.strip())}/10 установлено")
        else:
            test_results.append("⚠️ Пользователь не зарегистрирован")
        
        # 3. Проверка текущего дня
        current_day = game_data.get_current_day()
        test_results.append(f"✅ Текущий день: {current_day}/90")
        
        # 4. Тест отправки сообщения пользователю
        test_results.append("🔍 Тестирование отправки сообщения пользователю...")
        try:
            await bot.send_message(
                message.from_user.id,
                "✅ Тестовое сообщение пользователю успешно отправлено"
            )
            test_results.append("✅ Сообщение пользователю отправлено")
        except Exception as e:
            test_results.append(f"❌ Ошибка отправки пользователю: {e}")
        
        # 5. Тест отправки в чат (если настроен)
        from handlers.group import get_game_chat_id
        from services.reminders import get_bot_thread_id, send_update_to_thread
        
        chat_id = await get_game_chat_id()
        thread_id = await get_bot_thread_id()
        
        if chat_id and thread_id:
            test_results.append("🔍 Тестирование отправки сообщения в чат...")
            try:
                await send_update_to_thread(
                    bot,
                    chat_id,
                    "✅ <b>Тестовое сообщение от бота</b>\n\nЭто тест функциональности отправки сообщений в чат.",
                    thread_id
                )
                test_results.append("✅ Сообщение в чат отправлено")
            except Exception as e:
                test_results.append(f"❌ Ошибка отправки в чат: {e}")
        else:
            test_results.append("⚠️ Чат не настроен (пропуск теста отправки в чат)")
        
        # 6. Проверка работы с Excel файлом
        test_results.append("🔍 Тестирование работы с файлом...")
        try:
            file_data = await game_data._get_file_data(force_refresh=False)
            test_results.append(f"✅ Файл загружен: {len(file_data)} байт")
        except Exception as e:
            test_results.append(f"⚠️ Проблема с файлом: {e}")
        
        # Итоговый отчет
        result_text = "🧪 <b>Результаты тестирования бота</b>\n\n"
        result_text += "\n".join(test_results)
        result_text += "\n\n✅ Тестирование завершено!"
        
    except Exception as e:
        result_text = f"❌ <b>Критическая ошибка при тестировании:</b>\n\n{str(e)}"
        import traceback
        result_text += f"\n\n<code>{traceback.format_exc()}</code>"
    
    await message.answer(result_text, parse_mode="HTML")
