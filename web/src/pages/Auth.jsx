import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import apiClient from '../api/client'
import { CheckCircle, AlertCircle, Loader } from 'lucide-react'

export default function Auth() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('loading') // loading, success, error
  const [message, setMessage] = useState('Проверка токена...')
  const [userData, setUserData] = useState(null)

  useEffect(() => {
    const token = searchParams.get('token')
    
    if (!token) {
      setStatus('error')
      setMessage('Токен не предоставлен')
      return
    }

    // Проверяем токен
    apiClient.get('/api/auth/verify-token', {
      params: { token }
    })
      .then((response) => {
        const data = response.data
        if (data.valid) {
          setStatus('success')
          setUserData(data)
          setMessage(`Добро пожаловать, ${data.game_name || data.username}!`)
          
          // Сохраняем информацию о пользователе в localStorage
          localStorage.setItem('user_auth', JSON.stringify({
            user_id: data.user_id,
            username: data.username,
            game_name: data.game_name,
            token: token,
            authenticated: true
          }))
          
          // Перенаправляем через 2 секунды
          setTimeout(() => {
            navigate(`/participants/${data.user_id}`)
          }, 2000)
        } else {
          setStatus('error')
          setMessage('Токен недействителен')
        }
      })
      .catch((error) => {
        setStatus('error')
        const errorMessage = error.response?.data?.detail || 'Ошибка при проверке токена'
        setMessage(errorMessage)
      })
  }, [searchParams, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          {status === 'loading' && (
            <>
              <Loader className="mx-auto mb-4 text-primary-600 animate-spin" size={48} />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Авторизация</h2>
              <p className="text-gray-600">{message}</p>
            </>
          )}
          
          {status === 'success' && (
            <>
              <CheckCircle className="mx-auto mb-4 text-green-600" size={48} />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Успешно!</h2>
              <p className="text-gray-600 mb-4">{message}</p>
              <p className="text-sm text-gray-500">Перенаправление...</p>
            </>
          )}
          
          {status === 'error' && (
            <>
              <AlertCircle className="mx-auto mb-4 text-red-600" size={48} />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Ошибка</h2>
              <p className="text-gray-600 mb-4">{message}</p>
              <button
                onClick={() => navigate('/')}
                className="btn btn-primary"
              >
                Вернуться на главную
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

