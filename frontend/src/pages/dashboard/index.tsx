import { useState, useEffect } from 'react';
import { Card, Col, Row, Progress, Tag, Button, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  ClockCircleOutlined,
  ProjectOutlined,
  DollarOutlined,
  FileTextOutlined,
  PlusOutlined,
  ShoppingCartOutlined,
  CarryOutOutlined,
  FundOutlined,
  RightOutlined,
  RiseOutlined,
  FallOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import styles from './dashboard.module.css';

const statusColors: Record<string, string> = {
  pending: '#faad14',
  approved: '#52c41a',
  urgent: '#ff4d4f',
};

const statusLabels: Record<string, string> = {
  pending: '待审批',
  approved: '已通过',
  urgent: '紧急',
};

const mockApprovals = [
  { id: 1, title: '采购申请', project: 'XX数据中心集成项目', status: 'pending', time: '10分钟前' },
  { id: 2, title: '费用申请', project: 'YY弱电工程项目', status: 'urgent', time: '25分钟前' },
  { id: 3, title: '供货通知单', project: 'XX数据中心集成项目', status: 'pending', time: '1小时前' },
  { id: 4, title: '材料领用单', project: 'ZZ机房建设项目', status: 'pending', time: '2小时前' },
  { id: 5, title: '工程量变更', project: 'YY弱电工程项目', status: 'pending', time: '3小时前' },
];

const mockProjects = [
  { name: 'XX数据中心集成项目', percent: 80, type: '集成', pm: '王工', deadline: '2026-08-15' },
  { name: 'YY弱电工程项目', percent: 45, type: '集成', pm: '李工', deadline: '2026-10-30' },
  { name: 'ZZ机房建设项目', percent: 20, type: '集成', pm: '赵工', deadline: '2026-12-20' },
];

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  const hour = time.getHours();
  const greeting = hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好';
  const dateStr = `${time.getFullYear()}/${String(time.getMonth() + 1).padStart(2, '0')}/${String(time.getDate()).padStart(2, '0')}`;
  const dayStr = `星期${weekDays[time.getDay()]}`;
  const timeStr = time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className={styles.dashboard}>
      {/* Welcome Banner */}
      <div className={styles.welcomeBanner}>
        <div className={styles.welcomeLeft}>
          <div className={styles.welcomeGreeting}>
            {greeting}，{user?.displayName}
          </div>
          <div className={styles.welcomeSub}>
            今天是 {dateStr} {dayStr}，有 5 项待审批事项等待处理
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
          <Card className={styles.kpiCard} bodyStyle={{ padding: '20px 24px' }}>
            <div className={styles.kpiContent}>
              <div className={styles.kpiInfo}>
                <div className={styles.kpiLabel}>待审批</div>
                <div className={styles.kpiValue}>
                  5<span className={styles.kpiUnit}>项</span>
                </div>
                <div className={styles.kpiFooter}>
                  <RiseOutlined className={styles.trendUp} /> 较昨日 +2
                </div>
              </div>
              <div className={styles.kpiIconWrap} style={{ background: '#fff7e6', color: '#fa8c16' }}>
                <ClockCircleOutlined />
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card className={styles.kpiCard} bodyStyle={{ padding: '20px 24px' }}>
            <div className={styles.kpiContent}>
              <div className={styles.kpiInfo}>
                <div className={styles.kpiLabel}>进行中项目</div>
                <div className={styles.kpiValue}>
                  3<span className={styles.kpiUnit}>个</span>
                </div>
                <div className={styles.kpiFooter}>
                  <RiseOutlined className={styles.trendUp} /> 本月 +1
                </div>
              </div>
              <div className={styles.kpiIconWrap} style={{ background: '#e6f7ff', color: '#1890ff' }}>
                <ProjectOutlined />
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card className={styles.kpiCard} bodyStyle={{ padding: '20px 24px' }}>
            <div className={styles.kpiContent}>
              <div className={styles.kpiInfo}>
                <div className={styles.kpiLabel}>本月回款</div>
                <div className={styles.kpiValue}>
                  128<span className={styles.kpiUnit}>万元</span>
                </div>
                <div className={styles.kpiFooter}>
                  <RiseOutlined className={styles.trendUp} /> 完成率 68%
                </div>
              </div>
              <div className={styles.kpiIconWrap} style={{ background: '#f6ffed', color: '#52c41a' }}>
                <FundOutlined />
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card className={styles.kpiCard} bodyStyle={{ padding: '20px 24px' }}>
            <div className={styles.kpiContent}>
              <div className={styles.kpiInfo}>
                <div className={styles.kpiLabel}>本月支出</div>
                <div className={styles.kpiValue}>
                  86<span className={styles.kpiUnit}>万元</span>
                </div>
                <div className={styles.kpiFooter}>
                  <FallOutlined className={styles.trendDown} /> 环比 -12%
                </div>
              </div>
              <div className={styles.kpiIconWrap} style={{ background: '#fff1f0', color: '#ff4d4f' }}>
                <DollarOutlined />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Two-column content: Pending Approvals + Project Progress */}
      <Row gutter={[16, 16]} className={styles.contentRow}>
        <Col xs={24} md={14}>
          <Card className={styles.sectionCard} bodyStyle={{ padding: '20px 24px' }}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>
                <FileTextOutlined style={{ color: '#2563eb' }} /> 待办审批
              </div>
              <span className={styles.sectionMore}>查看全部 <RightOutlined style={{ fontSize: 11 }} /></span>
            </div>
            <ul className={styles.approvalList}>
              {mockApprovals.map((item) => (
                <li key={item.id} className={styles.approvalItem}>
                  <div className={styles.approvalLeft}>
                    <span className={styles.approvalDot} style={{ background: statusColors[item.status] || '#d9d9d9' }} />
                    <span className={styles.approvalTitle}>{item.title}</span>
                    <span className={styles.approvalProject}>{item.project}</span>
                    <Tag color={statusColors[item.status]} style={{ fontSize: 11, lineHeight: '18px', padding: '0 6px' }}>
                      {statusLabels[item.status] || item.status}
                    </Tag>
                  </div>
                  <span className={styles.approvalTime}>{item.time}</span>
                </li>
              ))}
            </ul>
          </Card>
        </Col>
        <Col xs={24} md={10}>
          <Card className={styles.sectionCard} bodyStyle={{ padding: '20px 24px' }}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>
                <CarryOutOutlined style={{ color: '#2563eb' }} /> 项目进展
              </div>
            </div>
            <ul className={styles.projectList}>
              {mockProjects.map((p, i) => (
                <li key={i} className={styles.projectItem}>
                  <div className={styles.projectHeader}>
                    <span className={styles.projectName}>{p.name}</span>
                    <span className={styles.projectPercent}>{p.percent}%</span>
                  </div>
                  <Progress
                    percent={p.percent}
                    strokeColor={p.percent >= 80 ? '#52c41a' : p.percent >= 40 ? '#2563eb' : '#faad14'}
                    trailColor="#f0f0f0"
                    size="small"
                    showInfo={false}
                    className={styles.projectBar}
                  />
                  <div className={styles.projectMeta}>
                    <span>{p.type} · {p.pm}</span>
                    <span>截止 {p.deadline}</span>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </Col>
      </Row>

      {/* Quick Actions */}
      <Card className={styles.quickActions} bodyStyle={{ padding: '20px 24px' }}>
        <div className={styles.sectionHeader} style={{ marginBottom: 16, borderBottom: '1px solid #f5f5f5', paddingBottom: 12 }}>
          <div className={styles.sectionTitle}>
            <PlusOutlined style={{ color: '#2563eb' }} /> 快捷操作
          </div>
        </div>
        <div className={styles.actionsGrid}>
          <div className={styles.actionBtn} onClick={() => navigate('/projects')}>
            <ProjectOutlined className={styles.actionIcon} />
            新建项目
          </div>
          <div className={styles.actionBtn} onClick={() => message.info('功能开发中')}>
            <ShoppingCartOutlined className={styles.actionIcon} />
            发起采购
          </div>
          <div className={styles.actionBtn} onClick={() => message.info('功能开发中')}>
            <DollarOutlined className={styles.actionIcon} />
            录入回款
          </div>
          <div className={styles.actionBtn} onClick={() => message.info('功能开发中')}>
            <FileTextOutlined className={styles.actionIcon} />
            费用申请
          </div>
        </div>
      </Card>
    </div>
  );
}
