/**
 * Host half of the API balance widget: serves the browser same-origin HTTP
 * routes used by the Client widget and keeps the DeepSeek API key in the
 * plugin's own configuration (edited through the config editor).
 */

export const inject = ['webServer']

const DEFAULT_BASE_URL = 'https://api.deepseek.com'

const ROUTE = '/plugin-api-balance'

function normalizeConfig(config) {
  const raw = config && typeof config === 'object' ? config : {}
  return {
    apiKey: typeof raw.apiKey === 'string' ? raw.apiKey.trim() : '',
    baseUrl: typeof raw.baseUrl === 'string' && raw.baseUrl.trim() ? raw.baseUrl.trim() : DEFAULT_BASE_URL,
  }
}

function corsHeaders(req) {
  const origin = req.headers.origin
  return {
    'access-control-allow-origin': typeof origin === 'string' && origin ? origin : '*',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '600',
  }
}

function sendJson(res, status, payload, req) {
  const body = JSON.stringify(payload)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body),
    ...(req ? corsHeaders(req) : {}),
  })
  res.end(body)
}

function readBody(req, limit = 8 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > limit) {
        reject(new Error('request body too large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

async function saveApiKey(ctx, apiKey) {
  const entry = ctx.fiber.entry
  const editor = ctx.get('configEditor')
  if (entry === undefined || editor === undefined) {
    throw new Error('当前环境的插件配置无法保存（没有 configEditor 服务）')
  }
  await editor.edit(entry, (current) => ({ ...current, apiKey }))
}

async function fetchBalance(key, baseUrl) {
  const url = String(baseUrl).replace(/\/+$/, '') + '/user/balance'
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${key}` },
  })
  const text = await response.text()
  let json = null
  try { json = JSON.parse(text) } catch { /* keep raw text */ }
  return { status: response.status, json, text }
}

export function apply(ctx, config) {
  const settings = normalizeConfig(config)

  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: ROUTE,
    handler: async (req, res) => {
      const send = (status, payload) => sendJson(res, status, payload, req)
      try {
        if (req.method === 'OPTIONS') {
          res.writeHead(204, corsHeaders(req))
          res.end()
          return
        }
        const url = new URL(req.url ?? '/', 'http://local')
        const route = url.pathname.slice(ROUTE.length).replace(/\/+$/, '') || '/'

        if (route === '/status') {
          send(200, {
            configured: Boolean(settings.apiKey),
            baseUrl: settings.baseUrl,
          })
          return
        }

        if (route === '/debug') {
          const modules = ctx.get('clientModules')
          if (!modules || typeof modules.graph !== 'function') {
            send(200, { hasClientModules: false })
            return
          }
          let graph = null
          try { graph = modules.graph() } catch (error) { graph = { error: String(error?.message ?? error) } }
          const entry = (graph?.entries ?? []).find((row) => row.id === '@local/api-balance-widget')
          send(200, {
            hasClientModules: true,
            entry,
            entryCount: graph?.entries?.length ?? 0,
            batchCount: graph?.batches?.length ?? 0,
          })
          return
        }

        if (route === '/account') {
          const account = ctx.get('deepseekAccount')
          if (!account || typeof account.getBalance !== 'function') {
            send(200, { hasAccount: false })
            return
          }
          const meta = { version: '0.2.2-rc.5', locale: 'zh-CN', timezoneOffsetSeconds: 8 * 3600 }
          try {
            const balance = await account.getBalance(meta)
            send(200, { hasAccount: true, ok: true, balance })
          } catch (error) {
            let state = null
            try { state = await account.getState() } catch { /* ignore */ }
            send(200, {
              hasAccount: true,
              ok: false,
              signedIn: state ? Boolean(state.signedIn ?? state.status ?? null) : null,
              state: state ? JSON.parse(JSON.stringify(state, (k, v) => (typeof v === 'string' && v.length > 200 ? v.slice(0, 200) + '…' : v))) : null,
              message: String(error?.message ?? error),
            })
          }
          return
        }

        if (route === '/market/list') {
          const market = ctx.get('pluginMarket')
          if (!market || typeof market.listIndexes !== 'function') {
            send(200, { hasMarket: false })
            return
          }
          send(200, { hasMarket: true, indexes: market.listIndexes() })
          return
        }

        if (route === '/market/add' && req.method === 'POST') {
          const market = ctx.get('pluginMarket')
          if (!market || typeof market.setIndexes !== 'function') {
            send(200, { hasMarket: false })
            return
          }
          const raw = await readBody(req)
          let url = ''
          try { url = String(JSON.parse(raw)?.url ?? '').trim() } catch { /* ignore */ }
          if (!url) { send(400, { message: 'url required' }); return }
          const current = market.listIndexes().map((summary) => summary.url)
          const next = [...current, url]
          await market.setIndexes(next)
          send(200, { saved: true, indexes: market.listIndexes() })
          return
        }

        if (route === '/market/set' && req.method === 'POST') {
          const market = ctx.get('pluginMarket')
          if (!market || typeof market.setIndexes !== 'function') {
            send(200, { hasMarket: false })
            return
          }
          const raw = await readBody(req)
          let urls = []
          try { urls = JSON.parse(raw)?.urls ?? [] } catch { /* ignore */ }
          if (!Array.isArray(urls) || urls.some((u) => typeof u !== 'string')) {
            send(400, { message: 'urls must be string[]' })
            return
          }
          await market.setIndexes(urls)
          send(200, { saved: true, indexes: market.listIndexes() })
          return
        }

        if (route === '/market/search') {
          const market = ctx.get('pluginMarket')
          if (!market || typeof market.search !== 'function') {
            send(200, { hasMarket: false })
            return
          }
          const indexUrl = url.searchParams.get('url') ?? ''
          if (!indexUrl) { send(400, { message: 'url required' }); return }
          try {
            const result = await market.search(indexUrl, {
              sort: { kind: 'index' },
              offset: 0,
              limit: 20,
              refresh: true,
            })
            send(200, { ok: true, result })
          } catch (error) {
            send(200, { ok: false, message: String(error?.message ?? error) })
          }
          return
        }

        if (route === '/value') {
          if (!settings.apiKey) {
            send(200, { configured: false })
            return
          }
          try {
            const result = await fetchBalance(settings.apiKey, settings.baseUrl)
            if (result.status === 200 && result.json) {
              send(200, { configured: true, ok: true, balance: result.json })
            } else {
              send(200, {
                configured: true,
                ok: false,
                status: result.status,
                message: result.text.slice(0, 300),
              })
            }
          } catch (error) {
            send(200, {
              configured: true,
              ok: false,
              message: String(error?.message ?? error),
            })
          }
          return
        }

        if (route === '/key' && req.method === 'POST') {
          const raw = await readBody(req)
          let key = ''
          try { key = String(JSON.parse(raw)?.apiKey ?? '').trim() } catch { /* ignore */ }
          if (!key || !/^sk-[A-Za-z0-9_-]{8,}$/.test(key)) {
            send(400, { saved: false, message: 'API Key 格式不正确（应以 sk- 开头）' })
            return
          }
          await saveApiKey(ctx, key)
          send(200, { saved: true })
          return
        }

        send(404, { message: 'not found' })
      } catch (error) {
        send(500, { message: String(error?.message ?? error) })
      }
    },
  }))
}
