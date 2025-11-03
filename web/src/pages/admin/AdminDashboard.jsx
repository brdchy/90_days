import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '../../api/client'
import { Users, FileText, TrendingUp, Clock, Settings, MessageSquare, CheckCircle } from 'lucide-react'
import StatCard from '../../components/StatCard'
import { Link } from 'react-router-dom'
import { useState } from 'react'

export default function AdminDashboard() {
  const { data: adminStats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.getAdminStats().then((res) => res.data),
  })

  const { data: settings } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => api.getSettings().then((res) => res.data),
  })

  if (isLoading) {
    return <div className="text-center py-12">Загрузка...</div>
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Панель администратора</h1>
        <p className="text-gray-600">Управление игрой и участниками</p>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Текущий день"
          value={adminStats?.current_day || '...'}
          subtitle="из 90"
          icon={TrendingUp}
          color="primary"
        />
        <StatCard
          title="Активных участников"
          value={adminStats?.active_users || 0}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Отчетов сегодня"
          value={`${adminStats?.reports_today || 0}/${adminStats?.active_users || 0}`}
          icon={FileText}
          color="green"
        />
        <StatCard
          title="Процент отчетов"
          value={`${adminStats?.reports_percentage?.toFixed(0) || 0}%`}
          icon={FileText}
          color="purple"
        />
      </div>

      {/* Быстрые действия */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Link
          to="/admin/participants"
          className="card hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Участники</h3>
              <p className="text-gray-600 text-sm">
                Просмотр и управление участниками
              </p>
            </div>
            <Users className="text-primary-600 group-hover:scale-110 transition-transform" size={32} />
          </div>
        </Link>

        <Link
          to="/admin/settings"
          className="card hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Настройки</h3>
              <p className="text-gray-600 text-sm">
                Настройка времени и параметров бота
              </p>
            </div>
            <Settings className="text-primary-600 group-hover:scale-110 transition-transform" size={32} />
          </div>
        </Link>

        <ChatTestCard settings={settings} />
      </div>

      {/* Информация о настройках */}
      {settings && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Settings className="text-primary-600" size={20} />
              Настройки времени
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600 mb-1">Время напоминаний</p>
                <p className="font-medium text-gray-900 flex items-center gap-2">
                  <Clock size={16} />
                  {settings.reminder_time || '18:00 (по умолчанию)'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Время исключения</p>
                <p className="font-medium text-gray-900 flex items-center gap-2">
                  <Clock size={16} />
                  {settings.removal_time || '23:30 (по умолчанию)'}
                </p>
              </div>
              <Link
                to="/admin/settings"
                className="text-primary-600 hover:text-primary-700 text-sm font-medium inline-flex items-center gap-1"
              >
                Изменить настройки →
              </Link>
            </div>
          </div>

          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MessageSquare className="text-primary-600" size={20} />
              Информация о чате
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600 mb-1">ID чата</p>
                <p className="font-medium text-gray-900 font-mono">
                  {settings.chat_id || 'Не настроен'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">ID треда</p>
                <p className="font-medium text-gray-900 font-mono">
                  {settings.thread_id || 'Не настроен'}
                </p>
              </div>
              {settings.chat_id && settings.thread_id && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle size={16} />
                  <span>Чат настроен</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ChatTestCard({ settings }) {
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState(null)

  const testChatMutation = useMutation({
    mutationFn: () => api.testChat(),
    onSuccess: (data) => {
      setResult({ success: true, message: data.message })
      setTimeout(() => setResult(null), 5000)
    },
    onError: (error) => {
      setResult({ success: false, message: error.response?.data?.detail || 'Ошибка при проверке чата' })
      setTimeout(() => setResult(null), 5000)
    },
    onSettled: () => {
      setTesting(false)
    },
  })

  const handleTest = () => {
    if (!settings?.chat_id || !settings?.thread_id) {
      setResult({ success: false, message: 'Чат не настроен' })
      setTimeout(() => setResult(null), 3000)
      return
    }

    setTesting(true)
    setResult(null)
    testChatMutation.mutate()
  }

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Проверка чата</h3>
          <p className="text-gray-600 text-sm">
            Тест отправки сообщений в чат
          </p>
        </div>
        <MessageSquare className="text-primary-600" size={32} />
      </div>

      {settings?.chat_id && settings?.thread_id ? (
        <div className="space-y-3">
          <button
            onClick={handleTest}
            disabled={testing}
            className="btn btn-primary w-full flex items-center justify-center gap-2"
          >
            {testing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Проверка...
              </>
            ) : (
              <>
                <MessageSquare size={16} />
                Проверить чат
              </>
            )}
          </button>

          {result && (
            <div
              className={`p-3 rounded-lg text-sm ${
                result.success
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {result.message}
            </div>
          )}

          <div className="text-xs text-gray-500 space-y-1">
            <div>Чат ID: {settings.chat_id}</div>
            <div>Тред ID: {settings.thread_id}</div>
          </div>
        </div>
      ) : (
        <div className="text-sm text-gray-500">
          Чат не настроен. Добавьте бота в чат для проверки.
        </div>
      )}
    </div>
  )
}

