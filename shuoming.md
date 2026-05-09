# 扬光工程管理系统 — 开发说明文档

> **版本**: v2.0 | **最后更新**: 2026-05-08
> **目标读者**: 开发工程师
> **部署方式**: 独立部署，HTTP + Nginx 反向代理
> **定位**: 独立应用（不依赖扬光AI商城）

---

## 1. 项目概述

### 1.1 产品定位

本系统是一套面向工程类企业的项目全过程管理平台，覆盖从项目立项、采购、库存、劳务、费用到回款的全链条业务。系统以"项目"为独立核算单元，所有流程产生的收支最终汇总至项目总体台账。系统同时支持公司级材料设备库与库存管理，以及项目级库存管理，实现设备物料的调拨与成本归集。

**与 yg-ai-market 的关系**：本系统为独立应用，拥有独立的登录认证系统、数据库和部署方案，不与扬光AI商城共用用户体系。

### 1.2 核心业务流程全景

```
项目立项 → 采购申请 → 采购询价 → 采购确认 → 供货通知 → 自动入库项目库存
                                                          ↓
                                              一键转公司库存（带审批）
                                                          ↓
                                              其他项目材料领用 → 成本转移
```

### 1.3 用户规模

- 员工数：**20 人以内**
- 并发量：低（内部工具场景）

---

## 2. 技术方案

### 2.1 技术栈

| 层级 | 技术选型 | 说明 |
|------|---------|------|
| **后端框架** | NestJS + TypeScript | 工程化强、模块清晰，适合大型业务系统 |
| **数据库** | PostgreSQL（主库），Redis（缓存/队列/通知） |
| **ORM** | Prisma | 类型安全、Schema 即文档、迁移管理完善 |
| **前端框架** | React + TypeScript + Vite | |
| **UI 组件库** | Ant Design 5.x | 企业级组件能力 |
| **状态管理** | Zustand（全局状态）+ TanStack React Query（服务端状态） | 轻量、高效 |
| **路由** | React Router v6 | |
| **文件存储** | 本地文件系统（开发）/ 阿里云 OSS（生产） | 合同扫描件、发票、签证单等 |
| **审批流** | 自建状态机引擎 | 基于配置化的审批状态 + 角色路由 |
| **认证方式** | 自建 JWT 认证（HS256），独立用户体系 | 独立登录，不再依赖商城 |
| **PDF 生成** | 后端生成（PDFKit / Puppeteer），支持文字水印 | 用于表单下载打印 |

### 2.2 系统架构

```
┌──────────────────────────────────────────────────────────────┐
│                      浏览器 (用户)                             │
│  ┌──────────────────────────────────────────────────────────┐│
│  │              yg-xmgl (独立应用)                            ││
│  │  React + Ant Design + Vite                               ││
│  │  /login → 独立登录页面                                    ││
│  │  /dashboard → 工作台                                     ││
│  └──────────────────────┬───────────────────────────────────┘│
└─────────────────────────┬────────────────────────────────────┘
                          │
              ┌───────────▼───────────┐
              │  API 请求携带 JWT     │
              │  Authorization: Bearer │
              └───────────┬───────────┘
                          │
┌─────────────────────────▼─────────────────────────────────────┐
│              yg-xmgl Backend (NestJS)                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Auth     │  │ Project  │  │ Purchase │  │ Inventory     │  │
│  │ Module   │  │ Module   │  │ Module   │  │ Module        │  │
│  └──────────┘  └──────────┘  └──────────┘  └───────────────┘  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Finance  │  │ Labor    │  │ Ledger   │  │ Notify        │  │
│  │ Module   │  │ Module   │  │ Module   │  │ Module        │  │
│  └──────────┘  └──────────┘  └──────────┘  └───────────────┘  │
│  ┌──────────┐  ┌──────────┐                                    │
│  │ PDF      │  │ Approval │                                    │
│  │ Module   │  │ Engine   │                                    │
│  └──────────┘  └──────────┘                                    │
│                    │               │                            │
│              ┌─────▼─────┐   ┌────▼─────┐                      │
│              │PostgreSQL  │   │  Redis   │                      │
│              │ (主数据库)  │   │ (缓存/队)│                      │
│              └───────────┘   └──────────┘                      │
└────────────────────────────────────────────────────────────────┘
```

### 2.3 目录结构

```
yg-xmgl/
├── backend/                  # NestJS 后端
│   ├── prisma/               # Prisma Schema + 迁移
│   ├── src/
│   │   ├── auth/             # 独立 JWT 认证模块（登录/注册/用户管理）
│   │   ├── projects/         # 项目立项模块
│   │   ├── materials/        # 材料设备库
│   │   ├── purchase/         # 采购申请/询价/确认
│   │   ├── inventory/        # 公司库存/项目库存
│   │   ├── requisition/      # 材料领用
│   │   ├── delivery/         # 供货通知
│   │   ├── expenses/         # 费用/报销
│   │   ├── variations/       # 工程量变更
│   │   ├── labor/            # 劳务合同/签证
│   │   ├── payment/          # 付款申请/确认
│   │   ├── receivable/       # 回款
│   │   ├── ledger/           # 项目台账
│   │   ├── notifications/    # 通知系统
│   │   ├── files/            # 文件管理
│   │   ├── pdf/              # PDF 表单生成模块（水印）
│   │   ├── approval/         # 审批流引擎
│   │   ├── common/           # 公共工具/守卫/拦截器
│   │   └── main.ts
│   ├── test/
│   ├── .env
│   └── package.json
├── frontend/                 # React 前端
│   ├── src/
│   │   ├── components/       # 通用组件
│   │   ├── layouts/          # 布局
│   │   ├── pages/            # 页面
│   │   │   ├── login/
│   │   │   ├── dashboard/
│   │   │   ├── projects/
│   │   │   ├── purchases/
│   │   │   ├── inventory/
│   │   │   ├── expenses/
│   │   │   ├── labor/
│   │   │   ├── finance/
│   │   │   └── settings/
│   │   ├── hooks/            # 自定义 hooks
│   │   ├── stores/           # Zustand stores
│   │   ├── api/              # API 客户端（React Query）
│   │   ├── utils/            # 工具函数
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
└── docs/
    └── README.md
```

---

## 3. 用户角色与权限

### 3.1 角色定义

| 角色标识 | 角色名称 | 职责范围 |
|---------|---------|----------|
| `sales` | 销售 | 负责项目立项 |
| `pm` | 项目经理 | 发起采购申请、供货通知、项目库存出入库、费用申请、报销、工程量变更、劳务签证、付款申请；审批采购询价、采购确认、材料设备领用单、劳务合同确认单 |
| `purchaser` | 采购 | 维护材料设备库、公司库存；发起采购询价、采购确认、劳务合同确认单；审批供货通知单、项目库存入库、**一键转公司库存**；接收项目费用/报销结果 |
| `finance` | 财务 | 录入项目回款；审批项目费用申请、项目报销、付款申请单；发起付款确认单 |
| `leader` | 企业负责人/分管领导 | 审批项目立项、采购申请、采购询价、采购确认、材料设备领用单、供货通知单、**一键转公司库存**、项目费用申请、项目报销、工程量变更申请、劳务合同确认单、劳务签证、付款申请单 |
| `engineer` | 工程人员 | 参与部分流程（如收货人），可发起项目入库，无需审批权限 |
| `admin` | 系统管理员 | 系统配置、用户管理、角色分配 |

### 3.2 权限矩阵

| 功能模块 | 操作 | 销售 | PM | 采购 | 财务 | 负责人 | 工程人员 |
|---------|------|:---:|:--:|:----:|:----:|:-----:|:-------:|
| **项目立项** | 创建 | ✅ | - | - | - | - | - |
| | 编辑（本人） | ✅ | - | - | - | - | - |
| | 审批 | - | - | - | - | ✅ | - |
| | 查看 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **采购申请** | 创建/编辑 | - | ✅ | - | - | - | - |
| | 审批 | - | - | - | - | ✅ | - |
| | 采购确认（审批后） | - | - | ✅ | - | - | - |
| **采购询价** | 创建/编辑 | - | - | ✅ | - | - | - |
| | 审批 | - | ✅ | - | - | ✅ | - |
| **采购确认** | 创建/编辑（上传合同） | - | - | ✅ | - | - | - |
| | 审批 | - | ✅ | - | - | ✅ | - |
| **供货通知** | 创建/编辑 | - | ✅ | - | - | - | ✅ |
| | 审批 | - | - | ✅ | - | ✅ | - |
| **公司库存** | 维护 | - | - | ✅ | - | - | - |
| | 查看 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **材料领用** | 创建/编辑 | - | ✅ | - | - | - | - |
| | 审批 | - | - | ✅ | - | ✅ | - |
| **项目库存** | 入库（自动） | - | ✅ | - | - | - | ✅ |
| | 入库审批 | - | - | ✅ | - | - | - |
| | **一键转公司库存** | - | ✅ | - | - | - | - |
| | 转公司库存审批（领导） | - | - | - | - | ✅ | - |
| | 转公司库存审批（采购） | - | - | ✅ | - | - | - |
| **费用申请** | 创建/编辑 | - | ✅ | - | - | - | - |
| | 审批（领导人） | - | - | - | - | ✅ | - |
| | 打款确认 | - | - | - | ✅ | - | - |
| **报销** | 创建/编辑 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| | 项目经理审批 | - | ✅ | - | - | - | - |
| | 领导审批 | - | - | - | - | ✅ | - |
| | 打款确认 | - | - | - | ✅ | - | - |
| **工程量变更** | 创建/编辑 | - | ✅ | - | - | - | - |
| | 审批 | - | - | - | - | ✅ | - |
| **劳务合同** | 创建/编辑 | - | - | ✅ | - | - | - |
| | 审批 | - | ✅ | - | - | ✅ | - |
| **劳务签证** | 创建/编辑 | - | ✅ | - | - | - | - |
| | 审批 | - | - | - | - | ✅ | - |
| **付款申请** | 创建/编辑 | - | ✅ | ✅ | - | - | - |
| | 审批 | - | - | - | - | ✅ | - |
| | 付款确认 | - | - | - | ✅ | - | - |
| **回款** | 录入 | - | - | - | ✅ | - | - |
| **项目台账** | 查看 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **PDF 下载** | 所有流程表单下载 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

> **一键转公司库存审批流程**：项目经理发起 → 企业负责人/分管领导审批 → 采购审批 → 通过后自动入公司库存

### 3.3 数据权限

- **项目立项**：销售只能看到并编辑自己创建的项目
- **项目经理**：仅能看到自己负责的项目及关联单据
- **采购**：能看到所有项目，以便统筹采购
- **财务**：所有项目
- **领导**：所有项目
- **工程人员**：仅能看到自己参与的项目
- **公司库存**：全局共享，无项目隔离
- **材料设备库**：全局共享，所有角色可读

---

## 4. 核心业务模块与数据模型

### 4.1 项目立项

**流程**：销售填报 → 负责人审批通过 → 抄送相关人员，项目台账自动创建。

**字段**：
- `项目编码`：String，自动生成，格式 `YGKI-{项目类型编码}-{YYYYMMDD}-{三位流水号}`
- `项目名称`：String，手动
- `项目类型`：Enum（`集成`=JC，`供货`=GH）
- `销售负责人`：关联用户表（角色销售）
- `项目概况`：Text
- `合同金额`：Decimal
- `预期利润率`：Decimal（百分比）
- `项目经理`：关联用户表（角色工程人员）
- `计划开工日期`：Date
- `计划完工日期`：Date
- `工期`：Integer，自动计算
- `备注`：Text
- `合同附件`：文件路径/URL
- `审批状态`：Enum（待审批/已通过/已驳回）
- 创建时间、更新时间

### 4.2 材料设备库

**独立于所有项目**，全局共享。

**字段**：
- 材料设备名称、品牌、规格型号、单位

**唯一性约束**：(材料设备名称, 品牌, 规格型号, 单位) 联合唯一。

**联动规则**：
- 采购可提前手动录入
- 采购申请时录入新料自动同步到该库
- 所有模块选材时模糊搜索此库

### 4.3 采购申请

**流程**：项目经理/项目参与人填报 → 企业负责人/分管领导审批 → 采购确认收到。

**关联**：属于某个项目。

**字段**：项目ID、采购明细（子表：材料设备名称、品牌、规格型号、单位、数量、合同单价、合同总价、要求到货时间、备注）、总价、到货地址、收货人、电话、审批状态。

### 4.4 采购询价

**流程**：采购发起 → 项目经理审批 → 负责人审批通过。

**关联**：基于已审批通过的采购申请。

### 4.5 采购确认

**流程**：采购上传合同 → 项目经理审批 → 负责人审批通过。

**关联**：基于已审批通过的采购询价。

### 4.6 公司库存

**独立于项目**，反映公司本级库存量。

**字段**：材料设备ID、数量、成本单价、备注

**数据来源**：
- 初始手动录入（采购维护）
- 项目库存"一键转公司"审批通过后自动增加
- 材料设备领用单审批通过后扣减

### 4.7 材料设备领用单

**流程**：项目经理发起 → 采购审批 → 领导审批通过。

**成本规则**：
- 若材料是公司已有库存（非项目转入），成本为零
- 若由其他项目转入公司，成本按该库存记录的成本单价
- 领用单中的"项目合同单价"与成本单价的差价计入项目台账

### 4.8 供货通知单（含自动入库）

**流程**：项目经理发起 → 采购审批 → 领导审批通过 → **审批通过后自动入库项目库存**。

**关联**：基于已审批的采购确认单。

**新增规则**：原设计需手动发起入库（第4.9节），现改为**审批通过后系统自动完成入库操作**，无需人工干预。

**字段**：
- `关联采购确认单ID`
- **采购明细**（源于确认单明细）：
  - 每一项增加 `到货日期`（手动选择），支持部分到货或分批次
- `到货日期总体选项`：可设"具体日期"或"分批次到货"
- `收货地址`：自动带出，可改
- `收货人及电话`：自动带出，可改
- 审批状态

**自动入库逻辑**：
```
供货通知单审批通过
  → 系统自动创建入库单（stock_in）
  → 明细逐项写入 project_inventory
  → 成本单价取该批次的采购单价
  → 更新项目库存数量
  → 记录入库流水
  → 通知项目经理"已自动入库"
```

### 4.9 项目库存

**隶属于项目**，管理该项目的设备入库与出库。

#### 4.9.1 入库（自动）

供货通知单审批通过后自动完成，操作员无需手动操作。

#### 4.9.2 一键转公司库存（含审批流）

> **新增需求 v2.0**：原设计为无需审批直接出库，现改为带审批流的完整流程。

**流程**：项目经理发起 → 企业负责人/分管领导审批 → 采购审批 → 通过后自动入公司库存。

**入口**：项目库存页面增加 **"一键转公司库存"** 按钮。

**交互流程**：
1. 点击按钮 → 弹出模态框，展示本项目全部库存明细清单
2. 每行左侧有 **复选框** 可勾选
3. 每行 **数量可手动修改**（不可超过当前库存量）
4. 底部必填 **原因**，分两部分：
   - **下拉框选择**（单选）：甲方设计变更 / 我方方案优化 / 采购数量提报错误 / 其他
   - **手动输入具体事项**：文本输入框，补充说明
5. 提交后进入审批流程

**审批流程**：
```
项目经理提交
  → 企业负责人/分管领导审批（通过/驳回）
    → 采购审批（通过/驳回）
      → 全部通过 → 自动入公司库存
```

**成本逻辑（关键）**：
- 转出时：项目库存扣减，公司库存增加（成本单价沿用采购单价）
- **项目成本不减少**，该部分材料设备的采购金额**仍然算在项目总成本内**
- 直到**其他项目发起"材料领用"审批通过**后，该部分成本才从原项目成本中扣除
- 实现方式：在 `project_ledger` 中维护 `stock_out_pending_deduct`（待抵扣转出成本）和 `deducted_by_other_projects`（已被其他项目抵扣金额）

**示例**：
```
项目A 采购了 10万元 的材料
  → 项目A 将其中 3万元 材料一键转公司库存
  → 项目A 成本仍为 10万元（不减少）
  → 项目B 从公司库存领用了这 3万元 材料
  → 项目A 成本调整为 10万 - 3万 = 7万元
  → 项目B 成本增加 3万元（按领用规则计算）
```

### 4.10 项目费用申请

**流程**：项目经理提报 → 领导审批 → 财务打款并反馈。

**台账影响**：审批通过且财务打款后，项目成本增加该金额。

### 4.11 项目报销

**流程**：
- 项目经理本人报销：提报 → 领导审批 → 财务打款抄送提报人
- 项目其他人员：提报 → 项目经理审批 → 领导审批 → 财务打款抄送

### 4.12 工程量变更申请

**流程**：项目经理提报 → 领导审批通过。

**台账影响**：审批通过后，变更总价计入项目成本，同时调整项目合同总额。

### 4.13 劳务合同确认单

**流程**：采购提报（上传合同附件、填写合同金额）→ 项目经理审批 → 领导审批。

### 4.14 劳务签证

**流程**：项目经理提报 → 领导审批。

**关联**：基于已审批的劳务合同。

### 4.15 付款申请单

**流程**：项目经理或采购提报 → 领导审批 → 财务付款。

### 4.16 付款确认单

**流程**：财务付款后发起，无需审批，直接通知领导和项目经理。

### 4.17 项目回款

**流程**：财务录入，无需审批，通知相关人。

### 4.18 项目总体台账

**实时自动汇总**，展示项目所有收支及利润。

**数据来源**：
- 收入：合同金额 + 工程量变更调整 + 实际回款累计
- 支出（成本）：
  - 采购成本：所有已审批的采购确认单汇总金额
  - 公司库存领用成本：领用单总成本
  - 项目费用、报销：已审批
  - 工程量变更、劳务合同及签证
  - **项目库存转公司后待抵扣成本：`stock_out_pending_deduct`**
  - **已被其他项目领用抵扣：`deducted_by_other_projects`**
- 利润 = 调整后合同总额 - 总支出

---

## 5. 系统级功能模块

### 5.1 通知系统

**通知类型**：

| 通知类型 | 触发时机 | 接收人 |
|---------|---------|--------|
| 待审批通知 | 有单据待某人审批 | 对应审批人 |
| 审批通过通知 | 单据审批通过 | 提报人 |
| 审批驳回通知 | 单据被驳回 | 提报人 |
| 供货通知自动入库 | 供货通知审批通过，系统自动入库完成 | 项目经理 |
| 一键转公司审批通过 | 转公司库存流程全部审批完成 | 发起人 |
| 付款确认通知 | 财务完成付款 | 提报人 + 项目经理 |
| 回款通知 | 财务录入回款 | 项目经理 |
| 库存领用通知 | 材料领用审批通过，成本发生转移 | 原项目项目经理 |

### 5.2 操作日志

所有业务单据的创建、修改、审批操作需要记录审计日志。

### 5.3 文件管理

合同扫描件、发票、签证单、报销附件等统一管理。

### 5.4 PDF 表单下载（新增）

> **新增需求 v2.0**

**功能描述**：每个流程（项目立项、采购申请、供货通知、入库单、转库存单等）详情页均提供 **"一键下载PDF表单"** 按钮。

**PDF 内容**：
- 表单全部字段数据（格式化为正式表单样式）
- 表单标题、编号、日期
- 审批状态及审批意见
- 各阶段审批人签字栏（留空，供线下签字）

**水印要求**：
- PDF 页面叠加 **当前登录员工姓名** 水印
- 水印以斜体半透明方式显示于页面背景
- 示例：`张三` 以 45° 倾斜、浅灰色、半透明显示在每一页

**技术实现**：
- 后端使用 **PDFKit** 或 **Puppeteer** 生成 PDF
- 水印在生成时直接绘制到 PDF 页面
- 接口：`GET /api/v1/pdf/{entityType}/{entityId}` → 返回 PDF 文件流
- 权限校验：当前用户必须对此单据有查看权限

**支持下载的流程**：
| 流程 | 实体类型 |
|------|---------|
| 项目立项 | `project` |
| 采购申请单 | `purchase-request` |
| 采购询价单 | `inquiry-order` |
| 采购确认单 | `purchase-confirm` |
| 供货通知单 | `delivery-notice` |
| 入库单 | `stock-in` |
| 一键转公司库存单 | `stock-out` |
| 材料设备领用单 | `material-requisition` |
| 费用申请单 | `expense-request` |
| 报销单 | `reimbursement` |
| 工程量变更申请 | `contract-variation` |
| 劳务合同确认单 | `labor-contract` |
| 劳务签证 | `labor-visa` |
| 付款申请单 | `payment-request` |
| 付款确认单 | `payment-confirmation` |
| 项目回款单 | `receivable` |

### 5.5 首页仪表盘

用户登录后的第一个页面，展示全局概览：待审批数、项目统计、财务概览、待办列表、项目进展、快捷操作。

---

## 6. 数据库设计核心表结构

```sql
-- 用户表（独立，不再依赖商城）
users (id, username, password_hash, display_name, role, department,
       phone, is_active, created_at, updated_at)

-- 项目表
projects (id, code, name, type, sales_id, description, contract_amount,
          expected_profit_rate, project_manager_id, plan_start_date,
          plan_end_date, duration, remarks, attachment, status, created_at)

-- 材料设备库
material_lib (id, name, brand, spec, unit, unique(name,brand,spec,unit))

-- 采购申请单
purchase_requests (id, project_id, total_amount, delivery_address,
                   receiver_id, phone, status, created_by...)
purchase_request_items (id, pr_id, material_lib_id, name, brand, spec, unit,
                        quantity, contract_price, total_price,
                        required_delivery_date, remark)

-- 采购询价单
inquiry_orders (id, pr_id, total_amount, status...)
inquiry_items (id, inquiry_id, material_lib_id, name..., quantity,
               purchase_price, total_price, is_extra)

-- 采购确认单
purchase_confirm (id, inquiry_id, delivery_payment_terms, supply_cycle,
                  contract_file, status...)
purchase_confirm_items (id, confirm_id, material_lib_id, name...,
                        quantity, unit, purchase_price, total)

-- 公司库存表
company_inventory (id, material_lib_id, quantity, cost_price, remark)
company_inventory_logs (id, inventory_id, change_qty, type, ref_id,
                        project_id, cost_price)

-- 供货通知单
delivery_notices (id, confirm_id, delivery_option, total_date,
                  receiver, phone, address, status)
delivery_notice_items (id, notice_id, confirm_item_id, material_lib_id,
                       quantity, delivery_date)

-- 项目库存表
project_inventory (id, project_id, material_lib_id, quantity, cost_price)
project_inventory_logs (id, inventory_id, change_qty, type, ref_id, cost_price)

-- 自动入库记录（由供货通知审批通过自动生成）
stock_in (id, notice_id, project_id, stock_in_time, status, auto_generated)
stock_in_items (id, stock_in_id, notice_item_id, material_lib_id, quantity, cost_price)

-- 一键转公司库存（含审批流）
stock_out (id, project_id, reason_type, reason_detail, status, created_by...)
stock_out_items (id, out_id, material_lib_id, quantity, cost_price, cost_total)

-- 成本调整记录（用于其他项目领用后扣减原项目成本）
cost_adjustments (id, source_project_id, target_project_id, stock_out_id,
                  requisition_id, amount, status, created_at)

-- 材料设备领用单
material_requisition (id, project_id, total_cost, status...)
material_requisition_items (id, req_id, material_lib_id, quantity,
                            cost_price, contract_price, total)

-- 项目费用申请
project_expense_requests (id, project_id, reason, amount, pay_method,
                          other_method, status)

-- 报销
reimbursements (id, project_id, reason, amount, has_invoice, invoice_file,
                no_invoice_reason, status, created_by, needs_pm_approve)

-- 工程量变更
contract_variations (id, project_id, status)
variation_items (id, variation_id, material_lib_id, name..., quantity,
                 contract_price, total)

-- 劳务合同
labor_contracts (id, project_id, amount, contract_file, status)

-- 劳务签证
labor_visas (id, labor_contract_id, reason_calc, amount_change, status)

-- 付款申请
payment_requests (id, project_id, contract_type, contract_id,
                  payment_terms, reason, amount, status)

-- 付款确认
payment_confirmations (id, payment_request_id, amount, payment_time)

-- 项目回款
project_receivables (id, project_id, amount, method, received_time)

-- 通知系统
notifications (id, user_id, type, title, content, entity_type, entity_id,
               is_read, created_at)

-- 操作日志
operation_logs (id, user_id, user_name, action, entity_type, entity_id,
                changes(JSON), ip_address, created_at)

-- 文件管理
files (id, original_name, stored_path, mime_type, size, entity_type,
       entity_id, uploaded_by, created_at)

-- 台账（可用视图或物化表）
project_ledger (
  project_id, contract_amount, variation_amount, adjusted_amount,
  total_receivable, total_paid_out, purchase_cost, labor_cost,
  expense_cost, requisition_cost, stock_out_pending_deduct,
  deducted_by_other_projects, other_deduction, total_cost, profit, profit_rate
)

-- 审批历史（统一审批记录表）
approval_history (
  id, entity_type, entity_id, step, approver_id, action(approve/reject),
  comment, created_at
)
```

---

## 7. API 设计规范

### 7.1 通用规范

- **基础路径**：`/api/v1`
- **认证方式**：`Authorization: Bearer {JWT_TOKEN}`（自签发的 token）
- **请求格式**：`application/json`
- **响应格式**：

```json
// 成功
{ "code": 0, "message": "success", "data": { ... } }

// 列表（带分页）
{ "code": 0, "message": "success", "data": { "items": [...], "total": 100, "page": 1, "pageSize": 20 } }

// 错误
{ "code": 40001, "message": "参数错误：项目名称不能为空", "data": null }
```

### 7.2 认证接口（独立登录）

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | `/api/v1/auth/login` | 登录，返回 JWT token | 所有人 |
| POST | `/api/v1/auth/register` | 创建账号（仅管理员） | 管理员 |
| GET | `/api/v1/auth/me` | 获取当前用户信息 | 登录用户 |
| PUT | `/api/v1/auth/change-password` | 修改密码 | 登录用户 |
| GET | `/api/v1/users` | 用户列表 | 管理员 |

### 7.3 PDF 下载接口（新增）

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/v1/pdf/{entityType}/{entityId}` | 下载 PDF 表单（含水印） | 有查看权限的用户 |

### 7.4 错误码规范

| 范围 | 含义 |
|------|------|
| 0 | 成功 |
| 401xx | 认证相关 |
| 403xx | 权限相关 |
| 404xx | 资源不存在 |
| 422xx | 参数校验失败 |
| 500xx | 服务器内部错误 |

### 7.5 命名规范

- **路由**：RESTful，复数名词
- **审批操作**：`POST /{entity}/{id}/approve`，`POST /{entity}/{id}/reject`
- **PDF 下载**：`GET /pdf/{entityType}/{entityId}`

---

## 8. UI 设计规范

以 Ant Design 5.x 为基础，ThemeToken 定制主色调。

- **主色**：品牌蓝色系
- **侧边栏**：深色背景
- **卡片**：白色背景，圆角，轻投影
- **表格**：无边框线风格，行 hover 高亮
- **按钮**：主按钮圆角风格

### 关键页面交互（一键转公司库存）

```
┌──────────────────────────────────────────────────────┐
│  项目库存 > 一键转公司库存                              │
│                                                       │
│  ┌──────────────────────────────────────────────────┐ │
│  │  ☑ 全选    已选 3 项 / 共 8 项                    │ │
│  │                                                  │ │
│  │  ☑ 电缆 YJV-3×25      数量 100 [____]  成本 ¥50 │ │
│  │  ☑ 配电箱 XL-21        数量 5   [____]  成本 ¥200│ │
│  │  ☑ 钢管 DN25           数量 200 [____]  成本 ¥15 │ │
│  │  ☐ 开关面板            数量 50  [____]  成本 ¥8  │ │
│  │  ...                                             │ │
│  └──────────────────────────────────────────────────┘ │
│                                                       │
│  转出原因：                                           │
│  [甲方设计变更          ▼] [______________________]   │
│    ↑ 下拉框选择           ↑ 手动输入具体事项        │
│                                                       │
│           [取消]              [提交审批]              │
└──────────────────────────────────────────────────────┘
```

---

## 9. 审批状态机

所有业务单据的统一审批状态流转：

```
draft(草稿) → pending(审批中) → approved(已通过)
                               → rejected(已驳回) → draft(重新提交)
```

**特殊状态**（各模块扩展）：
- 采购申请：增加 `confirmed`（采购已确认收到）
- 一键转公司库存：两级审批，分别记录 `leader_approved` 和 `purchaser_approved`

**审批记录**：统一使用 `approval_history` 表，记录每一步的操作人和意见。

---

## 10. 开发计划

按模块依赖关系分 **六个阶段** 迭代开发：

### 第一阶段：核心骨架 + 认证
- 项目初始化（NestJS + React 项目脚手架搭建）
- Prisma Schema 设计与数据库迁移
- 独立 JWT 认证模块（登录 / 用户管理）
- 前端布局（侧边栏 + 顶部栏 + 内容区）
- 登录页面
- 首页仪表盘
- 通知系统基础架构

### 第二阶段：项目立项 + 材料设备库
- 项目立项 CRUD + 审批流程
- 项目编码自动生成
- 材料设备库管理
- 项目列表与详情页

### 第三阶段：采购链条
- 采购申请 → 审批
- 采购询价 → 审批
- 采购确认 → 审批
- 供货通知单 → 审批

### 第四阶段：库存管理（含新需求）
- 公司库存管理
- **供货通知审批后自动入库项目库存**
- 项目库存管理
- **一键转公司库存（含审批流 + 勾选 + 原因选择）**
- **成本调整记录（跨项目抵扣）**
- 材料设备领用单
- 库存流水

### 第五阶段：成本与资金
- 项目费用申请
- 项目报销
- 工程量变更
- 劳务合同确认单
- 劳务签证

### 第六阶段：收付款 + 台账 + PDF
- 付款申请单 / 付款确认单
- 项目回款
- 项目总体台账（含成本抵扣逻辑）
- **PDF 表单下载（所有流程，含员工姓名水印）**

---

## 11. 附录

### 11.1 独立认证说明

不再依赖 yg-ai-market 的 JWT 认证，系统自建用户体系：

| 功能 | 实现方式 |
|------|---------|
| 密码加密 | bcrypt（passlib / bcryptjs）|
| JWT 签发 | HS256 算法，服务端配置密钥 |
| Token 有效期 | 24 小时 |
| 首次启动 | 自动创建默认管理员账号（admin / admin123） |
| 用户管理 | 管理员可创建/编辑/禁用账号，分配角色 |

### 11.2 与 yg-ai-market 的关系

- 独立部署，不依赖商城
- 如有需要，可通过 iframe 将本系统嵌入商城（可选），但不作为默认方案
- 用户体系完全独立，不与商城共享

### 11.3 一键转公司库存 - 完整数据流

```
项目经理提交转库存单（stock_out）
  → stock_out.status = pending
  → 通知企业负责人审批

企业负责人审批通过
  → approval_history 记录
  → stock_out.leader_approved = true
  → 通知采购审批

采购审批通过
  → approval_history 记录
  → stock_out.status = approved
  → 遍历 stock_out_items:
      → project_inventory.quantity -= 出库数量
      → company_inventory.quantity += 出库数量（成本单价沿用）
      → 记录 inventory_logs
      → project_ledger.stock_out_pending_deduct += 出库成本

其他项目发起材料领用（requisition）并审批通过
  → 领用明细涉及此部分材料时：
      → 创建 cost_adjustments 记录
      → project_ledger.deducted_by_other_projects += 抵扣金额
      → project_ledger.total_cost -= 抵扣金额
      → 原项目项目经理收到通知
```
