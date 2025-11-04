import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { Save, Calendar, Target, CheckCircle, X } from 'lucide-react'

export default function CreateReport() {
  const { day } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  
  // Получаем токен из localStorage
  const userAuth = JSON.parse(localStorage.getItem('user_auth') || '{}')
  const token = userAuth.token
  const userId = userAuth.user_id
  
  const [reportDay, setReportDay] = useState(day ? parseInt(day) : 1)
  const [restDay, setRestDay] = useState(false)
  const [progress, setProgress] = useState(Array(10).fill(''))
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  
  const { data: participant } = useQuery({
    queryKey: ['participant', userId],
    queryFn: () => api.getParticipant(userId).then((res) => res.data),
    enabled: !!userId,
  })
  
  const { data: currentDay } = useQuery({
    queryKey: ['current-day'],
    queryFn: () => api.getCurrentDay().then((res) => res.data),
  })
  
  const { data: existingReport } = useQuery({
    queryKey: ['report', userId, reportDay],
    queryFn: () => api.getReports(userId).then((res) => {
      const reports = res.data
      return reports.find(r => r.day === reportDay)
    }),
    enabled: !!userId && !!reportDay,
  })
  
  useEffect(() => {
    if (existingReport) {
      setProgress(existingReport.progress || Array(10).fill(''))
      setRestDay(existingReport.rest_day || false)
      setDate(existingReport.date || date)
    }
  }, [existingReport])
  
  const createMutation = useMutation({
    mutationFn: (reportData) => api.createUserReport(reportData, token),
    onSuccess: () => {
      queryClient.invalidateQueries(['reports', userId])
      queryClient.invalidateQueries(['stats', userId])
      navigate(`/participants/${userId}`)
    },
  })
  
  const updateMutation = useMutation({
    mutationFn: (reportData) => api.updateUserReport(reportDay, reportData, token),
    onSuccess: () => {
      queryClient.invalidateQueries(['reports', userId])
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
    
    const reportData = {
      user_id: userId,
      day: reportDay,
      date: date,
      progress: progress,
      rest_day: restDay
    }
    
    if (existingReport) {
      updateMutation.mutate({
        progress: progress,
        rest_day: restDay
      })
    } else {
      createMutation.mutate(reportData)
    }
  }
  
  if (!token || !userId) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">Необходима авторизация</p>
        <p className="text-sm text-gray-500">Пожалуйста, войдите через бота Telegram</p>
      </div>
    )
  }
  
  const maxDay = currentDay?.current_day || 90
  const goals = participant?.goals || []
  
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {existingReport ? 'Редактировать отчет' : 'Создать отчет'}
        </h1>
        <p className="text-gray-600">
          {participant?.game_name || participant?.full_name}
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="text-primary-600" size={20} />
            <h2 className="text-xl font-semibold text-gray-900">День игры</h2>
          </div>
          <div>
            <label htmlFor="day" className="block text-sm font-medium text-gray-700 mb-2">
              День (1-{maxDay})
            </label>
            <input
              id="day"
              type="number"
              min="1"
              max={maxDay}
              value={reportDay}
              onChange={(e) => setReportDay(parseInt(e.target.value) || 1)}
              className="input max-w-xs"
              required
              disabled={!!existingReport}
            />
            <p className="text-sm text-gray-500 mt-2">
              Текущий день игры: {currentDay?.current_day || '...'}
            </p>
          </div>
          
          <div className="mt-4">
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
              Дата
            </label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input max-w-xs"
              required
            />
          </div>
          
          <div className="mt-4 flex items-center gap-3">
            <input
              id="rest-day"
              type="checkbox"
              checked={restDay}
              onChange={(e) => setRestDay(e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded"
            />
            <label htmlFor="rest-day" className="text-sm font-medium text-gray-700">
              День отдыха
            </label>
          </div>
        </div>
        
        {!restDay && (
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <Target className="text-primary-600" size={20} />
              <h2 className="text-xl font-semibold text-gray-900">Прогресс по целям</h2>
            </div>
            <p className="text-gray-600 mb-4 text-sm">
              Укажите прогресс по каждой цели. Оставьте пустым, если цель не выполнена.
            </p>
            <div className="space-y-4">
              {goals.map((goal, index) => {
                if (!goal || !goal.trim()) return null
                return (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Цель #{index + 1}: {goal}
                    </label>
                    <textarea
                      value={progress[index] || ''}
                      onChange={(e) => {
                        const newProgress = [...progress]
                        newProgress[index] = e.target.value
                        setProgress(newProgress)
                      }}
                      className="input w-full"
                      rows={3}
                      placeholder="Опишите ваш прогресс..."
                    />
                  </div>
                )
              })}
            </div>
          </div>
        )}
        
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
            className="btn btn-primary flex items-center gap-2"
          >
            {createMutation.isPending || updateMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Сохранение...
              </>
            ) : (
              <>
                <Save size={18} />
                Сохранить отчет
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
        
        {(createMutation.isError || updateMutation.isError) && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            Ошибка: {(createMutation.error || updateMutation.error)?.response?.data?.detail || 'Неизвестная ошибка'}
          </div>
        )}
      </form>
    </div>
  )
}

