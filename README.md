# DSH Plugins

king hotker 的 DeepSeek Harness 插件库（索引地址方式）。

## 插件列表

- **DeepSeek API 余额**（`api-balance/`）：在输入框旁显示 DeepSeek 账户余额。

## 安装方式

在 DeepSeek Harness 的 **发现/插件市场 → 添加索引** 中填入（国内可用 jsDelivr 镜像）：

```
https://cdn.jsdelivr.net/gh/DENG-BRO/dsh-plugins@main/index.json
```

备用（GitHub 原地址，网络允许时也可用）：

```
https://raw.githubusercontent.com/DENG-BRO/dsh-plugins/main/index.json
```

之后即可在插件市场中看到并一键安装本仓库中的插件。

## 索引格式

`index.json` 遵循 DSH 插件市场索引格式 1（`format: 1`）。


---

# DeepSeek API 余额插件 — 安装说明

在 DeepSeek Harness 输入框旁显示你的 **DeepSeek 账号余额**(人民币),点「刷新」随时更新。

## 环境要求

- Windows 上的 **DeepSeek Harness 桌面版**(版本与馈赠者相近即可);
- 已登录 DeepSeek 账号(余额来自登录账号;未登录时可在插件里填 API Key 备用)。

## 安装步骤

1. 解压本压缩包到任意文件夹(例如 `D:\plugins\api-balance`);
2. 打开 DeepSeek Harness → **设置 → 插件 → 添加插件(Add plugin / Local directory)**;
3. 选择解压出来的文件夹(包含 `package.json` 的那一层);
4. **重启应用**;
5. 打开任意对话,输入框旁出现「DeepSeek 余额」小组件,显示你的余额。

## 使用

- 小组件显示 **¥ 余额**,点「刷新」重新查询;
- 数据来自你登录的 DeepSeek 账号(`deepseekAccount.getBalance`),不需要 API Key;
- 若未登录账号:小组件会提示输入 API Key,粘贴 `sk-` 开头的 Key 保存即可(从 [platform.deepseek.com](https://platform.deepseek.com) → 用户中心 → API Keys 创建)。

## 常见问题

- **看不到小组件**:确认已重启应用(不是只刷新页面);若仍没有,检查 设置 → 插件 里插件是否启用。
- **显示"查询失败"**:通常是未登录账号或网络问题,登录账号后点「刷新」。
- **API Key 无效**:401 = Key 本身无效/已撤销,必须用自己账号创建的 Key;或者直接登录账号用余额模式。
- **版本不兼容**:若 Harness 版本差异较大导致插件不显示,请联系馈赠者调整。

## 说明

- 本插件不包含任何人的 API Key 或隐私数据;
- 余额只读,不会产生费用,也不会泄露账号信息;
- 插件通过本机回环地址(127.0.0.1)与 Harness 通信,只在本机可用。

