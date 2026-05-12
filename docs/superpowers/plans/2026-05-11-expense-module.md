# 成本与资金模块 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build 5 expense/cost modules: expense requests, reimbursements, contract variations, labor contracts, and labor visas — each with CRUD and approval flows.

**Architecture:** Each module follows the existing NestJS pattern (module → controller → service → Prisma). Frontend uses Ant Design Table + Modal. Approval flow uses the existing `approvalHistory` table and `code-generator` for form numbers.

**Tech Stack:** NestJS + Prisma + PostgreSQL (backend), React + Ant Design (frontend)

---

## File Structure

### Backend (new modules in `backend/src/`)
```
backend/src/expense-requests/
├── expense-requests.module.ts
├── expense-requests.service.ts
├── expense-requests.controller.ts
└── dto/
    └── create-expense-request.dto.ts

backend/src/reimbursements/
├── reimbursements.module.ts
├── reimbursements.service.ts
├── reimbursements.controller.ts
└── dto/
    └── create-reimbursement.dto.ts

backend/src/contract-variations/
├── contract-variations.module.ts
├── contract-variations.service.ts
├── contract-variations.controller.ts
└── dto/
    └── create-variation.dto.ts

backend/src/labor-contracts/
├── labor-contracts.module.ts
├── labor-contracts.service.ts
├── labor-contracts.controller.ts
└── dto/
    └── create-labor-contract.dto.ts

backend/src/labor-visas/
├── labor-visas.module.ts
├── labor-visas.service.ts
├── labor-visas.controller.ts
└── dto/
    └── create-labor-visa.dto.ts
```

### Frontend (new pages in `frontend/src/pages/`)
```
frontend/src/pages/expenses/
├── ExpenseRequests.tsx        # 项目费用申请
├── Reimbursements.tsx         # 项目报销
├── ContractVariations.tsx     # 工程量变更
├── LaborContracts.tsx         # 劳务合同确认单
└── LaborVisas.tsx             # 劳务签证
```

### Modified Files
- `backend/src/app.module.ts` — add 5 new modules
- `frontend/src/App.tsx` — add expense routes
- `frontend/src/layouts/MainLayout.tsx` — update sidebar (费用报销 → submenu)

---

### Task 1: Backend — Expense Requests Module

**Files:**
- Create: `backend/src/expense-requests/dto/create-expense-request.dto.ts`
- Create: `backend/src/expense-requests/expense-requests.service.ts`
- Create: `backend/src/expense-requests/expense-requests.controller.ts`
- Create: `backend/src/expense-requests/expense-requests.module.ts`

**DTO:**
```typescript
import { IsNumber, IsString, IsOptional, Min } from 'class-validator';
export class CreateExpenseRequestDto {
  @IsNumber() projectId!: number;
  @IsString() reason!: string;
  @IsNumber() @Min(0) amount!: number;
  @IsString() payMethod!: string; // '现金' | '电汇' | '其他'
  @IsOptional() @IsString() otherMethod?: string;
}
```

**Service methods:** `findAll(projectId?)`, `findOne(id)`, `create(dto, userId)`, `submit(id)`, `approveLeader(id, userId)`, `approveFinance(id, userId)`, `reject(id, userId, comment)`

**Approval flow:** submit → pending_leader → pending_finance → approved / rejected

**Controller endpoints:**
- `GET /expense-requests?projectId=`
- `GET /expense-requests/:id`
- `POST /expense-requests`
- `POST /expense-requests/:id/submit`
- `POST /expense-requests/:id/approve-leader`
- `POST /expense-requests/:id/approve-finance`
- `POST /expense-requests/:id/reject`

---

### Task 2: Backend — Reimbursements Module

**Files:**
- Create: `backend/src/reimbursements/` — DTO, service, controller, module

**DTO:**
```typescript
import { IsNumber, IsString, IsOptional, Min, IsBoolean } from 'class-validator';
export class CreateReimbursementDto {
  @IsNumber() projectId!: number;
  @IsString() reason!: string;
  @IsNumber() @Min(0) amount!: number;
  @IsBoolean() hasInvoice!: boolean;
  @IsOptional() @IsString() invoiceFile?: string;
  @IsOptional() @IsString() noInvoiceReason?: string;
}
```

**Service methods:** Same pattern + special logic for `needsPmApprove`:
- If createdBy role is 'pm' → skip PM approval (status goes to pending_leader directly)
- If createdBy role is other → needs PM approval (pending_pm first)

**Approval flow:** submit → pending_pm (if creator is not PM) → pending_leader → pending_finance → approved / rejected

---

### Task 3: Backend — Contract Variations Module

**Files:**
- Create: `backend/src/contract-variations/` — DTO, service, controller, module

**DTO:**
```typescript
import { IsNumber, IsString, IsOptional, IsArray, Min } from 'class-validator';
class VariationItemDto {
  @IsOptional() @IsNumber() materialLibId?: number;
  @IsString() name!: string; @IsString() brand!: string;
  @IsString() spec!: string; @IsString() unit!: string;
  @IsNumber() quantity!: number;
  @IsNumber() @Min(0) contractPrice!: number;
}
export class CreateVariationDto {
  @IsNumber() projectId!: number;
  @IsArray() items!: VariationItemDto[];
  @IsOptional() @IsString() reason?: string;
}
```

**Service methods:** `findAll`, `findOne`, `create`, `submit`, `approve`, `reject`

**Approval flow:** submit → pending → approved / rejected

**Key logic in approve:** Update project ledger's `variationAmount` and `adjustedAmount`.

---

### Task 4: Backend — Labor Contracts + Labor Visas Modules

**Files:**
- Create: `backend/src/labor-contracts/` — DTO, service, controller, module
- Create: `backend/src/labor-visas/` — DTO, service, controller, module

**Labor Contract DTO:**
```typescript
@IsNumber() projectId!: number;
@IsNumber() @Min(0) amount!: number;
@IsOptional() @IsString() contractFile?: string;
```

**Labor Contract approval:** submit → pending_pm → pending_leader → approved / rejected

**Labor Visa DTO:**
```typescript
@IsNumber() laborContractId!: number;
@IsString() reasonCalc!: string;
@IsNumber() amountChange!: number; // can be negative
```

**Labor Visa approval:** submit → pending → approved / rejected

**Labor Visa service:** Must validate the labor contract exists and is approved. `amountChange` can be negative (reduction).

---

### Task 5: Frontend — API Layer

**Files:**
- Modify: `frontend/src/api/purchases.ts` — OR create a new `frontend/src/api/expenses.ts`

Create `frontend/src/api/expenses.ts` with all 5 API objects following the same pattern as existing APIs (findAll, findOne, create, submit, approve, reject, etc.)

---

### Task 6: Frontend — Expense Requests + Reimbursements Pages

**Files:**
- Create: `frontend/src/pages/expenses/ExpenseRequests.tsx`
- Create: `frontend/src/pages/expenses/Reimbursements.tsx`

Both pages follow the same pattern:
- Card + Table with status tabs
- Action buttons based on role
- Create/Edit modal form
- View detail modal with approval history timeline

---

### Task 7: Frontend — Variations + Labor Contracts + Labor Visas Pages

**Files:**
- Create: `frontend/src/pages/expenses/ContractVariations.tsx`
- Create: `frontend/src/pages/expenses/LaborContracts.tsx`
- Create: `frontend/src/pages/expenses/LaborVisas.tsx`

---

### Task 8: Frontend — Routes + Sidebar + Build

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/layouts/MainLayout.tsx`

**Routes:**
- `/expenses/requests` — ExpenseRequests
- `/expenses/reimbursements` — Reimbursements
- `/expenses/variations` — ContractVariations
- `/expenses/labor-contracts` — LaborContracts
- `/expenses/labor-visas` — LaborVisas

**Sidebar:** Replace single "费用报销" with submenu:
```
费用报销 (submenu)
  ├── 项目费用申请
  ├── 项目报销
  ├── 工程量变更
  ├── 劳务合同确认单
  └── 劳务签证
```
Replace "合同签证" menu item with nothing (variations moved to expenses).

---

## Self-Review Checklist

**Spec coverage:**
- Expense requests (PM submits → leader approves → finance pays) — Task 1 (backend) + Task 6 (frontend) ✓
- Reimbursements (role-differentiated PM approval) — Task 2 (backend) + Task 6 (frontend) ✓
- Contract variations (PM submits → leader approves, adjusts contract amount) — Task 3 (backend) + Task 7 (frontend) ✓
- Labor contracts (purchaser submits → PM approves → leader approves) — Task 4 (backend) + Task 7 (frontend) ✓
- Labor visas (based on approved labor contract, amount can be negative) — Task 4 (backend) + Task 7 (frontend) ✓
- Routes, sidebar, build — Task 8 ✓
- Approval history recording — included in all approve/reject methods ✓
- Form code generation — included in all create methods ✓
