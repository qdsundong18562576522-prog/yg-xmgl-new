import { useState, useEffect } from 'react';
import { Table, Button, Tag, Space, Card, Tabs, message, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, CheckCircleOutlined, CloseCircleOutlined, SendOutlined } from '@ant-design/icons';
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
