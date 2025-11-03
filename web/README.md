# 90 дней - 10 целей (Frontend)

Веб-платформа для игры "90 дней - 10 целей"

## Технологии

- React 18
- Vite
- TailwindCSS
- React Router
- TanStack Query (React Query)
- Zustand
- Recharts

## Установка

```bash
npm install
```

## Запуск в режиме разработки

```bash
npm run dev
```

Приложение будет доступно по адресу http://localhost:3000

## Сборка для продакшена

```bash
npm run build
```

Собранные файлы будут в папке `dist`

## Переменные окружения

Создайте файл `.env`:

```
VITE_API_URL=http://localhost:8000
```

## Структура проекта

```
web/
├── src/
│   ├── api/           # API клиент
│   ├── components/     # Переиспользуемые компоненты
│   ├── pages/          # Страницы приложения
│   │   ├── admin/     # Админские страницы
│   ├── stores/         # Zustand хранилища
│   ├── App.jsx         # Главный компонент
│   └── main.jsx        # Точка входа
├── index.html
└── package.json
```

## Админ-панель

- Логин: `admin`
- Пароль: `admin`

