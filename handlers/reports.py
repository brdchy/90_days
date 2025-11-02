from aiogram import Router, F
from aiogram.filters import Command
from aiogram.types import Message, CallbackQuery
from aiogram.fsm.context import FSMContext
from states import ReportStates
from keyboards.common import (
    get_main_menu, get_goals_selector,
    get_cancel_keyboard
)
from services.game_data import GameDataManager
from datetime import datetime

router = Router()
game_data = GameDataManager()


@router.message(Command("report"))
@router.message(F.text.lower().in_(["отправить отчет", "📊 отправить отчет"]))
async def cmd_report(message: Message, state: FSMContext):
    await state.clear()
    user_id = message.from_user.id
    
    data = await game_data.get_all_data()
    if not game_data.is_user_registered(user_id, data):
        await message.answer(
            "Вы еще не зарегистрированы в игре!\n\n"
            "Используйте /register для регистрации.",
            reply_markup=get_main_menu()
        )
        return
    
    goals = game_data.get_user_goals(user_id, data)
    if not all(goal.strip() for goal in goals):
        await message.answer(
            "Сначала установите все 10 целей!\n\n"
            "Используйте /goals для установки целей.",
            reply_markup=get_main_menu()
        )
        return
    
    # Начинаем процесс отправки отчета
    current_day = game_data.get_current_day()
    
    await message.answer(
        f"📊 <b>Ежедневный отчет. День #{current_day}</b>\n\n"
        "Выберите цели, по которым хотите указать прогресс.\n"
        "Не забудьте: минимум по 2 целям обязателен прогресс (кроме дней отдыха).\n\n"
        "Нажмите на цели для выбора:",
        parse_mode="HTML",
        reply_markup=get_goals_selector(goals, set())
    )
    
    await state.set_state(ReportStates.selecting_goals)
    await state.update_data(selected_goals=set(), goals_progress={}, current_day=current_day)


@router.callback_query(ReportStates.selecting_goals, F.data.startswith("toggle_goal_"))
async def callback_toggle_goal(callback: CallbackQuery, state: FSMContext):
    await callback.answer()
    
    goal_num = int(callback.data.split("_")[-1])
    state_data = await state.get_data()
    selected_goals = state_data.get("selected_goals", set())
    
    if goal_num in selected_goals:
        selected_goals.remove(goal_num)
    else:
        selected_goals.add(goal_num)
    
    await state.update_data(selected_goals=selected_goals)
    
    user_id = callback.from_user.id
    data = await game_data.get_all_data()
    goals = game_data.get_user_goals(user_id, data)
    
    await callback.message.edit_reply_markup(
        reply_markup=get_goals_selector(goals, selected_goals)
    )


@router.callback_query(ReportStates.selecting_goals, F.data == "finish_selection")
async def callback_finish_selection(callback: CallbackQuery, state: FSMContext):
    await callback.answer()
    
    state_data = await state.get_data()
    selected_goals = state_data.get("selected_goals", set())
    current_day = state_data.get("current_day", 1)
    
    # Проверка на день отдыха (каждый 10-й день)
    can_rest = (current_day % 10 == 0)
    
    if len(selected_goals) == 0:
        # Пользователь хочет использовать день отдыха
        if can_rest:
            await state.update_data(rest_day=True, selected_goals=set(range(1, 11)), goals_progress={})
            await save_report(callback.message, state)
        else:
            next_rest_day = ((current_day // 10) + 1) * 10
            await callback.message.answer(
                f"⚠️ День отдыха разрешен только каждый 10-й день.\n"
                f"Следующий день отдыха можно взять в день #{next_rest_day}\n\n"
                f"Выберите минимум 2 цели для отчета."
            )
        return
    
    if not can_rest and len(selected_goals) < 2:
        await callback.message.answer(
            "⚠️ В обычные дни необходим прогресс минимум по 2 целям!\n\n"
            "Выберите еще цели."
        )
        return
    
    # Переходим к указанию прогресса по целям
    await state.update_data(current_goal_index=0, rest_day=False, goals_progress={})
    # Отправляем сообщение перед началом ввода прогресса
    await callback.message.answer(
        "Теперь укажите прогресс по выбранным целям:",
        reply_markup=None
    )
    await process_next_goal(callback.message, state)


async def process_next_goal(message: Message, state: FSMContext):
    """Обрабатывает следующую цель из выбранных"""
    state_data = await state.get_data()
    selected_goals = sorted(list(state_data.get("selected_goals", set())))
    goals_progress = state_data.get("goals_progress", {})
    current_index = state_data.get("current_goal_index", 0)
    rest_day = state_data.get("rest_day", False)
    
    # Если день отдыха, сохраняем без обработки целей
    if rest_day:
        await save_report(message, state)
        return
    
    if current_index >= len(selected_goals):
        # Все цели обработаны, сохраняем отчет
        await save_report(message, state)
        return
    
    goal_num = selected_goals[current_index]
    
    user_id = message.from_user.id
    data = await game_data.get_all_data()
    goals = game_data.get_user_goals(user_id, data)
    
    # Проверяем, что список целей достаточно длинный
    if len(goals) < goal_num or goal_num < 1:
        await message.answer(
            f"⚠️ Ошибка: цель #{goal_num} не найдена. Пожалуйста, проверьте настройки целей.",
            reply_markup=get_main_menu()
        )
        await state.clear()
        return
    
    goal_text = goals[goal_num - 1] if goals[goal_num - 1] and goals[goal_num - 1].strip() else f"Цель #{goal_num} (не установлено)"
    
    # Сохраняем номер цели для ввода текста
    await state.update_data(current_goal_for_text=goal_num)
    await state.set_state(ReportStates.entering_progress)
    
    await message.answer(
        f"🎯 <b>Цель #{goal_num}</b>\n{goal_text}\n\n"
        "Введите описание вашего прогресса по этой цели.\n\n"
        "Опишите подробно, что вы сделали для достижения этой цели:",
        parse_mode="HTML",
        reply_markup=get_cancel_keyboard()
    )


@router.callback_query(ReportStates.selecting_goals, F.data == "back_to_goals")
async def callback_back_to_goals(callback: CallbackQuery, state: FSMContext):
    """Возврат к выбору целей"""
    await callback.answer()
    
    user_id = callback.from_user.id
    data = await game_data.get_all_data()
    goals = game_data.get_user_goals(user_id, data)
    
    state_data = await state.get_data()
    selected_goals = state_data.get("selected_goals", set())
    
    await callback.message.answer(
        "Выберите цели, по которым хотите указать прогресс:",
        reply_markup=get_goals_selector(goals, selected_goals)
    )


@router.callback_query(ReportStates.selecting_goals, F.data.startswith("text_goal_"))
async def callback_text_goal(callback: CallbackQuery, state: FSMContext):
    await callback.answer()
    goal_num = int(callback.data.split("_")[-1])
    
    await state.update_data(current_goal_for_text=goal_num)
    await state.set_state(ReportStates.entering_progress)
    
    user_id = callback.from_user.id
    data = await game_data.get_all_data()
    goals = game_data.get_user_goals(user_id, data)
    
    # Проверяем, что список целей достаточно длинный
    if len(goals) < goal_num or goal_num < 1:
        await callback.message.answer(
            f"⚠️ Ошибка: цель #{goal_num} не найдена. Пожалуйста, проверьте настройки целей.",
            reply_markup=get_main_menu()
        )
        await state.clear()
        return
    
    goal_text = goals[goal_num - 1] if goals[goal_num - 1] and goals[goal_num - 1].strip() else f"Цель #{goal_num} (не установлено)"
    
    await callback.message.answer(
        f"📝 <b>Цель #{goal_num}</b>\n{goal_text}\n\n"
        "Введите описание вашего прогресса по этой цели.\n\n"
        "Опишите подробно, что вы сделали для достижения этой цели:",
        parse_mode="HTML",
        reply_markup=get_cancel_keyboard()
    )


@router.message(ReportStates.entering_progress, F.text)
async def process_progress_text(message: Message, state: FSMContext):
    progress_text = message.text.strip()
    
    if len(progress_text) < 3:
        await message.answer("Описание прогресса слишком короткое. Опишите подробнее, что вы сделали.")
        return
    
    state_data = await state.get_data()
    goal_num = state_data.get("current_goal_for_text")
    goals_progress = state_data.get("goals_progress", {})
    goals_progress[goal_num] = progress_text
    
    current_index = state_data.get("current_goal_index", 0)
    await state.update_data(goals_progress=goals_progress, current_goal_index=current_index + 1)
    await state.set_state(ReportStates.selecting_goals)
    
    # Продолжаем обработку выбранных целей
    await process_next_goal(message, state)


@router.callback_query(ReportStates.selecting_goals, F.data == "cancel_report")
async def callback_cancel_report(callback: CallbackQuery, state: FSMContext):
    await callback.answer()
    await state.clear()
    await callback.message.answer(
        "Отправка отчета отменена.",
        reply_markup=get_main_menu()
    )


async def save_report(message: Message, state: FSMContext):
    """Сохраняет отчет"""
    state_data = await state.get_data()
    user_id = message.from_user.id
    current_day = state_data.get("current_day", 1)
    goals_progress = state_data.get("goals_progress", {})
    rest_day = state_data.get("rest_day", False)
    
    data = await game_data.get_all_data()
    
    if rest_day:
        goals_progress = {i: "Отдых" for i in range(1, 11)}
    
    game_data.save_daily_report(user_id, current_day, goals_progress, rest_day, data)
    # Сохраняем с синхронизацией с основным файлом (это важно для отчетов)
    await game_data.save_data(data, sync_to_main=True)
    
    await state.clear()
    
    if rest_day:
        text = f"✅ Отчет за день #{current_day} сохранен!\n\nДень отдыха зафиксирован. Отдыхай и набирайся сил! 💪"
    else:
        progress_count = sum(1 for p in goals_progress.values() if p and "✅" in p or (p and p.strip() and p != "❌ Не выполнено"))
        text = f"✅ Отчет за день #{current_day} сохранен!\n\nПрогресс по {progress_count} целям зафиксирован. Отличная работа! 🎉"
    
    await message.answer(
        text,
        reply_markup=get_main_menu()
    )

