# 数据看板优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all mock data on the dashboard with real API data, add visual charts (monthly financial trends), and optimize layout for role-based relevance.

**Current State:** Dashboard at `frontend/src/pages/dashboard/index.tsx` uses 100% mock data — mockApprovals, mockProjects, hardcoded KPI numbers. No backend dashboard module exists.

**Architecture:** Backend DashboardModule (NestJS) with a single controller that returns aggregated stats via Prisma raw queries / aggregate. Frontend replaces mock state with API calls, adds a trend chart using @ant-design/charts (already compatible with Ant Design v5).

**Tech Stack:** NestJS, Prisma, Ant Design, @ant-design/charts (or recharts)

---

### Task 1: Create Backend Dashboard Module

**Files:**
- Create: `backend/src/dashboard/dashboard.module.ts`
- Create: `backend/src/dashboard/dashboard.service.ts`
- Create: `backend/src/dashboard/dashboard.controller.ts`
- Modify: `backend/src/app.module.ts` — register DashboardModule

The dashboard module is **read-only** — no mutations, no approval flow, no notification calls. It aggregates data across all business modules via Prisma queries.

- [ ] **Step 1: Create dashboard.module.ts**

Standard NestJS module, exports DashboardService for potential reuse.

- [ ] **Step 2: Create dashboard.service.ts**

Implement the following aggregation methods:

**`getStats(userId: number, role: string)`** — Returns KPI card data:
- `pendingApprovalCount`: Count of all records across modules where status starts with 'pending' and the approver matches the user's role
- `activeProjectCount`: Count of projects where status = 'approved' and planEndDate >= now
- `totalProjectCount`: Count of all projects
- `totalContractAmount`: Sum of all approved projects' contractAmount
- `monthlyReceivable`: Sum of ProjectReceivable where receivedTime is in current month
- `monthlyExpense`: Sum of PaymentRequest where status = 'approved' and confirmed (PaymentConfirmation exists) in current month
- `lastMonthReceivable`: Same for previous month (for trend comparison)
- `lastMonthExpense`: Same for previous month

**`getPendingApprovals(limit = 10)`** — Returns unified pending approval list:
Query each module table for records with pending status, union them with a common shape:
```typescript
{ id, entityType, entityName, code, projectName, status, createdAt, url }
```

Modules to scan (all with status that includes 'pending'):
- Project (status = 'pending')
- PurchaseRequest (status = 'pending')
- InquiryOrder (status = 'pending_pm' or 'pending_leader')
- PurchaseConfirm (status = 'pending_pm' or 'pending_leader')
- DeliveryNotice (status = 'pending_purchaser' or 'pending_leader')
- StockOut (status = 'pending_leader' or 'pending_purchaser')
- MaterialRequisition (status = 'pending_purchaser' or 'pending_leader')
- ExpenseRequest (status = 'pending_leader' or 'pending_finance')
- Reimbursement (status = 'pending_pm' or 'pending_leader' or 'pending_finance')
- ContractVariation (status = 'pending')
- LaborContract (status = 'pending_pm' or 'pending_leader')
- LaborVisa (status = 'pending_leader')
- PaymentRequest (status = 'pending_leader' or 'pending_finance')

Implementation: Use Promise.all to query each table, then sort by createdAt desc and take limit.

**`getProjectProgress()`** — Returns project list with calculated progress:
- All approved projects
- Progress = elapsed days / total days * 100 (based on planStartDate ~ planEndDate)
- Include project name, type, pm name, deadline, progress percent

**`getMonthlyTrend(months = 12)`** — Returns monthly receivable/expense data for charts:
- Group ProjectReceivable by month for the last N months
- Group PaymentRequest (confirmed/approved) by month
- Return: `[{ month: '2026-01', receivable: xxx, expense: xxx }, ...]`

- [ ] **Step 3: Create dashboard.controller.ts**

Endpoints (all GET, all require JWT auth):

| Route | Method | Description |
|-------|--------|-------------|
| `/dashboard/stats` | GET | KPI numbers for current user |
| `/dashboard/pending-approvals` | GET | Unified pending approval list |
| `/dashboard/project-progress` | GET | Project list with progress |
| `/dashboard/monthly-trend` | GET | Monthly receivable/expense data |

- [ ] **Step 4: Register in app.module.ts**

Add import and register `DashboardModule`.

- [ ] **Step 5: Build and verify**

Run: `npm run build` (from backend directory)
Expected: Build succeeds, no errors.

---

### Task 2: Frontend — API Layer + Chart Library

**Files:**
- Create: `frontend/src/api/dashboard.ts`
- Modify: `frontend/src/pages/dashboard/index.tsx`
- Modify: `frontend/src/pages/dashboard/dashboard.module.css`

- [ ] **Step 1: Install chart library**

Run: `npm install @ant-design/charts` (or use recharts if lighter weight needed)

- [ ] **Step 2: Create dashboard API file**

```typescript
// frontend/src/api/dashboard.ts
import request from './request';

export const dashboardApi = {
  getStats: () => request.get('/dashboard/stats'),
  getPendingApprovals: () => request.get('/dashboard/pending-approvals'),
  getProjectProgress: () => request.get('/dashboard/project-progress'),
  getMonthlyTrend: () => request.get('/dashboard/monthly-trend'),
};
```

- [ ] **Step 3: Refactor DashboardPage — Replace mock data with real API**

**State management changes:**
- Remove `mockApprovals` and `mockProjects` constants
- Add `useState` for each data domain: stats, approvals, projects, trend
- Fetch all data in `useEffect` on mount using `Promise.all`
- Add loading state (Ant Design Skeleton or Spin)

**KPI Cards — Real data:**
| Card | Field |
|------|-------|
| 待审批 | `stats.pendingApprovalCount` |
| 进行中项目 | `stats.activeProjectCount` |
| 本月回款 | `stats.monthlyReceivable` (万元) |
| 本月支出 | `stats.monthlyExpense` (万元) |
| 项目总数 | `stats.totalProjectCount` |
| 合同总额 | `stats.totalContractAmount` (万元) |

- [ ] **Step 4: Add Monthly Trend Chart**

Below the KPI row, add a full-width Card containing a dual-axis/grouped bar chart:
- X-axis: month label
- Y-axis: amount (万元)
- Two series: 回款 (green) and 支出 (red/blue)
- Use `@ant-design/charts` Column (grouped) or Line component

```tsx
import { Column } from '@ant-design/charts';

// In the component:
const config = {
  data: trendData, // [{ month, type, value }]
  xField: 'month',
  yField: 'value',
  seriesField: 'type',
  isGroup: true,
  label: { position: 'top' },
  color: ({ type }) => type === '回款' ? '#52c41a' : '#1890ff',
};
```

- [ ] **Step 5: Update Pending Approvals Section**

Replace `mockApprovals` with real data from API:
- Show entity name/code, project name, status tag, relative time
- Click item → navigate to the corresponding module page
- Keep the same visual layout

- [ ] **Step 6: Update Project Progress Section**

Replace `mockProjects` with real data from API:
- Show real project name, PM, deadline, calculated progress bar
- Click → navigate to project detail or ledger

- [ ] **Step 7: Optimize Quick Actions**

Replace `message.info('功能开发中')` with real navigation:
- 新建项目 → `/projects` (already works)
- 发起采购 → `/purchases/requests`
- 录入回款 → `/finance/receivables`
- 费用申请 → `/expenses/requests`

- [ ] **Step 8: Build frontend**

Run: `npx vite build` (from frontend directory)
Expected: Build succeeds, no errors.

---

### Task 3: Integration Testing

- [ ] **Step 1: Rebuild backend**
- [ ] **Step 2: Start backend server and test API endpoints**

```bash
# Test stats
curl -s http://localhost:12404/api/v1/dashboard/stats -H "Authorization: Bearer $TOKEN"

# Test pending approvals
curl -s http://localhost:12404/api/v1/dashboard/pending-approvals -H "Authorization: Bearer $TOKEN"

# Test project progress
curl -s http://localhost:12404/api/v1/dashboard/project-progress -H "Authorization: Bearer $TOKEN"

# Test monthly trend
curl -s http://localhost:12404/api/v1/dashboard/monthly-trend -H "Authorization: Bearer $TOKEN"
```

- [ ] **Step 3: Build frontend and deploy**
- [ ] **Step 4: Verify full flow in browser** — KPI cards show real numbers, chart renders, approvals list is populated
