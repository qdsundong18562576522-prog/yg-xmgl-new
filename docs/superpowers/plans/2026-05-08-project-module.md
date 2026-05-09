# 项目立项模块 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete project creation/approval/list/detail module with auto-generated project codes and role-based access.

**Architecture:** NestJS module following the existing pattern (controller → service → Prisma), with a `code-generator` utility for project codes. Frontend uses Ant Design ProTable for list, Form for create/edit, and Steps for approval status. Sales can only see/edit their own drafts; leader approves; PM and others see approved projects.

**Tech Stack:** NestJS + Prisma + PostgreSQL (backend), React + Ant Design + React Router v7 (frontend)

---

## File Structure

### Backend (new files in `backend/src/projects/`)
```
backend/src/projects/
├── projects.module.ts        # Module definition
├── projects.service.ts       # Business logic: CRUD, code generation, approval
├── projects.controller.ts    # REST endpoints
├── dto/
│   ├── create-project.dto.ts # Validation for create
│   └── update-project.dto.ts # Validation for update
└── utils/
    └── code-generator.ts     # Project code generation (YGKI-xxx-YYYYMMDD-NNN)
```

### Frontend (new files in `frontend/src/pages/projects/`)
```
frontend/src/pages/projects/
├── index.tsx                 # Project list page with status tabs
├── ProjectForm.tsx           # Create/edit form modal
└── ProjectDetail.tsx         # Project detail view with approval timeline
```

### Modified Files
- `backend/src/app.module.ts` — add `ProjectsModule` import
- `frontend/src/App.tsx` — add `/projects` route

---

### Task 1: Backend — Code Generator Utility

**Files:**
- Create: `backend/src/projects/utils/code-generator.ts`

- [ ] **Step 1: Create code-generator.ts**

```typescript
import { PrismaClient } from '../../../generated/prisma/client';

const TYPE_MAP: Record<string, string> = {
  integration: 'JC',
  supply: 'GH',
};

export async function generateProjectCode(
  prisma: PrismaClient,
  type: string,
  date: Date,
): Promise<string> {
  const typeCode = TYPE_MAP[type] || 'QT';
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const prefix = `YGKI-${typeCode}-${dateStr}-`;

  // Find the latest code for today to increment sequence
  const lastProject = await prisma.project.findFirst({
    where: { code: { startsWith: prefix } },
    orderBy: { code: 'desc' },
    select: { code: true },
  });

  let sequence = 1;
  if (lastProject) {
    const lastSeq = parseInt(lastProject.code.split('-').pop() || '0', 10);
    sequence = lastSeq + 1;
  }

  return `${prefix}${String(sequence).padStart(3, '0')}`;
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `cd backend && npx tsc --noEmit`
Expected: No errors

---

### Task 2: Backend — DTOs

**Files:**
- Create: `backend/src/projects/dto/create-project.dto.ts`
- Create: `backend/src/projects/dto/update-project.dto.ts`

- [ ] **Step 1: Create create-project.dto.ts**

```typescript
import { IsString, IsEnum, IsNumber, IsOptional, IsDateString } from 'class-validator';

export enum ProjectTypeDto {
  integration = 'integration',
  supply = 'supply',
}

export class CreateProjectDto {
  @IsString()
  name!: string;

  @IsEnum(ProjectTypeDto)
  type!: ProjectTypeDto;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  contractAmount!: number;

  @IsNumber()
  @IsOptional()
  expectedProfitRate?: number;

  @IsNumber()
  projectManagerId!: number;

  @IsDateString()
  planStartDate!: string;

  @IsDateString()
  planEndDate!: string;

  @IsString()
  @IsOptional()
  remarks?: string;
}
```

- [ ] **Step 2: Create update-project.dto.ts**

```typescript
import { PartialType } from '@nestjs/common';
import { CreateProjectDto } from './create-project.dto';

export class UpdateProjectDto extends PartialType(CreateProjectDto) {}
```

- [ ] **Step 3: Verify no TypeScript errors**

Run: `cd backend && npx tsc --noEmit`
Expected: No errors

---

### Task 3: Backend — Projects Service

**Files:**
- Create: `backend/src/projects/projects.service.ts`

- [ ] **Step 1: Create projects.service.ts**

```typescript
import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { generateProjectCode } from './utils/code-generator';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: number, role: string) {
    const where: any = {};

    // Data permissions
    if (role === 'sales') {
      where.salesId = userId; // Sales only see their own
    } else if (role === 'pm') {
      // PM sees projects they manage OR where they are assigned
      where.OR = [
        { projectManagerId: userId },
        { salesId: userId },
      ];
    }
    // purchaser, finance, leader, admin see all

    return this.prisma.project.findMany({
      where,
      include: {
        sales: { select: { id: true, displayName: true } },
        projectManager: { select: { id: true, displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number, userId: number, role: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        sales: { select: { id: true, displayName: true } },
        projectManager: { select: { id: true, displayName: true } },
      },
    });
    if (!project) throw new NotFoundException('项目不存在');

    // Data permission check
    if (role === 'sales' && project.salesId !== userId) {
      throw new ForbiddenException('无权查看此项目');
    }

    return project;
  }

  async create(dto: CreateProjectDto, userId: number) {
    const code = await generateProjectCode(this.prisma, dto.type, new Date());

    const startDate = new Date(dto.planStartDate);
    const endDate = new Date(dto.planEndDate);
    const duration = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Validate project manager exists and is a pm/engineer
    const pm = await this.prisma.user.findUnique({ where: { id: dto.projectManagerId } });
    if (!pm) throw new BadRequestException('项目经理不存在');
    if (!['pm', 'engineer'].includes(pm.role)) {
      throw new BadRequestException('所选用户不是项目经理或工程人员');
    }

    return this.prisma.project.create({
      data: {
        code,
        name: dto.name,
        type: dto.type as any,
        salesId: userId,
        description: dto.description,
        contractAmount: dto.contractAmount,
        expectedProfitRate: dto.expectedProfitRate,
        projectManagerId: dto.projectManagerId,
        planStartDate: startDate,
        planEndDate: endDate,
        duration,
        remarks: dto.remarks,
        status: 'draft',
      },
      include: {
        sales: { select: { id: true, displayName: true } },
        projectManager: { select: { id: true, displayName: true } },
      },
    });
  }

  async update(id: number, dto: UpdateProjectDto, userId: number, role: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('项目不存在');

    // Only sales who created it or admin can edit
    if (role !== 'admin' && project.salesId !== userId) {
      throw new ForbiddenException('无权编辑此项目');
    }

    // Only allow editing when status is draft or rejected
    if (project.status !== 'draft' && project.status !== 'rejected') {
      throw new BadRequestException('只能编辑草稿或已驳回的项目');
    }

    const data: any = { ...dto };
    if (dto.planStartDate && dto.planEndDate) {
      const startDate = new Date(dto.planStartDate);
      const endDate = new Date(dto.planEndDate);
      data.duration = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }

    return this.prisma.project.update({
      where: { id },
      data,
      include: {
        sales: { select: { id: true, displayName: true } },
        projectManager: { select: { id: true, displayName: true } },
      },
    });
  }

  async submitForApproval(id: number, userId: number, role: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('项目不存在');
    if (project.salesId !== userId && role !== 'admin') {
      throw new ForbiddenException('无权提交此项目');
    }
    if (project.status !== 'draft' && project.status !== 'rejected') {
      throw new BadRequestException('只能提交草稿或已驳回的项目');
    }

    return this.prisma.project.update({
      where: { id },
      data: { status: 'pending' },
    });
  }

  async approve(id: number, userId: number) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('项目不存在');
    if (project.status !== 'pending') throw new BadRequestException('该项目不在审批中');

    // Verify user is a leader
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || (user.role !== 'leader' && user.role !== 'admin')) {
      throw new ForbiddenException('无权审批项目');
    }

    // Record approval history
    await this.prisma.approvalHistory.create({
      data: {
        entityType: 'project',
        entityId: id,
        step: 1,
        approverId: userId,
        action: 'approve',
      },
    });

    return this.prisma.project.update({
      where: { id },
      data: { status: 'approved' },
    });
  }

  async reject(id: number, userId: number, comment?: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('项目不存在');
    if (project.status !== 'pending') throw new BadRequestException('该项目不在审批中');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || (user.role !== 'leader' && user.role !== 'admin')) {
      throw new ForbiddenException('无权审批项目');
    }

    await this.prisma.approvalHistory.create({
      data: {
        entityType: 'project',
        entityId: id,
        step: 1,
        approverId: userId,
        action: 'reject',
        comment,
      },
    });

    return this.prisma.project.update({
      where: { id },
      data: { status: 'rejected' },
    });
  }
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `cd backend && npx tsc --noEmit`
Expected: No errors

---

### Task 4: Backend — Projects Controller + Module

**Files:**
- Create: `backend/src/projects/projects.controller.ts`
- Create: `backend/src/projects/projects.module.ts`

- [ ] **Step 1: Create projects.controller.ts**

```typescript
import { Controller, Get, Post, Put, Patch, Body, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/types';

@Controller('projects')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  @Get()
  async findAll(
    @CurrentUser() user: { userId: number; role: string },
  ) {
    return this.projectsService.findAll(user.userId, user.role);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number; role: string },
  ) {
    return this.projectsService.findOne(id, user.userId, user.role);
  }

  @Post()
  async create(
    @Body() dto: CreateProjectDto,
    @CurrentUser() user: { userId: number; role: string },
  ) {
    return this.projectsService.create(dto, user.userId);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() user: { userId: number; role: string },
  ) {
    return this.projectsService.update(id, dto, user.userId, user.role);
  }

  @Post(':id/submit')
  async submitForApproval(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number; role: string },
  ) {
    return this.projectsService.submitForApproval(id, user.userId, user.role);
  }

  @Post(':id/approve')
  @Roles(UserRole.leader, UserRole.admin)
  async approve(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number; role: string },
  ) {
    return this.projectsService.approve(id, user.userId);
  }

  @Post(':id/reject')
  @Roles(UserRole.leader, UserRole.admin)
  async reject(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { comment?: string },
    @CurrentUser() user: { userId: number; role: string },
  ) {
    return this.projectsService.reject(id, user.userId, body.comment);
  }
}
```

- [ ] **Step 2: Create projects.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
```

- [ ] **Step 3: Register module in app.module.ts**

Edit `backend/src/app.module.ts` — add `ProjectsModule` to imports:

```typescript
import { ProjectsModule } from './projects/projects.module';

// In @Module imports, add:
// ProjectsModule,

// Full file after change:
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ProjectsModule,
  ],
})
```

- [ ] **Step 4: Verify no TypeScript errors**

Run: `cd backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Build and test**

```bash
cd backend
rm -rf dist
node -e "const fs=require('fs');const p='dist/generated/prisma/client.js';let c=fs.readFileSync(p,'utf8');c=c.replace('import.meta.url','require(\"url\").pathToFileURL(__filename).href');fs.writeFileSync(p,c);" 2>/dev/null
npx nest build
node -e "const fs=require('fs');const p='dist/generated/prisma/client.js';let c=fs.readFileSync(p,'utf8');c=c.replace('import.meta.url','require(\"url\").pathToFileURL(__filename).href');fs.writeFileSync(p,c);"
```
Expected: Build succeeds

---

### Task 5: Frontend — API Layer for Projects

**Files:**
- Create: `frontend/src/api/projects.ts`

- [ ] **Step 1: Create projects API module**

```typescript
import request from './request';

export interface Project {
  id: number;
  code: string;
  name: string;
  type: 'integration' | 'supply';
  description?: string;
  contractAmount: number;
  expectedProfitRate?: number;
  projectManagerId: number;
  planStartDate: string;
  planEndDate: string;
  duration?: number;
  remarks?: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  createdAt: string;
  sales: { id: number; displayName: string };
  projectManager: { id: number; displayName: string };
}

export interface CreateProjectData {
  name: string;
  type: 'integration' | 'supply';
  description?: string;
  contractAmount: number;
  expectedProfitRate?: number;
  projectManagerId: number;
  planStartDate: string;
  planEndDate: string;
  remarks?: string;
}

export const projectsApi = {
  findAll: () => request.get<any, { code: number; data: Project[] }>('/projects'),
  findOne: (id: number) => request.get<any, { code: number; data: Project }>(`/projects/${id}`),
  create: (data: CreateProjectData) => request.post<any, { code: number; data: Project }>('/projects', data),
  update: (id: number, data: Partial<CreateProjectData>) => request.put<any, { code: number; data: Project }>(`/projects/${id}`, data),
  submit: (id: number) => request.post<any, { code: number; data: Project }>(`/projects/${id}/submit`),
  approve: (id: number) => request.post<any, { code: number; data: Project }>(`/projects/${id}/approve`),
  reject: (id: number, comment?: string) => request.post<any, { code: number; data: Project }>(`/projects/${id}/reject`, { comment }),
};
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

---

### Task 6: Frontend — Project Form Modal

**Files:**
- Create: `frontend/src/pages/projects/ProjectForm.tsx`

- [ ] **Step 1: Create ProjectForm.tsx**

```tsx
import { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, DatePicker, InputNumber, message } from 'antd';
import { projectsApi, CreateProjectData, Project } from '../../api/projects';
import request from '../../api/request';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editProject?: Project | null;
}

const typeOptions = [
  { value: 'integration', label: '集成' },
  { value: 'supply', label: '供货' },
];

export default function ProjectForm({ open, onClose, onSuccess, editProject }: Props) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [pmOptions, setPmOptions] = useState<any[]>([]);
  const isEdit = !!editProject;

  useEffect(() => {
    if (open) {
      // Load PM candidates (users with pm or engineer role)
      request.get('/users').then((res: any) => {
        const users = res.data || [];
        setPmOptions(users.filter((u: any) => ['pm', 'engineer', 'admin'].includes(u.role)));
      });

      if (editProject) {
        form.setFieldsValue({
          ...editProject,
          planStartDate: undefined, // DatePicker needs moment
          planEndDate: undefined,
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, editProject, form]);

  // Using simple date input instead of DatePicker for simplicity
  const handleFinish = async (values: any) => {
    setLoading(true);
    try {
      const data: CreateProjectData = {
        ...values,
        planStartDate: values.planStartDate,
        planEndDate: values.planEndDate,
      };

      if (isEdit && editProject) {
        await projectsApi.update(editProject.id, data);
        message.success('项目更新成功');
      } else {
        await projectsApi.create(data);
        message.success('项目创建成功');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      message.error(err?.response?.data?.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={isEdit ? '编辑项目' : '新建项目'}
      open={open}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={loading}
      width={640}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={handleFinish} preserve={false}>
        <Form.Item name="name" label="项目名称" rules={[{ required: true, message: '请输入项目名称' }]}>
          <Input placeholder="请输入项目名称" />
        </Form.Item>
        <Form.Item name="type" label="项目类型" rules={[{ required: true, message: '请选择项目类型' }]}>
          <Select options={typeOptions} placeholder="请选择项目类型" />
        </Form.Item>
        <Form.Item name="description" label="项目概况">
          <Input.TextArea rows={3} placeholder="请输入项目概况" />
        </Form.Item>
        <Form.Item name="projectManagerId" label="项目经理" rules={[{ required: true, message: '请选择项目经理' }]}>
          <Select
            showSearch
            placeholder="请选择项目经理"
            options={pmOptions.map((u: any) => ({ value: u.id, label: `${u.displayName} (${u.department || ''})` }))}
            filterOption={(input, option) => (option?.label as string || '').includes(input)}
          />
        </Form.Item>
        <Form.Item name="contractAmount" label="合同金额 (元)" rules={[{ required: true, message: '请输入合同金额' }]}>
          <InputNumber style={{ width: '100%' }} min={0} prefix="¥" placeholder="请输入合同金额" />
        </Form.Item>
        <Form.Item name="expectedProfitRate" label="预期利润率 (%)">
          <InputNumber style={{ width: '100%' }} min={0} max={100} placeholder="请输入预期利润率" />
        </Form.Item>
        <Form.Item name="planStartDate" label="计划开工日期" rules={[{ required: true, message: '请选择开工日期' }]}>
          <Input type="date" />
        </Form.Item>
        <Form.Item name="planEndDate" label="计划完工日期" rules={[{ required: true, message: '请选择完工日期' }]}>
          <Input type="date" />
        </Form.Item>
        <Form.Item name="remarks" label="备注">
          <Input.TextArea rows={2} placeholder="请输入备注（回款信息、验收等）" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

---

### Task 7: Frontend — Project List Page

**Files:**
- Create: `frontend/src/pages/projects/index.tsx`

- [ ] **Step 1: Create projects list page**

```tsx
import { useState, useEffect } from 'react';
import { Table, Button, Tag, Space, Card, Tabs, message, Modal, Popconfirm } from 'antd';
import { PlusOutlined, EyeOutlined, EditOutlined, CheckCircleOutlined, CloseCircleOutlined, SendOutlined } from '@ant-design/icons';
import { projectsApi, Project } from '../../api/projects';
import { useAuthStore } from '../../stores/authStore';
import ProjectForm from './ProjectForm';

const statusMap: Record<string, { color: string; label: string }> = {
  draft: { color: 'default', label: '草稿' },
  pending: { color: 'processing', label: '审批中' },
  approved: { color: 'success', label: '已通过' },
  rejected: { color: 'error', label: '已驳回' },
};

const typeMap: Record<string, string> = {
  integration: '集成',
  supply: '供货',
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [detailVisible, setDetailVisible] = useState<Project | null>(null);
  const user = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState('all');

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res: any = await projectsApi.findAll();
      setProjects(res.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProjects(); }, []);

  const filteredProjects = activeTab === 'all'
    ? projects
    : projects.filter((p) => p.status === activeTab);

  const handleSubmit = async (id: number) => {
    try {
      await projectsApi.submit(id);
      message.success('已提交审批');
      fetchProjects();
    } catch (err: any) {
      message.error(err?.response?.data?.message || '提交失败');
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await projectsApi.approve(id);
      message.success('已审批通过');
      fetchProjects();
    } catch (err: any) {
      message.error(err?.response?.data?.message || '审批失败');
    }
  };

  const handleReject = async (id: number) => {
    try {
      await projectsApi.reject(id);
      message.success('已驳回');
      fetchProjects();
    } catch (err: any) {
      message.error(err?.response?.data?.message || '驳回失败');
    }
  };

  const canEdit = (p: Project) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (user.role === 'sales' && p.sales.id === user.id && (p.status === 'draft' || p.status === 'rejected')) return true;
    return false;
  };

  const canSubmit = (p: Project) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (p.sales.id === user.id && (p.status === 'draft' || p.status === 'rejected')) return true;
    return false;
  };

  const canApprove = (p: Project) => {
    if (!user) return false;
    return (user.role === 'leader' || user.role === 'admin') && p.status === 'pending';
  };

  const columns = [
    { title: '项目编码', dataIndex: 'code', key: 'code', width: 220 },
    { title: '项目名称', dataIndex: 'name', key: 'name', ellipsis: true },
    {
      title: '类型', dataIndex: 'type', key: 'type', width: 80,
      render: (t: string) => typeMap[t] || t,
    },
    {
      title: '销售负责人', dataIndex: ['sales', 'displayName'], key: 'sales', width: 120,
    },
    {
      title: '项目经理', dataIndex: ['projectManager', 'displayName'], key: 'pm', width: 120,
    },
    {
      title: '合同金额', dataIndex: 'contractAmount', key: 'amount', width: 120,
      render: (v: number) => `¥${(v / 10000).toFixed(2)}万`,
    },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 100,
      render: (s: string) => {
        const m = statusMap[s] || { color: 'default', label: s };
        return <Tag color={m.color}>{m.label}</Tag>;
      },
    },
    {
      title: '操作', key: 'action', width: 240,
      render: (_: any, record: Project) => (
        <Space>
          {canEdit(record) && (
            <Button type="link" size="small" icon={<EditOutlined />}
              onClick={() => { setEditProject(record); setFormOpen(true); }}>
              编辑
            </Button>
          )}
          {canSubmit(record) && (
            <Popconfirm title="确认提交审批？" onConfirm={() => handleSubmit(record.id)}>
              <Button type="link" size="small" icon={<SendOutlined />}>提交</Button>
            </Popconfirm>
          )}
          {canApprove(record) && (
            <>
              <Button type="link" size="small" icon={<CheckCircleOutlined />}
                style={{ color: '#52c41a' }} onClick={() => handleApprove(record.id)}>
                通过
              </Button>
              <Button type="link" size="small" icon={<CloseCircleOutlined />}
                danger onClick={() => handleReject(record.id)}>
                驳回
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title="项目管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditProject(null); setFormOpen(true); }}>
            新建项目
          </Button>
        }
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            { key: 'all', label: '全部' },
            { key: 'draft', label: '草稿' },
            { key: 'pending', label: '审批中' },
            { key: 'approved', label: '已通过' },
            { key: 'rejected', label: '已驳回' },
          ]}
        />
        <Table
          dataSource={filteredProjects}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <ProjectForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditProject(null); }}
        onSuccess={fetchProjects}
        editProject={editProject}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

---

### Task 8: Frontend — Add Route + Sidebar Navigation

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/layouts/MainLayout.tsx`

- [ ] **Step 1: Add /projects route in App.tsx**

Import and add route inside MainLayout:

```tsx
import ProjectsPage from './pages/projects';

// Inside <Route path="/" element={...}>:
// <Route path="projects" element={<ProjectsPage />} />
```

The relevant section of App.tsx after modification:

```tsx
<Route path="/" element={<PrivateRoute><MainLayout /></PrivateRoute>}>
  <Route index element={<DashboardPage />} />
  <Route path="projects" element={<ProjectsPage />} />
  <Route path="users" element={<AdminRoute><UsersPage /></AdminRoute>} />
</Route>
```

- [ ] **Step 2: Verify the sidebar in MainLayout.tsx already has "项目管理" menu item**

The MainLayout.tsx already has `{ key: '/projects', icon: <ProjectOutlined />, label: '项目管理' }` — no changes needed.

- [ ] **Step 3: Verify no TypeScript errors**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Build frontend**

Run: `cd frontend && npx vite build`
Expected: Build succeeds

---

## Self-Review Checklist

**Spec coverage:**
- Project CRUD — Tasks 3-4 (backend), Tasks 6-7 (frontend) ✓
- Sales can only create/edit own projects — Task 3 (`findAll` filters by salesId), Task 3 (`update` checks salesId) ✓
- Leader approval flow (submit → approve/reject) — Task 3 (`submitForApproval`, `approve`, `reject`), Task 4 (endpoints), Task 7 (UI buttons) ✓
- Auto-generated project code — Task 1 (`code-generator.ts`) ✓
- Project list with status tabs — Task 7 (Tabs + Table) ✓
- Project form with validation — Task 6 (ProjectForm.tsx) ✓

**Placeholder scan:** No placeholders found. Every code block contains complete, working code.

**Type consistency:** Types used across tasks are consistent. `CreateProjectDto` → `UpdateProjectDto` (PartialType). Frontend `CreateProjectData` matches backend DTO. API response types use `code`/`data` wrapper consistent with the ResponseInterceptor.
