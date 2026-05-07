# 🦁 猎头加油站 - 部署指南

## 📦 完整部署包

### 页面文件

| 文件 | 说明 | 必需 |
|------|------|------|
| `index.html` | 落地页（首页） | ✅ |
| `terms.html` | 服务条款 | ✅ |
| `privacy.html` | 隐私政策 | ✅ |
| `refund.html` | 退款政策 | ✅ |

---

## 🚀 快速部署

### 方式一：静态托管（推荐）

#### 1. Vercel（免费）
```bash
# 安装 Vercel CLI
npm i -g vercel

# 部署
vercel

# 或拖拽整个 public 文件夹到 vercel.com
```

#### 2. Netlify（免费）
```bash
# 安装 Netlify CLI
npm i -g netlify-cli

# 部署
netlify deploy --prod --dir=public
```

#### 3. GitHub Pages（免费）
1. 创建 GitHub 仓库
2. 上传 public 文件夹内容
3. Settings → Pages → 选择 main branch

#### 4. 阿里云 OSS（国内访问快）
1. 创建 OSS Bucket（公共读）
2. 上传 public 文件夹内容
3. 绑定自定义域名

---

### 方式二：传统服务器

将 `public` 文件夹内容上传到 Web 服务器（如 Nginx、Apache）：

```nginx
# Nginx 配置示例
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/lietougasstation;
    index index.html;
    
    # 所有路径返回 index.html（SPA 支持）
    try_files $uri $uri/ /index.html;
}
```

---

## ⚠️ 部署前检查清单

### 必填项

- [ ] **网站备案**：国内服务器必须完成 ICP 备案
- [ ] **HTTPS 证书**：微信支付必须使用 HTTPS
- [ ] **域名配置**：绑定自定义域名

### 建议项

- [ ] 微信商户号申请（用于支付）
- [ ] 腾讯防水墙（验证码）接入
- [ ] 统计分析代码（百度统计/神策）
- [ ] 网站地图 (sitemap.xml)
- [ ] Robots.txt 配置

### 落地页内容

- [ ] 修改统计数据为真实数据
- [ ] 更新联系方式（邮箱、客服微信）
- [ ] 检查所有外链是否有效
- [ ] 测试表单提交功能
- [ ] 测试微信支付流程

---

## 📋 法律文本要求

已包含以下页面：

1. **服务条款** (`terms.html`)
   - 服务内容说明
   - 会员权益与定价
   - 分销计划规则（20%+5%佣金）
   - 知识产权声明
   - 免责声明

2. **隐私政策** (`privacy.html`)
   - 信息收集说明
   - 信息使用目的
   - Cookie 使用说明
   - 用户权利说明

3. **退款政策** (`refund.html`)
   - 月卡：7天无理由
   - 年卡：15天无理由
   - 终身：30天无理由
   - 佣金追回规则

⚠️ **注意**：这些为通用模板，正式部署前请：
1. 咨询专业律师
2. 根据实际业务调整
3. 添加真实的公司信息
4. 更新联系方式

---

## 🔧 后端集成

### 注册接口
```
POST /api/register
{
  "name": "张三",
  "phone": "13800138000",
  "wechat": "zhangsan",
  "referralCode": "ABC123"
}
```

### 支付接口
```
POST /api/pay
{
  "userId": "user_xxx",
  "plan": "monthly" | "yearly" | "lifetime",
  "method": "wechat"
}
```

### 分销佣金查询
```
GET /api/commissions?userId=user_xxx
```

---

## 🌐 自定义域名

### 域名配置
1. 在域名服务商添加 DNS 记录
2. 指向部署平台提供的地址
3. 在部署平台绑定域名
4. 申请 SSL 证书

### 微信白名单
如需微信内访问，需将域名加入微信白名单。

---

## 📞 技术支持

如有问题，请联系：
- 邮箱：support@lietougasstation.com
- 微信：猎头加油站官方客服

---

*© 2026 猎头加油站*
