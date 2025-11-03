import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../../api/client'
import { Users, CheckCircle, XCircle, ArrowRight, Eye, Search, Plus, Edit, Trash2 } from 'lucide-react'
import { useState } from 'react'

export default function AdminParticipants() {
  const [searchTerm, setSearchTerm] = useState('')
  const queryClient = useQueryClient()

  const { data: participants, isLoading } = useQuery({
    queryKey: ['participants'],
    queryFn: () => api.getParticipants().then((res) => res.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (userId) => api.deleteParticipant(userId),
    onSuccess: () => {
      queryClient.invalidateQueries(['participants'])
    },
  })

  const handleDelete = (userId, name) => {
    if (window.confirm(`Вы уверены, что хотите удалить участника "${name}"? Это также удалит все его отчеты!`)) {
      deleteMutation.mutate(userId)
    }
  }

  if (isLoading) {
    return <div className="text-center py-12">Загрузка...</div>
  }

  // Фильтрация по поисковому запросу
  const filteredParticipants = participants?.filter((p) => {
    const search = searchTerm.toLowerCase()
    return (
      p.game_name?.toLowerCase().includes(search) ||
      p.full_name?.toLowerCase().includes(search) ||
      p.username?.toLowerCase().includes(search) ||
      p.user_id.toString().includes(search)
    )
  }) || []

  const activeParticipants = filteredParticipants.filter((p) => p.status === 'active')
  const inactiveParticipants = filteredParticipants.filter((p) => p.status !== 'active')

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Управление участниками</h1>
          <p className="text-gray-600">
            Всего: {participants?.length || 0} | Активных: {activeParticipants.length} | Неактивных: {inactiveParticipants.length}
          </p>
        </div>
        <Link
          to="/admin/participants/new"
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          Создать участника
        </Link>
      </div>

      {/* Поиск */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Поиск по имени, username или ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10 w-full max-w-md"
          />
        </div>
      </div>

      {/* Активные участники */}
      {activeParticipants.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle className="text-green-600" size={20} />
            Активные участники ({activeParticipants.length})
          </h2>
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full align-middle">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Имя
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Username
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Целей
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Регистрация
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Действия
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {activeParticipants.map((participant) => {
                      const goalsCount = participant.goals.filter((g) => g && g.trim()).length
                      return (
                        <tr key={participant.user_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {participant.game_name || participant.full_name}
                            </div>
                            <div className="text-sm text-gray-500">ID: {participant.user_id}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">@{participant.username}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{goalsCount}/10</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {new Date(participant.registered_date).toLocaleDateString('ru-RU')}
                            </div>
                          </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-3">
                            <Link
                              to={`/participants/${participant.user_id}`}
                              className="text-primary-600 hover:text-primary-900 flex items-center gap-1"
                            >
                              <Eye size={16} />
                              Просмотр
                            </Link>
                            <Link
                              to={`/admin/participants/${participant.user_id}`}
                              className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                            >
                              <Edit size={16} />
                              Редактировать
                            </Link>
                            <button
                              onClick={() => handleDelete(participant.user_id, participant.game_name || participant.full_name)}
                              className="text-red-600 hover:text-red-900 flex items-center gap-1"
                            >
                              <Trash2 size={16} />
                              Удалить
                            </button>
                          </div>
                        </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Неактивные участники */}
      {inactiveParticipants.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <XCircle className="text-red-600" size={20} />
            Неактивные участники ({inactiveParticipants.length})
          </h2>
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full align-middle">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Имя
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Username
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Статус
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Действия
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {inactiveParticipants.map((participant) => (
                      <tr key={participant.user_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {participant.game_name || participant.full_name}
                          </div>
                          <div className="text-sm text-gray-500">ID: {participant.user_id}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">@{participant.username}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            {participant.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-3">
                            <Link
                              to={`/participants/${participant.user_id}`}
                              className="text-primary-600 hover:text-primary-900 flex items-center gap-1"
                            >
                              <Eye size={16} />
                              Просмотр
                            </Link>
                            <Link
                              to={`/admin/participants/${participant.user_id}`}
                              className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                            >
                              <Edit size={16} />
                              Редактировать
                            </Link>
                            <button
                              onClick={() => handleDelete(participant.user_id, participant.game_name || participant.full_name)}
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
          </div>
        </div>
      )}

      {filteredParticipants.length === 0 && (
        <div className="text-center py-12">
          <Users className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600">
            {searchTerm ? 'Участники не найдены' : 'Участников пока нет'}
          </p>
        </div>
      )}
    </div>
  )
}
