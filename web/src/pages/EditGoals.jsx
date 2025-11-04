import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { Save, Target, X } from 'lucide-react'

export default function EditGoals() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  
  // Получаем токен из localStorage
  const userAuth = JSON.parse(localStorage.getItem('user_auth') || '{}')
  const token = userAuth.token
  const userId = userAuth.user_id
  
  const [goals, setGoals] = useState(Array(10).fill(''))
  
  const { data: participant, isLoading } = useQuery({
    queryKey: ['participant', userId],
    queryFn: () => api.getParticipant(userId).then((res) => res.data),
    enabled: !!userId,
    onSuccess: (data) => {
      if (data?.goals) {
        setGoals(data.goals.length === 10 ? data.goals : [...data.goals, ...Array(10 - data.goals.length).fill('')])
      }
    },
  })
  
  const updateMutation = useMutation({
    mutationFn: (goalsData) => api.updateUserGoals({ goals: goalsData }, token),
    onSuccess: () => {
      queryClient.invalidateQueries(['participant', userId])
      queryClient.invalidateQueries(['stats', userId])
      navigate(`/participants/${userId}`)
    },
  })
  
  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!token || !userId) {
      alert('Необходима авторизация. Пожалуйста, войдите через бота.')
      return
    }
    
    updateMutation.mutate(goals)
  }
  
  if (!token || !userId) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">Необходима авторизация</p>
        <p className="text-sm text-gray-500">Пожалуйста, войдите через бота Telegram</p>
      </div>
    )
  }
  
  if (isLoading) {
    return <div className="text-center py-12">Загрузка...</div>
  }
  
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Редактировать цели</h1>
        <p className="text-gray-600">
          {participant?.game_name || participant?.full_name}
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <Target className="text-primary-600" size={20} />
            <h2 className="text-xl font-semibold text-gray-900">10 целей</h2>
          </div>
          <p className="text-gray-600 mb-4 text-sm">
            Установите до 10 целей, которые вы хотите достичь за 90 дней.
          </p>
          <div className="space-y-4">
            {goals.map((goal, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Цель #{index + 1}
                </label>
                <textarea
                  value={goal || ''}
                  onChange={(e) => {
                    const newGoals = [...goals]
                    newGoals[index] = e.target.value
                    setGoals(newGoals)
                  }}
                  className="input w-full"
                  rows={2}
                  placeholder={`Опишите цель #${index + 1}...`}
                />
              </div>
            ))}
          </div>
        </div>
        
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
                Сохранить цели
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/participants/${userId}`)}
            className="btn btn-secondary"
          >
            Отмена
          </button>
        </div>
        
        {updateMutation.isError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            Ошибка: {updateMutation.error?.response?.data?.detail || 'Неизвестная ошибка'}
          </div>
        )}
      </form>
    </div>
  )
}

