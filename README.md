# 扬光工程管理系统

面向工程类企业的项目全过程管理平台，覆盖从项目立项、采购、库存、劳务、费用到回款的全链条业务。

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端框架 | NestJS + TypeScript |
| 数据库 | PostgreSQL + Prisma ORM |
| 前端框架 | React 19 + TypeScript + Vite 8 |
| UI 组件库 | Ant Design 6.x |
| 状态管理 | Zustand + TanStack React Query |
| 认证方式 | JWT（独立认证，不依赖第三方）|

## 端口配置

| 服务 | 端口 |
|------|------|
| 前端开发服务器 | 12403 |
| 后端 API 服务器 | 12404 |

## 模块列表

- **项目立项** — 项目创建/编辑/审批/查看，销售负责人多选，参与人员
- **材料设备库** — 全局材料管理，模糊搜索
- **采购申请** — 采购明细录入，导入/导出 Excel，逐级审批
- **采购询价** — 基于采购申请创建，采购单价录入，额外费用（可正可负），两级审批
- **采购确认** — 合同附件上传，两级审批
- **供货通知** — 运输方式（陆运/空运/送货上门/自提），运单号跟踪
- **用户管理** — 多角色权限，账号启用/停用
- 更多模块开发中...

## 快速开始

### 前置要求

- Node.js 24+
- PostgreSQL 16+
- npm

### 安装与启动

```bash
# 克隆项目
git clone https://github.com/qdsundong18562576522-prog/yg-xmgl-new.git
cd yg-xmgl-new

# 后端
cd backend
npm install
# 配置 .env 中的 DATABASE_URL
npx prisma db push
npx tsx prisma/seed.ts  # 创建默认管理员 admin / admin123
npm run build
node dist/src/main.js    # 启动后端 http://localhost:12404

# 前端
cd ../frontend
npm install
npm run dev              # 启动前端 http://localhost:12403
```

### 默认管理员

- 用户名: `admin`
- 密码: `admin123`

## 核心功能

### 自动编号
所有表单自动生成唯一编号，格式：`{前缀}-{YYYYMMDD}-{流水号}`。

| 表单 | 编号前缀 |
|------|---------|
| 项目 | YGKI |
| 采购申请 | CGSQ |
| 采购询价 | CGCX |
| 采购确认 | CGQR |
| 供货通知 | GHTZ |

### 审批流
每个流程都有完整的审批状态流转：`草稿 → 审批中 → 已通过 / 已驳回`。
审批中的单据可撤回重新编辑。

### 级联保护
表单之间逐级关联，有下级引用时禁止删除父级数据。

### 角色权限

| 角色 | 职责 |
|------|------|
| 管理员 (admin) | 全部权限 |
| 企业负责人 (leader) | 领导审批 |
| 项目经理 (pm) | 项目执行与审批 |
| 采购 (purchaser) | 采购操作与审批 |
| 销售 (sales) | 项目立项 |
| 工程人员 (engineer) | 项目参与 |
| 财务 (finance) | 财务操作 |
