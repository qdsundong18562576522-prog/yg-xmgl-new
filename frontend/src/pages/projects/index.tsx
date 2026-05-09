import { useState, useEffect } from 'react';
import { Table, Button, Tag, Space, Card, Tabs, message, Popconfirm, Modal, Descriptions } from 'antd';
import { PlusOutlined, EyeOutlined, EditOutlined, CheckCircleOutlined, CloseCircleOutlined, SendOutlined } from '@ant-design/icons';
import { projectsApi } from '../../api/projects';
import type { Project } from '../../api/projects';
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
  const [viewProject, setViewProject] = useState<Project | null>(null);
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

  const handleDelete = async (id: number) => {
    try {
      await projectsApi.delete(id);
      message.success('项目已删除');
      fetchProjects();
    } catch (err: any) {
      message.error(err?.response?.data?.message || '删除失败');
    }
  };

  const canDelete = () => user?.role === 'admin';

  const isSalesMember = (p: Project) =>
    p.members?.some((m) => m.userId === user?.id && m.role === 'sales');

  const canEdit = (p: Project) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (user.role === 'sales' && (p.sales.id === user.id || isSalesMember(p)) && (p.status === 'draft' || p.status === 'rejected')) return true;
    return false;
  };

  const canSubmit = (p: Project) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if ((p.sales.id === user.id || isSalesMember(p)) && (p.status === 'draft' || p.status === 'rejected')) return true;
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
      title: '销售负责人', key: 'sales', width: 160,
      render: (_: any, record: Project) => {
        const salesMembers = record.members?.filter((m) => m.role === 'sales') || [];
        const names = salesMembers.map((m) => m.user.displayName);
        return <span>{names.join('、') || record.sales.displayName}</span>;
      },
    },
    {
      title: '项目经理', dataIndex: ['projectManager', 'displayName'], key: 'pm', width: 120,
    },
    {
      title: '合同金额', dataIndex: 'contractAmount', key: 'amount', width: 120,
      render: (v: number) => `¥${(v / 10000).toFixed(2)}万`,
    },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 160,
      render: (s: string, record: Project) => {
        const m = statusMap[s] || { color: 'default', label: s };
        const time = record.createdAt ? new Date(record.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
        return (
          <div>
            <Tag color={m.color}>{m.label}</Tag>
            <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>{time}</div>
          </div>
        );
      },
    },
    {
      title: '操作', key: 'action', width: 280,
      render: (_: any, record: Project) => (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />}
            onClick={() => setViewProject(record)}>
            查看
          </Button>
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
          {canDelete() && (
            <Popconfirm title="确认删除此项目？" onConfirm={() => handleDelete(record.id)}>
              <Button type="link" size="small" danger icon={<CloseCircleOutlined />}>删除</Button>
            </Popconfirm>
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

      <Modal title="项目详情" open={!!viewProject} onCancel={() => setViewProject(null)} footer={null} width={720}>
        {viewProject && (
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="项目编码" span={2}>{viewProject.code}</Descriptions.Item>
            <Descriptions.Item label="项目名称" span={2}>{viewProject.name}</Descriptions.Item>
            <Descriptions.Item label="项目类型">{typeMap[viewProject.type] || viewProject.type}</Descriptions.Item>
            <Descriptions.Item label="状态"><Tag color={statusMap[viewProject.status]?.color}>{statusMap[viewProject.status]?.label}</Tag></Descriptions.Item>
            <Descriptions.Item label="销售负责人" span={2}>
              {viewProject.members?.filter((m) => m.role === 'sales').map((m) => m.user.displayName).join('、') || viewProject.sales.displayName}
            </Descriptions.Item>
            <Descriptions.Item label="项目经理" span={2}>{viewProject.projectManager.displayName}</Descriptions.Item>
            <Descriptions.Item label="参与人员" span={2}>
              {viewProject.members?.filter((m) => m.role === 'participant').map((m) => m.user.displayName).join('、') || '无'}
            </Descriptions.Item>
            <Descriptions.Item label="合同金额">¥{(Number(viewProject.contractAmount) / 10000).toFixed(2)}万</Descriptions.Item>
            <Descriptions.Item label="预期利润率">{viewProject.expectedProfitRate ? `${viewProject.expectedProfitRate}%` : '-'}</Descriptions.Item>
            <Descriptions.Item label="计划开工日期">{new Date(viewProject.planStartDate).toLocaleDateString()}</Descriptions.Item>
            <Descriptions.Item label="计划完工日期">{new Date(viewProject.planEndDate).toLocaleDateString()}</Descriptions.Item>
            <Descriptions.Item label="工期">{viewProject.duration ? `${viewProject.duration}天` : '-'}</Descriptions.Item>
            <Descriptions.Item label="创建时间">{new Date(viewProject.createdAt).toLocaleString()}</Descriptions.Item>
            {viewProject.description && <Descriptions.Item label="项目概况" span={2}>{viewProject.description}</Descriptions.Item>}
            {viewProject.remarks && <Descriptions.Item label="备注" span={2}>{viewProject.remarks}</Descriptions.Item>}
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}
