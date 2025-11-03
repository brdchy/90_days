# Деплой веб-платформы

## Запуск в разработке

### 1. Запуск API (FastAPI)

```bash
# В корне проекта
python -m uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

Или используйте скрипт:

```bash
bash start_api.sh
```

### 2. Запуск фронтенда (React)

```bash
# Перейдите в папку web
cd web

# Установите зависимости (первый раз)
npm install

# Запустите dev сервер
npm run dev
```

Или используйте скрипт из корня проекта:

```bash
bash start_web.sh
```

Фронтенд будет доступен на http://localhost:3000

## Запуск в продакшене

### API

```bash
uvicorn api.main:app --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd web
npm run build
npm run preview
```

Или используйте любой веб-сервер (nginx, apache) для раздачи статических файлов из папки `web/dist`

## Docker

Можно создать Docker Compose конфигурацию для одновременного запуска бота, API и фронтенда.

## Важно

- Убедитесь, что API доступен для фронтенда (настроен CORS)
- В продакшене измените пароль админа в `api/main.py`
- Настройте переменные окружения для API URL на фронтенде

