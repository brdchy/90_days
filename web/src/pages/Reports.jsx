import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { FileText, Calendar, User } from 'lucide-react'

export default function Reports() {
  const { data: reports, isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: () => api.getReports().then((res) => res.data),
  })

  const { data: participants } = useQuery({
    queryKey: ['participants'],
    queryFn: () => api.getParticipants().then((res) => res.data),
  })

  if (isLoading) {
    return <div className="text-center py-12">Загрузка...</div>
  }

  // Группируем отчеты по дням
  const reportsByDay = {}
  reports?.forEach((report) => {
    if (!reportsByDay[report.day]) {
      reportsByDay[report.day] = []
    }
    reportsByDay[report.day].push(report)
  })

  const sortedDays = Object.keys(reportsByDay)
    .map(Number)
    .sort((a, b) => b - a)

  const getParticipantName = (userId) => {
    const participant = participants?.find((p) => p.user_id === userId)
    return participant?.game_name || participant?.full_name || `ID: ${userId}`
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Отчеты</h1>
        <p className="text-gray-600">
          Всего отчетов: {reports?.length || 0}
        </p>
      </div>

      {sortedDays.length > 0 ? (
        <div className="space-y-6">
          {sortedDays.map((day) => (
            <div key={day} className="card">
              <div className="flex items-center gap-3 mb-4">
                <Calendar className="text-primary-600" size={20} />
                <h2 className="text-xl font-semibold text-gray-900">День #{day}</h2>
                <span className="text-sm text-gray-500">
                  ({reportsByDay[day].length} {reportsByDay[day].length === 1 ? 'отчет' : 'отчетов'})
                </span>
              </div>

              <div className="space-y-3">
                {reportsByDay[day].map((report) => (
                  <Link
                    key={`${report.user_id}-${report.day}`}
                    to={`/reports/${report.user_id}/${report.day}`}
                    className="block border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <User className="text-gray-400" size={16} />
                        <span className="font-medium text-gray-900">
                          {getParticipantName(report.user_id)}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(report.date).toLocaleDateString('ru-RU', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>

                    {report.rest_day ? (
                      <span className="inline-block px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">
                        День отдыха
                      </span>
                    ) : (
                      <div className="text-sm text-gray-600">
                        Прогресс по{' '}
                        <span className="font-medium text-gray-900">
                          {report.progress.filter((p) => p && p.trim()).length}
                        </span>{' '}
                        {report.progress.filter((p) => p && p.trim()).length === 1
                          ? 'цели'
                          : 'целям'}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <FileText className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600">Отчетов пока нет</p>
        </div>
      )}
    </div>
  )
}

