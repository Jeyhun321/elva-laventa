import { useCallback, useEffect, useMemo, useState } from 'react'
import { adminSupabase, isConfigured } from '../lib/supabase.js'

const LEVELS = [
  { value: 'all', label: 'Все события' },
  { value: 'error', label: 'Ошибки' },
  { value: 'warning', label: 'Предупреждения' },
  { value: 'info', label: 'Информация' },
]

const SOURCE_LABELS = {
  frontend: 'Сайт',
  catalog: 'Каталог',
  checkout: 'Оформление заказа',
  auth: 'Вход',
  cart: 'Корзина',
  favorites: 'Избранное',
  telegram: 'Telegram',
  database: 'База данных',
}

const LEVEL_LABELS = {
  error: 'Ошибка',
  warning: 'Внимание',
  info: 'Инфо',
}

const dateTime = (value) => (value
  ? new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'medium' }).format(new Date(value))
  : '—')

const detailsText = (details) => {
  try {
    return JSON.stringify(details || {}, null, 2)
  } catch {
    return 'Нет дополнительных данных'
  }
}

export default function SystemLogsPanel() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [level, setLevel] = useState('all')
  const [query, setQuery] = useState('')

  const load = useCallback(async () => {
    if (!isConfigured || !adminSupabase) {
      setError('Supabase не подключён.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    const { data, error: requestError } = await adminSupabase
      .from('system_logs')
      .select('id, created_at, level, source, event, message, details, path')
      .order('created_at', { ascending: false })
      .limit(150)

    if (requestError) {
      setError(requestError.message || 'Не удалось загрузить журнал.')
      setLogs([])
    } else {
      setLogs(data || [])
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const phrase = query.trim().toLowerCase()

    return logs.filter((item) => {
      if (level !== 'all' && item.level !== level) return false
      if (!phrase) return true

      return [item.source, item.event, item.message, item.path, detailsText(item.details)]
        .join(' ')
        .toLowerCase()
        .includes(phrase)
    })
  }, [level, logs, query])

  return (
    <section className="system-logs" aria-label="Системные логи">
      <div className="system-logs-head">
        <div>
          <h2>Системные логи</h2>
          <p>Ошибки и важные события сайта. Пароли, коды доступа и данные покупателей сюда не сохраняются.</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => void load()} disabled={loading}>
          {loading ? 'Обновляю…' : 'Обновить'}
        </button>
      </div>

      <div className="system-log-filters">
        <div className="system-log-levels" aria-label="Фильтр по типу события">
          {LEVELS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`system-log-level${level === option.value ? ' active' : ''}`}
              onClick={() => setLevel(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <input
          className="system-log-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Поиск по сообщению или разделу"
          aria-label="Поиск по системным логам"
        />
      </div>

      {error && <div className="admin-msg error">{error}</div>}

      {!loading && !error && filtered.length === 0 && (
        <div className="system-log-empty">Событий по этому фильтру пока нет.</div>
      )}

      <div className="system-log-list">
        {filtered.map((item) => (
          <article key={item.id} className={`system-log-card ${item.level}`}>
            <div className="system-log-card-top">
              <span className={`system-log-badge ${item.level}`}>{LEVEL_LABELS[item.level] || item.level}</span>
              <time dateTime={item.created_at}>{dateTime(item.created_at)}</time>
            </div>
            <div className="system-log-card-meta">
              <span>{SOURCE_LABELS[item.source] || item.source}</span>
              <code>{item.event}</code>
            </div>
            <p>{item.message || 'Подробности не переданы.'}</p>
            {item.path && <div className="system-log-path">Страница: {item.path}</div>}
            {item.details && Object.keys(item.details).length > 0 && (
              <details>
                <summary>Технические детали</summary>
                <pre>{detailsText(item.details)}</pre>
              </details>
            )}
          </article>
        ))}
      </div>
    </section>
  )
}
