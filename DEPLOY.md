# Инструкция по деплою бота

## Подготовка

1. Скопируйте `.env.example` в `.env` и заполните переменные окружения:
```bash
cp .env.example .env
```

2. Заполните необходимые токены:
   - `BOT_TOKEN` - получите у [@BotFather](https://t.me/BotFather)
   - `YADISK_TOKEN` - OAuth токен Яндекс.Диска ([инструкция](https://yandex.ru/dev/disk/doc/dg/oauth/quickstart.html))
   - `ADMIN_CHAT_ID` - опционально, ID чата администратора

## Способ 1: Docker (рекомендуется)

### Установка Docker и Docker Compose

**Linux:**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo usermod -aG docker $USER
```

**Windows/Mac:** Установите [Docker Desktop](https://www.docker.com/products/docker-desktop)

### Запуск

```bash
# Сборка и запуск
docker-compose up -d

# Просмотр логов
docker-compose logs -f

# Остановка
docker-compose down

# Перезапуск
docker-compose restart
```

## Способ 2: VPS (Ubuntu/Debian)

### Установка зависимостей

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Python 3.11
sudo apt install python3.11 python3.11-venv python3-pip git -y

# Клонирование проекта
cd /opt
sudo git clone <ваш_репозиторий> 90days_bot
cd 90days_bot

# Создание виртуального окружения
python3.11 -m venv venv
source venv/bin/activate

# Установка зависимостей
pip install -r requirements.txt
```

### Настройка systemd

```bash
# Копирование файла службы
sudo cp 90days_bot.service /etc/systemd/system/

# Редактирование пути (если нужно)
sudo nano /etc/systemd/system/90days_bot.service

# Загрузка и запуск
sudo systemctl daemon-reload
sudo systemctl enable 90days_bot
sudo systemctl start 90days_bot

# Проверка статуса
sudo systemctl status 90days_bot

# Просмотр логов
sudo journalctl -u 90days_bot -f
```

## Способ 3: Heroku

### Установка Heroku CLI

[Скачать Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli)

### Деплой

```bash
# Вход в Heroku
heroku login

# Создание приложения
heroku create your-bot-name

# Установка переменных окружения
heroku config:set BOT_TOKEN=your_token
heroku config:set YADISK_TOKEN=your_token
heroku config:set YADISK_FILE_PATH=90days_10goals/track.xlsx

# Деплой
git push heroku main

# Просмотр логов
heroku logs --tail
```

## Способ 4: Локальный запуск

```bash
# Создание виртуального окружения
python -m venv venv

# Активация (Windows)
venv\Scripts\activate
# Активация (Linux/Mac)
source venv/bin/activate

# Установка зависимостей
pip install -r requirements.txt

# Настройка .env файла
cp .env.example .env
# Отредактируйте .env и заполните токены

# Запуск
python bot.py
```

## Проверка работы

После запуска бот должен:
1. Подключиться к Telegram
2. Создать Excel файл на Яндекс.Диске (если его нет)
3. Начать обработку команд

Проверьте работу командой `/start` в боте.

## Мониторинг

### Docker
```bash
docker-compose logs -f bot
```

### systemd
```bash
sudo journalctl -u 90days_bot -f
```

### Heroku
```bash
heroku logs --tail
```

## Обновление

### Docker
```bash
docker-compose pull
docker-compose up -d
```

### VPS
```bash
cd /opt/90days_bot
git pull
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart 90days_bot
```

### Heroku
```bash
git push heroku main
```

## Устранение неполадок

### Бот не запускается

1. Проверьте токены в файле `.env`
2. Проверьте логи: `docker-compose logs` или `journalctl -u 90days_bot`
3. Убедитесь, что порт не занят (для локального запуска)
4. Проверьте права доступа к файлу `.env` (должен быть 600)

### Ошибки с Яндекс.Диском

1. Проверьте токен Яндекс.Диска
2. Убедитесь, что токен имеет права на запись
3. Проверьте путь к файлу в `YADISK_FILE_PATH`

### Бот не отвечает

1. Проверьте, запущен ли бот: `docker ps` или `systemctl status 90days_bot`
2. Проверьте логи на наличие ошибок
3. Убедитесь, что бот не заблокирован в Telegram

## Безопасность

⚠️ **Важно:**
- Никогда не коммитьте файл `.env` в git
- Используйте сильные токены
- Регулярно обновляйте зависимости
- Используйте firewall на VPS
- Регулярно делайте бэкапы Excel файла

## Производительность

- Бот использует ~50-100 МБ памяти
- CPU нагрузка минимальная
- Рекомендуется минимум 512 МБ RAM для VPS

