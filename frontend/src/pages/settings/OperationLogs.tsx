import { useState, useEffect } from 'react';
import { Table, Tag, Select, DatePicker, Space, Descriptions } from 'antd';
import { settingsApi } from '../../api/settings';

const actionColors: Record<string, string> = {
  create: 'green', update: 'blue', delete: 'red',
  submit: 'orange', approve: 'cyan', reject: 'volcano', withdraw: 'purple',
};

export default function OperationLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [entityTypes, setEntityTypes] = useState<string[]>([]);
  const [filters, setFilters] = useState<any>({
    page: 1, pageSize: 20, entityType: undefined, action: undefined,
  });
  const [dateRange, setDateRange] = useState<any>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params: any = { page: filters.page, pageSize: filters.pageSize };
      if (filters.entityType) params.entityType = filters.entityType;
      if (filters.action) params.action = filters.action;
      if (dateRange?.[0]) params.startDate = dateRange[0].toISOString();
      if (dateRange?.[1]) params.endDate = dateRange[1].toISOString();
      const res: any = await settingsApi.getLogs(params);
      const d = res.data || res;
      setLogs(d.data || []);
      setTotal(d.total || 0);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    settingsApi.getLogEntityTypes().then((res: any) => {
      setEntityTypes(res.data || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  const columns = [
    {
      title: '时间', dataIndex: 'createdAt', key: 'createdAt', width: 180,
      render: (v: string) => v ? new Date(v).toLocaleString() : '-',
    },
    {
      title: '操作人', dataIndex: 'userName', key: 'userName', width: 100,
    },
    {
      title: '操作类型', dataIndex: 'action', key: 'action', width: 100,
      render: (v: string) => <Tag color={actionColors[v] || 'default'}>{v}</Tag>,
    },
    {
      title: '业务类型', dataIndex: 'entityType', key: 'entityType', width: 130,
    },
    {
      title: '业务ID', dataIndex: 'entityId', key: 'entityId', width: 80,
    },
    {
      title: '变更内容', dataIndex: 'changes', key: 'changes', ellipsis: true,
      render: (v: string) => {
        if (!v) return '-';
        try {
          const obj = JSON.parse(v);
          return Object.entries(obj).map(([k, val]) => (
            <Tag key={k} style={{ marginBottom: 2 }}>{k}: {JSON.stringify(val)}</Tag>
          ));
        } catch {
          return <span style={{ fontSize: 12, color: '#666' }}>{v.slice(0, 50)}</span>;
        }
      },
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }} wrap>
        <span>业务类型：</span>
        <Select
          allowClear
          placeholder="全部"
          style={{ width: 150 }}
          value={filters.entityType}
          onChange={(v) => setFilters({ ...filters, entityType: v, page: 1 })}
          options={entityTypes.map((t: string) => ({ label: t, value: t }))}
        />
        <span>操作类型：</span>
        <Select
          allowClear
          placeholder="全部"
          style={{ width: 120 }}
          value={filters.action}
          onChange={(v) => setFilters({ ...filters, action: v, page: 1 })}
          options={[
            { label: '创建', value: 'create' },
            { label: '更新', value: 'update' },
            { label: '删除', value: 'delete' },
            { label: '提交', value: 'submit' },
            { label: '审批通过', value: 'approve' },
            { label: '驳回', value: 'reject' },
            { label: '撤回', value: 'withdraw' },
          ]}
        />
        <span>时间范围：</span>
        <DatePicker.RangePicker
          value={dateRange}
          onChange={(dates) => {
            setDateRange(dates);
            setFilters({ ...filters, page: 1 });
          }}
        />
      </Space>
      <Table
        columns={columns}
        dataSource={logs}
        rowKey="id"
        loading={loading}
        pagination={{
          current: filters.page,
          pageSize: filters.pageSize,
          total,
          onChange: (p, ps) => setFilters({ ...filters, page: p, pageSize: ps }),
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条`,
        }}
        locale={{ emptyText: '暂无操作日志' }}
        expandable={{
          expandedRowRender: (record: any) => (
            <div style={{ padding: 8 }}>
              <Descriptions size="small" column={1}>
                <Descriptions.Item label="业务类型">{record.entityType}</Descriptions.Item>
                <Descriptions.Item label="操作类型">{record.action}</Descriptions.Item>
                <Descriptions.Item label="操作人">{record.userName}</Descriptions.Item>
                <Descriptions.Item label="IP地址">{record.ipAddress || '-'}</Descriptions.Item>
                <Descriptions.Item label="变更内容">
                  <pre style={{ fontSize: 12, maxHeight: 200, overflow: 'auto', background: '#f5f5f5', padding: 8, borderRadius: 4 }}>
                    {record.changes ? JSON.stringify(JSON.parse(record.changes), null, 2) : '-'}
                  </pre>
                </Descriptions.Item>
              </Descriptions>
            </div>
          ),
        }}
      />
    </div>
  );
}
