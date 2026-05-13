import { useState, useEffect } from 'react';
import {
  Card, Table, Button, Modal, Input, InputNumber, Switch, message,
  Row, Col, List, Badge, Space,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { settingsApi } from '../../api/settings';

export default function SettingsDict() {
  const [types, setTypes] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [selectedType, setSelectedType] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  const fetchTypes = async () => {
    setLoading(true);
    try {
      const res: any = await settingsApi.getDictTypes();
      const list = res.data || [];
      setTypes(list);
      if (list.length > 0 && !selectedType) {
        setSelectedType(list[0].dictType);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const fetchEntries = async (type: string) => {
    if (!type) return;
    setEntriesLoading(true);
    try {
      const res: any = await settingsApi.getDictByType(type);
      setEntries(res.data || []);
    } catch {
      // ignore
    } finally {
      setEntriesLoading(false);
    }
  };

  useEffect(() => {
    fetchTypes();
  }, []);

  useEffect(() => {
    if (selectedType) fetchEntries(selectedType);
  }, [selectedType]);

  const handleDelete = (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '删除后不可恢复，确定要删除该字典条目吗？',
      onOk: async () => {
        try {
          await settingsApi.deleteDict(id);
          message.success('已删除');
          fetchEntries(selectedType);
          fetchTypes();
        } catch (e: any) {
          message.error(e?.response?.data?.message || '删除失败');
        }
      },
    });
  };

  const handleSave = async () => {
    if (!editItem) return;
    try {
      if (editItem.id) {
        await settingsApi.updateDict(editItem.id, editItem);
      } else {
        await settingsApi.createDict(editItem);
      }
      message.success('保存成功');
      setModalOpen(false);
      fetchEntries(selectedType);
      fetchTypes();
    } catch (e: any) {
      message.error(e?.response?.data?.message || '保存失败');
    }
  };

  const columns = [
    { title: '标签', dataIndex: 'dictLabel', key: 'dictLabel', width: 150 },
    { title: '值', dataIndex: 'dictValue', key: 'dictValue', width: 150 },
    { title: '排序', dataIndex: 'sortOrder', key: 'sortOrder', width: 80, align: 'center' as const },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 80, align: 'center' as const,
      render: (v: boolean, r: any) => (
        <Switch
          size="small"
          checked={v}
          onChange={async () => {
            try {
              await settingsApi.toggleDict(r.id);
              fetchEntries(selectedType);
            } catch { /* ignore */ }
          }}
        />
      ),
    },
    { title: '备注', dataIndex: 'remark', key: 'remark', ellipsis: true },
    {
      title: '操作', key: 'action', width: 100,
      render: (_: any, r: any) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => {
            setEditItem(r);
            setModalOpen(true);
          }} />
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(r.id)} />
        </Space>
      ),
    },
  ];

  return (
    <Row gutter={16}>
      <Col span={6}>
        <Card title="字典类型" size="small" styles={{ body: { padding: 0 } }}>
          <List
            loading={loading}
            dataSource={types}
            locale={{ emptyText: '暂无字典' }}
            renderItem={(item: any) => (
              <List.Item
                onClick={() => setSelectedType(item.dictType)}
                style={{
                  cursor: 'pointer',
                  padding: '10px 16px',
                  background: selectedType === item.dictType ? '#e6f7ff' : 'transparent',
                  borderLeft: selectedType === item.dictType ? '3px solid #1890ff' : '3px solid transparent',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <span>{item.dictType}</span>
                  <Badge count={item.count} style={{ backgroundColor: '#1890ff' }} />
                </div>
              </List.Item>
            )}
          />
        </Card>
      </Col>
      <Col span={18}>
        <Card
          title={selectedType || '请选择字典类型'}
          size="small"
          extra={
            selectedType ? (
              <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => {
                setEditItem({ dictType: selectedType, dictLabel: '', dictValue: '', sortOrder: 0 });
                setModalOpen(true);
              }}>新增</Button>
            ) : null
          }
          styles={{ body: { padding: 0 } }}
        >
          <Table
            columns={columns}
            dataSource={entries}
            rowKey="id"
            loading={entriesLoading}
            pagination={false}
            locale={{ emptyText: '请选择左侧字典类型' }}
          />
        </Card>
      </Col>
      <Modal
        title={editItem?.id ? '编辑字典条目' : '新增字典条目'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        okText="保存"
        cancelText="取消"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={{ marginBottom: 4, fontWeight: 500 }}>字典类型</div>
            <Input value={editItem?.dictType || ''} disabled />
          </div>
          <div>
            <div style={{ marginBottom: 4, fontWeight: 500 }}>标签</div>
            <Input
              value={editItem?.dictLabel || ''}
              onChange={(e) => setEditItem({ ...editItem, dictLabel: e.target.value })}
              placeholder="如：集成"
            />
          </div>
          <div>
            <div style={{ marginBottom: 4, fontWeight: 500 }}>值</div>
            <Input
              value={editItem?.dictValue || ''}
              onChange={(e) => setEditItem({ ...editItem, dictValue: e.target.value })}
              placeholder="如：integration"
            />
          </div>
          <div>
            <div style={{ marginBottom: 4, fontWeight: 500 }}>排序</div>
            <InputNumber
              value={editItem?.sortOrder || 0}
              onChange={(v) => setEditItem({ ...editItem, sortOrder: v || 0 })}
              min={0}
            />
          </div>
          <div>
            <div style={{ marginBottom: 4, fontWeight: 500 }}>备注</div>
            <Input
              value={editItem?.remark || ''}
              onChange={(e) => setEditItem({ ...editItem, remark: e.target.value })}
            />
          </div>
        </div>
      </Modal>
    </Row>
  );
}
