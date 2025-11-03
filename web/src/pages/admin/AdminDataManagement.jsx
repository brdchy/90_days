import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { Download, Upload, Calendar, Database, AlertCircle } from 'lucide-react'

export default function AdminDataManagement() {
  const queryClient = useQueryClient()
  const [importData, setImportData] = useState('')
  const [importError, setImportError] = useState('')

  const { data: settings } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => api.getSettings().then((res) => res.data),
  })

  const exportMutation = useMutation({
    mutationFn: () => api.exportData(),
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `game_data_${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    },
  })

  const importMutation = useMutation({
    mutationFn: (data) => api.importData(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['participants'])
      queryClient.invalidateQueries(['reports'])
      queryClient.invalidateQueries(['admin-stats'])
      setImportData('')
      setImportError('')
      alert('Данные успешно импортированы!')
    },
    onError: (error) => {
      setImportError(error.response?.data?.detail || 'Ошибка при импорте данных')
    },
  })

  const dayMutation = useMutation({
    mutationFn: (day) => api.setGameDay(day),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-stats'])
      queryClient.invalidateQueries(['current-day'])
      alert('День игры обновлен!')
    },
  })

  const handleImport = () => {
    try {
      const data = JSON.parse(importData)
      if (!data.participants || !data.reports) {
        setImportError('Неверный формат данных. Ожидается объект с полями participants и reports.')
        return
      }
      importMutation.mutate(data)
    } catch (e) {
      setImportError('Ошибка парсинга JSON: ' + e.message)
    }
  }

  const handleSetDay = () => {
    const day = prompt('Введите день игры (1-90):')
    if (day) {
      const dayInt = parseInt(day)
      if (dayInt >= 1 && dayInt <= 90) {
        dayMutation.mutate(dayInt)
      } else {
        alert('День должен быть от 1 до 90')
      }
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Управление данными</h1>
        <p className="text-gray-600">Экспорт, импорт и управление данными игры</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Экспорт данных */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <Download className="text-primary-600" size={20} />
            <h2 className="text-xl font-semibold text-gray-900">Экспорт данных</h2>
          </div>
          <p className="text-gray-600 mb-4 text-sm">
            Скачайте все данные игры в формате JSON для резервного копирования
          </p>
          <button
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending}
            className="btn btn-primary w-full flex items-center justify-center gap-2"
          >
            {exportMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Экспорт...
              </>
            ) : (
              <>
                <Download size={18} />
                Экспортировать данные
              </>
            )}
          </button>
        </div>

        {/* Управление днем игры */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="text-primary-600" size={20} />
            <h2 className="text-xl font-semibold text-gray-900">Текущий день игры</h2>
          </div>
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">Текущий день:</p>
            <p className="text-2xl font-bold text-gray-900">{settings?.current_day || '...'}</p>
          </div>
          <button
            onClick={handleSetDay}
            disabled={dayMutation.isPending}
            className="btn btn-primary w-full flex items-center justify-center gap-2"
          >
            {dayMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Обновление...
              </>
            ) : (
              <>
                <Calendar size={18} />
                Установить день игры
              </>
            )}
          </button>
        </div>
      </div>

      {/* Импорт данных */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <Upload className="text-primary-600" size={20} />
          <h2 className="text-xl font-semibold text-gray-900">Импорт данных</h2>
        </div>
        <div className="mb-4">
          <p className="text-gray-600 mb-2 text-sm">
            Вставьте JSON данные для импорта. Внимание: это перезапишет все текущие данные!
          </p>
          <textarea
            value={importData}
            onChange={(e) => {
              setImportData(e.target.value)
              setImportError('')
            }}
            className="input min-h-[200px] font-mono text-sm"
            placeholder='{"participants": [...], "reports": [...]}'
          />
        </div>
        {importError && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
            <AlertCircle size={20} className="mt-0.5" />
            <div>{importError}</div>
          </div>
        )}
        <button
          onClick={handleImport}
          disabled={!importData || importMutation.isPending}
          className="btn btn-primary w-full flex items-center justify-center gap-2"
        >
          {importMutation.isPending ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Импорт...
            </>
          ) : (
            <>
              <Upload size={18} />
              Импортировать данные
            </>
          )}
        </button>
      </div>

      {/* Информация о данных */}
      <div className="card mt-6">
        <div className="flex items-center gap-3 mb-4">
          <Database className="text-primary-600" size={20} />
          <h2 className="text-xl font-semibold text-gray-900">Информация о хранилище</h2>
        </div>
        <div className="text-sm text-gray-600 space-y-2">
          <p>• Данные хранятся в Excel файле на Яндекс.Диске</p>
          <p>• Экспорт создает резервную копию в формате JSON</p>
          <p>• Импорт полностью заменяет текущие данные</p>
          <p>• Изменение дня игры влияет на все расчеты статистики</p>
        </div>
      </div>
    </div>
  )
}

