# DeepSeek API 余额插件

在聊天输入框下方显示 **DeepSeek 账户**的剩余额度。

## 功能

- **优先读取当前登录的 DeepSeek 账户余额**（`ctx.remote.account` 的 `getBalance`，走你已登录的账号，不需要额外配置）；
- 账户不可用时回退到手动 API Key 模式（`https://api.deepseek.com/user/balance`）；
- 手动「刷新」按钮重新查询；
- API Key 保存在插件自身的配置中（本机 profile），不会上传到任何第三方。

## 使用

1. 直接用：小组件自动显示你账号的钱包余额（人民币）；
2. 如需 API Key 方式：打开 [platform.deepseek.com](https://platform.deepseek.com) → 用户中心 → API Keys 创建，粘贴到小组件保存。

## 实现说明

- Host 侧注册 `/plugin-api-balance` 前缀路由（同源 HTTP，含 CORS 头），优先调用 `deepseekAccount.getBalance()` 读取账号余额，未登录时回退到 API Key 查询；
- Client 侧注册 `conversation.composer.dock` 槽位组件，使用 `__DSH_TRANSPORT__.streamBaseUrl` 解析宿主地址（兼容 Electron `dsh-app://` 与浏览器两种环境）；
- Key 通过插件配置（`apiKey` 字段）持久化，使用 `configEditor` 编辑。

## 限制

- 只读余额，不提供充值或消耗明细；
- 账户余额需要本机已登录 DeepSeek 账号；API Key 模式仅支持 `api.deepseek.com`。

