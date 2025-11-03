# 90 дней - 10 целей (API)

FastAPI backend для веб-платформы игры

## Запуск

```bash
# Установка зависимостей
pip install fastapi uvicorn[standard] python-multipart

# Запуск сервера
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

Или через Python:

```bash
python api/main.py
```

API будет доступно по адресу http://localhost:8000

## Документация API

После запуска доступна автоматическая документация:

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Аутентификация

Для админских endpoints используется HTTP Basic Authentication:

- Username: `admin`
- Password: `admin`

## Endpoints

### Публичные

- `GET /api/participants` - Список участников
- `GET /api/participants/{user_id}` - Информация об участнике
- `GET /api/reports?user_id={user_id}` - Отчеты (опционально фильтр по user_id)
- `GET /api/stats/{user_id}` - Статистика участника
- `GET /api/current-day` - Текущий день игры

### Админские

- `GET /api/admin/stats` - Общая статистика
- `GET /api/admin/settings` - Настройки бота
- `PUT /api/admin/settings` - Обновить настройки
- `POST /api/admin/remind` - Отправить напоминания

