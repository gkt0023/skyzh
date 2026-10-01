# 部署步骤：Supabase 配置 + Vercel 静态部署

本项目是纯静态前端（HTML + CSS + JS），无构建步骤，部署非常简单。
共分三步：**① 建 Supabase 数据库 → ② 填配置 → ③ 部署到 Vercel**。

---

## 一、Supabase 配置（约 10 分钟）

### 1. 创建项目
1. 打开 https://supabase.com 并注册/登录；
2. 点击 **New project**：填项目名、设置数据库密码（**务必记下来**）、选择离你最近的地区（如 Singapore / Tokyo / 或国内可直连的节点）；
3. 等待 1~2 分钟项目创建完成。

### 2. 执行建表 SQL
1. 左侧菜单进入 **SQL Editor → New query**；
2. 打开本项目的 `supabase-schema.sql`，把**全部内容**复制粘贴进去；
3. 点击 **Run**，看到成功提示即可。

这一步会自动完成：
- 创建 `users` 用户表（含 待审核/已通过/已驳回 状态字段）
- 创建 `goods` 商品表（含 `goods_no` 编号字段）
- 创建编号序列与触发器（**审核通过时自动生成递增唯一编号，从 1001 开始**）
- 写入种子管理员账号 `admin@example.com` / `admin123`
- 创建公开图片存储桶 `goods-images`

> 执行后可以在左侧 **Table Editor** 里看到两张表，在 **Storage** 里看到存储桶，即表示成功。

### 3. 获取密钥并填入配置
1. 左侧进入 **Project Settings → API**；
2. 复制 **Project URL**（形如 `https://xxxx.supabase.co`）和 **anon public key**（一长串 base64）；
3. 打开本项目的 `js/config.js`，替换两个占位值：

```js
const SUPABASE_URL = "https://xxxx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOi...你的anon公钥";
```

保存即可，**不需要改其他任何文件**。

### 4. 修改管理员默认密码（重要）
种子管理员的密码是公开文档里的 `admin123`，上线前请务必修改：
1. 在浏览器控制台（F12）执行下面代码，得到新密码的 SHA-256 哈希：

```js
crypto.subtle.digest('SHA-256', new TextEncoder().encode('你的新密码'))
  .then(b => console.log([...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('')));
```

2. 到 Supabase **SQL Editor** 执行：

```sql
update public.users
set password_hash = '第1步得到的哈希'
where email = 'admin@example.com';
```

---

## 二、Vercel 部署（静态站点，无需构建）

### 方式 A：网页导入（推荐）
1. 把整个项目（含 `html / css / js` 文件夹、`supabase-schema.sql`、本文件）推到 GitHub 仓库；
2. 打开 https://vercel.com ，用 GitHub 账号登录；
3. 点 **Add New → Project**，选择刚推送的仓库；
4. **Framework Preset 选 `Other`**（或什么都不选），**Build Command 留空**，**Output Directory 留空**；
5. 点 **Deploy**，约 1 分钟后完成，得到网址 `https://你的项目.vercel.app`。

### 方式 B：本地命令行（CLI）
```bash
# 安装 Vercel CLI（只需一次）
npm install -g vercel

# 在项目根目录执行
cd D:\zh
vercel          # 首次会要求登录；Framework 选择 Other / 留空
vercel --prod   # 部署到生产环境
```

### 后续更新
改完代码后重新 `git push`（方式 A 自动重新部署）或重新 `vercel --prod`（方式 B）。

---

## 三、上线后验证流程（按需求逐条核对）

| 需求 | 验证方法 |
| --- | --- |
| 首页必须登录 | 直接访问首页 → 自动跳转登录页 |
| 注册后待审核 | 注册新账号 → 用该账号登录 → 提示"等待管理员审核"无法登录 |
| 管理员审核账号 | 用 admin 登录 → 管理后台 → 批准该账号 → 该账号即可登录 |
| 发布商品待审核 | 登录后进"发布商品"页 → 传图+填简介提交 → 提示待审核 |
| 商品审核通过+自动编号 | 管理员后台批准商品 → 首页出现该商品卡片，编号从 1001 递增 |
| 管理员权限隔离 | 普通用户访问 admin.html → 被拦截跳回首页 |

---

## 四、安全说明（请务必阅读）

本项目定位为**轻量演示/展示站**，为简化部署做了以下取舍，**生产环境必须升级**：

1. **密码存储**：使用前端 SHA-256 哈希，非加盐、可被彩虹表破解。
   → 生产建议改用 **Supabase Auth**（自带 bcrypt 加盐 + 会话管理）。
2. **数据库权限**：建表 SQL 关闭了 RLS，anon key 是公开的，任何拿到 key 的人理论上可读写数据。
   → 生产建议开启 RLS 行级安全，并编写严格策略。
3. **审核操作**：目前"批准/驳回"直接由前端调用数据库接口，若改用 Supabase Auth，应把审核逻辑放进 **Edge Functions / Serverless 函数**中校验管理员身份。
4. **登录态**：使用 localStorage，存在 XSS 窃取风险。
   → 生产建议用 Supabase Auth 的会话机制。
5. **图片上传**：建议在客户端限制图片大小（如 <5MB）与类型（仅 jpg/png/webp）。

> 本项目的 `supabase-schema.sql` 中已把 RLS 关闭语句和说明写好，方便你理解每一行；升级时再按上述建议改造即可。
