import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { Users, CheckCircle, XCircle, Trophy, TrendingUp, AlertTriangle, BarChart3 } from 'lucide-react'

export default function Participants() {
  const { data: participants, isLoading } = useQuery({
    queryKey: ['participants'],
    queryFn: () => api.getParticipants().then((res) => res.data),
  })

  const { data: communityStats, isLoading: statsLoading } = useQuery({
    queryKey: ['community-stats'],
    queryFn: () => api.getCommunityStats().then((res) => res.data),
  })

  if (isLoading || statsLoading) {
    return <div className="text-center py-12">Загрузка...</div>
  }

  const activeParticipants = participants?.filter((p) => p.status === 'active') || []
  const inactiveParticipants = participants?.filter((p) => p.status !== 'active') || []
  
  // Создаем маппинг статистики для быстрого доступа
  const statsMap = {}
  if (communityStats?.participants_ranking) {
    communityStats.participants_ranking.forEach(p => {
      statsMap[p.user_id] = p
    })
  }

  // Находим участников, которые отстают (нет отчета за сегодня)
  const participantsWithoutTodayReport = activeParticipants.filter(p => {
    const stats = statsMap[p.user_id]
    return stats && !stats.has_today_report
  })

  // Топ-3 участников
  const topParticipants = communityStats?.participants_ranking?.slice(0, 3) || []

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Участники</h1>
        <p className="text-gray-600">
          Всего: {participants?.length || 0} | Активных: {activeParticipants.length}
          {communityStats && ` | День игры: ${communityStats.current_day}/90`}
        </p>
      </div>

      {/* Общая статистика комьюнити */}
      {communityStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="card">
            <div className="flex items-center gap-3 mb-2">
              <BarChart3 className="text-primary-600" size={20} />
              <h3 className="font-semibold text-gray-900">Текущий день</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900">{communityStats.current_day}</p>
            <p className="text-sm text-gray-500">из 90</p>
          </div>

          <div className="card">
            <div className="flex items-center gap-3 mb-2">
              <Users className="text-green-600" size={20} />
              <h3 className="font-semibold text-gray-900">Активных</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900">{communityStats.active_participants}</p>
            <p className="text-sm text-gray-500">участников</p>
          </div>

          <div className="card">
            <div className="flex items-center gap-3 mb-2">
              {participantsWithoutTodayReport.length > 0 ? (
                <AlertTriangle className="text-red-600" size={20} />
              ) : (
                <CheckCircle className="text-green-600" size={20} />
              )}
              <h3 className="font-semibold text-gray-900">Без отчета сегодня</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900">{participantsWithoutTodayReport.length}</p>
            <p className="text-sm text-gray-500">участников</p>
          </div>
        </div>
      )}

      {/* Топ участников */}
      {topParticipants.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Trophy className="text-yellow-600" size={20} />
            Топ участников
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topParticipants.map((top, idx) => {
              const participant = activeParticipants.find(p => p.user_id === top.user_id)
              if (!participant) return null
              
              return (
                <div
                  key={top.user_id}
                  className={`card ${
                    idx === 0 ? 'ring-2 ring-yellow-400' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-gray-400">#{top.rank}</span>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {top.game_name}
                        </h3>
                        <p className="text-xs text-gray-500">@{top.username}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Отчетов:</span>
                      <span className="font-medium text-gray-900">{top.reports_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Прогресс:</span>
                      <span className="font-medium text-gray-900">{top.avg_progress}%</span>
                    </div>
                    {top.has_today_report && (
                      <div className="text-green-600 text-xs">✓ Отчет за сегодня</div>
                    )}
                  </div>
                  <Link
                    to={`/participants/${top.user_id}`}
                    className="block mt-3 text-sm text-primary-600 hover:text-primary-700"
                  >
                    Подробнее →
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Участники без отчета сегодня */}
      {participantsWithoutTodayReport.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="text-red-600" size={20} />
            Нужна поддержка
          </h2>
          <p className="text-gray-600 mb-4 text-sm">
            Эти участники еще не отправили отчет за сегодня. Возможно, им нужна помощь или мотивация!
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {participantsWithoutTodayReport.map((participant) => (
              <ParticipantCard key={participant.user_id} participant={participant} stats={statsMap[participant.user_id]} />
            ))}
          </div>
        </div>
      )}

      {/* Активные участники */}
      {activeParticipants.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle className="text-green-600" size={20} />
            Все активные участники
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeParticipants.map((participant) => (
              <ParticipantCard key={participant.user_id} participant={participant} stats={statsMap[participant.user_id]} />
            ))}
          </div>
        </div>
      )}

      {/* Неактивные участники */}
      {inactiveParticipants.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <XCircle className="text-red-600" size={20} />
            Неактивные участники
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inactiveParticipants.map((participant) => (
              <ParticipantCard key={participant.user_id} participant={participant} />
            ))}
          </div>
        </div>
      )}

      {participants?.length === 0 && (
        <div className="text-center py-12">
          <Users className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600">Участников пока нет</p>
        </div>
      )}
    </div>
  )
}

function ParticipantCard({ participant, stats }) {
  const goalsCount = participant.goals.filter((g) => g && g.trim()).length

  return (
    <Link
      to={`/participants/${participant.user_id}`}
      className="card hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 text-lg">
              {participant.game_name || participant.full_name}
            </h3>
            {stats?.rank && (
              <span className="text-xs font-medium text-gray-400">#{stats.rank}</span>
            )}
          </div>
          <p className="text-sm text-gray-500">@{participant.username}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              participant.status === 'active'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {participant.status === 'active' ? 'Активен' : 'Неактивен'}
          </span>
          {stats && !stats.has_today_report && (
            <span className="text-xs text-red-600 flex items-center gap-1">
              <AlertTriangle size={12} />
              Нет отчета
            </span>
          )}
        </div>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-4 text-gray-600">
          <span>Целей: {goalsCount}/10</span>
          {stats && (
            <>
              <span className="flex items-center gap-1">
                <TrendingUp size={14} className="text-primary-600" />
                {stats.avg_progress}%
              </span>
            </>
          )}
        </div>
        {stats && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Отчетов: {stats.reports_count}</span>
            {stats.has_today_report && (
              <span className="text-green-600">✓ Сегодня</span>
            )}
          </div>
        )}
        <div className="text-xs text-gray-500">
          Регистрация: {new Date(participant.registered_date).toLocaleDateString('ru-RU')}
        </div>
      </div>
    </Link>
  )
}

