import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { Settings, Clock, Save, CheckCircle, Calendar, Globe, AlertCircle, ListChecks } from 'lucide-react'

export default function AdminSettings() {
  const [reminderTime, setReminderTime] = useState('18:00')
  const [removalTime, setRemovalTime] = useState('23:30')
  const [currentDay, setCurrentDay] = useState('')
  const [timeOffset, setTimeOffset] = useState('0')
  const [saved, setSaved] = useState(false)
  const [chatTestResult, setChatTestResult] = useState(null)
  const [botStatus, setBotStatus] = useState(null)

  const queryClient = useQueryClient()

  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => api.getSettings().then((res) => res.data),
    onSuccess: (data) => {
      if (data.reminder_time) setReminderTime(data.reminder_time)
      if (data.removal_time) setRemovalTime(data.removal_time)
      if (data.current_day) setCurrentDay(data.current_day.toString())
      if (data.time_offset_hours !== undefined) setTimeOffset(data.time_offset_hours.toString())
    },
  })

  const updateMutation = useMutation({
    mutationFn: (newSettings) => api.updateSettings(newSettings),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-settings'])
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
  })

  const [botStatusError, setBotStatusError] = useState('')
  const { refetch: refetchBotStatus, isFetching: isBotStatusLoading } = useQuery({
    queryKey: ['admin-bot-status'],
    queryFn: () => api.getBotStatus().then((res) => res.data),
    enabled: false,
    onSuccess: (data) => {
      setBotStatusError('')
      setBotStatus(data)
    },
    onError: (error) => {
      setBotStatus(null)
      setBotStatusError(error.response?.data?.detail || error.message || 'Не удалось получить статус бота')
    },
  })

  const testChatMutation = useMutation({
    mutationFn: () => api.testChat(),
    onSuccess: (response) => {
      const data = response.data || response
      setChatTestResult({ success: true, message: data.message || 'Чат настроен корректно' })
    },
    onError: (error) => {
      const message = error.response?.data?.detail || error.message || 'Ошибка при проверке чата'
      setChatTestResult({ success: false, message })
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    updateMutation.mutate({
      reminder_time: reminderTime,
      removal_time: removalTime,
      current_day: currentDay ? parseInt(currentDay) : null,
      time_offset_hours: parseInt(timeOffset) || 0,
    })
  }

  if (isLoading) {
    return <div className="text-center py-12">Загрузка...</div>
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Настройки бота</h1>
        <p className="text-gray-600">Настройте время напоминаний и исключения участников</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Время напоминаний */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="text-primary-600" size={20} />
            <h2 className="text-xl font-semibold text-gray-900">Время напоминаний</h2>
          </div>
          <p className="text-gray-600 mb-4">
            В это время бот будет отправлять напоминания участникам о необходимости отправить отчет
          </p>
          <div>
            <label htmlFor="reminder-time" className="block text-sm font-medium text-gray-700 mb-2">
              Время напоминания (ЧЧ:ММ)
            </label>
            <input
              id="reminder-time"
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              className="input max-w-xs"
              required
            />
            <p className="text-sm text-gray-500 mt-2">
              Текущее значение: {settings?.reminder_time || '18:00 (по умолчанию)'}
            </p>
          </div>
        </div>

        {/* Время исключения */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <Settings className="text-primary-600" size={20} />
            <h2 className="text-xl font-semibold text-gray-900">Время исключения</h2>
          </div>
          <p className="text-gray-600 mb-4">
            В это время бот будет проверять отчеты и исключать участников без прогресса
          </p>
          <div>
            <label htmlFor="removal-time" className="block text-sm font-medium text-gray-700 mb-2">
              Время исключения (ЧЧ:ММ)
            </label>
            <input
              id="removal-time"
              type="time"
              value={removalTime}
              onChange={(e) => setRemovalTime(e.target.value)}
              className="input max-w-xs"
              required
            />
            <p className="text-sm text-gray-500 mt-2">
              Текущее значение: {settings?.removal_time || '23:30 (по умолчанию)'}
            </p>
          </div>
        </div>

        {/* Управление днем игры */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="text-primary-600" size={20} />
            <h2 className="text-xl font-semibold text-gray-900">Текущий день игры</h2>
          </div>
          <p className="text-gray-600 mb-4">
            Установите текущий день игры вручную (по умолчанию вычисляется автоматически)
          </p>
          <div>
            <label htmlFor="current-day" className="block text-sm font-medium text-gray-700 mb-2">
              День игры (1-90)
            </label>
            <input
              id="current-day"
              type="number"
              min="1"
              max="90"
              value={currentDay}
              onChange={(e) => setCurrentDay(e.target.value)}
              className="input max-w-xs"
              placeholder={settings?.current_day?.toString() || 'Автоматически'}
            />
            <p className="text-sm text-gray-500 mt-2">
              Текущее значение: {settings?.current_day || 'Вычисляется автоматически'}
            </p>
          </div>
        </div>

        {/* Смещение времени */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="text-primary-600" size={20} />
            <h2 className="text-xl font-semibold text-gray-900">Смещение внутреннего времени</h2>
          </div>
          <p className="text-gray-600 mb-4">
            Измените внутреннее время бота (в часах). Положительное значение сдвигает время вперед, отрицательное - назад.
          </p>
          <div>
            <label htmlFor="time-offset" className="block text-sm font-medium text-gray-700 mb-2">
              Смещение времени (часы)
            </label>
            <input
              id="time-offset"
              type="number"
              value={timeOffset}
              onChange={(e) => setTimeOffset(e.target.value)}
              className="input max-w-xs"
              placeholder="0"
            />
            <p className="text-sm text-gray-500 mt-2">
              Текущее значение: {settings?.time_offset_hours || 0} часов
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Пример: +3 для UTC+3, -5 для UTC-5
            </p>
          </div>
        </div>

        {/* Информация о чате */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Globe className="text-primary-600" size={20} />
              Информация о чате
            </h2>
            <button
              type="button"
              onClick={() => {
                setChatTestResult(null)
                testChatMutation.mutate()
              }}
              disabled={testChatMutation.isPending}
              className="btn btn-secondary flex items-center gap-2"
            >
              {testChatMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  Проверка...
                </>
              ) : (
                <>
                  <AlertCircle size={18} />
                  Проверить чат
                </>
              )}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">ID чата</p>
              <p className="font-medium text-gray-900 font-mono">
                {settings?.chat_id || 'Не настроен'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">ID треда</p>
              <p className="font-medium text-gray-900 font-mono">
                {settings?.thread_id || 'Не настроен'}
              </p>
            </div>
          </div>
          {chatTestResult && (
            <div className={`mt-4 p-3 rounded-lg ${
              chatTestResult.success 
                ? 'bg-green-50 border border-green-200 text-green-700' 
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              <div className="flex items-center gap-2">
                {chatTestResult.success ? (
                  <CheckCircle size={18} />
                ) : (
                  <AlertCircle size={18} />
                )}
                <span>{chatTestResult.message}</span>
              </div>
            </div>
          )}
          <p className="text-sm text-gray-500 mt-4">
            Эти значения устанавливаются автоматически при добавлении бота в чат. Используйте кнопку "Проверить чат" для проверки настроек.
          </p>
        </div>

        {/* Статус бота: текущее время и план действий */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <ListChecks className="text-primary-600" size={20} />
              Статус бота (время и план на сегодня)
            </h2>
            <button
              type="button"
              onClick={() => refetchBotStatus()}
              disabled={isBotStatusLoading}
              className="btn btn-secondary"
            >
              {isBotStatusLoading ? 'Обновление...' : 'Обновить статус'}
            </button>
          </div>
          {botStatusError && (
            <div className="mb-3 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
              {botStatusError}
            </div>
          )}
          {!botStatus ? (
            <p className="text-gray-500">Нажмите «Обновить статус», чтобы получить информацию.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Текущее время бота</p>
                  <p className="font-medium text-gray-900 font-mono">{botStatus.bot_time}</p>
                  <p className="text-xs text-gray-500">Смещение: {botStatus.time_offset_hours || 0} ч</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Системное время</p>
                  <p className="font-medium text-gray-900 font-mono">{botStatus.system_time}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Время напоминаний</p>
                  <p className="font-medium text-gray-900">{botStatus.reminder_time}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Время исключения</p>
                  <p className="font-medium text-gray-900">{botStatus.removal_time}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">Участники без отчета за день #{botStatus.current_day}</p>
                <p className="font-medium text-gray-900">{botStatus.users_without_report_count}</p>
                {botStatus.users_without_report?.length > 0 && (
                  <ul className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-700">
                    {botStatus.users_without_report.slice(0, 10).map((u) => (
                      <li key={u.user_id} className="flex items-center gap-2 overflow-hidden">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                        <span className="font-medium truncate max-w-[10rem]">{u.game_name}</span>
                        {u.username && (
                          <span className="text-gray-500 truncate">@{u.username}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Кнопка сохранения */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="btn btn-primary flex items-center gap-2"
          >
            {updateMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Сохранение...
              </>
            ) : (
              <>
                <Save size={18} />
                Сохранить настройки
              </>
            )}
          </button>

          {saved && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle size={18} />
              <span className="font-medium">Настройки сохранены!</span>
            </div>
          )}
        </div>

        {updateMutation.isError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            Ошибка при сохранении настроек: {updateMutation.error?.message || 'Неизвестная ошибка'}
          </div>
        )}
      </form>
    </div>
  )
}

