window.__ModuleLoader__.load({
  id: '@local/api-balance-widget',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const ROUTE = '/plugin-api-balance'

    function apiBase() {
      const transport = globalThis.__DSH_TRANSPORT__
      if (transport && typeof transport.streamBaseUrl === 'string' && transport.streamBaseUrl) {
        return String(transport.streamBaseUrl).replace(/\/+$/, '')
      }
      return ''
    }

    function apiUrl(path) {
      return apiBase() + ROUTE + path
    }

    function formatAccountBalance(balance) {
      if (!balance || balance.status !== 'ready' || !Array.isArray(balance.value)) return '—'
      const cny = balance.value.find((wallet) => wallet.currency === 'CNY')
      if (!cny) return '—'
      const amount = Number(cny.balance)
      if (!Number.isFinite(amount)) return '—'
      return '¥' + amount.toFixed(2)
    }

    function Widget() {
      const [state, setState] = React.useState({ phase: 'loading' })
      const [draftKey, setDraftKey] = React.useState('')
      const [saving, setSaving] = React.useState(false)
      const [message, setMessage] = React.useState('')

      function load() {
        setState({ phase: 'loading' })
        fetch(apiUrl('/account'), { cache: 'no-store' })
          .then((response) => response.json())
          .then((data) => {
            if (data.hasAccount && data.ok && data.balance) {
              setState({ phase: 'ok', balance: data.balance, source: 'account' })
              return
            }
            // Fallback: manually configured API key.
            return fetch(apiUrl('/value'), { cache: 'no-store' })
              .then((response) => response.json())
              .then((valueData) => {
                if (!valueData.configured) { setState({ phase: 'unconfigured' }); return }
                if (!valueData.ok) { setState({ phase: 'error', message: valueData.message || ('HTTP ' + valueData.status) }); return }
                setState({ phase: 'ok', balance: valueData.balance, source: 'apikey' })
              })
          })
          .catch((error) => setState({ phase: 'error', message: String((error && error.message) || error) }))
      }

      React.useEffect(() => { load() }, [])

      function saveKey() {
        const key = draftKey.trim()
        if (!key || saving) return
        setSaving(true)
        setMessage('')
        fetch(apiUrl('/key'), {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ apiKey: key }),
        })
          .then((response) => response.json())
          .then((data) => {
            if (data.saved) { setDraftKey(''); setMessage('已保存，正在刷新…'); setTimeout(load, 800) }
            else { setMessage(data.message || '保存失败') }
          })
          .catch((error) => setMessage(String((error && error.message) || error)))
          .finally(() => setSaving(false))
      }

      const container = {
        display: 'flex', alignItems: 'center', gap: 8,
        fontFamily: 'inherit', fontSize: 12, lineHeight: 1.4,
        padding: '2px 4px', color: 'var(--dsw-alias-text-secondary, #9aa0a6)',
      }
      const badge = {
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '1px 8px', borderRadius: 999,
        background: 'var(--dsw-alias-bg-secondary, rgba(127,127,127,0.12))',
        color: 'var(--dsw-alias-text-primary, #e8eaed)', fontWeight: 600,
      }
      const button = {
        font: 'inherit', fontSize: 12, padding: '1px 8px', borderRadius: 6,
        border: '1px solid var(--dsw-alias-border-secondary, rgba(127,127,127,0.35))',
        background: 'transparent', color: 'inherit', cursor: 'pointer',
      }
      const input = {
        font: 'inherit', fontSize: 12, padding: '2px 8px', borderRadius: 6, minWidth: 180,
        border: '1px solid var(--dsw-alias-border-secondary, rgba(127,127,127,0.35))',
        background: 'var(--dsw-alias-bg-primary, transparent)',
        color: 'var(--dsw-alias-text-primary, inherit)',
      }

      if (state.phase === 'loading') {
        return h('div', { style: container }, h('span', null, '余额加载中…'))
      }
      if (state.phase === 'unconfigured') {
        return h('div', { style: container },
          h('span', null, 'DeepSeek 余额'),
          h('input', {
            style: input, type: 'password', placeholder: '输入 API Key（sk-...）',
            value: draftKey, onChange: (event) => setDraftKey(event.target.value),
            onKeyDown: (event) => { if (event.key === 'Enter') saveKey() },
          }),
          h('button', { style: button, onClick: saveKey, disabled: saving }, saving ? '保存中…' : '保存'),
          message ? h('span', { style: { color: '#e8a33d' } }, message) : null,
        )
      }
      if (state.phase === 'error') {
        return h('div', { style: container },
          h('span', null, 'DeepSeek 余额'),
          h('span', { style: { color: '#e05a5a' } }, '查询失败：', state.message),
          h('button', { style: button, onClick: load }, '重试'),
        )
      }
      return h('div', { style: container },
        h('span', null, 'DeepSeek 余额'),
        h('span', { style: badge }, formatAccountBalance(state.balance)),
        h('button', { style: button, onClick: load }, '刷新'),
      )
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
          name: 'conversation.composer.dock',
          id: 'api-balance-widget',
          order: 5,
        }, Widget))
      },
    }
  },
})
