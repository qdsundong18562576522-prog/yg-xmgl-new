import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Table, Tag, Button, Progress } from 'antd';
import { FundOutlined, EyeOutlined } from '@ant-design/icons';
import request from '../../api/request';

const typeColors: Record<string, string> = {
  集成: 'blue',
  供货: 'orange',
};

export default function ProjectLedgerListPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    request
      .get('/projects/ledger-list')
      .then((res: any) => setData(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const money = (v: any) => `¥${Number(v || 0).toLocaleString()}`;

  const columns = [
    {
      title: '项目编号',
      dataIndex: 'code',
      key: 'code',
      width: 180,
      render: (code: string) => <Tag>{code}</Tag>,
    },
    {
      title: '项目名称',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (t: string) => <Tag color={typeColors[t]}>{t}</Tag>,
    },
    {
      title: '项目经理',
      dataIndex: 'pm',
      key: 'pm',
      width: 100,
    },
    {
      title: '合同金额',
      dataIndex: 'contractAmount',
      key: 'contractAmount',
      width: 140,
      align: 'right' as const,
      render: (v: number) => money(v),
    },
    {
      title: '变更金额',
      dataIndex: 'variationAmount',
      key: 'variationAmount',
      width: 140,
      align: 'right' as const,
      render: (v: number) => (
        <span style={{ color: v > 0 ? '#fa8c16' : '#8c8c8c' }}>{money(v)}</span>
      ),
    },
    {
      title: '调整后金额',
      dataIndex: 'adjustedAmount',
      key: 'adjustedAmount',
      width: 140,
      align: 'right' as const,
      render: (v: number) => <strong>{money(v)}</strong>,
    },
    {
      title: '预期结算额',
      dataIndex: 'expectedSettlement',
      key: 'expectedSettlement',
      width: 140,
      align: 'right' as const,
      render: (v: number) => <span style={{ color: '#1890ff' }}>{money(v)}</span>,
    },
    {
      title: '已回款',
      dataIndex: 'totalReceivable',
      key: 'totalReceivable',
      width: 140,
      align: 'right' as const,
      render: (v: number) => <span style={{ color: '#52c41a' }}>{money(v)}</span>,
    },
    {
      title: '回款率',
      dataIndex: 'receivableRate',
      key: 'receivableRate',
      width: 120,
      render: (v: number) => (
        <Progress
          percent={v}
          size="small"
          strokeColor={v >= 80 ? '#52c41a' : v >= 40 ? '#1890ff' : '#faad14'}
          format={() => `${v}%`}
        />
      ),
    },
    {
      title: '已付款',
      dataIndex: 'totalPaidOut',
      key: 'totalPaidOut',
      width: 140,
      align: 'right' as const,
      render: (v: number) => <span style={{ color: '#ff4d4f' }}>{money(v)}</span>,
    },
    {
      title: '总成本',
      dataIndex: 'totalCost',
      key: 'totalCost',
      width: 140,
      align: 'right' as const,
      render: (v: number) => money(v),
    },
    {
      title: '利润',
      dataIndex: 'profit',
      key: 'profit',
      width: 140,
      align: 'right' as const,
      render: (v: number) => (
        <span style={{ color: v >= 0 ? '#52c41a' : '#ff4d4f', fontWeight: 600 }}>
          {money(v)}
        </span>
      ),
    },
    {
      title: '利润率',
      dataIndex: 'profitRate',
      key: 'profitRate',
      width: 100,
      align: 'right' as const,
      render: (v: number) => (
        <Tag color={v >= 15 ? 'green' : v >= 5 ? 'blue' : 'red'}>{v.toFixed(2)}%</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, record: any) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/projects/ledger/${record.id}`)}
        >
          详情
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Card
        title={
          <span>
            <FundOutlined style={{ marginRight: 8, color: '#2563eb' }} />
            项目台账
          </span>
        }
        styles={{ body: { padding: 0 } }}
      >
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={false}
          scroll={{ x: 1600 }}
          locale={{ emptyText: '暂无项目台账数据' }}
        />
      </Card>
    </div>
  );
}
