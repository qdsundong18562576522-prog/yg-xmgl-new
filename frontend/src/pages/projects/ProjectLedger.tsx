import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Table, Descriptions, Button, Statistic, Row, Col, Spin, Tag, Progress, Space, Divider } from 'antd';
import { ArrowLeftOutlined, FundOutlined } from '@ant-design/icons';
import request from '../../api/request';

const statusLabels: Record<string, string> = {
  draft: '草稿', pending: '审批中', approved: '已通过', rejected: '已驳回',
};

const typeLabels: Record<string, string> = {
  integration: '集成', supply: '供货',
};

export default function ProjectLedgerPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      setLoading(true);
      request.get(`/projects/${id}/ledger`)
        .then((res: any) => setData(res.data || {}))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;
  if (!data) return <div style={{ textAlign: 'center', padding: 80, color: '#999' }}>台账数据加载失败</div>;

  const { project } = data;

  const money = (v: any) => `¥${Number(v || 0).toLocaleString()}`;
  const pct = (v: any) => `${Number(v || 0).toFixed(2)}%`;

  const totalPct = data.costBreakdown?.procurementPct + data.costBreakdown?.laborPct + data.costBreakdown?.otherPct || 100;

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/projects')}>返回</Button>
        <h2 style={{ margin: 0 }}>项目台账</h2>
        <Tag color="blue">{project.code}</Tag>
        <span style={{ color: '#666' }}>{project.name}</span>
      </div>

      {/* Top Stats */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={4}><Card size="small"><Statistic title="合同金额" value={data.contractAmount} prefix="¥" precision={0} /></Card></Col>
        <Col span={5}><Card size="small"><Statistic title="预期结算额" value={data.expectedSettlement} prefix="¥" precision={0} valueStyle={{ color: '#1890ff' }} /></Card></Col>
        <Col span={5}><Card size="small"><Statistic title="总成本" value={data.totalCost} prefix="¥" precision={0} valueStyle={{ color: data.totalCost > 0 ? '#fa541c' : '#262626' }} /></Card></Col>
        <Col span={5}><Card size="small"><Statistic title="预期利润" value={data.expectedProfit} prefix="¥" precision={0} valueStyle={{ color: data.expectedProfit >= 0 ? '#52c41a' : '#ff4d4f' }} /></Card></Col>
        <Col span={3}><Card size="small"><Statistic title="利润率" value={data.expectedProfitRate} suffix="%" precision={2} valueStyle={{ color: data.expectedProfitRate >= 0 ? '#52c41a' : '#ff4d4f' }} /></Card></Col>
        <Col span={2}><Card size="small"><Statistic title="回款率" value={data.receivableRate} suffix="%" precision={2} /></Card></Col>
      </Row>

      {/* Project Info */}
      <Card title="项目基本信息" size="small" style={{ marginBottom: 16 }}>
        <Descriptions column={3} size="small">
          <Descriptions.Item label="项目编号">{project.code}</Descriptions.Item>
          <Descriptions.Item label="项目名称">{project.name}</Descriptions.Item>
          <Descriptions.Item label="项目类型">{typeLabels[project.type] || project.type}</Descriptions.Item>
          <Descriptions.Item label="状态"><Tag>{statusLabels[project.status] || project.status}</Tag></Descriptions.Item>
          <Descriptions.Item label="销售负责人">{project.salesName}</Descriptions.Item>
          <Descriptions.Item label="项目经理">{project.pmName}</Descriptions.Item>
          <Descriptions.Item label="计划开工">{project.planStartDate ? new Date(project.planStartDate).toLocaleDateString() : '-'}</Descriptions.Item>
          <Descriptions.Item label="计划完工">{project.planEndDate ? new Date(project.planEndDate).toLocaleDateString() : '-'}</Descriptions.Item>
          <Descriptions.Item label="工期">{project.duration ? `${project.duration}天` : '-'}</Descriptions.Item>
          <Descriptions.Item label="合同金额">{money(data.contractAmount)}</Descriptions.Item>
          <Descriptions.Item label="预期利润率">{project.expectedProfitRate ? `${project.expectedProfitRate}%` : '-'}</Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 工程量变更 */}
      <Card title={`工程量变更（${data.variationDetails?.length || 0}笔，合计 ${money(data.variationAmount)}）`} size="small" style={{ marginBottom: 16 }}>
        {data.variationDetails?.length > 0 ? data.variationDetails.map((v: any, idx: number) => (
          <div key={idx} style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 4 }}>变更 #{v.id} — {v.createdBy} · {v.createdAt ? new Date(v.createdAt).toLocaleDateString() : ''}</div>
            <Table
              dataSource={v.items}
              rowKey="name"
              pagination={false}
              size="small"
              columns={[
                { title: '名称', dataIndex: 'name', width: 140 },
                { title: '规格', dataIndex: 'spec', width: 100 },
                { title: '单位', dataIndex: 'unit', width: 60 },
                { title: '工程量', dataIndex: 'quantity', width: 80, render: (val: number) => <span style={{ color: val < 0 ? '#ff4d4f' : '#262626' }}>{val}</span> },
                { title: '综合单价', dataIndex: 'contractPrice', width: 100, render: (val: number) => money(val) },
                { title: '小计', width: 120, render: (_: any, r: any) => <span style={{ color: r.total < 0 ? '#ff4d4f' : '#262626' }}>{money(r.total)}</span> },
              ]}
            />
          </div>
        )) : <div style={{ color: '#999', padding: 12, textAlign: 'center' }}>无变更记录</div>}
      </Card>

      {/* 采购成本 */}
      <Card title={`采购成本（净额 ${money(data.netProcurementCost)}）`} size="small" style={{ marginBottom: 16 }}>
        <Descriptions column={3} size="small" style={{ marginBottom: 12 }}>
          <Descriptions.Item label="入库总额"><span style={{ color: '#1890ff', fontWeight: 500 }}>{money(data.stockInTotal)}</span></Descriptions.Item>
          <Descriptions.Item label="转出公司库存"><span style={{ color: '#fa541c' }}>- {money(data.stockOutTotal)}</span></Descriptions.Item>
          <Descriptions.Item label="跨项目调整"><span style={{ color: '#faad14' }}>{money(data.costAdjustmentsInTotal - data.costAdjustmentsOutTotal)}</span></Descriptions.Item>
        </Descriptions>

        {data.stockInItems?.length > 0 && (
          <>
            <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 4 }}>入库材料明细</div>
            <Table
              dataSource={data.stockInItems}
              rowKey={(_, idx) => String(idx)}
              pagination={false}
              size="small"
              style={{ marginBottom: 12 }}
              columns={[
                { title: '名称', dataIndex: 'name', width: 120 }, { title: '品牌', dataIndex: 'brand', width: 80 },
                { title: '规格', dataIndex: 'spec', width: 100 }, { title: '数量', dataIndex: 'quantity', width: 60 },
                { title: '单价', dataIndex: 'costPrice', width: 80, render: (v: number) => money(v) },
                { title: '金额', width: 100, render: (_: any, r: any) => money(r.total) },
              ]}
            />
          </>
        )}
        {data.stockOutItems?.length > 0 && (
          <>
            <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 4 }}>转出至公司库存明细</div>
            <Table
              dataSource={data.stockOutItems}
              rowKey={(_, idx) => String(idx)}
              pagination={false}
              size="small"
              columns={[
                { title: '名称', dataIndex: 'name', width: 120 }, { title: '品牌', dataIndex: 'brand', width: 80 },
                { title: '规格', dataIndex: 'spec', width: 100 }, { title: '数量', dataIndex: 'quantity', width: 60 },
                { title: '金额', width: 100, render: (_: any, r: any) => money(r.total) },
              ]}
            />
          </>
        )}
        {(data.costAdjustmentsIn?.length > 0 || data.costAdjustmentsOut?.length > 0) && (
          <>
            <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 4 }}>跨项目成本调整</div>
            {data.costAdjustmentsIn?.map((c: any, i: number) => (
              <div key={`in_${i}`} style={{ fontSize: 12, padding: '2px 0' }}>
                <Tag color="green">转入</Tag> 来自 {c.sourceProject} — {money(c.amount)}
              </div>
            ))}
            {data.costAdjustmentsOut?.map((c: any, i: number) => (
              <div key={`out_${i}`} style={{ fontSize: 12, padding: '2px 0' }}>
                <Tag color="orange">转出</Tag> 至 {c.targetProject} — {money(c.amount)}
              </div>
            ))}
          </>
        )}
      </Card>

      {/* 劳务成本 */}
      <Card title={`劳务成本（合计 ${money(data.totalLaborCost)}）`} size="small" style={{ marginBottom: 16 }}>
        {data.laborContractDetails?.length > 0 && (
          <>
            <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 4 }}>劳务合同</div>
            <Table
              dataSource={data.laborContractDetails}
              rowKey="code"
              pagination={false}
              size="small"
              style={{ marginBottom: 12 }}
              columns={[
                { title: '合同编号', dataIndex: 'code', width: 180 },
                { title: '承包方', dataIndex: 'contractorName', width: 120 },
                { title: '金额', dataIndex: 'amount', width: 120, render: (v: number) => money(v) },
              ]}
            />
          </>
        )}
        {data.laborVisaDetails?.length > 0 && (
          <>
            <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 4 }}>劳务签证</div>
            <Table
              dataSource={data.laborVisaDetails}
              rowKey="code"
              pagination={false}
              size="small"
              columns={[
                { title: '签证编号', dataIndex: 'code', width: 180 },
                { title: '合同编号', dataIndex: 'contractCode', width: 180 },
                { title: '签证原因', dataIndex: 'reasonCalc', ellipsis: true },
                { title: '金额变更', dataIndex: 'amountChange', width: 120, render: (v: number) => <span style={{ color: v < 0 ? '#ff4d4f' : '#52c41a' }}>{money(v)}</span> },
              ]}
            />
          </>
        )}
        {!data.laborContractDetails?.length && !data.laborVisaDetails?.length && (
          <div style={{ color: '#999', padding: 12, textAlign: 'center' }}>无劳务成本记录</div>
        )}
      </Card>

      {/* 其他成本 */}
      <Card title={`其他成本（合计 ${money(data.otherCostTotal)}）`} size="small" style={{ marginBottom: 16 }}>
        <Descriptions column={3} size="small" style={{ marginBottom: 8 }}>
          <Descriptions.Item label="报销总额">{money(data.reimbursementTotal)}</Descriptions.Item>
          <Descriptions.Item label="费用申请总额">{money(data.expenseRequestTotal)}</Descriptions.Item>
        </Descriptions>
        {data.reimbursementDetails?.length > 0 && (
          <Table
            dataSource={data.reimbursementDetails}
            rowKey="id"
            pagination={false}
            size="small"
            style={{ marginBottom: 8 }}
            columns={[
              { title: '类型', width: 80, render: () => <Tag color="blue">报销</Tag> },
              { title: '事由', dataIndex: 'reason', ellipsis: true },
              { title: '金额', dataIndex: 'amount', width: 120, render: (v: number) => money(v) },
            ]}
          />
        )}
        {data.expenseRequestDetails?.length > 0 && (
          <Table
            dataSource={data.expenseRequestDetails}
            rowKey="id"
            pagination={false}
            size="small"
            columns={[
              { title: '类型', width: 80, render: () => <Tag color="orange">费用申请</Tag> },
              { title: '事由', dataIndex: 'reason', ellipsis: true },
              { title: '金额', dataIndex: 'amount', width: 120, render: (v: number) => money(v) },
            ]}
          />
        )}
        {!data.reimbursementDetails?.length && !data.expenseRequestDetails?.length && (
          <div style={{ color: '#999', padding: 12, textAlign: 'center' }}>无其他成本记录</div>
        )}
      </Card>

      {/* 付款与回款 */}
      <Card title={`付款与回款`} size="small" style={{ marginBottom: 16 }}>
        <Descriptions column={2} size="small" style={{ marginBottom: 8 }}>
          <Descriptions.Item label="已付款总额"><span style={{ color: '#fa541c', fontWeight: 500 }}>{money(data.totalPaidOut)}</span></Descriptions.Item>
          <Descriptions.Item label="已回款总额"><span style={{ color: '#52c41a', fontWeight: 500 }}>{money(data.totalReceivable)}</span></Descriptions.Item>
        </Descriptions>
        {data.paymentDetails?.length > 0 && (
          <Table
            dataSource={data.paymentDetails}
            rowKey="code"
            pagination={false}
            size="small"
            style={{ marginBottom: 8 }}
            columns={[
              { title: '编号', dataIndex: 'code', width: 180 },
              { title: '事由', dataIndex: 'reason', ellipsis: true },
              { title: '金额', dataIndex: 'amount', width: 120, render: (v: number) => money(v) },
              { title: '状态', width: 80, render: (_: any, r: any) => r.confirmed ? <Tag color="green">已付</Tag> : <Tag>审批中</Tag> },
            ]}
          />
        )}
        {data.receivableDetails?.length > 0 && (
          <Table
            dataSource={data.receivableDetails}
            rowKey={(_, idx) => String(idx)}
            pagination={false}
            size="small"
            columns={[
              { title: '金额', dataIndex: 'amount', width: 120, render: (v: number) => <span style={{ color: '#52c41a', fontWeight: 500 }}>{money(v)}</span> },
              { title: '方式', dataIndex: 'method', width: 100 },
              { title: '回款时间', dataIndex: 'receivedTime', width: 150, render: (v: string) => v ? new Date(v).toLocaleString() : '-' },
              { title: '经办人', dataIndex: 'createdBy', width: 100 },
            ]}
          />
        )}
        {!data.paymentDetails?.length && !data.receivableDetails?.length && (
          <div style={{ color: '#999', padding: 12, textAlign: 'center' }}>无付款与回款记录</div>
        )}
      </Card>

      {/* 利润分析 */}
      <Card title="利润分析" size="small" style={{ marginBottom: 16 }}>
        <Row gutter={24}>
          <Col span={8}>
            <Statistic title="预期结算额" value={data.expectedSettlement} prefix="¥" precision={0} valueStyle={{ color: '#1890ff', fontSize: 24 }} />
          </Col>
          <Col span={8}>
            <Statistic title="总成本" value={data.totalCost} prefix="¥" precision={0} valueStyle={{ color: '#fa541c', fontSize: 24 }} />
          </Col>
          <Col span={8}>
            <Statistic
              title="预期利润"
              value={data.expectedProfit}
              prefix="¥"
              precision={0}
              valueStyle={{ color: data.expectedProfit >= 0 ? '#52c41a' : '#ff4d4f', fontSize: 24 }}
            />
          </Col>
        </Row>
        <Divider />
        <Row gutter={24}>
          <Col span={6}>
            <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>利润率</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: data.expectedProfitRate >= 0 ? '#52c41a' : '#ff4d4f' }}>{pct(data.expectedProfitRate)}</div>
          </Col>
          <Col span={6}>
            <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>回款率</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: '#1890ff' }}>{pct(data.receivableRate)}</div>
          </Col>
          <Col span={6}>
            <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>预期利润率（立项时）</div>
            <div style={{ fontSize: 22, fontWeight: 600 }}>{project.expectedProfitRate ? `${project.expectedProfitRate}%` : '-'}</div>
          </Col>
          <Col span={6}>
            <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>资金缺口</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: data.expectedSettlement - data.totalPaidOut > 0 ? '#faad14' : '#52c41a' }}>
              {money(data.expectedSettlement - data.totalPaidOut)}
            </div>
          </Col>
        </Row>
        <Divider />
        <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 8 }}>成本结构</div>
        {totalPct > 0 && (
          <div style={{ display: 'flex', height: 24, borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
            {data.costBreakdown?.procurementPct > 0 && <div style={{ flex: data.costBreakdown.procurementPct, background: '#1890ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12 }}>采购 {data.costBreakdown.procurementPct}%</div>}
            {data.costBreakdown?.laborPct > 0 && <div style={{ flex: data.costBreakdown.laborPct, background: '#722ed1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12 }}>劳务 {data.costBreakdown.laborPct}%</div>}
            {data.costBreakdown?.otherPct > 0 && <div style={{ flex: data.costBreakdown.otherPct, background: '#faad14', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12 }}>其他 {data.costBreakdown.otherPct}%</div>}
          </div>
        )}
        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#666' }}>
          <span><span style={{ color: '#1890ff' }}>●</span> 采购成本 {pct(data.costBreakdown?.procurementPct)}</span>
          <span><span style={{ color: '#722ed1' }}>●</span> 劳务成本 {pct(data.costBreakdown?.laborPct)}</span>
          <span><span style={{ color: '#faad14' }}>●</span> 其他成本 {pct(data.costBreakdown?.otherPct)}</span>
        </div>
      </Card>
    </div>
  );
}
