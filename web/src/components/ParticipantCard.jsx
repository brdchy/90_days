import { Link } from 'react-router-dom'
import { User } from 'lucide-react'

export default function ParticipantCard({ participant }) {
  const goalsCount = participant.goals.filter((g) => g && g.trim()).length

  return (
    <Link
      to={`/participants/${participant.user_id}`}
      className="card hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-900 text-lg">
            {participant.game_name || participant.full_name}
          </h3>
          <p className="text-sm text-gray-500">@{participant.username}</p>
        </div>
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            participant.status === 'active'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {participant.status === 'active' ? 'Активен' : 'Неактивен'}
        </span>
      </div>
      <div className="flex items-center gap-4 text-sm text-gray-600">
        <span>Целей: {goalsCount}/10</span>
        <span>
          Регистрация:{' '}
          {new Date(participant.registered_date).toLocaleDateString('ru-RU')}
        </span>
      </div>
    </Link>
  )
}

