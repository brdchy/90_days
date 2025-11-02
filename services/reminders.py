import asyncio
import logging
from datetime import datetime, time
from typing import List, Optional
from aiogram import Bot
from services.game_data import GameDataManager
from config_reader import config

game_data = GameDataManager()

# Глобальное хранилище для ID треда бота (можно улучшить, добавив в БД)
_bot_thread_id: Optional[int] = None


async def set_bot_thread_id(thread_id: int):
    """Устанавливает ID треда бота и сохраняет в файл"""
    global _bot_thread_id
    _bot_thread_id = thread_id
    # Сохраняем в файл
    try:
        from handlers.group import get_game_chat_id
        chat_id = await get_game_chat_id()
        await game_data.save_chat_config(chat_id, thread_id)
        logging.info(f"Сохранен thread_id: {thread_id}")
    except Exception as e:
        logging.error(f"Ошибка при сохранении thread_id: {e}")


async def get_bot_thread_id() -> Optional[int]:
    """Получает ID треда бота из памяти или файла"""
    global _bot_thread_id
    
    # Сначала пробуем из памяти
    if _bot_thread_id:
        return _bot_thread_id
    
    # Загружаем из файла
    try:
        config_data = await game_data.get_chat_config()
        thread_id = config_data.get("thread_id")
        if thread_id:
            _bot_thread_id = thread_id
            return thread_id
    except Exception as e:
        logging.warning(f"Не удалось загрузить thread_id из файла: {e}")
    
    return None


def get_bot_thread_id_sync() -> Optional[int]:
    """Синхронная версия для обратной совместимости (использует только память)"""
    return _bot_thread_id


async def send_reminder(bot: Bot, user_id: int, day: int, is_late: bool = False):
    """Отправляет напоминание пользователю"""
    if is_late:
        text = (
            f"⚠️ <b>Внимание! Вы не отправили отчет за день #{day}</b>\n\n"
            "Напоминаю: кто не прикрепляет очередной отчет до конца дня - выбывает из игры.\n\n"
            "Пожалуйста, отправьте отчет как можно скорее! Используйте /report"
        )
    else:
        text = (
            f"🔔 <b>Напоминание о ежедневном отчете</b>\n\n"
            f"Не забудьте отправить отчет за день #{day}!\n\n"
            "Используйте /report или кнопку '📊 Отправить отчет' в меню."
        )
    
    try:
        await bot.send_message(user_id, text, parse_mode="HTML")
    except Exception as e:
        # Пользователь заблокировал бота или другая ошибка
        logging.warning(f"Не удалось отправить напоминание пользователю {user_id}: {e}")


async def send_update_to_thread(bot: Bot, chat_id: int, message: str, thread_id: Optional[int] = None):
    """Отправляет обновление в тред бота"""
    if not thread_id:
        thread_id = await get_bot_thread_id()
    
    if thread_id and chat_id:
        try:
            await bot.send_message(
                chat_id=chat_id,
                message_thread_id=thread_id,
                text=message,
                parse_mode="HTML"
            )
        except Exception as e:
            logging.error(f"Не удалось отправить сообщение в тред: {e}")


async def check_and_remind_users(bot: Bot, chat_id: Optional[int] = None, thread_id: Optional[int] = None):
    """Проверяет всех пользователей и отправляет напоминания"""
    data = await game_data.get_all_data()
    current_day = game_data.get_current_day()
    
    users_without_report = []
    
    # Проверяем всех активных участников
    for participant in data["participants"]:
        if participant["status"] != "active":
            continue
        
        user_id = participant["user_id"]
        
        # Проверяем, есть ли отчет за сегодня
        has_report_today = False
        for report in data["reports"]:
            if report["user_id"] == user_id and report["day"] == current_day:
                has_report_today = True
                break
        
        if not has_report_today:
            users_without_report.append(participant)
            # Отправляем напоминание
            # Проверяем время: если после 20:00, то это позднее напоминание
            now = datetime.now()
            is_late = now.hour >= 20
            
            await send_reminder(bot, user_id, current_day, is_late)
            await asyncio.sleep(1)  # Небольшая задержка между отправками
    
    # Отправляем сводку в тред, если есть пользователи без отчета
    if users_without_report and chat_id:
        count = len(users_without_report)
        if count > 0:
            summary = (
                f"📊 <b>Напоминание о отчетах за день #{current_day}</b>\n\n"
                f"Не отправили отчет: <b>{count}</b> участников\n\n"
                "Не забудьте отправить отчет до конца дня!"
            )
            await send_update_to_thread(bot, chat_id, summary, thread_id)


async def check_and_remove_inactive_users(bot: Bot, chat_id: Optional[int] = None, thread_id: Optional[int] = None):
    """Проверяет и исключает неактивных пользователей"""
    data = await game_data.get_all_data()
    current_day = game_data.get_current_day()
    
    # Проверяем отчеты только после 23:00
    now = datetime.now()
    if now.hour < 23:
        return
    
    removed_users = []
    removed_for_no_report = []
    removed_for_low_progress = []
    
    for participant in data["participants"]:
        if participant["status"] != "active":
            continue
        
        user_id = participant["user_id"]
        game_name = participant.get("game_name", f"ID {user_id}")
        
        # Проверяем, есть ли отчет за сегодня
        has_report_today = False
        for report in data["reports"]:
            if report["user_id"] == user_id and report["day"] == current_day:
                has_report_today = True
                # Проверяем количество целей с прогрессом
                progress_count = sum(1 for p in report["progress"] if p and p.strip() and p != "Отдых")
                rest_day = report.get("rest_day", False)
                
                # Если не день отдыха и прогресс меньше 2 целей - исключаем
                if not rest_day and progress_count < 2 and current_day > 1:
                    participant["status"] = "removed"
                    removed_users.append(user_id)
                    removed_for_low_progress.append(game_name)
                    try:
                        await bot.send_message(
                            user_id,
                            f"❌ Вы исключены из игры за недостаточный прогресс по целям "
                            f"(день #{current_day}).\n\n"
                            f"Требовалось минимум 2 цели с прогрессом."
                        )
                    except:
                        pass
                break
        
        # Если нет отчета - исключаем (только после первого дня)
        if not has_report_today and current_day > 1:
            participant["status"] = "removed"
            removed_users.append(user_id)
            removed_for_no_report.append(game_name)
            try:
                await bot.send_message(
                    user_id,
                    f"❌ Вы исключены из игры за отсутствие отчета за день #{current_day}."
                )
            except:
                pass
    
    if removed_users:
        await game_data.save_data(data, sync_to_main=True)
        
        # Формируем сообщение для треда
        message_parts = [
            f"❌ <b>Исключение участников. День #{current_day}</b>\n",
            f"Всего исключено: <b>{len(removed_users)}</b>\n"
        ]
        
        if removed_for_no_report:
            message_parts.append(f"\n📝 <b>Без отчета ({len(removed_for_no_report)}):</b>")
            for name in removed_for_no_report[:5]:  # Показываем до 5 имен
                message_parts.append(f"• {name}")
            if len(removed_for_no_report) > 5:
                message_parts.append(f"... и еще {len(removed_for_no_report) - 5}")
        
        if removed_for_low_progress:
            message_parts.append(f"\n📉 <b>Недостаточный прогресс ({len(removed_for_low_progress)}):</b>")
            for name in removed_for_low_progress[:5]:
                message_parts.append(f"• {name}")
            if len(removed_for_low_progress) > 5:
                message_parts.append(f"... и еще {len(removed_for_low_progress) - 5}")
        
        if chat_id:
            await send_update_to_thread(bot, chat_id, "\n".join(message_parts), thread_id)
        
        # Уведомляем админа
        if config.admin_chat_id:
            try:
                await bot.send_message(
                    config.admin_chat_id,
                    f"⚠️ Исключены пользователи: {len(removed_users)}"
                )
            except:
                pass


async def send_daily_stats(bot: Bot, chat_id: int, thread_id: Optional[int] = None):
    """Отправляет ежедневную статистику в тред"""
    data = await game_data.get_all_data()
    current_day = game_data.get_current_day()
    
    active_users = sum(1 for p in data["participants"] if p["status"] == "active")
    reports_today = sum(1 for r in data["reports"] if r["day"] == current_day)
    
    stats_text = (
        f"📊 <b>Ежедневная статистика. День #{current_day}/90</b>\n\n"
        f"👥 Активных участников: <b>{active_users}</b>\n"
        f"✅ Отчетов сегодня: <b>{reports_today}/{active_users}</b>\n"
    )
    
    if reports_today < active_users:
        missing = active_users - reports_today
        stats_text += f"\n⚠️ Еще не отправили отчет: <b>{missing}</b> участников"
    
    await send_update_to_thread(bot, chat_id, stats_text, thread_id)


async def reminder_loop(bot: Bot, chat_id: Optional[int] = None, thread_id: Optional[int] = None):
    """Основной цикл напоминаний"""
    last_minute = -1
    
    while True:
        try:
            now = datetime.now()
            current_minute = now.minute
            current_hour = now.hour
            
            # Проверяем и отправляем напоминания в 18:00 (только один раз в минуту)
            if current_hour == 18 and current_minute == 0 and last_minute != 0:
                await check_and_remind_users(bot, chat_id, thread_id)
                # Отправляем статистику
                if chat_id:
                    await send_daily_stats(bot, chat_id, thread_id)
            
            # Проверяем и исключаем неактивных в 23:30 (только один раз в минуту)
            if current_hour == 23 and current_minute == 30 and last_minute != 30:
                await check_and_remove_inactive_users(bot, chat_id, thread_id)
            
            last_minute = current_minute
            
            # Ждем минуту перед следующей проверкой
            await asyncio.sleep(60)
        except Exception as e:
            logging.error(f"Ошибка в цикле напоминаний: {e}")
            await asyncio.sleep(60)

