# 移动端构建 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

---

## 一、方案对比

### 方案 A：移动端 H5（推荐）
| 维度 | 说明 |
|------|------|
| 技术栈 | 现有 React + Ant Design，新增 `antd-mobile` 或响应式适配 |
| 优点 | 现有代码复用度高，一套代码 PC+移动，开发快，无需额外部署 |
| 缺点 | 移动端体验不如原生 App |
| 适用 | 微信内打开、手机浏览器访问 |

### 方案 B：Uni-app（小程序 + App）
| 维度 | 说明 |
|------|------|
| 技术栈 | Uni-app (Vue3)，另起项目 |
| 优点 | 可编译为微信小程序 + H5 + Android/iOS App |
| 缺点 | 需要重写前端，后端 API 复用，开发周期长 |
| 适用 | 需要发布到微信小程序商店或应用商店 |

### 方案 C：React Native
| 维度 | 说明 |
|------|------|
| 技术栈 | React Native + Expo |
| 优点 | 与现有 React 技术栈一致，原生体验 |
| 缺点 | 学习成本高，需要额外构建环境 |
| 适用 | 需要高性能原生 App |

---

## 二、推荐方案：方案 A（H5 响应式）

### 理由
1. 现有系统基于 React + Ant Design，可直接用 `antd-mobile` 或 CSS 媒体查询适配
2. 前后端已联调完成，后端 API 完全复用
3. 开发成本最低，1-2 天可完成核心功能
4. 部署零成本：同一个域名，手机打开直接自适应
5. 后续可按需升级到 Uni-app

### 架构

```
现有后端 API (NestJS) → 同一份
                ↓
现有前端 (React + Vite)
    ├── PC 端: 现有路由 + 布局（不变）
    └── 移动端: 新增 /m/* 路由 + 移动布局
                  ├── /m/dashboard      移动工作台
                  ├── /m/approvals      待审批列表
                  ├── /m/projects       项目列表
                  ├── /m/notifications  消息通知
                  └── /m/profile        个人中心
```

---

## 三、功能范围（MVP）

### Phase 1 — 移动端核心功能（3天）

| 功能 | 说明 |
|------|------|
| **移动端布局** | 底部 Tab 导航（工作台/审批/消息/我的） |
| **工作台** | KPI 卡片（待审批数、进行中项目数），最近待办 |
| **待审批列表** | 跨模块待审批事项，支持审批通过/驳回 |
| **消息通知** | 通知列表，标记已读，点击跳转 |
| **个人中心** | 修改密码，查看个人信息，退出登录 |

### Phase 2 — 增强功能（后续）

| 功能 | 说明 |
|------|------|
| 项目详情查看 | 项目信息、进度、台账 |
| 采购审批 | 查看采购单据详情 |
| 费用审批 | 费用申请、报销审批 |
| 快捷录入 | 回款录入、费用申请 |

---

## 四、技术实现

### 路由结构
```
/m                     → 重定向到 /m/dashboard
/m/dashboard           → 移动工作台
/m/approvals           → 待审批列表
/m/approvals/:type/:id → 审批详情
/m/notifications       → 消息通知
/m/profile             → 个人中心
/m/profile/password    → 修改密码
```

### 组件规划
```
frontend/src/
  pages/mobile/
    MobileLayout.tsx       ← 移动端主布局（底部 Tab）
    MobileDashboard.tsx    ← 工作台
    MobileApprovals.tsx    ← 待审批列表
    MobileApprovalDetail.tsx ← 审批详情
    MobileNotifications.tsx ← 消息通知
    MobileProfile.tsx      ← 个人中心
  App.tsx                  ← 新增 /m/* 路由
```

### 判断移动端
```typescript
// 通过 URL 前缀 /m/ 或者 UserAgent 判断
const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
// 或直接访问 /m/* 路由进入移动版
```

---

## 五、执行计划

- [ ] **Task 1: 搭建移动端布局**
  - 创建 `MobileLayout.tsx`（底部 TabBar：工作台、审批、消息、我的）
  - 创建各 Tab 页面骨架
  - 在 `App.tsx` 注册 `/m/*` 路由

- [ ] **Task 2: 移动工作台**
  - 复用 `dashboardApi` 获取数据
  - 展示 KPI 卡片（待审批数、项目数、本月回款/支出）
  - 展示最近待办事项列表

- [ ] **Task 3: 待审批列表 + 审批操作**
  - 调用 `dashboard/pending-approvals` 获取待审批列表
  - 点击进入详情页，查看单据信息
  - 支持通过/驳回操作

- [ ] **Task 4: 消息通知**
  - 调用 `notifications` API
  - 通知列表 + 标记已读
  - 点击跳转对应模块

- [ ] **Task 5: 个人中心**
  - 用户信息展示
  - 修改密码表单

- [ ] **Task 6: 构建验证**
  - 前端编译检查
  - 移动端页面访问测试
