import { AlertCircle } from 'lucide-react'

export default function Error({ message = 'Произошла ошибка при загрузке данных' }) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
        <p className="text-gray-700">{message}</p>
      </div>
    </div>
  )
}

