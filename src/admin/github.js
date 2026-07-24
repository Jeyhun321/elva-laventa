// GitHub Contents API vasitəsilə kataloqu birbaşa repozitoriyada yeniləyir.
// Token yalnız brauzerdə (localStorage) saxlanılır, heç bir serverə göndərilmir.

export const REPO_OWNER = 'Jeyhun321'
export const REPO_NAME = 'elva-laventa'
export const BRANCH = 'main'
export const CATALOG_PATH = 'src/data/catalog.json'
export const IMAGE_DIR = 'public/products'

const TOKEN_KEY = 'elva_gh_token'

export const getToken = () => localStorage.getItem(TOKEN_KEY) || ''
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t.trim())
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

const api = async (path, options = {}) => {
  const token = getToken()
  if (!token) throw new Error('NO_TOKEN')

  const res = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {}),
    },
  })

  if (!res.ok) {
    let detail = ''
    try {
      detail = (await res.json()).message || ''
    } catch {
      /* boş cavab ola bilər */
    }
    const err = new Error(detail || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return res.status === 204 ? null : res.json()
}

// UTF-8 mətni base64-ə çevirir (btoa təkbaşına Azərbaycan hərflərini pozur)
const utf8ToBase64 = (str) => {
  const bytes = new TextEncoder().encode(str)
  let binary = ''
  bytes.forEach((b) => { binary += String.fromCharCode(b) })
  return btoa(binary)
}

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

const contentsUrl = (path) =>
  `/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`

// Faylın mövcud sha-sını götürür (yeniləmək üçün lazımdır)
const getSha = async (path) => {
  try {
    const data = await api(`${contentsUrl(path)}?ref=${BRANCH}`)
    return data.sha
  } catch (e) {
    if (e.status === 404) return null
    throw e
  }
}

const putFile = async ({ path, base64, message }) => {
  const sha = await getSha(path)
  return api(contentsUrl(path), {
    method: 'PUT',
    body: JSON.stringify({
      message,
      content: base64,
      branch: BRANCH,
      ...(sha ? { sha } : {}),
    }),
  })
}

// Tokenin düzgün olduğunu və repozitoriyaya yazma icazəsini yoxlayır
export const checkAccess = async () => {
  const repo = await api(`/repos/${REPO_OWNER}/${REPO_NAME}`)
  return { ok: Boolean(repo.permissions?.push), repo: repo.full_name }
}

export const uploadImage = async (file) => {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const safe = file.name
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'foto'
  const filename = `${Date.now()}-${safe}.${ext}`
  const path = `${IMAGE_DIR}/${filename}`

  await putFile({
    path,
    base64: await fileToBase64(file),
    message: `Yeni məhsul şəkli: ${filename}`,
  })

  // Sayt alt qovluqda işlədiyi üçün BASE_URL nəzərə alınır
  return `${import.meta.env.BASE_URL}products/${filename}`
}

export const publishCatalog = async (catalog, note = '') => {
  const json = JSON.stringify(catalog, null, 2) + '\n'
  return putFile({
    path: CATALOG_PATH,
    base64: utf8ToBase64(json),
    message: note || `Kataloq yeniləndi (${catalog.products.length} məhsul)`,
  })
}

// Son yayım (deploy) statusunu göstərir
export const latestRun = async () => {
  const data = await api(
    `/repos/${REPO_OWNER}/${REPO_NAME}/actions/runs?per_page=1`
  )
  const run = data.workflow_runs?.[0]
  if (!run) return null
  return { status: run.status, conclusion: run.conclusion, url: run.html_url }
}
