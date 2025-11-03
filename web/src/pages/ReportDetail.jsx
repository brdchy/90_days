import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api/client'
import { ArrowLeft, Calendar, Target, FileText } from 'lucide-react'

export default function ReportDetail() {
  const { userId, day } = useParams()
  const userIdInt = parseInt(userId)
  const dayInt = parseInt(day)

  const { data: participant } = useQuery({
    queryKey: ['participant', userIdInt],
    queryFn: () => api.getParticipant(userIdInt).then((res) => res.data),
  })

  const { data: reports } = useQuery({
    queryKey: ['reports', userIdInt],
    queryFn: () => api.getReports(userIdInt).then((res) => res.data),
    enabled: !!participant,
  })

  const report = reports?.find((r) => r.day === dayInt)

  if (!participant || !report) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Загрузка...</p>
      </div>
    )
  }

  const goals = participant.goals || []

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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Отчет {participant.game_name || participant.full_name}
        </h1>
        <div className="flex items-center gap-4 text-gray-600">
          <div className="flex items-center gap-2">
            <Calendar size={18} />
            <span>День #{report.day}</span>
          </div>
          <span>•</span>
          <span>{new Date(report.date).toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
          })}</span>
        </div>
      </div>

      {report.rest_day ? (
        <div className="card">
          <div className="text-center py-8">
            <div className="inline-block px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-lg font-medium mb-4">
              День отдыха
            </div>
            <p className="text-gray-600">Участник использовал день отдыха</p>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="text-primary-600" size={20} />
            <h2 className="text-xl font-semibold text-gray-900">Прогресс по целям</h2>
          </div>

          <div className="space-y-4">
            {goals.map((goal, index) => {
              const progress = report.progress[index] || ''
              const hasProgress = progress && progress.trim() && progress !== '❌ Не выполнено'

              return (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Target className="text-gray-400" size={16} />
                        <h3 className="font-semibold text-gray-900">Цель #{index + 1}</h3>
                        {hasProgress && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                            Выполнено
                          </span>
                        )}
                      </div>
                      <p className="text-gray-700 mb-2">{goal || 'Цель не установлена'}</p>
                      {hasProgress && (
                        <div className="bg-gray-50 rounded p-3">
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{progress}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

