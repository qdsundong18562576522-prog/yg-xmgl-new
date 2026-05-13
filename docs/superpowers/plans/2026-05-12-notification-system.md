# 消息通知系统 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a system-wide notification system: when any approval-flow action occurs (submit/approve/reject/withdraw), the relevant user receives a notification visible via a bell icon in the top-right header.

**Architecture:** Backend NotificationService (NestJS module) with CRUD endpoints + Prisma Notification table. Each existing service calls `notify()` on state changes. Frontend adds bell icon with unread badge (Ant Design Badge + Popover) in MainLayout, polling every 30s.

**Tech Stack:** NestJS, Prisma, Ant Design, React

---

### Task 1: Create Backend Notification Module

**Files:**
- Create: `backend/src/notifications/notifications.module.ts`
- Create: `backend/src/notifications/notifications.service.ts`
- Create: `backend/src/notifications/notifications.controller.ts`
- Modify: `backend/src/app.module.ts` — register NotificationsModule

- [ ] **Step 1: Create notifications.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
```

- [ ] **Step 2: Create notifications.service.ts**

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async notify(userId: number, type: string, title: string, content: string, entityType?: string, entityId?: number) {
    return this.prisma.notification.create({
      data: { userId, type, title, content, entityType, entityId },
    });
  }

  async findByUser(userId: number, limit = 20) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async unreadCount(userId: number) {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  async markRead(id: number, userId: number) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  async markAllRead(userId: number) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }
}
```

- [ ] **Step 3: Create notifications.controller.ts**

```typescript
import { Controller, Get, Post, Param, ParseIntPipe } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private service: NotificationsService) {}

  @Get()
  async findAll(@CurrentUser() user: any) {
    return this.service.findByUser(user.userId);
  }

  @Get('unread-count')
  async unreadCount(@CurrentUser() user: any) {
    const count = await this.service.unreadCount(user.userId);
    return { count };
  }

  @Post(':id/read')
  async markRead(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.service.markRead(id, user.userId);
  }

  @Post('read-all')
  async markAllRead(@CurrentUser() user: any) {
    return this.service.markAllRead(user.userId);
  }
}
```

- [ ] **Step 4: Register in app.module.ts**

Add import and register `NotificationsModule` in `backend/src/app.module.ts`.

- [ ] **Step 5: Build and verify**

Run: `npm run build` (from backend directory)
Expected: Build succeeds, no errors.

---

### Task 2: Add notify() Calls to All Module Services

**Files:** Modify ~13 service files to inject `NotificationsService` and call `notify()` on submit/approve/reject/withdraw.

Each service follows this pattern to inject NotificationsService:

```typescript
import { NotificationsService } from '../notifications/notifications.service';

// In constructor:
constructor(
  private prisma: PrismaService,
  private notifications: NotificationsService,
) {}
```

**Pattern for each notification call:**

**Submit (draft → pending):**
```typescript
await this.notifications.notify(
  firstApproverId,  // e.g., leader or pm user ID
  'approval_required',
  `${moduleLabel}审批通知`,
  `${creatorName} 提交了 ${code}，待您审批`,
  entityType,
  entityId,
);
```

**Approve (pending → next or approved):**
```typescript
await this.notifications.notify(
  record.createdById,
  'approved',
  `${moduleLabel}已通过`,
  `您的 ${code} 已通过${stepLabel}审批`,
  entityType,
  entityId,
);
```

**Reject:**
```typescript
await this.notifications.notify(
  record.createdById,
  'rejected',
  `${moduleLabel}已驳回`,
  `您的 ${code} 已被驳回${comment ? '：' + comment : ''}`,
  entityType,
  entityId,
);
```

**Withdraw:**
```typescript
await this.notifications.notify(
  approverId,
  'withdrawn',
  `${moduleLabel}已撤回`,
  `${userName} 撤回了 ${code}`,
  entityType,
  entityId,
);
```

**Modules to modify (service files and their module files for dependency injection):**

| Module | Service File | EntityType Label | Submitter find logic |
|--------|-------------|-----------------|---------------------|
| projects | `projects.service.ts` | project | project.salesId or submitter |
| purchase-requests | `purchase-requests.service.ts` | purchase-request | createdById |
| inquiry-orders | `inquiry-orders.service.ts` | inquiry-order | createdById |
| purchase-confirms | `purchase-confirms.service.ts` | purchase-confirm | createdById |
| delivery-notices | `delivery-notices.service.ts` | delivery-notice | createdById |
| stock-out | `stock-out.service.ts` | stock-out | createdById |
| material-requisitions | `material-requisitions.service.ts` | material-requisition | createdById |
| expense-requests | `expense-requests.service.ts` | expense-request | createdById |
| reimbursements | `reimbursements.service.ts` | reimbursement | createdById |
| contract-variations | `contract-variations.service.ts` | contract-variation | createdById |
| labor-contracts | `labor-contracts.service.ts` | labor-contract | createdById |
| labor-visas | `labor-visas.service.ts` | labor-visa | createdById |
| payment-requests | `payment-requests.service.ts` | payment-request | createdById |

**For each service, 4 modifications:**
1. Import NotificationsService
2. Add to constructor
3. Add NotificationsModule to the module's imports
4. Insert notify() calls at each status transition

- [ ] **Step 1: Modify projects.service.ts** — Insert notify() in submitForApproval, approve, reject
- [ ] **Step 2: Modify purchase-requests.service.ts** — Insert notify() in submit, approve, reject, withdraw
- [ ] **Step 3: Modify inquiry-orders.service.ts** — Insert notify() in submit, approvePm, approveLeader, reject, withdraw
- [ ] **Step 4: Modify purchase-confirms.service.ts** — Insert notify() in submit, approvePm, approveLeader, reject, withdraw
- [ ] **Step 5: Modify delivery-notices.service.ts** — Insert notify() in submit, approvePurchaser, approveLeader, reject, withdraw
- [ ] **Step 6: Modify stock-out.service.ts** — Insert notify() in submit, approveLeader, approvePurchaser, reject
- [ ] **Step 7: Modify material-requisitions.service.ts** — Insert notify() in submit, approvePurchaser, approveLeader, reject
- [ ] **Step 8: Modify expense-requests.service.ts** — Insert notify() in submit, approveLeader, approveFinance, reject
- [ ] **Step 9: Modify reimbursements.service.ts** — Insert notify() in submit, approvePm, approveLeader, approveFinance, reject
- [ ] **Step 10: Modify contract-variations.service.ts** — Insert notify() in submit, approve, reject
- [ ] **Step 11: Modify labor-contracts.service.ts** — Insert notify() in submit, approvePm, approveLeader, reject, withdraw
- [ ] **Step 12: Modify labor-visas.service.ts** — Insert notify() in submit, approve, reject, withdraw
- [ ] **Step 13: Modify payment-requests.service.ts** — Insert notify() in submit, approveLeader, approveFinance, reject, withdraw, confirmPay

**Important:** Each service's module file must import `NotificationsModule`:
```typescript
import { NotificationsModule } from '../notifications/notifications.module';
// In @Module imports array:
NotificationsModule,
```

- [ ] **Step 14: Build and verify**

Run: `npm run build`
Expected: All modules compile with no errors.

---

### Task 3: Frontend — Bell Icon Component + API

**Files:**
- Create: `frontend/src/api/notifications.ts`
- Create: `frontend/src/components/NotificationBell.tsx`
- Modify: `frontend/src/layouts/MainLayout.tsx`

- [ ] **Step 1: Create notifications API file**

```typescript
import request from './request';

export const notificationsApi = {
  findAll: () => request.get('/notifications'),
  unreadCount: () => request.get('/notifications/unread-count'),
  markRead: (id: number) => request.post(`/notifications/${id}/read`),
  markAllRead: () => request.post('/notifications/read-all'),
};
```

- [ ] **Step 2: Create NotificationBell component**

```tsx
import { useState, useEffect, useRef } from 'react';
import { Badge, Popover, List, Button, message } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { notificationsApi } from '../api/notifications';

const iconMap: Record<string, string> = {
  approval_required: '📋',
  approved: '✅',
  rejected: '❌',
  withdrawn: '↩️',
};

const entityRoutes: Record<string, string> = {
  project: '/projects',
  'purchase-request': '/purchases/requests',
  'inquiry-order': '/purchases/inquiries',
  'purchase-confirm': '/purchases/confirms',
  'delivery-notice': '/purchases/delivery',
  'stock-out': '/inventory/stock-out',
  'material-requisition': '/inventory/requisitions',
  'expense-request': '/expenses/requests',
  reimbursement: '/expenses/reimbursements',
  'contract-variation': '/projects/variations',
  'labor-contract': '/labor/contracts',
  'labor-visa': '/labor/visas',
  'payment-request': '/finance/payment-requests',
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const [listRes, countRes]: any = await Promise.all([
        notificationsApi.findAll(),
        notificationsApi.unreadCount(),
      ]);
      setNotifications(listRes.data || []);
      setUnreadCount(countRes.data?.count || 0);
    } catch {}
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleClick = async (item: any) => {
    try {
      await notificationsApi.markRead(item.id);
      setOpen(false);
      if (item.entityType && entityRoutes[item.entityType]) {
        navigate(entityRoutes[item.entityType]);
      }
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setUnreadCount(0);
      setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
      message.success('已全部标记已读');
    } catch {}
  };

  const content = (
    <div style={{ width: 360 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <strong>消息通知</strong>
        <Button type="link" size="small" onClick={handleMarkAllRead}>全部已读</Button>
      </div>
      <List
        dataSource={notifications.slice(0, 10)}
        locale={{ emptyText: '暂无通知' }}
        renderItem={(item: any) => (
          <List.Item
            onClick={() => handleClick(item)}
            style={{
              cursor: 'pointer',
              padding: '8px 12px',
              background: item.isRead ? 'transparent' : '#e6f7ff',
              borderRadius: 4,
              marginBottom: 2,
            }}
          >
            <List.Item.Meta
              avatar={<span style={{ fontSize: 18 }}>{iconMap[item.type] || '📌'}</span>}
              title={<span style={{ fontWeight: item.isRead ? 400 : 600, fontSize: 13 }}>{item.title}</span>}
              description={
                <div>
                  <div style={{ fontSize: 12, color: '#666' }}>{item.content}</div>
                  <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                    {new Date(item.createdAt).toLocaleString()}
                  </div>
                </div>
              }
            />
          </List.Item>
        )}
      />
    </div>
  );

  return (
    <Popover content={content} trigger="click" open={open} onOpenChange={setOpen} placement="bottomRight">
      <Badge count={unreadCount} size="small" style={{ cursor: 'pointer' }}>
        <BellOutlined style={{ fontSize: 18, cursor: 'pointer' }} />
      </Badge>
    </Popover>
  );
}
```

- [ ] **Step 3: Modify MainLayout.tsx**

In the Header section, before the user dropdown, add the NotificationBell:

```tsx
// Add import:
import NotificationBell from '../components/NotificationBell';

// In the Header div, before the Dropdown:
<div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
  <NotificationBell />
  <Dropdown menu={userMenu} placement="bottomRight">
    ...
  </Dropdown>
</div>
```

Also wrap the Header's flex container properly: the existing Header has `justifyContent: 'space-between'`. The button is on the left, user menu on the right. Add the bell in the middle-right area, right before the user menu.

Current Header JSX:
```tsx
<Header style={{ padding: '0 24px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
  <Button type="text" icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={() => setCollapsed(!collapsed)} />
  <Dropdown menu={userMenu} placement="bottomRight">
    <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
      <Avatar icon={<UserOutlined />} />
      <span>{user?.displayName}</span>
    </div>
  </Dropdown>
</Header>
```

Change the right side to:
```tsx
<div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
  <NotificationBell />
  <Dropdown menu={userMenu} placement="bottomRight">
    <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
      <Avatar icon={<UserOutlined />} />
      <span>{user?.displayName}</span>
    </div>
  </Dropdown>
</div>
```

- [ ] **Step 4: Build frontend**

Run: `npx vite build`
Expected: Build succeeds.

---

### Task 4: Build, Deploy, and Test

- [ ] **Step 1: Rebuild backend**

Run: `cd /c/Users/Administrator/Desktop/xmwd/yg-xmgl-new/backend && npm run build`

- [ ] **Step 2: Build frontend and deploy**

Run:
```
cd /c/Users/Administrator/Desktop/xmwd/yg-xmgl-new/frontend
npx vite build
cp -r dist/* /c/Users/Administrator/Desktop/xmwd/yg-xmgl-new/backend/public/
```

- [ ] **Step 3: Restart backend**

Kill old process, start new: `node dist/src/main.js`

- [ ] **Step 4: Test API**

```bash
TOKEN=...

# Test unread count
curl -s http://localhost:12404/api/v1/notifications/unread-count -H "Authorization: Bearer $TOKEN"

# Test notifications list
curl -s http://localhost:12404/api/v1/notifications -H "Authorization: Bearer $TOKEN"

# Test mark all read
curl -s http://localhost:12404/api/v1/notifications/read-all -H "Authorization: Bearer $TOKEN" -X POST
```

- [ ] **Step 5: Test full flow**

Create and submit a payment request → verify notification is created for the approver → verify bell icon shows badge.
