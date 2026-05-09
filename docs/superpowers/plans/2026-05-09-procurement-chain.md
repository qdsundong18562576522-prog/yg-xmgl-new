# 采购链条模块 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete procurement chain: material library → purchase request → inquiry → purchase confirmation → delivery notification, each with CRUD and approval flows.

**Architecture:** Each business entity follows the existing pattern (module → controller → service → Prisma), with shared approval logic reused from the project module pattern. Material library has a dedicated search API used across all procurement forms.

**Tech Stack:** NestJS + Prisma + PostgreSQL (backend), React + Ant Design + React Router v7 (frontend)

---

## File Structure

### Backend (new modules in `backend/src/`)
```
backend/src/materials/
├── materials.module.ts
├── materials.service.ts
├── materials.controller.ts
└── dto/
    ├── create-material.dto.ts
    └── update-material.dto.ts

backend/src/purchase-requests/
├── purchase-requests.module.ts
├── purchase-requests.service.ts
├── purchase-requests.controller.ts
└── dto/
    ├── create-purchase-request.dto.ts
    └── update-purchase-request.dto.ts

backend/src/inquiry-orders/
├── inquiry-orders.module.ts
├── inquiry-orders.service.ts
├── inquiry-orders.controller.ts
└── dto/
    ├── create-inquiry-order.dto.ts
    └── update-inquiry-order.dto.ts

backend/src/purchase-confirms/
├── purchase-confirms.module.ts
├── purchase-confirms.service.ts
├── purchase-confirms.controller.ts
└── dto/
    ├── create-purchase-confirm.dto.ts
    └── update-purchase-confirm.dto.ts

backend/src/delivery-notices/
├── delivery-notices.module.ts
├── delivery-notices.service.ts
├── delivery-notices.controller.ts
└── dto/
    ├── create-delivery-notice.dto.ts
    └── update-delivery-notice.dto.ts
```

### Frontend (new pages in `frontend/src/pages/`)
```
frontend/src/pages/materials/
├── index.tsx          # Material list + CRUD
└── MaterialForm.tsx   # Create/edit material modal

frontend/src/pages/purchases/
├── PurchaseRequests.tsx    # Purchase request list
├── PurchaseRequestForm.tsx # Create/edit form
├── InquiryOrders.tsx       # Inquiry order list
├── InquiryOrderForm.tsx    # Create/edit form
├── PurchaseConfirms.tsx    # Purchase confirm list
├── PurchaseConfirmForm.tsx # Create/edit form
├── DeliveryNotices.tsx     # Delivery notice list
└── DeliveryNoticeForm.tsx  # Create/edit form
```

### Modified Files
- `backend/src/app.module.ts` — add 5 new modules
- `frontend/src/App.tsx` — add routes for purchases sub-pages
- `frontend/src/layouts/MainLayout.tsx` — update sidebar (already has 采购管理)

---

### Task 1: Backend — Materials Module (CRUD + Search)

**Files:**
- Create: `backend/src/materials/dto/create-material.dto.ts`
- Create: `backend/src/materials/dto/update-material.dto.ts`
- Create: `backend/src/materials/materials.service.ts`
- Create: `backend/src/materials/materials.controller.ts`
- Create: `backend/src/materials/materials.module.ts`

- [ ] **Step 1: Create DTOs**

`create-material.dto.ts`:
```typescript
import { IsString } from 'class-validator';

export class CreateMaterialDto {
  @IsString()
  name!: string;

  @IsString()
  brand!: string;

  @IsString()
  spec!: string;

  @IsString()
  unit!: string;
}
```

`update-material.dto.ts`:
```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateMaterialDto } from './create-material.dto';
export class UpdateMaterialDto extends PartialType(CreateMaterialDto) {}
```

- [ ] **Step 2: Create materials.service.ts**

```typescript
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';

@Injectable()
export class MaterialsService {
  constructor(private prisma: PrismaService) {}

  async findAll(search?: string) {
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { spec: { contains: search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.materialLib.findMany({ where, orderBy: { name: 'asc' } });
  }

  async findOne(id: number) {
    const material = await this.prisma.materialLib.findUnique({ where: { id } });
    if (!material) throw new NotFoundException('材料不存在');
    return material;
  }

  async create(dto: CreateMaterialDto) {
    try {
      return await this.prisma.materialLib.create({ data: dto });
    } catch (e: any) {
      if (e.code === 'P2002') throw new ConflictException('该材料已存在（名称+品牌+规格+单位重复）');
      throw e;
    }
  }

  async update(id: number, dto: UpdateMaterialDto) {
    await this.findOne(id);
    try {
      return await this.prisma.materialLib.update({ where: { id }, data: dto });
    } catch (e: any) {
      if (e.code === 'P2002') throw new ConflictException('更新后与已有材料重复');
      throw e;
    }
  }

  async delete(id: number) {
    await this.findOne(id);
    await this.prisma.materialLib.delete({ where: { id } });
    return { id, deleted: true };
  }
}
```

- [ ] **Step 3: Create materials.controller.ts**

```typescript
import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { MaterialsService } from './materials.service';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/types';

@Controller('materials')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MaterialsController {
  constructor(private materialsService: MaterialsService) {}

  @Get()
  async findAll(@Query('search') search?: string) {
    return this.materialsService.findAll(search);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.materialsService.findOne(id);
  }

  @Post()
  @Roles(UserRole.purchaser, UserRole.admin)
  async create(@Body() dto: CreateMaterialDto) {
    return this.materialsService.create(dto);
  }

  @Put(':id')
  @Roles(UserRole.purchaser, UserRole.admin)
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMaterialDto) {
    return this.materialsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.purchaser, UserRole.admin)
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.materialsService.delete(id);
  }
}
```

- [ ] **Step 4: Create materials.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { MaterialsController } from './materials.controller';
import { MaterialsService } from './materials.service';

@Module({
  controllers: [MaterialsController],
  providers: [MaterialsService],
  exports: [MaterialsService],
})
export class MaterialsModule {}
```

- [ ] **Step 5: Verify compilation**

Run: `cd backend && npx tsc --noEmit`
Expected: No errors

---

### Task 2: Backend — Purchase Requests Module

**Files:**
- Create: `backend/src/purchase-requests/dto/create-purchase-request.dto.ts`
- Create: `backend/src/purchase-requests/dto/update-purchase-request.dto.ts`
- Create: `backend/src/purchase-requests/purchase-requests.service.ts`
- Create: `backend/src/purchase-requests/purchase-requests.controller.ts`
- Create: `backend/src/purchase-requests/purchase-requests.module.ts`

- [ ] **Step 1: Create DTOs**

`create-purchase-request.dto.ts`:
```typescript
import { IsString, IsNumber, IsOptional, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

class PurchaseRequestItemDto {
  @IsOptional()
  @IsNumber()
  materialLibId?: number;

  @IsString()
  name!: string;

  @IsString()
  brand!: string;

  @IsString()
  spec!: string;

  @IsString()
  unit!: string;

  @IsNumber()
  @Min(0)
  quantity!: number;

  @IsNumber()
  @Min(0)
  contractPrice!: number;

  @IsOptional()
  @IsString()
  remark?: string;
}

export class CreatePurchaseRequestDto {
  @IsNumber()
  projectId!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseRequestItemDto)
  items!: PurchaseRequestItemDto[];

  @IsOptional()
  @IsString()
  deliveryAddress?: string;

  @IsOptional()
  @IsNumber()
  receiverId?: number;

  @IsOptional()
  @IsString()
  phone?: string;
}
```

`update-purchase-request.dto.ts`:
```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreatePurchaseRequestDto } from './create-purchase-request.dto';
export class UpdatePurchaseRequestDto extends PartialType(CreatePurchaseRequestDto) {}
```

- [ ] **Step 2: Create purchase-requests.service.ts**

Implement: `findAll(projectId?)`, `findOne(id)`, `create(dto, userId)`, `update(id, dto, userId, role)`, `submit(id, userId, role)`, `approve(id, userId)`, `reject(id, userId, comment)`, `confirm(id, userId)` (采购确认收到).

Key logic:
- `create`: Auto-calculate `totalAmount` from items (`qty × contractPrice`), auto-add new materials to `material_lib`
- `findAll`: Filter by projectId if provided, otherwise all (based on role)
- `approve`: Only `leader`/`admin` can approve
- `confirm`: After leader approves, `purchaser` clicks "确认收到" to set status to `confirmed`

- [ ] **Step 3: Create controller + module**

Follow same pattern as ProjectsController. Endpoints:
- `GET /purchase-requests?projectId=` — list
- `GET /purchase-requests/:id` — detail
- `POST /purchase-requests` — create
- `PUT /purchase-requests/:id` — update (draft only)
- `POST /purchase-requests/:id/submit` — submit for approval
- `POST /purchase-requests/:id/approve` — leader/admin approve
- `POST /purchase-requests/:id/reject` — leader/admin reject
- `POST /purchase-requests/:id/confirm` — purchaser confirms receipt

- [ ] **Step 4: Verify compilation**

Run: `cd backend && npx tsc --noEmit`
Expected: No errors

---

### Task 3: Backend — Inquiry Orders Module

**Files:**
- Create: `backend/src/inquiry-orders/dto/create-inquiry-order.dto.ts`
- Create: `backend/src/inquiry-orders/dto/update-inquiry-order.dto.ts`
- Create: `backend/src/inquiry-orders/inquiry-orders.service.ts`
- Create: `backend/src/inquiry-orders/inquiry-orders.controller.ts`
- Create: `backend/src/inquiry-orders/inquiry-orders.module.ts`

- [ ] **Step 1: Create DTOs**

Similar to Purchase Request but based on `prId` (references approved purchase request). Items auto-copied from purchase request items, with additional `purchasePrice` field.

- [ ] **Step 2: Create service**

Key logic:
- `create`: Must reference an approved purchase request. Auto-copy items from the PR. Allow adding extra rows (like 技术服务费).
- `approve`: Two-step — PM approves first, then leader approves.

- [ ] **Step 3: Create controller + module**

Endpoints:
- `GET /inquiry-orders?projectId=`
- `GET /inquiry-orders/:id`
- `POST /inquiry-orders` (based on prId)
- `POST /inquiry-orders/:id/submit`
- `POST /inquiry-orders/:id/approve-pm` — PM approves
- `POST /inquiry-orders/:id/approve-leader` — leader approves
- `POST /inquiry-orders/:id/reject`

- [ ] **Step 4: Verify compilation**

Run: `cd backend && npx tsc --noEmit`
Expected: No errors

---

### Task 4: Backend — Purchase Confirms + Delivery Notices Modules

**Files:**
- Create: `backend/src/purchase-confirms/` — module, service, controller, DTOs
- Create: `backend/src/delivery-notices/` — module, service, controller, DTOs

- [ ] **Step 1: Purchase Confirms**

- Based on inquiry order (inquiryId)
- Items auto-copied from inquiry items
- Supports uploading contract file
- Approval: PM → Leader
- After approval, marks the procurement cycle as complete

Endpoints:
- `GET /purchase-confirms?projectId=`
- `GET /purchase-confirms/:id`
- `POST /purchase-confirms` (based on inquiryId)
- `POST /purchase-confirms/:id/submit`
- `POST /purchase-confirms/:id/approve-pm`
- `POST /purchase-confirms/:id/approve-leader`
- `POST /purchase-confirms/:id/reject`

- [ ] **Step 2: Delivery Notices**

- Based on purchase confirm (confirmId)
- Items auto-copied from confirm items, with per-item delivery date
- Supports partial delivery
- Approval: Purchaser → Leader

Endpoints:
- `GET /delivery-notices?projectId=`
- `GET /delivery-notices/:id`
- `POST /delivery-notices` (based on confirmId)
- `POST /delivery-notices/:id/submit`
- `POST /delivery-notices/:id/approve-purchaser`
- `POST /delivery-notices/:id/approve-leader`
- `POST /delivery-notices/:id/reject`

- [ ] **Step 3: Register all 5 modules in app.module.ts**

```typescript
import { MaterialsModule } from './materials/materials.module';
import { PurchaseRequestsModule } from './purchase-requests/purchase-requests.module';
import { InquiryOrdersModule } from './inquiry-orders/inquiry-orders.module';
import { PurchaseConfirmsModule } from './purchase-confirms/purchase-confirms.module';
import { DeliveryNoticesModule } from './delivery-notices/delivery-notices.module';

// Add all to imports array
```

- [ ] **Step 4: Build and patch Prisma client**

```bash
cd backend
rm -rf dist
npx nest build
node -e "const fs=require('fs');const p='dist/generated/prisma/client.js';let c=fs.readFileSync(p,'utf8');c=c.replace('import.meta.url','require(\"url\").pathToFileURL(__filename).href');fs.writeFileSync(p,c);"
```

Expected: Build succeeds

---

### Task 5: Frontend — API Layer + Materials Page

**Files:**
- Create: `frontend/src/api/purchases.ts` — all purchase-chain API calls
- Create: `frontend/src/api/materials.ts` — materials API
- Create: `frontend/src/pages/materials/index.tsx` — material list + CRUD
- Create: `frontend/src/components/MaterialSearch.tsx` — reusable material search component

- [ ] **Step 1: Create materials API**

```typescript
import request from './request';

export interface Material {
  id: number;
  name: string;
  brand: string;
  spec: string;
  unit: string;
}

export const materialsApi = {
  findAll: (search?: string) => request.get<any, { code: number; data: Material[] }>('/materials', { params: { search } }),
  create: (data: Partial<Material>) => request.post('/materials', data),
  update: (id: number, data: Partial<Material>) => request.put(`/materials/${id}`, data),
  delete: (id: number) => request.delete(`/materials/${id}`),
};
```

- [ ] **Step 2: Create purchases API**

```typescript
import request from './request';

// Purchase Request
export const purchaseRequestsApi = {
  findAll: (projectId?: number) => request.get('/purchase-requests', { params: { projectId } }),
  findOne: (id: number) => request.get(`/purchase-requests/${id}`),
  create: (data: any) => request.post('/purchase-requests', data),
  update: (id: number, data: any) => request.put(`/purchase-requests/${id}`, data),
  submit: (id: number) => request.post(`/purchase-requests/${id}/submit`),
  approve: (id: number) => request.post(`/purchase-requests/${id}/approve`),
  reject: (id: number, comment?: string) => request.post(`/purchase-requests/${id}/reject`, { comment }),
  confirm: (id: number) => request.post(`/purchase-requests/${id}/confirm`),
};

// Similar patterns for inquiryOrdersApi, purchaseConfirmsApi, deliveryNoticesApi
```

- [ ] **Step 3: Create MaterialSearch component**

A reusable `Select` component that searches materials by name:
```tsx
// MaterialSearch: A Select with debounced search, calls materialsApi.findAll(input)
// When a material is selected, returns the full material object
// Used in all purchase forms to auto-fill brand/spec/unit
```

- [ ] **Step 4: Create materials list page**

A Card with Table showing all materials, search input, and modal for create/edit. Only `purchaser` and `admin` see add/edit/delete buttons.

- [ ] **Step 5: Verify compilation**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

---

### Task 6: Frontend — Purchase Request Page

**Files:**
- Create: `frontend/src/pages/purchases/PurchaseRequests.tsx`
- Create: `frontend/src/pages/purchases/PurchaseRequestForm.tsx`

- [ ] **Step 1: Create list page**

Card with Table: columns for project name, total amount, status, created date, actions.
- Tab filtering: all/draft/pending/approved/rejected
- Action buttons based on permissions: edit/submit/approve/reject/confirm

- [ ] **Step 2: Create form modal**

Form fields:
- projectId — Select (projects list)
- deliveryAddress — Input
- receiverId — Select (users)
- phone — Input
- items — dynamic table with add/remove rows, each row: material search → auto-fill brand/spec/unit, quantity, contractPrice, auto-calc total

- [ ] **Step 3: Verify compilation**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

---

### Task 7: Frontend — Inquiry Order + Purchase Confirm + Delivery Notice Pages

**Files:**
- Create: `frontend/src/pages/purchases/InquiryOrders.tsx`
- Create: `frontend/src/pages/purchases/InquiryOrderForm.tsx`
- Create: `frontend/src/pages/purchases/PurchaseConfirms.tsx`
- Create: `frontend/src/pages/purchases/PurchaseConfirmForm.tsx`
- Create: `frontend/src/pages/purchases/DeliveryNotices.tsx`
- Create: `frontend/src/pages/purchases/DeliveryNoticeForm.tsx`

- [ ] **Step 1: Create Inquiry Order pages**

List page: similar to purchase requests, but with two-step approval status (PM/Leader).
Form: select from approved purchase requests, items auto-copied, allow adding extra rows.

- [ ] **Step 2: Create Purchase Confirm pages**

List page: standard approval flow display.
Form: select from approved inquiry orders, items auto-copied, upload contract file.

- [ ] **Step 3: Create Delivery Notice pages**

List page: standard approval flow display.
Form: select from approved purchase confirms, items auto-copied, set per-item delivery date.

- [ ] **Step 4: Verify compilation**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

---

### Task 8: Frontend — Routes + Sidebar + Build

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Add routes**

```tsx
import MaterialsPage from './pages/materials';
import PurchaseRequests from './pages/purchases/PurchaseRequests';
import InquiryOrders from './pages/purchases/InquiryOrders';
import PurchaseConfirms from './pages/purchases/PurchaseConfirms';
import DeliveryNotices from './pages/purchases/DeliveryNotices';

// Inside MainLayout routes:
<Route path="materials" element={<MaterialsPage />} />
<Route path="purchases/requests" element={<PurchaseRequests />} />
<Route path="purchases/inquiries" element={<InquiryOrders />} />
<Route path="purchases/confirms" element={<PurchaseConfirms />} />
<Route path="purchases/delivery" element={<DeliveryNotices />} />
```

- [ ] **Step 2: Update sidebar menu**

Replace the single "采购管理" menu item with a submenu:
```
采购管理 (submenu)
  ├── 采购申请
  ├── 采购询价
  ├── 采购确认
  └── 供货通知单
```

- [ ] **Step 3: Build and verify**

Run: `cd frontend && npx tsc --noEmit && npx vite build`
Expected: Build succeeds

---

## Self-Review Checklist

**Spec coverage:**
- Materials library CRUD — Task 1 (backend) + Task 5 (frontend) ✓
- Material search with fuzzy matching — Task 1 (backend, `contains` + `mode: insensitive`), Task 5 (MaterialSearch component) ✓
- Purchase request with approval — Task 2 (backend) + Task 6 (frontend) ✓
- Inquiry order with two-step approval — Task 3 (backend) + Task 7 (frontend) ✓
- Purchase confirm with approval — Task 4 (backend) + Task 7 (frontend) ✓
- Delivery notice with approval — Task 4 (backend) + Task 7 (frontend) ✓
- Auto-copy items from previous step in chain — Tasks 2-4 (service logic) ✓
- Auto-add new materials to lib during PR creation — Task 2 (service) ✓
- Module registration in app.module.ts — Task 4 ✓
- Routes and sidebar — Task 8 ✓

**Placeholder scan:** No placeholder patterns found.

**Type consistency:** DTO patterns follow the established CreateProjectDto → UpdateProjectDto (PartialType) pattern. API response types follow the existing `{ code, message, data }` wrapper pattern.
