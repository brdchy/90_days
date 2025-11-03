import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import { Save, X, Plus, Trash2 } from 'lucide-react'

export default function AdminManageParticipant() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isNew = userId === 'new'
  const userIdInt = isNew ? null : parseInt(userId)

  const { data: participant, isLoading } = useQuery({
    queryKey: ['participant', userIdInt],
    queryFn: () => api.getParticipant(userIdInt).then((res) => res.data),
    enabled: !isNew,
  })

  const [formData, setFormData] = useState({
    user_id: '',
    username: '',
    full_name: '',
    game_name: '',
    status: 'active',
    goals: Array(10).fill(''),
  })

  // Заполняем форму данными участника
  useEffect(() => {
    if (participant && !isNew && formData.user_id === '') {
      setFormData({
        user_id: participant.user_id.toString(),
        username: participant.username,
        full_name: participant.full_name,
        game_name: participant.game_name,
        status: participant.status,
        goals: participant.goals || Array(10).fill(''),
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participant, isNew])

  const createMutation = useMutation({
    mutationFn: (data) => api.createParticipant(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['participants'])
      navigate('/admin/participants')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data) => api.updateParticipant(userIdInt, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['participants'])
      queryClient.invalidateQueries(['participant', userIdInt])
      navigate('/admin/participants')
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (isNew) {
      createMutation.mutate({
        user_id: parseInt(formData.user_id),
        username: formData.username,
        full_name: formData.full_name,
        game_name: formData.game_name,
        goals: formData.goals,
      })
    } else {
      updateMutation.mutate({
        game_name: formData.game_name,
        status: formData.status,
        goals: formData.goals,
      })
    }
  }

  if (isLoading && !isNew) {
    return <div className="text-center py-12">Загрузка...</div>
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {isNew ? 'Создать участника' : 'Редактировать участника'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Основная информация</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isNew && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">User ID *</label>
                  <input
                    type="number"
                    value={formData.user_id}
                    onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Username *</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="input"
                    required
                  />
                </div>
              </>
            )}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Game Name *</label>
              <input
                type="text"
                value={formData.game_name}
                onChange={(e) => setFormData({ ...formData, game_name: e.target.value })}
                className="input"
                required
              />
            </div>
            {!isNew && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Статус</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="input"
                >
                  <option value="active">Активен</option>
                  <option value="removed">Удален</option>
                  <option value="inactive">Неактивен</option>
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Цели (до 10)</h2>
          <div className="space-y-3">
            {formData.goals.map((goal, index) => (
              <div key={index}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Цель #{index + 1}
                </label>
                <input
                  type="text"
                  value={goal}
                  onChange={(e) => {
                    const newGoals = [...formData.goals]
                    newGoals[index] = e.target.value
                    setFormData({ ...formData, goals: newGoals })
                  }}
                  className="input"
                  placeholder={`Введите цель #${index + 1}`}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
            className="btn btn-primary flex items-center gap-2"
          >
            <Save size={18} />
            {createMutation.isPending || updateMutation.isPending
              ? 'Сохранение...'
              : 'Сохранить'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/participants')}
            className="btn btn-secondary flex items-center gap-2"
          >
            <X size={18} />
            Отмена
          </button>
        </div>

        {(createMutation.isError || updateMutation.isError) && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            Ошибка: {(createMutation.error || updateMutation.error)?.response?.data?.detail || 'Неизвестная ошибка'}
          </div>
        )}
      </form>
    </div>
  )
}

