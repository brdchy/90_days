import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { Users, FileText, TrendingUp, ArrowRight } from 'lucide-react'
import StatCard from '../components/StatCard'

export default function Home() {
  const { data: currentDay } = useQuery({
    queryKey: ['current-day'],
    queryFn: () => api.getCurrentDay().then((res) => res.data),
  })

  const { data: participants } = useQuery({
    queryKey: ['participants'],
    queryFn: () => api.getParticipants().then((res) => res.data),
  })

  const activeParticipants = participants?.filter((p) => p.status === 'active') || []

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

      </div>
    </div>
  )
}
