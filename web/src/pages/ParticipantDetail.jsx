import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api/client'
import { ArrowLeft, Calendar, Target, BarChart as BarChartIcon, Edit, FileText, Plus } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

export default function ParticipantDetail() {
  const { userId } = useParams()
  const userIdInt = parseInt(userId)
  
  // Проверяем, авторизован ли пользователь и это его страница
  const userAuth = JSON.parse(localStorage.getItem('user_auth') || '{}')
  const isOwnPage = userAuth.user_id === userIdInt && userAuth.authenticated

  const { data: participant } = useQuery({
    queryKey: ['participant', userIdInt],
    queryFn: () => api.getParticipant(userIdInt).then((res) => res.data),
  })

  const { data: stats } = useQuery({
    queryKey: ['stats', userIdInt],
    queryFn: () => api.getUserStats(userIdInt).then((res) => res.data),
    enabled: !!participant,
  })

  const { data: reports } = useQuery({
    queryKey: ['reports', userIdInt],
    queryFn: () => api.getReports(userIdInt).then((res) => res.data),
    enabled: !!participant,
  })

  if (!participant) {
    return <div className="text-center py-12">Загрузка...</div>
  }

  const chartData = stats?.goals_stats.map((goal) => ({
    name: `Цель ${goal.goal_num}`,
    progress: goal.progress_percent,
    days: goal.progress_days,
  })) || []

  const COLORS = ['#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#ef4444', '#f59e0b']

  return (
    <div>
      <Link
        to="/participants"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft size={18} />
        Назад к участникам
      </Link>

      {/* Заголовок */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {participant.game_name || participant.full_name}
        </h1>
        <p className="text-gray-600">@{participant.username}</p>
      </div>

      {/* Информация */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="text-primary-600" size={20} />
            <h3 className="font-semibold text-gray-900">Регистрация</h3>
          </div>
          <p className="text-gray-600">
            {new Date(participant.registered_date).toLocaleDateString('ru-RU', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <Target className="text-primary-600" size={20} />
            <h3 className="font-semibold text-gray-900">Цели</h3>
          </div>
          <p className="text-gray-600">
            {participant.goals.filter((g) => g && g.trim()).length} / 10 установлено
          </p>
        </div>

        {stats && (
          <div className="card">
            <div className="flex items-center gap-3 mb-2">
              <Target className="text-primary-600" size={20} />
              <h3 className="font-semibold text-gray-900">Отчетов</h3>
            </div>
            <p className="text-gray-600">{stats.reports_count}</p>
          </div>
        )}
      </div>

      {/* Действия для владельца страницы */}
      {isOwnPage && (
        <div className="mb-6 flex flex-wrap gap-3">
          <Link
            to={`/participants/${participant.user_id}/stats`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <BarChartIcon size={18} />
            <span>Посмотреть полную статистику</span>
          </Link>
          <Link
            to={`/participants/${participant.user_id}/edit-goals`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Edit size={18} />
            <span>Редактировать цели</span>
          </Link>
          <Link
            to="/reports/create"
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus size={18} />
            <span>Создать отчет</span>
          </Link>
        </div>
      )}
      
      {/* Ссылка на статистику для других пользователей */}
      {!isOwnPage && stats && (
        <div className="mb-6">
          <Link
            to={`/participants/${participant.user_id}/stats`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <BarChartIcon size={18} />
            <span>Посмотреть полную статистику</span>
          </Link>
        </div>
      )}

      {/* Статистика по целям */}
      {stats && stats.goals_stats.length > 0 && (
        <div className="card mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Прогресс по целям</h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="progress" name="Процент прогресса">
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Детальная статистика по целям */}
      {stats && stats.goals_stats.length > 0 && (
        <div className="card mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Детали по целям</h2>
          <div className="space-y-4">
            {stats.goals_stats.map((goal) => (
              <div key={goal.goal_num} className="border-b border-gray-200 pb-4 last:border-0">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      Цель #{goal.goal_num}
                    </h3>
                    <p className="text-gray-600 text-sm mb-2">{goal.goal_text}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>Прогресс: {goal.progress_days} дней</span>
                      {goal.last_progress_day > 0 && (
                        <span>Последний: день #{goal.last_progress_day}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary-600">
                      {goal.progress_percent.toFixed(0)}%
                    </div>
                    <div className="w-32 h-2 bg-gray-200 rounded-full mt-2">
                      <div
                        className="h-2 bg-primary-600 rounded-full"
                        style={{ width: `${Math.min(goal.progress_percent, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Отчеты */}
      {reports && reports.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Все отчеты</h2>
          <div className="space-y-3">
            {reports.map((report) => (
              <Link
                key={`${report.user_id}-${report.day}`}
                to={`/reports/${report.user_id}/${report.day}`}
                className="block border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-900">День #{report.day}</span>
                  <span className="text-sm text-gray-500">
                    {new Date(report.date).toLocaleDateString('ru-RU')}
                  </span>
                </div>
                {report.rest_day ? (
                  <span className="inline-block px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">
                    День отдыха
                  </span>
                ) : (
                  <div className="text-sm text-gray-600">
                    Прогресс по {report.progress.filter((p) => p && p.trim()).length} целям
                    <span className="text-primary-600 ml-2">→ Подробнее</span>
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

