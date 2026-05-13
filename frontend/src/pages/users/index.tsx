import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Tag, Space, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, StopOutlined, CheckCircleOutlined } from '@ant-design/icons';
import request from '../../api/request';

const roleColors: Record<string, string> = {
  admin: 'red', leader: 'orange', pm: 'blue', purchaser: 'purple',
  finance: 'green', engineer: 'cyan', sales: 'gold',
};
const roleNames: Record<string, string> = {
  admin: '管理员', leader: '企业负责人', pm: '项目经理', purchaser: '采购',
  finance: '财务', engineer: '工程人员', sales: '销售',
};

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [form] = Form.useForm();
  const isEdit = !!editUser;

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res: any = await request.get('/users');
      setUsers(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const openCreate = () => {
    setEditUser(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (user: any) => {
    setEditUser(user);
    setModalOpen(true);
  };

  useEffect(() => {
    if (modalOpen && editUser) {
      form.setFieldsValue(editUser);
    } else if (modalOpen && !editUser) {
      form.resetFields();
    }
  }, [modalOpen, editUser, form]);

  const handleSubmit = async (values: any) => {
    try {
      if (isEdit) {
        await request.put(`/users/${editUser.id}`, values);
        message.success('更新成功');
      } else {
        await request.post('/users', values);
        message.success('创建成功');
      }
      setModalOpen(false);
      setEditUser(null);
      form.resetFields();
      fetchUsers();
    } catch (err: any) {
      message.error(err?.response?.data?.message || '操作失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await request.delete(`/users/${id}`);
      message.success('已删除');
      fetchUsers();
    } catch (err: any) {
      message.error(err?.response?.data?.message || '删除失败');
    }
  };

  const handleToggleActive = async (user: any) => {
    try {
      await request.put(`/users/${user.id}`, { isActive: !user.isActive });
      message.success(user.isActive ? '已停用' : '已启用');
      fetchUsers();
    } catch (err: any) {
      message.error(err?.response?.data?.message || '操作失败');
    }
  };

  const columns = [
    { title: '用户名', dataIndex: 'username', key: 'username' },
    { title: '姓名', dataIndex: 'displayName', key: 'displayName' },
    {
      title: '角色', dataIndex: 'role', key: 'role',
      render: (r: string) => <Tag color={roleColors[r]}>{roleNames[r] || r}</Tag>,
    },
    { title: '部门', dataIndex: 'department', key: 'department' },
    { title: '电话', dataIndex: 'phone', key: 'phone' },
    {
      title: '状态', dataIndex: 'isActive', key: 'isActive', width: 80,
      render: (v: boolean) => v ? <Tag color="success">启用</Tag> : <Tag color="error">停用</Tag>,
    },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', render: (v: string) => new Date(v).toLocaleDateString() },
    {
      title: '操作', key: 'action', width: 200,
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>编辑</Button>
          {record.role !== 'admin' && (
            <Popconfirm title={record.isActive ? '确认停用此用户？' : '确认启用此用户？'} onConfirm={() => handleToggleActive(record)}>
              <Button type="link" size="small" icon={record.isActive ? <StopOutlined /> : <CheckCircleOutlined />}>
                {record.isActive ? '停用' : '启用'}
              </Button>
            </Popconfirm>
          )}
          {record.role !== 'admin' && (
            <Popconfirm title="确认删除此用户？" onConfirm={() => handleDelete(record.id)}>
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h3>用户管理</h3>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新建用户</Button>
      </div>
      <Table dataSource={users} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} />
      <Modal
        title={isEdit ? '编辑用户' : '新建用户'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditUser(null); }}
        onOk={() => form.submit()}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} preserve={false}>
          <Form.Item name="username" label="用户名" rules={isEdit ? [] : [{ required: true }]}>
            <Input disabled={isEdit} />
          </Form.Item>
          {!isEdit && (
            <Form.Item name="password" label="密码" rules={[{ required: true }]}>
              <Input.Password />
            </Form.Item>
          )}
          <Form.Item name="displayName" label="姓名" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="role" label="角色" rules={[{ required: true }]}>
            <Select options={Object.entries(roleNames).map(([k, v]) => ({ value: k, label: v }))} />
          </Form.Item>
          <Form.Item name="department" label="部门">
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="电话">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
