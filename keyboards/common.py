from aiogram.types import ReplyKeyboardMarkup, KeyboardButton, InlineKeyboardMarkup
from aiogram.utils.keyboard import ReplyKeyboardBuilder, InlineKeyboardBuilder


def get_main_menu() -> ReplyKeyboardMarkup:
    """Главное меню бота"""
    builder = ReplyKeyboardBuilder()
    builder.button(text="📝 Мои цели")
    builder.button(text="📊 Отправить отчет")
    builder.button(text="📈 Статистика")
    builder.button(text="ℹ️ Помощь")
    builder.adjust(2, 2)
    return builder.as_markup(resize_keyboard=True)


def get_goals_menu() -> InlineKeyboardMarkup:
    """Меню для работы с целями"""
    builder = InlineKeyboardBuilder()
    builder.button(text="➕ Установить цели", callback_data="set_goals")
    builder.button(text="✏️ Редактировать цели", callback_data="edit_goals")
    builder.adjust(1)
    return builder.as_markup()


def get_goals_selector(goals: list[str], selected: set[int]) -> InlineKeyboardMarkup:
    """Клавиатура для выбора целей для отчета"""
    builder = InlineKeyboardBuilder()
    for i, goal in enumerate(goals, 1):
        status = "✅" if i in selected else "⚪"
        # Показываем текст цели, обрезаем если слишком длинный
        goal_text = goal.strip() if goal.strip() else f"Цель #{i}"
        if len(goal_text) > 40:
            goal_text = goal_text[:37] + "..."
        builder.button(
            text=f"{status} {i}. {goal_text}",
            callback_data=f"toggle_goal_{i}"
        )
    builder.button(text="✅ Завершить выбор", callback_data="finish_selection")
    builder.button(text="❌ Отмена", callback_data="cancel_report")
    builder.adjust(1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2)
    return builder.as_markup()


def get_goal_status_keyboard(goal_num: int) -> InlineKeyboardMarkup:
    """Клавиатура для ввода прогресса по цели"""
    builder = InlineKeyboardBuilder()
    builder.button(text="📝 Ввести описание прогресса", callback_data=f"text_goal_{goal_num}")
    builder.button(text="🔙 Вернуться", callback_data="back_to_goals")
    builder.adjust(1)
    return builder.as_markup()


def get_cancel_keyboard() -> ReplyKeyboardMarkup:
    """Клавиатура с кнопкой отмены"""
    builder = ReplyKeyboardBuilder()
    builder.button(text="❌ Отмена")
    return builder.as_markup(resize_keyboard=True)


def get_confirm_keyboard() -> InlineKeyboardMarkup:
    """Клавиатура подтверждения"""
    builder = InlineKeyboardBuilder()
    builder.button(text="✅ Подтвердить", callback_data="confirm")
    builder.button(text="❌ Отмена", callback_data="cancel")
    builder.adjust(2)
    return builder.as_markup()


def get_edit_goals_keyboard(goals: list[str]) -> InlineKeyboardMarkup:
    """Клавиатура для выбора цели для редактирования"""
    builder = InlineKeyboardBuilder()
    for i, goal in enumerate(goals, 1):
        if goal.strip():
            goal_text = goal.strip()
            if len(goal_text) > 35:
                goal_text = goal_text[:32] + "..."
            builder.button(
                text=f"✏️ {i}. {goal_text}",
                callback_data=f"edit_goal_{i}"
            )
    builder.button(text="❌ Отмена", callback_data="cancel_edit")
    builder.adjust(1)
    return builder.as_markup()

