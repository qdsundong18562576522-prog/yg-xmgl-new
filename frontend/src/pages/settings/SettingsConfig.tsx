import { useState, useEffect } from 'react';
import { Table, Button, Modal, Input, message, Tag } from 'antd';
import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import { settingsApi } from '../../api/settings';

const presetKeys: Record<string, string> = {
  company_name: '公司名称',
  company_address: '公司地址',
  company_phone: '联系电话',
  system_title: '系统标题',
};

export default function SettingsConfig() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [editValue, setEditValue] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res: any = await settingsApi.getConfigs();
      setData(res.data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async () => {
    if (!editItem) return;
    try {
      await settingsApi.updateConfig(editItem.configKey, editValue);
      message.success('保存成功');
      setModalOpen(false);
      fetchData();
    } catch (e: any) {
      message.error(e?.response?.data?.message || '保存失败');
    }
  };

  const columns = [
    { title: '配置键', dataIndex: 'configKey', key: 'configKey', width: 200, render: (k: string) => <Tag>{k}</Tag> },
    { title: '说明', dataIndex: 'description', key: 'description', width: 200, render: (v: string, r: any) => v || presetKeys[r.configKey] || '-' },
    { title: '配置值', dataIndex: 'configValue', key: 'configValue', ellipsis: true },
    {
      title: '更新时间', dataIndex: 'updatedAt', key: 'updatedAt', width: 180,
      render: (v: string) => v ? new Date(v).toLocaleString() : '-',
    },
    {
      title: '操作', key: 'action', width: 80,
      render: (_: any, r: any) => (
        <Button
          type="link"
          icon={<EditOutlined />}
          onClick={() => { setEditItem(r); setEditValue(r.configValue || ''); setModalOpen(true); }}
        />
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => {
          setEditItem({ configKey: '', configValue: '' });
          setEditValue('');
          setModalOpen(true);
        }}>新增配置</Button>
      </div>
      <Table
        columns={columns}
        dataSource={data}
        rowKey="configKey"
        loading={loading}
        pagination={false}
        locale={{ emptyText: '暂无系统配置' }}
      />
      <Modal
        title={editItem?.configKey ? `编辑配置: ${editItem.configKey}` : '新增配置'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        okText="保存"
        cancelText="取消"
      >
        {editItem && !editItem.configKey && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ marginBottom: 4, fontWeight: 500 }}>配置键</div>
            <Input
              placeholder="如 company_name"
              value={editItem.configKey}
              onChange={(e) => setEditItem({ ...editItem, configKey: e.target.value })}
            />
          </div>
        )}
        <div style={{ marginBottom: 4, fontWeight: 500 }}>配置值</div>
        <Input.TextArea
          rows={3}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          placeholder="请输入配置值"
        />
      </Modal>
    </div>
  );
}
