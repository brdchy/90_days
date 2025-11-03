import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api } from '../../api/client'
import { Save, X, ArrowLeft, Calendar } from 'lucide-react'

export default function AdminManageReport() {
  const { userId, day } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isNew = !userId || !day
  const userIdInt = userId ? parseInt(userId) : null
  const dayInt = day ? parseInt(day) : null

  const { data: participant } = useQuery({
    queryKey: ['participant', userIdInt],
    queryFn: () => api.getParticipant(userIdInt).then((res) => res.data),
    enabled: !!userIdInt,
  })

  const { data: reports } = useQuery({
    queryKey: ['reports', userIdInt],
    queryFn: () => api.getReports(userIdInt).then((res) => res.data),
    enabled: !!userIdInt,
  })

  const existingReport = reports?.find((r) => r.day === dayInt)

  const [formData, setFormData] = useState({
    user_id: userIdInt || '',
    day: dayInt || '',
    date: new Date().toISOString().split('T')[0],
    rest_day: false,
    progress: Array(10).fill(''),
  })

  useEffect(() => {
    if (existingReport && !isNew) {
      setFormData({
        user_id: existingReport.user_id,
        day: existingReport.day,
        date: existingReport.date,
        rest_day: existingReport.rest_day,
        progress: existingReport.progress || Array(10).fill(''),
      })
    } else if (participant) {
      setFormData((prev) => ({
        ...prev,
        user_id: participant.user_id,
        progress: participant.goals.map(() => ''),
      }))
    }
  }, [existingReport, participant, isNew])

  const createMutation = useMutation({
    mutationFn: (data) => api.createReport(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['reports'])
      navigate('/admin/reports')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data) => api.updateReport(userIdInt, dayInt, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['reports'])
      navigate('/admin/reports')
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (isNew) {
      createMutation.mutate({
        user_id: parseInt(formData.user_id),
        day: parseInt(formData.day),
        date: formData.date,
        rest_day: formData.rest_day,
        progress: formData.progress,
      })
    } else {
      updateMutation.mutate({
        progress: formData.progress,
        rest_day: formData.rest_day,
      })
    }
  }

  return (
    <div>
      <Link
        to="/admin/reports"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft size={18} />
        Назад к отчетам
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {isNew ? 'Создать отчет' : 'Редактировать отчет'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Основная информация</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isNew ? (
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">День *</label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={formData.day}
                    onChange={(e) => setFormData({ ...formData, day: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Дата *</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="input"
                    required
                  />
                </div>
              </>
            ) : (
              <div className="md:col-span-2">
                <div className="text-sm text-gray-600 mb-4">
                  <p>Участник: {participant?.game_name || `ID: ${userIdInt}`}</p>
                  <p>День: #{dayInt}</p>
                  <p>Дата: {new Date(formData.date).toLocaleDateString('ru-RU')}</p>
                </div>
              </div>
            )}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.rest_day}
                  onChange={(e) => setFormData({ ...formData, rest_day: e.target.checked })}
                  className="w-4 h-4 text-primary-600 rounded"
                />
                <span className="text-sm font-medium text-gray-700">День отдыха</span>
              </label>
            </div>
          </div>
        </div>

        {!formData.rest_day && (
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Прогресс по целям</h2>
            <div className="space-y-3">
              {formData.progress.map((progress, index) => (
                <div key={index}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Цель #{index + 1} {participant?.goals?.[index] ? `(${participant.goals[index]})` : ''}
                  </label>
                  <textarea
                    value={progress}
                    onChange={(e) => {
                      const newProgress = [...formData.progress]
                      newProgress[index] = e.target.value
                      setFormData({ ...formData, progress: newProgress })
                    }}
                    className="input min-h-[80px]"
                    placeholder={`Опишите прогресс по цели #${index + 1}`}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
            className="btn btn-primary flex items-center gap-2"
          >
            <Save size={18} />
            {createMutation.isPending || updateMutation.isPending ? 'Сохранение...' : 'Сохранить'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/reports')}
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

