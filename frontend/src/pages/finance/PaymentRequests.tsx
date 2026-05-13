import { useState, useEffect } from 'react';
import { Table, Button, Tag, Space, Card, Tabs, message, Modal, Descriptions, Timeline, Form, Select, Input, InputNumber, DatePicker } from 'antd';
import { PlusOutlined, SendOutlined, CheckCircleOutlined, CloseCircleOutlined, EyeOutlined, RollbackOutlined, DollarOutlined, DeleteOutlined } from '@ant-design/icons';
import { paymentRequestsApi } from '../../api/finance';
import { useAuthStore } from '../../stores/authStore';
import request from '../../api/request';

const statusMap: Record<string, { color: string; label: string }> = {
  draft: { color: 'default', label: '草稿' },
  pending_leader: { color: 'warning', label: '领导审批' },
  pending_finance: { color: 'orange', label: '财务审批' },
  approved: { color: 'success', label: '已通过' },
  rejected: { color: 'error', label: '已驳回' },
};

const contractTypeLabels: Record<string, string> = {
  purchase_confirm: '采购合同',
  labor_contract: '劳务合同',
};

export default function PaymentRequestsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [viewItem, setViewItem] = useState<any>(null);
  const [approvalHistory, setApprovalHistory] = useState<any[]>([]);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const user = useAuthStore((s) => s.user);

  const fetch = async () => {
    setLoading(true);
    try {
      const res: any = await paymentRequestsApi.findAll();
      setData(res.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const filtered = activeTab === 'all' ? data : data.filter((p) => p.status === activeTab);

  const handleAction = async (action: string, id: number, comment?: string) => {
    try {
      const api = paymentRequestsApi as any;
      if (api[action]) await api[action](id, comment);
      message.success('操作成功');
      fetch();
    } catch (err: any) {
      message.error(err?.response?.data?.message || '操作失败');
    }
  };

  const canApprove = (status: string, role: string) => {
    if (role === 'admin') return true;
    if (status === 'pending_leader' && role === 'leader') return true;
    if (status === 'pending_finance' && role === 'finance') return true;
    return false;
  };

  const handleConfirmPay = async (values: any) => {
    try {
      await paymentRequestsApi.confirmPay(viewItem.id, {
        amount: values.amount,
        paymentTime: values.paymentTime?.toISOString(),
      });
      message.success('付款确认成功');
      setPayModalOpen(false);
      setViewItem(null);
      fetch();
    } catch (err: any) {
      message.error(err?.response?.data?.message || '确认失败');
    }
  };

  const columns = [
    { title: '编号', dataIndex: 'code', key: 'code', width: 200 },
    { title: '项目', key: 'project', dataIndex: ['project', 'name'], ellipsis: true },
    { title: '事由', dataIndex: 'reason', ellipsis: true },
    { title: '金额', dataIndex: 'amount', render: (v: any) => `¥${Number(v || 0).toLocaleString()}` },
    { title: '创建人', dataIndex: ['createdBy', 'displayName'], width: 100 },
    { title: '创建时间', dataIndex: 'createdAt', width: 120, render: (v: string) => new Date(v).toLocaleDateString() },
    { title: '状态', dataIndex: 'status', width: 120, render: (s: string) => {
      const m = statusMap[s] || { color: 'default', label: s };
      return <Tag color={m.color}>{m.label}</Tag>;
    }},
    { title: '操作', key: 'action', width: 340, render: (_: any, record: any) => (
      <Space>
        <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => {
          setViewItem(record);
          request.get('/approval-history', { params: { entityType: 'payment-request', entityId: record.id } })
            .then((res: any) => setApprovalHistory(res.data || [])).catch(() => setApprovalHistory([]));
        }}>查看</Button>
        {record.status === 'draft' && (
          <Button type="link" size="small" icon={<SendOutlined />} onClick={() => handleAction('submit', record.id)}>提交</Button>
        )}
        {(record.status === 'pending_leader' || record.status === 'pending_finance') && (record.createdById === user?.id || user?.role === 'admin') && (
          <Button type="link" size="small" icon={<RollbackOutlined />} onClick={() => handleAction('withdraw', record.id)}>撤回</Button>
        )}
        {(user?.role === 'admin' || ((record.status === 'draft' || record.status === 'rejected') && record.createdById === user?.id)) && (
          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => {
            Modal.confirm({
              title: '确认删除',
              content: `确定要删除付款申请 ${record.code} 吗？`,
              onOk: () => handleAction('delete', record.id),
            });
          }}>删除</Button>
        )}
        {canApprove(record.status, user?.role || '') && (
          <>
            <Button type="link" size="small" icon={<CheckCircleOutlined />} style={{ color: '#52c41a' }} onClick={() => handleAction(record.status === 'pending_leader' ? 'approveLeader' : 'approveFinance', record.id)}>通过</Button>
            <Button type="link" size="small" icon={<CloseCircleOutlined />} danger onClick={() => handleAction('reject', record.id)}>驳回</Button>
          </>
        )}
      </Space>
    )},
  ];

  return (
    <div>
      <Card title="付款申请" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setFormOpen(true)}>新建申请</Button>}>
        <Tabs activeKey={activeTab} onChange={setActiveTab}
          items={[
            { key: 'all', label: '全部' }, { key: 'draft', label: '草稿' },
            { key: 'pending_leader', label: '领导审批' }, { key: 'pending_finance', label: '财务审批' },
            { key: 'approved', label: '已通过' }, { key: 'rejected', label: '已驳回' },
          ]}
        />
        <Table dataSource={filtered} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} />
      </Card>
      <PaymentForm open={formOpen} onClose={() => setFormOpen(false)} onSuccess={fetch} />
      <Modal title="付款申请详情" open={!!viewItem} onCancel={() => { setViewItem(null); setApprovalHistory([]); }} footer={null} width={720}>
        {viewItem && (
          <>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="编号" span={2}>{viewItem.code}</Descriptions.Item>
              <Descriptions.Item label="项目" span={2}>{viewItem.project?.name}</Descriptions.Item>
              <Descriptions.Item label="合同类型">{contractTypeLabels[viewItem.contractType] || viewItem.contractType}</Descriptions.Item>
              <Descriptions.Item label="合同编号">{viewItem.contractId || '-'}</Descriptions.Item>
              {viewItem.contractData && <ContractDataDisplay data={viewItem.contractData} />}
              <Descriptions.Item label="付款条款" span={2}>{viewItem.paymentTerms || '-'}</Descriptions.Item>
              <Descriptions.Item label="事由" span={2}>{viewItem.reason}</Descriptions.Item>
              <Descriptions.Item label="金额">¥{Number(viewItem.amount || 0).toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="创建人">{viewItem.createdBy?.displayName}</Descriptions.Item>
              <Descriptions.Item label="创建时间" span={2}>{new Date(viewItem.createdAt).toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="状态" span={2}>{statusMap[viewItem.status]?.label || viewItem.status}</Descriptions.Item>
              {viewItem.confirmations?.[0] && (
                <>
                  <Descriptions.Item label="付款确认金额">¥{Number(viewItem.confirmations[0].amount || 0).toLocaleString()}</Descriptions.Item>
                  <Descriptions.Item label="付款时间">{new Date(viewItem.confirmations[0].paymentTime).toLocaleString()}</Descriptions.Item>
                </>
              )}
            </Descriptions>
            {viewItem.status === 'approved' && !viewItem.confirmations?.length && (user?.role === 'finance' || user?.role === 'admin') && (
              <div style={{ marginTop: 16, textAlign: 'right' }}>
                <Button type="primary" icon={<DollarOutlined />} onClick={() => setPayModalOpen(true)}>确认付款</Button>
              </div>
            )}
            {approvalHistory.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <h4 style={{ marginBottom: 12 }}>审批记录</h4>
                <Timeline items={approvalHistory.map((h: any) => ({
                  color: h.action === 'approve' ? 'green' : h.action === 'reject' ? 'red' : 'gray',
                  children: (
                    <div>
                      <div style={{ fontWeight: 500 }}>{h.action === 'approve' ? '通过' : h.action === 'reject' ? '驳回' : h.action}</div>
                      <div style={{ fontSize: 13, color: '#666' }}>{h.approver?.displayName} · {new Date(h.createdAt).toLocaleString()}</div>
                      {h.comment && <div style={{ fontSize: 13, color: '#999' }}>备注：{h.comment}</div>}
                    </div>
                  ),
                }))} />
              </div>
            )}
          </>
        )}
      </Modal>
      <Modal title="确认付款" open={payModalOpen} onCancel={() => setPayModalOpen(false)} onOk={() => {
        const form = (window as any).__payForm;
        if (form) form.submit();
      }} width={500} destroyOnClose>
        <PayConfirmForm viewItem={viewItem} onSubmit={handleConfirmPay} />
      </Modal>
    </div>
  );
}

function ContractDataDisplay({ data }: { data: string }) {
  try {
    const items = JSON.parse(data);
    if (!items?.length) return null;
    return (
      <Descriptions.Item label="付款条目" span={2}>
        {items.map((d: any, i: number) => (
          <div key={i} style={{ padding: '2px 0' }}>{d.contractLabel} — ¥{Number(d.amount || 0).toLocaleString()}</div>
        ))}
      </Descriptions.Item>
    );
  } catch (_) { return null; }
}

function PayConfirmForm({ viewItem, onSubmit }: { viewItem: any; onSubmit: (values: any) => void }) {
  const [form] = Form.useForm();
  useEffect(() => {
    (window as any).__payForm = form;
    return () => { delete (window as any).__payForm; };
  }, [form]);
  return (
    <Form form={form} layout="vertical" onFinish={onSubmit} initialValues={{ amount: viewItem?.amount }}>
      <Form.Item name="amount" label="付款金额" rules={[{ required: true }]}>
        <InputNumber min={0} prefix="¥" style={{ width: '100%' }} />
      </Form.Item>
      <Form.Item name="paymentTime" label="付款时间" rules={[{ required: true }]}>
        <DatePicker showTime style={{ width: '100%' }} />
      </Form.Item>
    </Form>
  );
}

function PaymentForm({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [contractType, setContractType] = useState<string>();
  const [contracts, setContracts] = useState<any[]>([]);
  const [confirmGroups, setConfirmGroups] = useState<any[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<any[]>([]);
  const [remainingInfo, setRemainingInfo] = useState<any>(null);

  const projectId = Form.useWatch('projectId', form);

  useEffect(() => {
    if (open) {
      request.get('/projects').then((res: any) => setProjects(res.data || []));
      form.resetFields();
      setContractType(undefined);
      setContracts([]);
      /* setSelectedConfirm */ (null);
      setConfirmGroups([]);
      setSelectedGroups([]);
      setRemainingInfo(null);
    }
  }, [open, form]);

  useEffect(() => {
    if (contractType && projectId) {
      const url = contractType === 'purchase_confirm' ? '/purchase-confirms' : '/labor-contracts';
      request.get(url, { params: { projectId } }).then((res: any) => {
        const approved = (res.data || []).filter((c: any) => c.status === 'approved');
        setContracts(approved);
      }).catch(() => setContracts([]));
    } else {
      setContracts([]);
    }
  }, [contractType, projectId]);

  const fetchRemaining = async (type: string, id: number) => {
    try {
      const res: any = await request.post('/payment-requests/remaining', { contractType: type, contractId: id });
      setRemainingInfo(res.data || { totalAmount: 0, totalPaid: 0, remaining: 0 });
    } catch (_) {
      setRemainingInfo(null);
    }
  };

  const handleConfirmSelect = async (confirmId: number) => {
    if (!confirmId) {
      /* setSelectedConfirm */ (null);
      setConfirmGroups([]);
      setSelectedGroups([]);
      setRemainingInfo(null);
      return;
    }
    const res: any = await request.get(`/purchase-confirms/${confirmId}`).catch(() => { message.error('加载采购确认单详情失败'); return null; });
    if (!res) return;
    const data = res.data || res;
    /* setSelectedConfirm */ (data);
    let groups: any[] = [];
    try { groups = JSON.parse(data.groupData || '[]'); } catch (_) { groups = []; }
    setConfirmGroups(groups);
    setSelectedGroups(groups.map((g: any, i: number) => ({
      key: `g_${i}`,
      contractLabel: `合同${i + 1} - ${g.supplierName} (¥${Number(g.contractAmount || 0).toLocaleString()})`,
      supplierName: g.supplierName,
      amount: Number(g.contractAmount || 0),
    })));
    fetchRemaining('purchase_confirm', confirmId);
  };

  const toggleGroup = (key: string) => {
    setSelectedGroups(selectedGroups.filter((g) => g.key !== key));
  };

  const updateGroupAmount = (key: string, amount: number) => {
    setSelectedGroups(selectedGroups.map((g) => g.key === key ? { ...g, amount } : g));
  };

  const totalAmount = selectedGroups.reduce((sum, g) => sum + (g.amount || 0), 0);

  const handleFinish = async (values: any) => {
    if (contractType === 'purchase_confirm') {
      const validGroups = selectedGroups.filter((g) => g.amount > 0);
      if (validGroups.length === 0) { message.error('请至少选择一个合同并输入金额'); return; }
    }
    const finalAmount = contractType === 'purchase_confirm' ? totalAmount : values.amount;
    if (remainingInfo && finalAmount > remainingInfo.remaining) {
      message.error(`申请金额不能超过剩余可申请金额 ¥${remainingInfo.remaining.toLocaleString()}`);
      return;
    }
    setLoading(true);
    try {
      await paymentRequestsApi.create({
        ...values,
        contractData: contractType === 'purchase_confirm' ? selectedGroups.filter((g) => g.amount > 0) : undefined,
        amount: finalAmount,
      });
      message.success('创建成功');
      onSuccess();
      onClose();
    } catch (err: any) {
      message.error(err?.response?.data?.message || '创建失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="新建付款申请" open={open} onCancel={onClose} onOk={() => form.submit()} confirmLoading={loading} width={700} destroyOnClose>
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item name="projectId" label="关联项目" rules={[{ required: true, message: '请选择项目' }]}>
          <Select placeholder="选择项目" options={projects.map((p: any) => ({ value: p.id, label: `${p.name} (${p.code})` }))} />
        </Form.Item>
        <Form.Item name="contractType" label="合同类型" rules={[{ required: true }]}>
          <Select placeholder="选择合同类型" onChange={(val) => { setContractType(val as string); form.setFieldsValue({ contractId: undefined }); setRemainingInfo(null); }}
            options={[
              { value: 'purchase_confirm', label: '采购合同' },
              { value: 'labor_contract', label: '劳务合同' },
            ]}
          />
        </Form.Item>

        {contractType === 'purchase_confirm' && (
          <>
            <Form.Item name="contractId" label="采购确认单" rules={[{ required: true, message: '请选择采购确认单' }]}>
              <Select placeholder="选择已审批的采购确认单" onChange={handleConfirmSelect}
                options={contracts.map((c: any) => ({ value: c.id, label: `${c.code} - ¥${Number(c.totalAmount || 0).toLocaleString()}` }))}
              />
            </Form.Item>
            {remainingInfo && (
              <div style={{ marginBottom: 12, padding: '8px 12px', background: '#fff7e6', borderRadius: 4, fontSize: 13 }}>
                <div style={{ fontWeight: 500, marginBottom: 4 }}>付款汇总</div>
                {remainingInfo.contractItems?.length > 0 ? (
                  remainingInfo.contractItems.map((item: any, idx: number) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: 12 }}>
                      <span>{item.label}</span>
                      <span>
                        已申请 <strong>¥{Number(item.paid).toLocaleString()}</strong>
                        ｜ 剩余 <strong style={{ color: '#1890ff' }}>¥{Number(item.remaining).toLocaleString()}</strong>
                      </span>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: 12 }}>
                    总额 ¥{Number(remainingInfo.totalAmount).toLocaleString()}
                    ｜ 已申请 ¥{Number(remainingInfo.totalPaid).toLocaleString()}
                    ｜ 剩余 <strong style={{ color: '#1890ff' }}>¥{Number(remainingInfo.remaining).toLocaleString()}</strong>
                  </div>
                )}
              </div>
            )}
            {confirmGroups.length > 0 && (
              <div style={{ marginBottom: 16, padding: 12, border: '1px solid #f0f0f0', borderRadius: 6 }}>
                <div style={{ fontWeight: 500, marginBottom: 8 }}>选择付款合同条目：</div>
                {confirmGroups.map((g: any, i: number) => {
                  const key = `g_${i}`;
                  const sel = selectedGroups.find((s) => s.key === key);
                  const isSelected = !!sel;
                  return (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, padding: 6, background: isSelected ? '#f6ffed' : '#fafafa', borderRadius: 4 }}>
                      <input type="checkbox" checked={isSelected} onChange={() => {
                        if (isSelected) { toggleGroup(key); }
                        else { setSelectedGroups([...selectedGroups, { key, contractLabel: `合同${i + 1} - ${g.supplierName}`, supplierName: g.supplierName, amount: Number(g.contractAmount || 0) }]); }
                      }} />
                      <span style={{ flex: 1, fontSize: 13 }}>合同{i + 1} - {g.supplierName}</span>
                      <span style={{ fontSize: 12, color: '#999', marginRight: 8 }}>合同金额 ¥{Number(g.contractAmount || 0).toLocaleString()}</span>
                      {isSelected && (
                        <InputNumber prefix="¥" size="small" style={{ width: 160 }} min={0} value={sel.amount} onChange={(v) => updateGroupAmount(key, v || 0)} />
                      )}
                    </div>
                  );
                })}
                <div style={{ textAlign: 'right', fontWeight: 600, marginTop: 8, fontSize: 15, color: totalAmount > (remainingInfo?.remaining || Infinity) ? '#ff4d4f' : '#262626' }}>
                  本次申请合计：¥{totalAmount.toLocaleString()}
                  {remainingInfo && totalAmount > remainingInfo.remaining && (
                    <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 8 }}>（超出剩余可申请金额）</span>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {contractType === 'labor_contract' && (
          <>
            <Form.Item name="contractId" label="劳务合同" rules={[{ required: true, message: '请选择劳务合同' }]}>
              <Select placeholder="选择已审批的劳务合同" onChange={(val) => val && fetchRemaining('labor_contract', val as number)}
                options={contracts.map((c: any) => ({
                  value: c.id, label: `${c.code} - ${c.contractorName || ''} (¥${Number(c.amount).toLocaleString()})`,
                }))}
              />
            </Form.Item>
            {remainingInfo && (
              <div style={{ marginBottom: 12, padding: '8px 12px', background: '#fff7e6', borderRadius: 4, fontSize: 13 }}>
                {
                  remainingInfo.visaAdjustedAmount !== undefined
                    ? <>原合同 ¥{Number(remainingInfo.originalAmount).toLocaleString()} ｜ 签证调整 ¥{Number(remainingInfo.visaAdjustedAmount - remainingInfo.originalAmount).toLocaleString()} ｜ 调整后总额 <strong>¥{Number(remainingInfo.totalAmount).toLocaleString()}</strong></>
                    : <>合同总额 ¥{Number(remainingInfo.totalAmount).toLocaleString()}</>
                } ｜ 已申请付款 ¥{Number(remainingInfo.totalPaid).toLocaleString()} ｜
                <span style={{ color: '#1890ff', fontWeight: 600 }}> 剩余可申请 ¥{Number(remainingInfo.remaining).toLocaleString()}</span>
              </div>
            )}
            <Form.Item name="amount" label="付款金额" rules={[{ required: true, message: '请输入金额' }]}>
              <InputNumber min={0} prefix="¥" style={{ width: '100%' }} placeholder="请输入付款金额"
                max={remainingInfo?.remaining} />
            </Form.Item>
          </>
        )}

        <Form.Item name="paymentTerms" label="付款条款">
          <Input.TextArea rows={2} placeholder="输入付款条款（可选）" />
        </Form.Item>
        <Form.Item name="reason" label="付款事由" rules={[{ required: true, message: '请输入付款事由' }]}>
          <Input.TextArea rows={2} placeholder="请输入付款事由" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
