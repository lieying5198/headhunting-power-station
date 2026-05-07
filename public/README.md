# 🦁 猎头加油站 - 落地页项目

## 📁 项目结构

```
public/
├── index.html        # 主落地页
├── terms.html        # 服务条款
├── privacy.html     # 隐私政策
├── refund.html      # 退款政策
└── DEPLOYMENT.md    # 部署指南
```

## 📦 完整部署包

落地页已包含所有必需页面：

| 页面 | 文件 | 说明 |
|------|------|------|
| 首页 | `index.html` | 精美落地页，含注册表单、分销展示 |
| 服务条款 | `terms.html` | 完整的用户协议 |
| 隐私政策 | `privacy.html` | 个人信息保护说明 |
| 退款政策 | `refund.html` | 退款规则说明 |

---

## 🚀 快速预览

### 方法1: Node.js 服务（推荐）
```bash
npm install
node scripts/serve.js
# 浏览器打开 http://localhost:3000
```

### 方法2: 直接打开
```bash
# Windows
start public/index.html

# macOS
open public/index.html
```

### 方法3: VS Code Live Server
- 安装 "Live Server" 扩展
- 右键 `index.html` → "Open with Live Server"

---

## 🌐 一键部署

### Vercel（推荐，免费）
```bash
npm i -g vercel
vercel --prod
```

### Netlify
```bash
npm i -g netlify-cli
netlify deploy --prod --dir=public
```

### GitHub Pages
1. 创建仓库，上传 `public` 文件夹
2. Settings → Pages → 选择 main 分支

---

## 📱 页面功能

### ✅ 已实现
- 响应式深色主题设计
- 用户注册表单（姓名、手机、微信号）
- 推荐码机制（支持链接参数 `?ref=xxx`）
- 会员定价展示（月卡/年卡/终身）
- 分销佣金展示（20%+5%）
- 分享功能（复制链接/微信）
- 法律文本页面（服务条款/隐私/退款）

### 🔧 需后端支持
- 用户注册 API
- 推荐码验证
- 微信支付集成
- 佣金计算与提现

---

## ⚠️ 部署前必读

### 法律合规
- [ ] 服务条款、隐私政策、退款政策已包含（见 `public/` 文件夹）
- [ ] 正式部署前请咨询律师，根据实际业务调整
- [ ] 添加真实的公司信息和联系方式

### 运营资质
- [ ] 网站 ICP 备案（国内服务器必需）
- [ ] 微信商户号（用于支付）
- [ ] HTTPS 证书（微信支付必需）

### 落地页内容
- [ ] 修改统计数据（当前为示例数据）
- [ ] 更新联系方式（邮箱、客服微信）
- [ ] 配置后端 API 地址

---

## 🔗 推荐码机制

URL 参数支持：
```
https://your-domain.com/?ref=USER123
```

- 自动识别并填充推荐码
- 存储在 localStorage 供后续使用
- 支持分享链接给好友

---

## 🎨 页面特性

- 深色主题 + 橙色主色调
- 流畅动画效果
- 移动端适配
- 无外部依赖（字体/图标使用 CDN）

---

*© 2026 猎头加油站*
