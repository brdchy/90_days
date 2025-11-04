import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { Users, FileText, TrendingUp, ArrowRight, Play, CheckCircle } from 'lucide-react'
import StatCard from '../components/StatCard'
import { useState } from 'react'

export default function Home() {
  const queryClient = useQueryClient()
  const [startGameMessage, setStartGameMessage] = useState(null)
  
  const { data: currentDay } = useQuery({
    queryKey: ['current-day'],
    queryFn: () => api.getCurrentDay().then((res) => res.data),
  })

  const { data: participants } = useQuery({
    queryKey: ['participants'],
    queryFn: () => api.getParticipants().then((res) => res.data),
  })
  
  const { data: gameStartStatus } = useQuery({
    queryKey: ['game-start-status'],
    queryFn: () => api.getGameStartStatus().then((res) => res.data),
  })

  const activeParticipants = participants?.filter((p) => p.status === 'active') || []
  
  // Проверяем, авторизован ли пользователь
  const userAuth = JSON.parse(localStorage.getItem('user_auth') || '{}')
  const isAuthenticated = userAuth.authenticated && userAuth.user_id
  const isAgreed = gameStartStatus?.agreed_user_ids?.includes(userAuth.user_id) || false
  
  const agreeMutation = useMutation({
    mutationFn: () => api.agreeToStartGame(userAuth.user_id, userAuth.token),
    onSuccess: (data) => {
      setStartGameMessage(data.message)
      queryClient.invalidateQueries(['game-start-status'])
      queryClient.invalidateQueries(['current-day'])
      if (data.game_started) {
        setTimeout(() => {
          setStartGameMessage(null)
        }, 5000)
      }
    },
    onError: (error) => {
      setStartGameMessage(error.response?.data?.detail || 'Ошибка при согласии на начало игры')
      setTimeout(() => setStartGameMessage(null), 5000)
    },
  })
  
  const handleAgreeToStart = () => {
    if (!isAuthenticated) {
      alert('Необходима авторизация. Пожалуйста, войдите через бота Telegram.')
      return
    }
    agreeMutation.mutate()
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Добро пожаловать!
        </h1>
        <p className="text-gray-600">
          Платформа для отслеживания прогресса в игре "90 дней - 10 целей"
        </p>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Текущий день"
          value={currentDay?.current_day || '...'}
          subtitle="из 90"
          icon={TrendingUp}
          color="primary"
        />
        <StatCard
          title="Активных участников"
          value={activeParticipants.length}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Всего участников"
          value={participants?.length || 0}
          icon={Users}
          color="green"
        />
      </div>

      {/* Кнопка начала игры */}
      {gameStartStatus && !gameStartStatus.game_started && (
        <div className="card mb-8 bg-gradient-to-r from-primary-50 to-blue-50 border-2 border-primary-200">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                <Play className="text-primary-600" size={24} />
                Начать игру
              </h2>
              <p className="text-gray-700 mb-4">
                Игра начнется только после того, как все участники согласятся с проведением игры.
                {gameStartStatus.total_participants > 0 && (
                  <span className="block mt-2 text-sm">
                    Согласны: {gameStartStatus.agreed_participants} из {gameStartStatus.total_participants}
                  </span>
                )}
              </p>
              {isAuthenticated && (
                <button
                  onClick={handleAgreeToStart}
                  disabled={isAgreed || agreeMutation.isPending}
                  className={`btn ${
                    isAgreed 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-primary-600 hover:bg-primary-700'
                  } text-white flex items-center gap-2`}
                >
                  {agreeMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Обработка...
                    </>
                  ) : isAgreed ? (
                    <>
                      <CheckCircle size={18} />
                      Вы уже согласны
                    </>
                  ) : (
                    <>
                      <Play size={18} />
                      Согласен начать игру
                    </>
                  )}
                </button>
              )}
              {!isAuthenticated && (
                <p className="text-sm text-gray-600">
                  Войдите через бота Telegram, чтобы согласиться на начало игры
                </p>
              )}
              {startGameMessage && (
                <div className={`mt-4 p-3 rounded-lg ${
                  startGameMessage.includes('началась') || startGameMessage.includes('зарегистрировано')
                    ? 'bg-green-50 border border-green-200 text-green-700'
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}>
                  {startGameMessage}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Быстрые ссылки */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          to="/participants"
          className="card hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Участники
              </h3>
              <p className="text-gray-600">
                Просмотрите список всех участников и их прогресс
              </p>
            </div>
            <ArrowRight
              className="text-primary-600 group-hover:translate-x-1 transition-transform"
              size={24}
            />
          </div>
        </Link>

        <Link
          to="/reports"
          className="card hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Отчеты
              </h3>
              <p className="text-gray-600">
                Просмотрите все ежедневные отчеты участников
              </p>
            </div>
            <ArrowRight
              className="text-primary-600 group-hover:translate-x-1 transition-transform"
              size={24}
            />
          </div>
        </Link>
        {isAuthenticated && (
          <Link
            to="/reports/create"
            className="card hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Создать отчет
                </h3>
                <p className="text-gray-600">
                  Заполните отчет за текущий день по своим целям
                </p>
              </div>
              <ArrowRight
                className="text-primary-600 group-hover:translate-x-1 transition-transform"
                size={24}
              />
            </div>
          </Link>
        )}
        {isAuthenticated && (
          <Link
            to={`/participants/${userAuth.user_id}/edit-goals`}
            className="card hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Мои цели
                </h3>
                <p className="text-gray-600">
                  Просмотр и редактирование ваших 10 целей
                </p>
              </div>
              <ArrowRight
                className="text-primary-600 group-hover:translate-x-1 transition-transform"
                size={24}
              />
            </div>
          </Link>
        )}
      </div>
    </div>
  )
}
