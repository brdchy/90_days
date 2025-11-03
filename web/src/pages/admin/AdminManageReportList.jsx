import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import { Plus, Edit, Trash2, FileText, Search, Calendar } from 'lucide-react'
import { useState } from 'react'

export default function AdminManageReportList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')

  const { data: reports, isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: () => api.getReports().then((res) => res.data),
  })

  const { data: participants } = useQuery({
    queryKey: ['participants'],
    queryFn: () => api.getParticipants().then((res) => res.data),
  })

  const deleteMutation = useMutation({
    mutationFn: ({ userId, day }) => api.deleteReport(userId, day),
    onSuccess: () => {
      queryClient.invalidateQueries(['reports'])
    },
  })

  if (isLoading) {
    return <div className="text-center py-12">Загрузка...</div>
  }

  const getParticipantName = (userId) => {
    const participant = participants?.find((p) => p.user_id === userId)
    return participant?.game_name || participant?.full_name || `ID: ${userId}`
  }

  const filteredReports = reports?.filter((report) => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    const participantName = getParticipantName(report.user_id).toLowerCase()
    return (
      participantName.includes(search) ||
      report.user_id.toString().includes(search) ||
      report.day.toString().includes(search)
    )
  }) || []

  const reportsByDay = {}
  filteredReports.forEach((report) => {
    if (!reportsByDay[report.day]) {
      reportsByDay[report.day] = []
    }
    reportsByDay[report.day].push(report)
  })

  const sortedDays = Object.keys(reportsByDay)
    .map(Number)
    .sort((a, b) => b - a)

  const handleDelete = (userId, day) => {
    if (window.confirm('Вы уверены, что хотите удалить этот отчет?')) {
      deleteMutation.mutate({ userId, day })
    }
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Управление отчетами</h1>
          <p className="text-gray-600">Всего отчетов: {reports?.length || 0}</p>
        </div>
        <Link
          to="/admin/reports/new"
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          Создать отчет
        </Link>
      </div>

      {/* Поиск */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Поиск по участнику, ID или дню..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10 w-full max-w-md"
          />
        </div>
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

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Участник</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Дата</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportsByDay[day].map((report) => (
                      <tr key={`${report.user_id}-${report.day}`} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {getParticipantName(report.user_id)}
                          </div>
                          <div className="text-sm text-gray-500">ID: {report.user_id}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(report.date).toLocaleDateString('ru-RU')}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {report.rest_day ? (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary-100 text-primary-700">
                              День отдыха
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                              Прогресс: {report.progress.filter((p) => p && p.trim()).length} целей
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/admin/reports/${report.user_id}/${report.day}`}
                              className="text-primary-600 hover:text-primary-900 flex items-center gap-1"
                            >
                              <Edit size={16} />
                              Редактировать
                            </Link>
                            <button
                              onClick={() => handleDelete(report.user_id, report.day)}
                              className="text-red-600 hover:text-red-900 flex items-center gap-1"
                            >
                              <Trash2 size={16} />
                              Удалить
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <FileText className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600">
            {searchTerm ? 'Отчеты не найдены' : 'Отчетов пока нет'}
          </p>
        </div>
      )}
    </div>
  )
}

