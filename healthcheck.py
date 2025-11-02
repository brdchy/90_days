#!/usr/bin/env python3
"""
Простой healthcheck для бота
Проверяет доступность конфигурации и токенов
"""
import sys
from config_reader import config

def check_config():
    """Проверяет наличие необходимых токенов"""
    errors = []
    
    try:
        bot_token = config.bot_token.get_secret_value()
        if not bot_token or bot_token == "your_bot_token_here":
            errors.append("BOT_TOKEN не настроен")
    except Exception as e:
        errors.append(f"Ошибка чтения BOT_TOKEN: {e}")
    
    try:
        yadisk_token = config.yadisk_token.get_secret_value()
        if not yadisk_token or yadisk_token == "your_yadisk_token_here":
            errors.append("YADISK_TOKEN не настроен")
    except Exception as e:
        errors.append(f"Ошибка чтения YADISK_TOKEN: {e}")
    
    if errors:
        print("❌ Ошибки конфигурации:")
        for error in errors:
            print(f"  - {error}")
        sys.exit(1)
    else:
        print("✅ Конфигурация в порядке")
        sys.exit(0)

if __name__ == "__main__":
    check_config()

