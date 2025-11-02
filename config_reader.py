import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import SecretStr, Field


class Settings(BaseSettings):
    bot_token: SecretStr = Field(..., description="Telegram Bot Token")
    yadisk_token: SecretStr = Field(..., description="Yandex Disk OAuth Token")
    yadisk_file_path: str = Field(default="90days_10goals/track.xlsx", description="Path to Excel file on Yandex Disk")
    admin_chat_id: int | None = Field(default=None, description="Admin chat ID (optional)")
    
    model_config = SettingsConfigDict(
        env_file='.env' if os.path.exists('.env') else None,
        env_file_encoding='utf-8',
        extra='ignore'
    )


# Проверяем наличие файла .env и выводим понятное сообщение при ошибке
if not os.path.exists('.env'):
    print("⚠️  Файл '.env' не найден!")
    print("📝 Создайте файл '.env' на основе '.env.example' и заполните токены:")
    print("   Windows: copy .env.example .env")
    print("   Linux/Mac: cp .env.example .env")
    print("\n💡 Затем отредактируйте файл '.env' и укажите:")
    print("   - BOT_TOKEN (получите у @BotFather)")
    print("   - YADISK_TOKEN (OAuth токен Яндекс.Диска)")
    exit(1)

try:
    config = Settings()
except Exception as e:
    print(f"❌ Ошибка загрузки конфигурации: {e}")
    print("\n💡 Убедитесь, что файл '.env' содержит все необходимые переменные:")
    print("   - BOT_TOKEN=ваш_токен_бота")
    print("   - YADISK_TOKEN=ваш_токен_яндекс_диска")
    print("   - YADISK_FILE_PATH=90days_10goals/track.xlsx (опционально)")
    print("   - ADMIN_CHAT_ID= (опционально)")
    exit(1)
