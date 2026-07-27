#!/usr/bin/env node
// Elva LaVenta — локальный просмотрщик системных логов (живой tail в терминале).
//
// Ходит НАПРЯМУЮ в базу Supabase, минуя сайт и админку — поэтому работает,
// даже если сайт или админ-панель недоступны.
//
// Требует service_role ключ (обходит RLS). Ключ берётся ТОЛЬКО из локального
// файла tools/.env.logs (он в .gitignore и в репозиторий не попадает).
//
// Запуск:
//   npm run logs                 — живой tail (обновление каждые 5 сек)
//   npm run logs -- --level error   — только ошибки
//   npm run logs -- --once          — вывести последние и выйти (без опроса)
//   npm run logs -- --interval 10   — интервал опроса в секундах
//   npm run logs -- --limit 100     — сколько последних строк показать на старте

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))

// ---------- Конфиг: локальный tools/.env.logs (не в git) или переменные окружения ----------
function loadEnv() {
  const env = { ...process.env }
  try {
    const raw = readFileSync(join(HERE, '.env.logs'), 'utf8')
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      let value = trimmed.slice(eq + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      if (!(key in env) || !env[key]) env[key] = value
    }
  } catch {
    // Файла может не быть — тогда полагаемся на переменные окружения.
  }
  return env
}

// ---------- Разбор аргументов ----------
function parseArgs(argv) {
  const opts = { level: 'all', interval: 5, limit: 40, once: false }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--once') opts.once = true
    else if (arg === '--level') opts.level = String(argv[++i] || 'all').toLowerCase()
    else if (arg === '--interval') opts.interval = Math.max(2, Number(argv[++i]) || 5)
    else if (arg === '--limit') opts.limit = Math.max(1, Math.min(500, Number(argv[++i]) || 40))
    else if (arg === '--help' || arg === '-h') opts.help = true
  }
  return opts
}

// ---------- Цвета ANSI ----------
const C = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  gray: '\x1b[90m',
  bgRed: '\x1b[41m\x1b[97m',
  bgYellow: '\x1b[43m\x1b[30m',
  bgBlue: '\x1b[44m\x1b[97m',
}

const LEVEL_STYLE = {
  error: { badge: `${C.bgRed} ОШИБКА `, text: C.red },
  warning: { badge: `${C.bgYellow} ВНИМАНИЕ `, text: C.yellow },
  info: { badge: `${C.bgBlue} ИНФО `, text: C.cyan },
}

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

function fmtTime(iso) {
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      dateStyle: 'short',
      timeStyle: 'medium',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function printLog(row) {
  const style = LEVEL_STYLE[row.level] || { badge: ` ${row.level} `, text: C.reset }
  const source = SOURCE_LABELS[row.source] || row.source
  const time = `${C.gray}${fmtTime(row.created_at)}${C.reset}`

  console.log(
    `${style.badge}${C.reset} ${time}  ${C.bold}${source}${C.reset} ${C.dim}·${C.reset} ${C.cyan}${row.event}${C.reset}`,
  )
  if (row.message) {
    console.log(`   ${style.text}${row.message}${C.reset}`)
  }
  if (row.path) {
    console.log(`   ${C.gray}страница: ${row.path}${C.reset}`)
  }
  if (row.details && Object.keys(row.details).length > 0) {
    const json = JSON.stringify(row.details, null, 2)
      .split('\n')
      .map((l) => `   ${C.gray}${l}${C.reset}`)
      .join('\n')
    console.log(json)
  }
  console.log('')
}

// ---------- Запрос к Supabase REST ----------
async function fetchLogs({ url, key, level, limit, afterId }) {
  const params = new URLSearchParams()
  params.set('select', 'id,created_at,level,source,event,message,details,path')
  params.set('order', 'id.desc')
  params.set('limit', String(limit))
  if (level && level !== 'all') params.set('level', `eq.${level}`)
  if (afterId != null) {
    params.set('id', `gt.${afterId}`)
    params.set('order', 'id.asc')
    params.set('limit', '500')
  }

  const res = await fetch(`${url}/rest/v1/system_logs?${params.toString()}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
    },
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status} ${res.statusText} — ${body.slice(0, 200)}`)
  }
  return res.json()
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// ---------- Основной цикл ----------
async function main() {
  const opts = parseArgs(process.argv.slice(2))

  if (opts.help) {
    console.log(`Elva LaVenta — просмотр системных логов в терминале.

  npm run logs                    живой tail
  npm run logs -- --once          показать последние и выйти
  npm run logs -- --level error   только ошибки (error | warning | info)
  npm run logs -- --interval 10   интервал опроса, сек (мин. 2)
  npm run logs -- --limit 100     сколько последних строк на старте (1–500)`)
    return
  }

  const env = loadEnv()
  const url = (env.SUPABASE_URL || '').replace(/\/+$/, '')
  const key = env.SUPABASE_SERVICE_ROLE_KEY || ''

  if (!url || !key) {
    console.error(`${C.red}Не задан SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY.${C.reset}

Создай файл ${C.bold}tools/.env.logs${C.reset} (скопируй из tools/.env.logs.example) и впиши:
  SUPABASE_URL=https://<твой-проект>.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=<service_role ключ из Supabase → Project Settings → API>

Файл tools/.env.logs в .gitignore — в репозиторий он не попадёт.`)
    process.exitCode = 1
    return
  }

  console.log(`${C.green}Elva LaVenta · системные логи${C.reset} ${C.gray}(${url})${C.reset}`)
  console.log(
    `${C.gray}фильтр: ${opts.level}${opts.once ? ' · разовый вывод' : ` · опрос каждые ${opts.interval} сек`}. Ctrl+C — выход.${C.reset}\n`,
  )

  // Стартовая пачка последних событий (в хронологическом порядке).
  let lastId = 0
  try {
    const initial = await fetchLogs({ url, key, level: opts.level, limit: opts.limit })
    initial.reverse().forEach((row) => {
      printLog(row)
      if (row.id > lastId) lastId = row.id
    })
    if (initial.length === 0) console.log(`${C.gray}Событий пока нет.${C.reset}\n`)
  } catch (err) {
    console.error(`${C.red}Ошибка запроса:${C.reset} ${err.message}`)
    process.exitCode = 1
    return
  }

  if (opts.once) return

  // Живой опрос: показываем только новые (id больше уже виденного).
  // eslint-disable-next-line no-constant-condition
  while (true) {
    await sleep(opts.interval * 1000)
    try {
      const fresh = await fetchLogs({ url, key, level: opts.level, afterId: lastId })
      for (const row of fresh) {
        printLog(row)
        if (row.id > lastId) lastId = row.id
      }
    } catch (err) {
      console.error(`${C.gray}[${fmtTime(new Date().toISOString())}]${C.reset} ${C.yellow}не удалось обновить: ${err.message}${C.reset}`)
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
