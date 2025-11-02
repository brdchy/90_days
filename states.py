from aiogram.fsm.state import StatesGroup, State


class RegistrationStates(StatesGroup):
    waiting_for_name = State()
    

class GoalSettingStates(StatesGroup):
    setting_goal_1 = State()
    setting_goal_2 = State()
    setting_goal_3 = State()
    setting_goal_4 = State()
    setting_goal_5 = State()
    setting_goal_6 = State()
    setting_goal_7 = State()
    setting_goal_8 = State()
    setting_goal_9 = State()
    setting_goal_10 = State()
    editing_goal = State()  # Состояние для редактирования цели


class ReportStates(StatesGroup):
    selecting_goals = State()
    entering_progress = State()

