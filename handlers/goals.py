from aiogram import Router, F
from aiogram.filters import Command
from aiogram.types import Message, CallbackQuery
from aiogram.fsm.context import FSMContext
from states import GoalSettingStates
from keyboards.common import get_main_menu, get_goals_menu, get_cancel_keyboard, get_edit_goals_keyboard
from services.game_data import GameDataManager

router = Router()
game_data = GameDataManager()


@router.message(Command("goals"))
@router.message(F.text.lower().in_(["мои цели", "📝 мои цели"]))
async def cmd_goals(message: Message, state: FSMContext):
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
    goals_count = sum(1 for goal in goals if goal.strip())
    
    text = f"📝 <b>Ваши цели</b>\n\n"
    if goals_count == 0:
        text += "Вы еще не установили цели.\n\nНажмите кнопку ниже, чтобы начать установку целей."
    else:
        text += f"Установлено целей: {goals_count}/10\n\n"
        for i, goal in enumerate(goals, 1):
            if goal.strip():
                text += f"{i}. {goal}\n"
            else:
                text += f"{i}. <i>не установлено</i>\n"
        text += "\nВыберите действие:"
    
    await message.answer(
        text,
        parse_mode="HTML",
        reply_markup=get_goals_menu()
    )


@router.callback_query(F.data == "set_goals")
async def callback_set_goals(callback: CallbackQuery, state: FSMContext):
    await callback.answer()
    user_id = callback.from_user.id
    
    data = await game_data.get_all_data()
    goals = game_data.get_user_goals(user_id, data)
    
    # Проверяем, все ли цели установлены
    if all(goal.strip() for goal in goals):
        await callback.message.answer(
            "✅ Все 10 целей уже установлены!\n\n"
            "Используйте 'Редактировать цели' для изменения.",
            reply_markup=get_main_menu()
        )
        return
    
    # Начинаем установку целей - сохраняем данные в состоянии для переиспользования
    await state.update_data(goals=goals, game_data=data)
    await state.set_state(GoalSettingStates.setting_goal_1)
    
    goal_num = next((i for i, g in enumerate(goals, 1) if not g.strip()), 1)
    await callback.message.answer(
        f"🎯 <b>Установка цели #{goal_num}</b>\n\n"
        "Введите вашу цель. Помните: ставим самые смелые цели, от которых мурашки по коже бегут!\n\n"
        "Не думайте, КАК её достичь - просто сформулируйте мечту.",
        parse_mode="HTML",
        reply_markup=get_cancel_keyboard()
    )


@router.callback_query(F.data == "edit_goals")
async def callback_edit_goals(callback: CallbackQuery, state: FSMContext):
    await callback.answer()
    user_id = callback.from_user.id
    
    data = await game_data.get_all_data()
    goals = game_data.get_user_goals(user_id, data)
    
    # Проверяем, есть ли установленные цели
    goals_count = sum(1 for goal in goals if goal.strip())
    if goals_count == 0:
        await callback.message.answer(
            "У вас еще нет установленных целей для редактирования.\n\n"
            "Сначала установите цели через 'Установить цели'.",
            reply_markup=get_main_menu()
        )
        return
    
    await callback.message.answer(
        "✏️ <b>Редактирование целей</b>\n\n"
        "Выберите цель, которую хотите отредактировать:",
        parse_mode="HTML",
        reply_markup=get_edit_goals_keyboard(goals)
    )


@router.callback_query(F.data.startswith("edit_goal_"))
async def callback_edit_specific_goal(callback: CallbackQuery, state: FSMContext):
    await callback.answer()
    goal_num = int(callback.data.split("_")[-1])
    
    user_id = callback.from_user.id
    data = await game_data.get_all_data()
    goals = game_data.get_user_goals(user_id, data)
    
    if goal_num < 1 or goal_num > 10:
        await callback.message.answer("Неверный номер цели.")
        return
    
    current_goal = goals[goal_num - 1] if goals[goal_num - 1] else ""
    
    # Сохраняем номер цели для редактирования
    await state.update_data(editing_goal_num=goal_num, game_data=data)
    await state.set_state(GoalSettingStates.editing_goal)
    
    await callback.message.answer(
        f"✏️ <b>Редактирование цели #{goal_num}</b>\n\n"
        f"<b>Текущий текст:</b>\n{current_goal}\n\n"
        f"Введите новый текст цели:",
        parse_mode="HTML",
        reply_markup=get_cancel_keyboard()
    )


@router.callback_query(F.data == "cancel_edit")
async def callback_cancel_edit(callback: CallbackQuery, state: FSMContext):
    await callback.answer()
    await state.clear()
    await callback.message.answer(
        "Редактирование отменено.",
        reply_markup=get_main_menu()
    )


@router.message(GoalSettingStates.editing_goal, F.text)
async def process_edited_goal(message: Message, state: FSMContext):
    goal_text = message.text.strip()
    
    if len(goal_text) < 5:
        await message.answer("Цель слишком короткая. Опишите свою цель более подробно (минимум 5 символов).")
        return
    
    user_id = message.from_user.id
    state_data = await state.get_data()
    goal_num = state_data.get("editing_goal_num")
    data = state_data.get("game_data")
    
    if not data:
        data = await game_data.get_all_data()
    
    if not goal_num or goal_num < 1 or goal_num > 10:
        await message.answer("Ошибка: неверный номер цели.")
        await state.clear()
        return
    
    # Сохраняем отредактированную цель
    game_data.set_user_goal(user_id, goal_num, goal_text, data)
    await game_data.save_data(data, sync_to_main=False)
    
    await message.answer(
        f"✅ <b>Цель #{goal_num} успешно обновлена!</b>\n\n"
        f"Новый текст:\n{goal_text}",
        parse_mode="HTML",
        reply_markup=get_main_menu()
    )
    await state.clear()




# Обработчики для установки целей по очереди
async def handle_goal_input(message: Message, state: FSMContext, goal_num: int, next_state):
    """Обрабатывает ввод цели"""
    goal_text = message.text.strip()
    
    if len(goal_text) < 5:
        await message.answer("Цель слишком короткая. Опишите свою цель более подробно (минимум 5 символов).")
        return
    
    user_id = message.from_user.id
    
    # Получаем данные один раз и храним в состоянии
    state_data = await state.get_data()
    data = state_data.get("game_data")
    
    if not data:
        # Если данных нет в состоянии, загружаем
        data = await game_data.get_all_data()
    
    # Сохраняем цель в данные
    game_data.set_user_goal(user_id, goal_num, goal_text, data)
    
    # Обновляем цели в состоянии
    goals = state_data.get("goals", [])
    if len(goals) < 10:
        goals = [""] * 10
    goals[goal_num - 1] = goal_text
    
    # Сохраняем обновленные данные в состояние (но НЕ на диск)
    await state.update_data(goals=goals, game_data=data)
    
    # Проверяем, остались ли не установленные цели
    unset_goals = [i for i, g in enumerate(goals, 1) if not g.strip()]
    
    if unset_goals:
        next_goal = unset_goals[0]
        await state.set_state(next_state)
        await message.answer(
            f"✅ Цель #{goal_num} установлена!\n\n"
            f"🎯 <b>Установка цели #{next_goal}</b>\n\n"
            "Введите следующую цель:",
            parse_mode="HTML",
            reply_markup=get_cancel_keyboard()
        )
    else:
        # Все цели установлены - сохраняем на диск (без синхронизации с основным файлом)
        await game_data.save_data(data, sync_to_main=False)
        await message.answer(
            "🎉 <b>Отлично! Все 10 целей установлены!</b>\n\n"
            "Теперь каждый день вы будете отправлять отчет о прогрессе по целям.\n\n"
            "Удачи в достижении ваших целей! 💪",
            parse_mode="HTML",
            reply_markup=get_main_menu()
        )
        await state.clear()


@router.message(GoalSettingStates.setting_goal_1, F.text)
async def process_goal_1(message: Message, state: FSMContext):
    await handle_goal_input(message, state, 1, GoalSettingStates.setting_goal_2)


@router.message(GoalSettingStates.setting_goal_2, F.text)
async def process_goal_2(message: Message, state: FSMContext):
    await handle_goal_input(message, state, 2, GoalSettingStates.setting_goal_3)


@router.message(GoalSettingStates.setting_goal_3, F.text)
async def process_goal_3(message: Message, state: FSMContext):
    await handle_goal_input(message, state, 3, GoalSettingStates.setting_goal_4)


@router.message(GoalSettingStates.setting_goal_4, F.text)
async def process_goal_4(message: Message, state: FSMContext):
    await handle_goal_input(message, state, 4, GoalSettingStates.setting_goal_5)


@router.message(GoalSettingStates.setting_goal_5, F.text)
async def process_goal_5(message: Message, state: FSMContext):
    await handle_goal_input(message, state, 5, GoalSettingStates.setting_goal_6)


@router.message(GoalSettingStates.setting_goal_6, F.text)
async def process_goal_6(message: Message, state: FSMContext):
    await handle_goal_input(message, state, 6, GoalSettingStates.setting_goal_7)


@router.message(GoalSettingStates.setting_goal_7, F.text)
async def process_goal_7(message: Message, state: FSMContext):
    await handle_goal_input(message, state, 7, GoalSettingStates.setting_goal_8)


@router.message(GoalSettingStates.setting_goal_8, F.text)
async def process_goal_8(message: Message, state: FSMContext):
    await handle_goal_input(message, state, 8, GoalSettingStates.setting_goal_9)


@router.message(GoalSettingStates.setting_goal_9, F.text)
async def process_goal_9(message: Message, state: FSMContext):
    await handle_goal_input(message, state, 9, GoalSettingStates.setting_goal_10)


@router.message(GoalSettingStates.setting_goal_10, F.text)
async def process_goal_10(message: Message, state: FSMContext):
    await handle_goal_input(message, state, 10, None)
    # После 10-й цели состояние очищается в handle_goal_input


# Обработка некорректного ввода при установке целей
@router.message(GoalSettingStates.setting_goal_1)
@router.message(GoalSettingStates.setting_goal_2)
@router.message(GoalSettingStates.setting_goal_3)
@router.message(GoalSettingStates.setting_goal_4)
@router.message(GoalSettingStates.setting_goal_5)
@router.message(GoalSettingStates.setting_goal_6)
@router.message(GoalSettingStates.setting_goal_7)
@router.message(GoalSettingStates.setting_goal_8)
@router.message(GoalSettingStates.setting_goal_9)
@router.message(GoalSettingStates.setting_goal_10)
@router.message(GoalSettingStates.editing_goal)
async def process_goal_invalid(message: Message):
    await message.answer("Пожалуйста, введите текстовое описание цели.")

