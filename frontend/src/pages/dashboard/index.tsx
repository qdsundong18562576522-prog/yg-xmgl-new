import { useState, useEffect } from 'react';
import { Card, Col, Row, Tag, Spin, Skeleton } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  ClockCircleOutlined,
  ProjectOutlined,
  DollarOutlined,
  FileTextOutlined,
  PlusOutlined,
  ShoppingCartOutlined,
  FundOutlined,
  CarryOutOutlined,
  RightOutlined,
  RiseOutlined,
  FallOutlined,
} from '@ant-design/icons';
import { Column } from '@ant-design/charts';
import { useAuthStore } from '../../stores/authStore';
import { dashboardApi } from '../../api/dashboard';
import styles from './dashboard.module.css';

const statusColors: Record<string, string> = {
  pending: '#faad14',
  pending_pm: '#faad14',
  pending_leader: '#faad14',
  pending_purchaser: '#faad14',
  pending_finance: '#faad14',
  approved: '#52c41a',
  urgent: '#ff4d4f',
  overdue: '#ff4d4f',
  active: '#2563eb',
};

const statusLabels: Record<string, string> = {
  pending: '待审批',
  pending_pm: '待PM审批',
  pending_leader: '待领导审批',
  pending_purchaser: '待采购审批',
  pending_finance: '待财务审批',
  approved: '已通过',
  urgent: '紧急',
};

const entityRoutes: Record<string, string> = {
  project: '/projects',
  'purchase-request': '/purchases/requests',
  'inquiry-order': '/purchases/inquiries',
  'purchase-confirm': '/purchases/confirms',
  'delivery-notice': '/purchases/delivery',
  'stock-out': '/inventory/stock-out',
  'material-requisition': '/inventory/requisitions',
  'expense-request': '/expenses/requests',
  reimbursement: '/expenses/reimbursements',
  'contract-variation': '/projects/variations',
  'labor-contract': '/labor/contracts',
  'labor-visa': '/labor/visas',
  'payment-request': '/finance/payment-requests',
};

function formatRelativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}

function formatAmount(val: number, unit = '万元') {
  const wan = val / 10000;
  return `${wan.toFixed(wan < 1 ? 2 : 1)}${unit}`;
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [trend, setTrend] = useState<any[]>([]);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, approvalsRes, projectsRes, trendRes]: any[] =
          await Promise.all([
            dashboardApi.getStats(),
            dashboardApi.getPendingApprovals(),
            dashboardApi.getProjectProgress(),
            dashboardApi.getMonthlyTrend(),
          ]);
        setStats(statsRes.data || statsRes);
        setApprovals(approvalsRes.data || approvalsRes);
        setProjects(projectsRes.data || projectsRes);
        setTrend(trendRes.data || trendRes);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  const hour = time.getHours();
  const greeting = hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好';
  const dateStr = `${time.getFullYear()}/${String(time.getMonth() + 1).padStart(2, '0')}/${String(time.getDate()).padStart(2, '0')}`;
  const dayStr = `星期${weekDays[time.getDay()]}`;
  const timeStr = time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // Chart data format
  const chartData = trend.flatMap((t: any) => [
    { month: t.month, type: '回款', value: t.receivable / 10000 },
    { month: t.month, type: '支出', value: t.expense / 10000 },
  ]);

  const chartConfig = {
    data: chartData,
    xField: 'month',
    yField: 'value',
    seriesField: 'type',
    isGroup: true,
    columnStyle: { radius: [4, 4, 0, 0] },
    label: {
      position: 'top' as const,
      formatter: (d: any) => d.value > 0 ? d.value.toFixed(1) : '',
      style: { fontSize: 11 },
    },
    color: ({ type }: any) => (type === '回款' ? '#52c41a' : '#1890ff'),
    legend: { position: 'top' as const },
    yAxis: {
      title: { text: '万元' },
    },
  };

  const quickActions = [
    { label: '新建项目', icon: <ProjectOutlined />, path: '/projects' },
    { label: '发起采购', icon: <ShoppingCartOutlined />, path: '/purchases/requests' },
    { label: '录入回款', icon: <FundOutlined />, path: '/finance/receivables' },
    { label: '费用申请', icon: <FileTextOutlined />, path: '/expenses/requests' },
  ];

  return (
    <div className={styles.dashboard}>
      {/* Welcome Banner */}
      <div className={styles.welcomeBanner}>
        <div className={styles.welcomeLeft}>
          <div className={styles.welcomeGreeting}>
            {greeting}，{user?.displayName}
          </div>
          <div className={styles.welcomeSub}>
            今天是 {dateStr} {dayStr}
            {stats ? `，有 ${stats.pendingApprovalCount} 项待审批事项等待处理` : ''}
          </div>
        </div>
        <div className={styles.welcomeRight}>
          <div className={styles.welcomeDate}>{dateStr} {dayStr}</div>
          <div className={styles.welcomeTime}>{timeStr}</div>
        </div>
      </div>

      {/* KPI Cards */}
      <Row gutter={[16, 16]} className={styles.kpiRow}>
        <Col xs={12} sm={12} md={6}>
          <Card className={styles.kpiCard} styles={{ body: { padding: '20px 24px' } }}>
            {loading ? <Skeleton active paragraph={false} /> : (
              <div className={styles.kpiContent}>
                <div className={styles.kpiInfo}>
                  <div className={styles.kpiLabel}>待审批</div>
                  <div className={styles.kpiValue}>
                    {stats?.pendingApprovalCount}<span className={styles.kpiUnit}>项</span>
                  </div>
                  <div className={styles.kpiFooter}>
                    <RiseOutlined className={styles.trendUp} />
                  </div>
                </div>
                <div className={styles.kpiIconWrap} style={{ background: '#fff7e6', color: '#fa8c16' }}>
                  <ClockCircleOutlined />
                </div>
              </div>
            )}
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card className={styles.kpiCard} styles={{ body: { padding: '20px 24px' } }}>
            {loading ? <Skeleton active paragraph={false} /> : (
              <div className={styles.kpiContent}>
                <div className={styles.kpiInfo}>
                  <div className={styles.kpiLabel}>进行中项目</div>
                  <div className={styles.kpiValue}>
                    {stats?.activeProjectCount}<span className={styles.kpiUnit}>个</span>
                  </div>
                  <div className={styles.kpiFooter}>
                    <RiseOutlined className={styles.trendUp} /> 共 {stats?.totalProjectCount} 个项目
                  </div>
                </div>
                <div className={styles.kpiIconWrap} style={{ background: '#e6f7ff', color: '#1890ff' }}>
                  <ProjectOutlined />
                </div>
              </div>
            )}
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card className={styles.kpiCard} styles={{ body: { padding: '20px 24px' } }}>
            {loading ? <Skeleton active paragraph={false} /> : (
              <div className={styles.kpiContent}>
                <div className={styles.kpiInfo}>
                  <div className={styles.kpiLabel}>本月回款</div>
                  <div className={styles.kpiValue}>
                    {formatAmount(stats?.monthlyReceivable || 0)}<span className={styles.kpiUnit}></span>
                  </div>
                  <div className={styles.kpiFooter}>
                    {stats?.lastMonthReceivable ? (
                      <><RiseOutlined className={styles.trendUp} /> 上月 {formatAmount(stats.lastMonthReceivable)}</>
                    ) : <span style={{ color: '#8c8c8c' }}>暂无数据</span>}
                  </div>
                </div>
                <div className={styles.kpiIconWrap} style={{ background: '#f6ffed', color: '#52c41a' }}>
                  <FundOutlined />
                </div>
              </div>
            )}
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card className={styles.kpiCard} styles={{ body: { padding: '20px 24px' } }}>
            {loading ? <Skeleton active paragraph={false} /> : (
              <div className={styles.kpiContent}>
                <div className={styles.kpiInfo}>
                  <div className={styles.kpiLabel}>本月支出</div>
                  <div className={styles.kpiValue}>
                    {formatAmount(stats?.monthlyExpense || 0)}<span className={styles.kpiUnit}></span>
                  </div>
                  <div className={styles.kpiFooter}>
                    {stats?.lastMonthExpense ? (
                      <><FallOutlined className={styles.trendDown} /> 上月 {formatAmount(stats.lastMonthExpense)}</>
                    ) : <span style={{ color: '#8c8c8c' }}>暂无数据</span>}
                  </div>
                </div>
                <div className={styles.kpiIconWrap} style={{ background: '#fff1f0', color: '#ff4d4f' }}>
                  <DollarOutlined />
                </div>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* Monthly Trend Chart */}
      {!loading && chartData.length > 0 && (
        <Card
          className={styles.sectionCard}
          styles={{ body: { padding: '20px 24px' } }}
          style={{ marginBottom: 24 }}
        >
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitle}>
              <FundOutlined style={{ color: '#2563eb' }} /> 月度回款 / 支出趋势
            </div>
          </div>
          <div style={{ height: 300 }}>
            <Column {...chartConfig} />
          </div>
        </Card>
      )}

      {/* Two-column content: Pending Approvals + Project Progress */}
      <Row gutter={[16, 16]} className={styles.contentRow}>
        <Col xs={24} md={14}>
          <Card className={styles.sectionCard} styles={{ body: { padding: '20px 24px' } }}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>
                <FileTextOutlined style={{ color: '#2563eb' }} /> 待办审批
              </div>
            </div>
            {loading ? <Skeleton active /> : approvals.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: '#8c8c8c' }}>暂无待审批事项</div>
            ) : (
              <ul className={styles.approvalList}>
                {approvals.slice(0, 10).map((item: any, i: number) => (
                  <li
                    key={`${item.entityType}-${item.id}-${i}`}
                    className={styles.approvalItem}
                    onClick={() => {
                      const route = entityRoutes[item.entityType];
                      if (route) navigate(route);
                    }}
                    style={{ cursor: entityRoutes[item.entityType] ? 'pointer' : 'default' }}
                  >
                    <div className={styles.approvalLeft}>
                      <span
                        className={styles.approvalDot}
                        style={{ background: statusColors[item.status] || '#d9d9d9' }}
                      />
                      <span className={styles.approvalTitle}>{item.title}</span>
                      {item.projectName && (
                        <span className={styles.approvalProject}>{item.projectName}</span>
                      )}
                      <Tag color={statusColors[item.status]} style={{ fontSize: 11, lineHeight: '18px', padding: '0 6px' }}>
                        {statusLabels[item.status] || '待审批'}
                      </Tag>
                    </div>
                    <span className={styles.approvalTime}>
                      {item.createdAt ? formatRelativeTime(item.createdAt) : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </Col>
        <Col xs={24} md={10}>
          <Card className={styles.sectionCard} styles={{ body: { padding: '20px 24px' } }}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>
                <CarryOutOutlined style={{ color: '#2563eb' }} /> 项目进展
              </div>
            </div>
            {loading ? <Skeleton active /> : projects.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: '#8c8c8c' }}>暂无进行中项目</div>
            ) : (
              <ul className={styles.projectList}>
                {projects.map((p: any, i: number) => (
                  <li
                    key={i}
                    className={styles.projectItem}
                    onClick={() => navigate(`/projects`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className={styles.projectHeader}>
                      <span className={styles.projectName}>{p.name}</span>
                      <span className={styles.projectPercent}>
                        {p.status === 'overdue' ? '已逾期' : `${p.percent}%`}
                      </span>
                    </div>
                    <div
                      className={styles.projectBar}
                      style={{ marginBottom: 4 }}
                    >
                      <div
                        style={{
                          height: 8,
                          borderRadius: 4,
                          background: '#f0f0f0',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.min(p.percent, 100)}%`,
                            height: '100%',
                            borderRadius: 4,
                            background: p.status === 'overdue'
                              ? '#ff4d4f'
                              : p.percent >= 80
                                ? '#52c41a'
                                : p.percent >= 40
                                  ? '#2563eb'
                                  : '#faad14',
                            transition: 'width 0.3s',
                          }}
                        />
                      </div>
                    </div>
                    <div className={styles.projectMeta}>
                      <span>{p.type} · {p.pm}</span>
                      <span>截止 {p.deadline}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </Col>
      </Row>

      {/* Quick Actions */}
      <Card className={styles.quickActions} styles={{ body: { padding: '20px 24px' } }}>
        <div className={styles.sectionHeader} style={{ marginBottom: 16, borderBottom: '1px solid #f5f5f5', paddingBottom: 12 }}>
          <div className={styles.sectionTitle}>
            <PlusOutlined style={{ color: '#2563eb' }} /> 快捷操作
          </div>
        </div>
        <div className={styles.actionsGrid}>
          {quickActions.map((action) => (
            <div
              key={action.label}
              className={styles.actionBtn}
              onClick={() => navigate(action.path)}
            >
              {action.icon}
              {action.label}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
