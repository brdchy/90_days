from aiogram import Router, F, Bot
from aiogram.filters import Command, StateFilter
from aiogram.fsm.context import FSMContext
from aiogram.types import Message, CallbackQuery
from states import RegistrationStates
from keyboards.common import get_main_menu, get_cancel_keyboard
from services.game_data import GameDataManager

router = Router()
game_data = GameDataManager()


@router.message(Command("register"))
@router.message(F.text.lower() == "регистрация")
async def cmd_register(message: Message, state: FSMContext):
    user_id = message.from_user.id
    
    # Проверяем, не зарегистрирован ли уже
    data = await game_data.get_all_data()
    if game_data.is_user_registered(user_id, data):
        await message.answer(
            "Вы уже зарегистрированы в игре!\n\n"
            "Используйте /goals для работы с целями или /report для отправки отчета.",
            reply_markup=get_main_menu()
        )
        return
    
    await message.answer(
        "🎮 <b>Регистрация в игре</b>\n\n"
        "Для участия в игре '90 дней - 10 целей' нужно:\n"
        "1. Указать ваше имя (как хотите, чтобы вас называли в игре)\n"
        "2. Установить 10 целей\n\n"
        "Начнем с имени. Как вас называть?",
        parse_mode="HTML",
        reply_markup=get_cancel_keyboard()
    )
    await state.set_state(RegistrationStates.waiting_for_name)


@router.message(RegistrationStates.waiting_for_name, F.text)
async def process_name(message: Message, state: FSMContext):
    name = message.text.strip()
    if len(name) < 2:
        await message.answer("Имя слишком короткое. Введите имя минимум из 2 символов.")
        return
    
    user_id = message.from_user.id
    username = message.from_user.username or f"user_{user_id}"
    full_name = message.from_user.full_name or username
    
    # Регистрируем пользователя
    data = await game_data.get_all_data()
    game_data.register_user(user_id, username, full_name, name, data)
    # Сохраняем без синхронизации с основным файлом (регистрация не критична)
    await game_data.save_data(data, sync_to_main=False)
    
    # Отправляем обновление в тред, если он настроен
    from services.reminders import send_update_to_thread, get_bot_thread_id
    from handlers.group import get_game_chat_id
    
    chat_id = await get_game_chat_id()
    thread_id = await get_bot_thread_id()
    if chat_id and thread_id:
        bot = message.bot
        if bot:
            active_count = len([p for p in data['participants'] if p['status'] == 'active'])
            update_text = (
                f"👋 <b>Новый участник!</b>\n\n"
                f"Присоединился: <b>{name}</b>\n"
                f"Всего активных участников: <b>{active_count}</b>"
            )
            await send_update_to_thread(bot, chat_id, update_text, thread_id)
    
    await message.answer(
        f"✅ Отлично, {name}! Вы успешно зарегистрированы.\n\n"
        "Теперь нужно установить 10 целей. Используйте команду /goals или нажмите кнопку ниже.",
        reply_markup=get_main_menu()
    )
    await state.clear()


@router.message(RegistrationStates.waiting_for_name)
async def process_name_invalid(message: Message):
    await message.answer("Пожалуйста, введите текстовое имя.")

