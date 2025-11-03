import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api/client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { Target, TrendingUp, Calendar, ArrowLeft } from 'lucide-react'

export default function ParticipantStats() {
  const { userId } = useParams()
  const userIdInt = parseInt(userId)

  const { data: stats, isLoading } = useQuery({
    queryKey: ['stats', userIdInt],
    queryFn: () => api.getUserStats(userIdInt).then((res) => res.data),
  })

  const { data: reports } = useQuery({
    queryKey: ['reports', userIdInt],
    queryFn: () => api.getReports(userIdInt).then((res) => res.data),
    enabled: !!stats,
  })

  if (isLoading) {
    return <div className="text-center py-12">Загрузка...</div>
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Статистика недоступна</p>
      </div>
    )
  }

  const chartData = stats.goals_stats.map((goal) => ({
    name: `Цель ${goal.goal_num}`,
    progress: goal.progress_percent,
    days: goal.progress_days,
  }))

  const dailyProgress = reports?.map((report) => {
    const progressCount = report.progress.filter((p) => p && p.trim()).length
    return {
      day: report.day,
      progress: progressCount,
      date: report.date,
    }
  }) || []

  return (
    <div>
      <Link
        to={`/participants/${userIdInt}`}
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft size={18} />
        Назад к участнику
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Статистика</h1>
        <p className="text-gray-600">{stats.game_name}</p>
      </div>

      {/* Общая статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="text-primary-600" size={20} />
            <h3 className="font-semibold text-gray-900">Текущий день</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.current_day}</p>
          <p className="text-sm text-gray-500 mt-1">из 90</p>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <Target className="text-primary-600" size={20} />
            <h3 className="font-semibold text-gray-900">Отчетов</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.reports_count}</p>
          <p className="text-sm text-gray-500 mt-1">
            {stats.has_today_report ? (
              <span className="text-green-600">Сегодня отправлен ✓</span>
            ) : (
              <span className="text-red-600">Сегодня не отправлен</span>
            )}
          </p>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="text-primary-600" size={20} />
            <h3 className="font-semibold text-gray-900">Средний прогресс</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {stats.goals_stats.length > 0
              ? (
                  stats.goals_stats.reduce((sum, g) => sum + g.progress_percent, 0) /
                  stats.goals_stats.length
                ).toFixed(0)
              : 0}
            %
          </p>
        </div>
      </div>

      {/* График прогресса по дням */}
      {dailyProgress.length > 0 && (
        <div className="card mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Прогресс по дням</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyProgress}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="progress"
                stroke="#0ea5e9"
                strokeWidth={2}
                name="Целей с прогрессом"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* График по целям */}
      {chartData.length > 0 && (
        <div className="card mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Прогресс по целям</h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="progress" name="Процент прогресса" fill="#0ea5e9" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Детальная статистика */}
      {stats.goals_stats.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Детали по целям</h2>
          <div className="space-y-4">
            {stats.goals_stats.map((goal) => (
              <div key={goal.goal_num} className="border-b border-gray-200 pb-4 last:border-0">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">Цель #{goal.goal_num}</h3>
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
    </div>
  )
}

