# 🦁 猎头能量站 - 完整项目

## 📂 项目结构

```
headhunting-power-station/
├── website/                    # 前端网站（部署到GitHub Pages）
│   ├── index.html             # 首页
│   ├── styles.css             # 样式表
│   └── app.js                # 前端逻辑
│
├── api/                       # 后端API（部署到Cloudflare Workers）
│   └── index.js              # Workers API入口
│
├── database/                  # 数据库
│   └── schema.sql           # D1数据库Schema
│
├── handlers/                  # Node.js Skill处理（IMA平台）
│   ├── commands.js          # 命令路由
│   ├── membership.js        # 会员管理
│   ├── reward.js            # 分销奖励
│   ├── database.js          # 数据存储
│   ├── notification.js     # 通知系统
│   └── admin.js             # 管理员功能
│
├── wrangler.toml             # Cloudflare Workers配置
├── DEPLOY.md                 # 后端部署指南
├── README.md                 # Skill说明
└── 设计文档.md               # 功能设计文档
```

## 🚀 快速部署

### 第一步：部署前端到 GitHub Pages

```bash
# 1. 创建GitHub仓库并推送
cd website
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/headhunting-power-station.git
git push -u origin master

# 2. 在GitHub仓库设置中启用GitHub Pages
# Settings → Pages → Source: master branch
```

### 第二步：部署后端到 Cloudflare

```bash
# 1. 安装Wrangler CLI
npm install -g wrangler

# 2. 登录Cloudflare
wrangler login

# 3. 创建D1数据库
wrangler d1 create headhunting-db

# 4. 记录返回的database_id

# 5. 编辑wrangler.toml，填入database_id

# 6. 初始化数据库
wrangler d1 execute headhunting-db --file=./database/schema.sql

# 7. 创建KV命名空间
wrangler kv:namespace create "HEADHUNTING_CACHE"

# 8. 更新wrangler.toml中的KV ID

# 9. 部署
wrangler deploy

# 10. 记录返回的Workers URL
```

### 第三步：配置前端API地址

编辑 `website/app.js`，将 `API_BASE` 改为你的Workers URL：

```javascript
const API_BASE = 'https://your-workers-url.workers.dev';
```

重新推送即可。

## 🌐 免费资源汇总

| 服务 | 提供商 | 免费额度 | 用途 |
|------|--------|---------|------|
| 前端托管 | GitHub Pages | 无限 | 网站静态文件 |
| 后端API | Cloudflare Workers | 10万次/天 | 接口服务 |
| 数据库 | Cloudflare D1 | 5MB/100万行 | 用户、订单数据 |
| KV缓存 | Cloudflare KV | 10亿次读 | 会话、Token |
| CDN | Cloudflare | 无限 | 加速分发 |
| SSL证书 | Cloudflare | 免费 | HTTPS |
| 域名DNS | Cloudflare | 免费 | 域名解析 |

## 💰 支付集成

### 微信支付
1. 申请微信支付商户号
2. 在 Workers 中配置商户密钥
3. 微信支付回调地址设置为：
   ```
   https://your-workers.workers.dev/api/order/callback/wechat
   ```

### 支付宝
1. 申请支付宝商家服务
2. 配置 RSA2 密钥
3. 支付宝回调地址设置为：
   ```
   https://your-workers.workers.dev/api/order/callback/alipay
   ```

## 🔐 安全配置

### 1. 设置敏感变量
```bash
# 微信AppSecret
wrangler secret put WECHAT_APP_SECRET

# 微信商户密钥
wrangler secret put WECHAT_MCH_KEY

# JWT密钥
wrangler secret put JWT_SECRET
```

### 2. CORS配置
Workers已配置允许跨域，生产环境可限制为你的域名。

### 3. Rate Limiting
可在Workers中添加访问频率限制。

## 📊 功能清单

### 已实现
- ✅ 用户注册/登录
- ✅ 微信一键登录
- ✅ 会员等级体系
- ✅ 积分系统
- ✅ 每日签到
- ✅ 邀请分销（三级佣金）
- ✅ VIP购买
- ✅ 订单管理
- ✅ 文章/课程系统
- ✅ 收藏功能

### 待集成
- ⏳ 微信支付
- ⏳ 支付宝支付
- ⏳ 真实的微信登录
- ⏳ 文件上传（R2/七牛云）
- ⏳ 邮件通知
- ⏳ 短信验证码
- ⏳ 微信消息推送

## 🛠️ 开发命令

```bash
# 本地测试Workers
wrangler dev

# 查看Workers日志
wrangler tail

# 查看数据库内容
wrangler d1 execute headhunting-db --command "SELECT * FROM users LIMIT 5"

# 导出数据库
wrangler d1 export headhunting-db --output ./backup.sql

# 导入数据
wrangler d1 execute headhunting-db --file=./backup.sql
```

## 📱 移动端适配

前端已响应式设计，支持手机/平板访问。

会员可在手机上：
- 注册/登录
- 查看VIP状态
- 每日签到
- 邀请好友
- 购买会员
- 查看文章

## 🔧 自定义配置

### 修改价格
编辑 `api/index.js` 中的 `products` 对象：
```javascript
const products = {
  'vip_month': { name: '月度VIP', amount: 9900, period: 30 },  // amount单位：分
  'vip_year': { name: '年度VIP', amount: 59900, period: 365 },
  'vip_permanent': { name: '永久VIP', amount: 199900, period: 9999 },
};
```

### 修改分销比例
编辑 `api/index.js` 中的佣金计算：
```javascript
const levels = [
  { level: 1, rate: 0.10 },  // 一级10%
  { level: 2, rate: 0.05 },  // 二级5%
  { level: 3, rate: 0.02 },  // 三级2%
];
```

### 修改积分规则
编辑 `api/index.js` 中的签到和任务配置：
```javascript
// 签到积分
let points = 5;  // 基础5积分
// 连续签到7天额外奖励
```

## 💡 常见问题

**Q: 微信登录失败？**
A: 检查微信公众平台的授权回调域名是否配置正确

**Q: 支付后VIP没开通？**
A: 检查支付回调URL是否可访问，签名验证是否通过

**Q: 数据库满了？**
A: D1免费版5MB，可清理过期数据或升级付费版

**Q: API请求超时？**
A: Workers执行时间限制10ms，免费版适当优化代码

## 📞 技术支持

遇到问题可在GitHub提Issue，或联系开发者。

---

*🦁 让每个猎头都成为精准交付的高手*
