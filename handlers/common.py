from aiogram import Router, F
from aiogram.filters import Command, StateFilter
from aiogram.fsm.context import FSMContext
from aiogram.types import Message
from keyboards.common import get_main_menu
from services.game_data import GameDataManager
import logging

router = Router()
game_data = GameDataManager()


@router.message(Command("start"))
async def cmd_start(message: Message, state: FSMContext):
    await state.clear()
    
    # Проверяем, зарегистрирован ли пользователь
    data = await game_data.get_all_data()
    user_id = message.from_user.id
    
    # Создаем кнопку для входа на сайт, если пользователь зарегистрирован
    from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
    from keyboards.common import get_main_menu
    
    if game_data.is_user_registered(user_id, data):
        # Генерируем токен через API
        import httpx
        import os
        
        web_url = os.getenv("WEB_URL", "http://localhost:3000")
        api_url = os.getenv("API_URL", "http://localhost:8000")
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{api_url}/api/auth/generate-token",
                    json={"user_id": user_id},
                    timeout=5.0
                )
                if response.status_code == 200:
                    token_data = response.json()
                    web_link = InlineKeyboardMarkup(inline_keyboard=[[
                        InlineKeyboardButton(
                            text="🌐 Перейти на сайт",
                            url=token_data.get("url", f"{web_url}/auth?token={token_data.get('token')}")
                        )
                    ]])
                    
                    await message.answer(
                        "👋 Привет! Я бот для игры '90 дней - 10 целей'.\n\n"
                        "Я помогу тебе:\n"
                        "• Зарегистрироваться в игре\n"
                        "• Установить 10 целей\n"
                        "• Вести ежедневные отчеты\n"
                        "• Отслеживать прогресс\n\n"
                        "Используй меню ниже или команды для навигации.\n\n"
                        "💡 <b>Нажми кнопку ниже, чтобы перейти на сайт и посмотреть свою статистику!</b>",
                        reply_markup=web_link,
                        parse_mode="HTML"
                    )
                else:
                    await message.answer(
                        "👋 Привет! Я бот для игры '90 дней - 10 целей'.\n\n"
                        "Я помогу тебе:\n"
                        "• Зарегистрироваться в игре\n"
                        "• Установить 10 целей\n"
                        "• Вести ежедневные отчеты\n"
                        "• Отслеживать прогресс\n\n"
                        "Используй меню ниже или команды для навигации.",
                        reply_markup=get_main_menu()
                    )
        except Exception as e:
            logging.warning(f"Не удалось сгенерировать ссылку на сайт: {e}")
            await message.answer(
                "👋 Привет! Я бот для игры '90 дней - 10 целей'.\n\n"
                "Я помогу тебе:\n"
                "• Зарегистрироваться в игре\n"
                "• Установить 10 целей\n"
                "• Вести ежедневные отчеты\n"
                "• Отслеживать прогресс\n\n"
                "Используй меню ниже или команды для навигации.",
                reply_markup=get_main_menu()
            )
    else:
        await message.answer(
            "👋 Привет! Я бот для игры '90 дней - 10 целей'.\n\n"
            "Я помогу тебе:\n"
            "• Зарегистрироваться в игре\n"
            "• Установить 10 целей\n"
            "• Вести ежедневные отчеты\n"
            "• Отслеживать прогресс\n\n"
            "Используй меню ниже или команды для навигации.",
            reply_markup=get_main_menu()
        )


@router.message(Command("time"))
async def cmd_time_user(message: Message):
    """Показывает текущее время бота для обычных пользователей"""
    from services.game_data import GameDataManager
    from services.reminders import _get_bot_time
    from datetime import datetime
    
    game_data = GameDataManager()
    settings = await game_data.get_settings()
    
    bot_time = _get_bot_time(settings)
    system_time = datetime.now()
    time_offset = settings.get("time_offset_hours", 0)
    
    time_text = f"""
🕐 <b>Текущее время</b>

<b>Время бота:</b> {bot_time.strftime("%Y-%m-%d %H:%M:%S")}
<b>Системное время:</b> {system_time.strftime("%Y-%m-%d %H:%M:%S")}

{f'<b>Смещение:</b> {time_offset:+d} часов' if time_offset != 0 else ''}
"""
    
    await message.answer(time_text, parse_mode="HTML")


@router.message(Command("help"))
@router.message(F.text.lower().in_(["помощь", "ℹ️ помощь"]))
async def cmd_help(message: Message):
    help_text = """
📖 <b>Помощь по боту</b>

<b>Основные команды:</b>
/start - Начать работу с ботом
/register - Зарегистрироваться в игре
/goals - Установить/просмотреть цели
/report - Отправить ежедневный отчет
/stats - Статистика прогресса
/help - Эта справка

<b>Правила игры:</b>
• Установи 10 целей на 90 дней
• Каждый день отправляй отчет о прогрессе
• Обязателен прогресс минимум по 2 целям в день
• Раз в 10 дней можно взять день отдыха
• Не отправил отчет до конца дня - выбываешь из игры

<b>Навигация:</b>
Используй кнопки меню для быстрого доступа к функциям.

Удачи в достижении целей! 💪
"""
    await message.answer(help_text, parse_mode="HTML")


@router.message(Command("stats"))
@router.message(F.text.lower().in_(["статистика", "📈 статистика"]))
async def cmd_stats(message: Message):
    """Показывает статистику прогресса пользователя"""
    user_id = message.from_user.id
    
    data = await game_data.get_all_data()
    if not game_data.is_user_registered(user_id, data):
        await message.answer(
            "Вы еще не зарегистрированы в игре!\n\n"
            "Используйте /register для регистрации.",
            reply_markup=get_main_menu()
        )
        return
    
    # Находим пользователя
    user_data = None
    for participant in data["participants"]:
        if participant["user_id"] == user_id:
            user_data = participant
            break
    
    if not user_data:
        await message.answer("Ошибка: данные пользователя не найдены.")
        return
    
    # Считаем статистику по отчетам
    user_reports = [r for r in data["reports"] if r["user_id"] == user_id]
    reports_count = len(user_reports)
    current_day = game_data.get_current_day()
    
    # Проверяем отчет за сегодня
    has_today_report = any(r["day"] == current_day for r in user_reports)
    
    # Находим дату регистрации
    reg_date_str = user_data.get("registered_date", "")
    days_in_game = current_day
    if reg_date_str:
        try:
            from datetime import datetime
            reg_date = datetime.strptime(reg_date_str, "%Y-%m-%d")
            days_in_game = (datetime.now() - reg_date).days + 1
        except:
            pass
    
    # Считаем статистику по целям
    goals = user_data.get("goals", [""] * 10)
    goals_stats = []
    total_progress_days = 0
    active_goals_count = 0
    
    for i, goal in enumerate(goals):
        if not goal.strip():
            continue
        
        active_goals_count += 1
        goal_progress_days = 0
        goal_rest_days = 0
        goal_no_progress_days = 0
        last_progress_day = 0
        
        for report in user_reports:
            progress = report["progress"][i] if i < len(report["progress"]) else ""
            is_rest_day = report.get("rest_day", False)
            
            if is_rest_day:
                goal_rest_days += 1
            elif progress and progress.strip() and progress not in ["Отдых", "❌ Не выполнено"]:
                goal_progress_days += 1
                last_progress_day = max(last_progress_day, report["day"])
            elif report["day"] <= current_day:
                goal_no_progress_days += 1
        
        total_progress_days += goal_progress_days
        
        # Процент дней с прогрессом
        if days_in_game > 0:
            progress_percent = (goal_progress_days / min(days_in_game, current_day)) * 100
        else:
            progress_percent = 0
        
        goals_stats.append({
            "num": i + 1,
            "goal": goal,
            "progress_days": goal_progress_days,
            "rest_days": goal_rest_days,
            "no_progress_days": goal_no_progress_days,
            "last_progress": last_progress_day,
            "progress_percent": progress_percent
        })
    
    # Сортируем по проценту прогресса (от большего к меньшему)
    goals_stats.sort(key=lambda x: x["progress_percent"], reverse=True)
    
    # Формируем статистику
    stats_text = f"📊 <b>Ваша статистика</b>\n\n"
    
    # Общая информация
    stats_text += f"📅 <b>Игра:</b>\n"
    stats_text += f"• Текущий день: <b>{current_day}/90</b>\n"
    stats_text += f"• Дней в игре: <b>{days_in_game}</b>\n"
    stats_text += f"• Отправлено отчетов: <b>{reports_count}</b>\n"
    if has_today_report:
        stats_text += "• ✅ Отчет за сегодня отправлен\n"
    else:
        stats_text += "• ⚠️ Отчет за сегодня <b>не отправлен</b>\n"
    
    if active_goals_count > 0:
        avg_progress = total_progress_days / active_goals_count
        stats_text += f"• Средний прогресс: <b>{avg_progress:.1f}</b> дней с прогрессом\n"
    
    stats_text += f"\n🎯 <b>Прогресс по целям:</b>\n\n"
    
    # Показываем топ-5 целей по прогрессу и остальные
    top_goals = goals_stats[:5]
    other_goals = goals_stats[5:]
    
    for goal_stat in top_goals:
        num = goal_stat["num"]
        goal_text = goal_stat["goal"][:40] + ("..." if len(goal_stat["goal"]) > 40 else "")
        progress_days = goal_stat["progress_days"]
        progress_percent = goal_stat["progress_percent"]
        last_progress = goal_stat["last_progress"]
        
        stats_text += f"<b>{num}.</b> {goal_text}\n"
        stats_text += f"   📈 Прогресс: <b>{progress_days}</b> дней ({progress_percent:.0f}%)\n"
        if last_progress > 0:
            stats_text += f"   📅 Последний прогресс: день #{last_progress}\n"
        else:
            stats_text += f"   ⚠️ Прогресса еще не было\n"
        stats_text += "\n"
    
    if other_goals:
        stats_text += f"\n<b>Остальные цели ({len(other_goals)}):</b>\n"
        for goal_stat in other_goals:
            num = goal_stat["num"]
            progress_days = goal_stat["progress_days"]
            progress_percent = goal_stat["progress_percent"]
            emoji = "🟢" if progress_percent >= 50 else "🟡" if progress_percent >= 25 else "🔴"
            stats_text += f"{emoji} {num}: {progress_days} дней ({progress_percent:.0f}%)\n"
    
    await message.answer(stats_text, parse_mode="HTML", reply_markup=get_main_menu())


@router.message(StateFilter(None), Command("cancel"))
@router.message(StateFilter(None), F.text.lower() == "❌ отмена")
async def cmd_cancel_no_state(message: Message):
    await message.answer("Нечего отменять. Вы не находитесь в процессе заполнения формы.")


@router.message(Command("cancel"))
@router.message(F.text.lower() == "❌ отмена")
async def cmd_cancel(message: Message, state: FSMContext):
    await state.clear()
    await message.answer(
        "Действие отменено.",
        reply_markup=get_main_menu()
    )
