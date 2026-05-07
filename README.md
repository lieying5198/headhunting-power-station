# 🦁 猎头AI加油站 Skill - 会员管理与分销系统

## 📦 项目结构

```
headhunting-power-station/
├── index.js                 # 主入口文件
├── skill.json              # Skill配置文件
├── system_prompt.md        # 系统提示词
├── manifest.json           # 发布清单
├── handlers/
│   ├── commands.js         # 命令路由
│   ├── membership.js       # 会员管理
│   ├── reward.js           # 分销奖励
│   ├── database.js         # 数据存储
│   ├── notification.js     # 通知系统
│   └── admin.js            # 管理员功能
├── data/                   # JSON数据存储（开发用）
├── README.md              # 本文件
└── 设计文档.md             # 功能设计文档
```

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境

```bash
cp .env.example .env
# 编辑 .env 填入配置
```

### 3. 启动服务

```bash
node index.js
```

### 4. 测试命令

```bash
# 注册
/register 张三 13800138000 wx_zhangsan

# 查看状态
/status

# 升级会员
/upgrade yearly

# 查看推荐人
/referrals

# 查看收益
/earnings
```

## 💰 会员体系

> ⚠️ **重要声明**：本服务一经注册，不予退费。请根据自身需求谨慎购买。

| 等级 | 价格 | 支付方式 | 权益 |
|------|------|----------|------|
| L0 免费 | ¥0 | - | 3次/天基础功能 |
| L1 月付 | ¥99/月 | 微信支付 | 无限使用 |
| L1 年付 | ¥599/年 | 微信支付 | 无限使用+年费权益 |
| L1 终身 | ¥1999 | 微信支付 | 永久无限使用 |
| L2 分销 | 免费 | - | 20%+5%佣金分成 |

### 💳 支付说明
- 所有付费会员仅支持**微信支付**
- 支付成功后自动开通会员权益
- 付费前请确认需求，一经开通不予退费

## 📊 分销机制

```
用户A (分销会员)
    │
    ├── 推荐 ───▶ 用户B (付费¥599)
    │              │
    │              └── A获得: ¥599 × 20% = ¥119.8
    │
    └── 推荐 ───▶ 用户C (付费)
                    │
                    └── A获得: ¥x × 5% = ¥x
                    └── B获得: ¥x × 20% = ¥x
```

## 🔧 管理员命令

```bash
# 查看会员列表
/admin members

# 查看会员详情
/admin member phone=13800138000

# 收益报告
/admin earnings

# 提现申请列表
/admin withdrawals

# 审批提现
/admin approve id=xxx

# 拒绝提现
/admin reject id=xxx reason=xxx

# 排行榜
/admin leaderboard

# 统计数据
/admin stats
```

## 📝 API 接口

### 会员管理

```javascript
const membership = require('./handlers/membership');

// 注册
await membership.register({
  name: '张三',
  phone: '13800138000',
  wechat: 'wx_zhangsan',
  referrer: '13800138001' // 可选
});

// 升级
await membership.upgrade('13800138000', 'yearly');

// 状态
await membership.getStatus('13800138000');

// 推荐列表
await membership.getReferrals('13800138000');

// 收益
await membership.getEarnings('13800138000');

// 提现
await membership.withdraw('13800138000', 500);
```

### 分销奖励

```javascript
const reward = require('./handlers/reward');

// 计算网络价值
await reward.calculateNetworkValue('USER_ID');

// 推荐链接
reward.generateReferralLink('ABC123');

// 排行榜
await reward.getLeaderboard(10);

// 月度结算
await reward.monthlySettlement();
```

## 🗄️ 数据存储

开发环境使用 JSON 文件存储：

- `data/users.json` - 用户数据
- `data/transactions.json` - 交易记录
- `data/withdrawals.json` - 提现记录

**生产环境请替换为真实数据库**（MySQL/MongoDB/PostgreSQL）

## 🔒 安全与政策

### 安全措施
1. 敏感操作需要验证手机号
2. 提现需要管理员审批
3. 佣金有7天冷却期
4. 密码和密钥不在代码中明文存储

### 退款政策
> ⚠️ **一经注册，不予退费**
>
> 本服务为虚拟数字服务，会员权益一经开通即可使用。根据相关法规，虚拟服务一经注册/开通后不支持退款。请在购买前确认：
> - 您的使用需求
> - 套餐功能是否符合预期
> - 是否接受本服务的退款政策
>
> 如有疑问，请在购买前联系客服咨询。

## 📈 扩展功能

- [ ] 支付集成（微信/支付宝）
- [ ] 微信消息推送
- [ ] 邮件通知
- [ ] 数据可视化仪表盘
- [ ] API Webhook
- [ ] 多语言支持

## 📄 许可证

MIT License

---

*🦁 让每个猎头都成为精准交付的高手*
