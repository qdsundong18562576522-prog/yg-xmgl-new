# 系统设置模块 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full 系统设置 (System Settings) module — settings management, dictionary/tag management, operation log viewer, and user password change.

**Current State:** Menu item exists in sidebar (`MainLayout.tsx` line 65) but no route in `App.tsx` and no page component. No backend module exists.

**Architecture:** Backend SettingsModule with CRUD for system config + dictionary entries + password change endpoint. Frontend settings page with tabs (配置管理 / 字典管理 / 操作日志 / 修改密码).

**Tech Stack:** NestJS, Prisma, Ant Design, React

---

### Task 1: Backend — SystemConfig + Dictionary Models

**Files:**
- Modify: `backend/prisma/schema.prisma` — add `SystemConfig` and `Dictionary` models
- Run: `npx prisma generate` to regenerate client

- [ ] **Step 1: Add SystemConfig model**

```prisma
model SystemConfig {
  id        Int      @id @default(autoincrement())
  configKey String   @unique @map("config_key") @db.VarChar(100)
  configValue String? @map("config_value") @db.Text
  description String? @db.VarChar(255)
  updatedAt DateTime @updatedAt @map("updated_at")
  updatedBy Int?     @map("updated_by")

  @@map("system_configs")
}
```

- [ ] **Step 2: Add Dictionary model** (for enum-like tag/dropdown data)

```prisma
model Dictionary {
  id        Int      @id @default(autoincrement())
  dictType  String   @map("dict_type") @db.VarChar(50)    // e.g., 'project_type', 'expense_category'
  dictLabel String   @map("dict_label") @db.VarChar(100)  // display text
  dictValue String   @map("dict_value") @db.VarChar(100)  // stored value
  sortOrder Int      @default(0) @map("sort_order")       // display order
  status    Boolean  @default(true)                       // enabled/disabled
  remark    String?  @db.VarChar(255)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@unique([dictType, dictValue])
  @@map("dictionaries")
}
```

- [ ] **Step 3: Run Prisma migration**

```bash
npx prisma migrate dev --name add_settings_module
```

- [ ] **Step 4: Regenerate Prisma client**

```bash
npx prisma generate
```

---

### Task 2: Backend — SettingsModule

**Files:**
- Create: `backend/src/settings/settings.module.ts`
- Create: `backend/src/settings/settings.controller.ts`
- Create: `backend/src/settings/settings.service.ts`
- Modify: `backend/src/app.module.ts` — register SettingsModule

- [ ] **Step 1: Create settings.service.ts**

Implement the following methods:

**SystemConfig:**
- `getConfig(key?: string)` — Get all or a specific config
- `updateConfig(key: string, value: string, userId: number)` — Create or update a config
- `getAllConfigs()` — Return all configs as key-value pairs

**Dictionary:**
- `getDictByType(type: string)` — Get all entries for a dictionary type (ordered by sortOrder)
- `getAllDictTypes()` — Get distinct dictTypes with entry count
- `createDict(data)` — Create a dictionary entry
- `updateDict(id: number, data)` — Update a dictionary entry
- `deleteDict(id: number)` — Delete a dictionary entry (check if in use)
- `toggleDictStatus(id: number)` — Enable/disable

- [ ] **Step 2: Create settings.controller.ts**

| Route | Method | Description |
|-------|--------|-------------|
| `/settings/config` | GET | Get all configs |
| `/settings/config/:key` | GET | Get single config |
| `/settings/config/:key` | PUT | Update a config |
| `/settings/dict/types` | GET | Get all dict types |
| `/settings/dict/:type` | GET | Get dict entries by type |
| `/settings/dict` | POST | Create dict entry |
| `/settings/dict/:id` | PUT | Update dict entry |
| `/settings/dict/:id` | DELETE | Delete dict entry |
| `/settings/dict/:id/toggle` | POST | Toggle status |

All routes require JWT + admin role (except password change).

- [ ] **Step 3: Add password change endpoint to auth.service.ts / auth.controller.ts**

Backend already has password hashing with bcrypt. Add a new endpoint:

```typescript
// In auth.controller.ts
@Post('change-password')
@UseGuards(JwtAuthGuard)
async changePassword(
  @CurrentUser() user: any,
  @Body() dto: { oldPassword: string; newPassword: string },
) {
  return this.authService.changePassword(user.userId, dto.oldPassword, dto.newPassword);
}
```

```typescript
// In auth.service.ts
async changePassword(userId: number, oldPassword: string, newPassword: string) {
  const user = await this.prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundException('用户不存在');
  const valid = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!valid) throw new BadRequestException('原密码错误');
  const hash = await bcrypt.hash(newPassword, 10);
  await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } });
  return { message: '密码修改成功' };
}
```

- [ ] **Step 3: Create settings.module.ts** — Standard NestJS module
- [ ] **Step 4: Register in app.module.ts**

- [ ] **Step 5: Build and verify**

---

### Task 3: Backend — Operation Log Viewer

**Operation Log model already exists** in `schema.prisma` (model `OperationLog`). No schema changes needed.

- [ ] **Step 1: Add query methods to settings.service.ts**

```typescript
async getOperationLogs(page = 1, pageSize = 20, filters?: {
  entityType?: string;
  action?: string;
  userId?: number;
  startDate?: string;
  endDate?: string;
}) {
  // Build where clause from filters
  // Return paginated results with user info
}
```

- [ ] **Step 2: Add controller endpoints**

| Route | Method | Description |
|-------|--------|-------------|
| `/settings/operation-logs` | GET | Paginated log list with filters |
| `/settings/operation-logs/entity-types` | GET | Get distinct entity types for filter dropdown |

---

### Task 4: Frontend — Settings Page

**Files:**
- Create: `frontend/src/pages/settings/index.tsx`
- Create: `frontend/src/pages/settings/SettingsConfig.tsx`
- Create: `frontend/src/pages/settings/SettingsDict.tsx`
- Create: `frontend/src/pages/settings/OperationLogs.tsx`
- Create: `frontend/src/api/settings.ts`
- Modify: `frontend/src/App.tsx` — add route for `/settings`

- [ ] **Step 1: Create API file** (`frontend/src/api/settings.ts`)

```typescript
import request from './request';

export const settingsApi = {
  // Config
  getConfigs: () => request.get('/settings/config'),
  updateConfig: (key: string, value: string) => request.put(`/settings/config/${key}`, { value }),

  // Dictionary
  getDictTypes: () => request.get('/settings/dict/types'),
  getDictByType: (type: string) => request.get(`/settings/dict/${type}`),
  createDict: (data: any) => request.post('/settings/dict', data),
  updateDict: (id: number, data: any) => request.put(`/settings/dict/${id}`, data),
  deleteDict: (id: number) => request.delete(`/settings/dict/${id}`),
  toggleDict: (id: number) => request.post(`/settings/dict/${id}/toggle`),

  // Operation Logs
  getLogs: (params: any) => request.get('/settings/operation-logs', { params }),
  getLogEntityTypes: () => request.get('/settings/operation-logs/entity-types'),
};
```

- [ ] **Step 2: Create SettingsConfig.tsx** — System configuration tab

A key-value editor for system-wide settings:
- Display as a list/table of config keys with edit-in-place or modal editing
- Predefined config keys (with descriptions):
  - `company_name` — 公司名称
  - `company_address` — 公司地址
  - `company_phone` — 联系电话
  - `system_title` — 系统标题
- Add/Edit: opens a modal/drawer with key + value + description fields
- Only admin can modify (route already restricted by menu visibility)

- [ ] **Step 3: Create SettingsDict.tsx** — Dictionary management tab

For managing dropdown options / enum-like data:
- Left panel: list of dictionary types (with count badges)
- Right panel: entries for selected type
- CRUD operations on entries via Modal
- Fields: label, value, sort order, status (enabled/disabled), remark
- Drag-to-sort or sort-order number input

Predefined dict types to seed:
- `project_tag` — 项目标签 (集成, 供货等)
- `expense_category` — 费用类别
- `payment_method` — 付款方式
- `delivery_method` — 交货方式
- `transport_method` — 运输方式

- [ ] **Step 4: Create OperationLogs.tsx** — Operation log viewer tab

Read-only table with filters:
- Filter row: entity type (dropdown), action (dropdown), date range (DatePicker.RangePicker)
- Table columns: 时间, 操作人, 操作类型, 业务类型, 业务ID, 变更内容
- Pagination (20 per page)
- Expandable row to show full change details in JSON format

- [ ] **Step 5: Create ChangePassword.tsx** — Password change tab

```tsx
import { Card, Form, Input, Button, message } from 'antd';
import request from '../../api/request';

export default function ChangePassword() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: any) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error('两次输入的密码不一致');
      return;
    }
    setLoading(true);
    try {
      await request.post('/auth/change-password', {
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      });
      message.success('密码修改成功');
      form.resetFields();
    } catch (e: any) {
      message.error(e?.response?.data?.message || '修改失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="修改密码" style={{ maxWidth: 500 }}>
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item name="oldPassword" label="原密码" rules={[{ required: true, message: '请输入原密码' }]}>
          <Input.Password />
        </Form.Item>
        <Form.Item name="newPassword" label="新密码" rules={[
          { required: true, message: '请输入新密码' },
          { min: 6, message: '密码至少6位' },
        ]}>
          <Input.Password />
        </Form.Item>
        <Form.Item name="confirmPassword" label="确认新密码" rules={[
          { required: true, message: '请确认新密码' },
        ]}>
          <Input.Password />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>确认修改</Button>
        </Form.Item>
      </Form>
    </Card>
  );
}
```

- [ ] **Step 6: Update index.tsx** — Add password change tab (visible to all users, not just admin)

```tsx
import ChangePassword from './ChangePassword';

// In Tabs items, add:
{ key: 'password', label: '修改密码', icon: <KeyOutlined />, children: <ChangePassword /> }
```

The password tab should be visible to all authenticated users (unlike config/dict/logs which are admin-only). Handle this by checking user role inside the tab rendering, or keep all tabs visible but restrict data access at the API level.

```tsx
import { Tabs } from 'antd';
import { SettingOutlined, BookOutlined, FileTextOutlined } from '@ant-design/icons';
import SettingsConfig from './SettingsConfig';
import SettingsDict from './SettingsDict';
import OperationLogs from './OperationLogs';

export default function SettingsPage() {
  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>系统设置</h2>
      <Tabs items={[
        { key: 'config', label: '配置管理', icon: <SettingOutlined />, children: <SettingsConfig /> },
        { key: 'dict', label: '字典管理', icon: <BookOutlined />, children: <SettingsDict /> },
        { key: 'logs', label: '操作日志', icon: <FileTextOutlined />, children: <OperationLogs /> },
      ]} />
    </div>
  );
}
```

- [ ] **Step 6: Add route in App.tsx**

```tsx
import SettingsPage from './pages/settings';
// ...
<Route path="/settings" element={<SettingsPage />} />
```

- [ ] **Step 7: Build frontend**

---

### Task 5: Seed Data + Integration

- [ ] **Step 1: Add seed data for dictionary types**

In `backend/prisma/seed.ts`, add initial dictionary entries:
```typescript
const defaultDicts = [
  { dictType: 'project_tag', dictLabel: '集成', dictValue: 'integration', sortOrder: 1 },
  { dictType: 'project_tag', dictLabel: '供货', dictValue: 'supply', sortOrder: 2 },
  { dictType: 'expense_category', dictLabel: '办公费用', dictValue: 'office', sortOrder: 1 },
  // ...
];
```

- [ ] **Step 2: Rebuild backend + frontend**
- [ ] **Step 3: Run seed** `npx prisma db seed`
- [ ] **Step 4: Test all API endpoints**
- [ ] **Step 5: Deploy and verify in browser**
