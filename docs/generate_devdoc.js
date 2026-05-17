const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, TableOfContents,
  HeadingLevel, BorderStyle, WidthType, ShadingType, PageNumber, PageBreak,
} = require("docx");

const b = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const bs = { top: b, bottom: b, left: b, right: b };
const cm = { top: 60, bottom: 60, left: 100, right: 100 };

function h1(t) { return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 200 }, children: [new TextRun({ text: t, bold: true, size: 32, font: "Arial", color: "1a365d" })] }); }
function h2(t) { return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 160 }, children: [new TextRun({ text: t, bold: true, size: 28, font: "Arial", color: "2563eb" })] }); }
function h3(t) { return new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 120 }, children: [new TextRun({ text: t, bold: true, size: 24, font: "Arial" })] }); }
function p(t, o = {}) { return new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: t, size: 22, font: "Arial", ...o })] }); }
function bp(t) { return p(t, { bold: true }); }
function bl(t, l = 0) { return new Paragraph({ numbering: { reference: "bullets", level: l }, spacing: { after: 60 }, children: [new TextRun({ text: t, size: 22, font: "Arial" })] }); }
function mt(hdrs, rows, cw) {
  const tw = cw.reduce((a, b) => a + b, 0);
  return new Table({ width: { size: tw, type: WidthType.DXA }, columnWidths: cw, rows: [
    new TableRow({ children: hdrs.map((h, i) => new TableCell({ borders: bs, width: { size: cw[i], type: WidthType.DXA }, margins: cm,
      shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
      children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 20, font: "Arial" })] })] })) }),
    ...rows.map(r => new TableRow({ children: r.map((c, i) => new TableCell({ borders: bs, width: { size: cw[i], type: WidthType.DXA }, margins: cm,
      children: [new Paragraph({ children: [new TextRun({ text: String(c), size: 20, font: "Arial" })] })] })) })),
  ]});
}
function pb() { return new Paragraph({ children: [new PageBreak()] }); }

const hdr = new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "扬光工程管理系统 · 项目开发文档", size: 18, font: "Arial", color: "888888" })] })] });
const ftr = new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
  new TextRun({ text: "第 ", size: 18, font: "Arial", color: "888888" }),
  new TextRun({ children: [PageNumber.CURRENT], size: 18, font: "Arial", color: "888888" }),
  new TextRun({ text: " 页", size: 18, font: "Arial", color: "888888" }),
]})] });

const sec = (ch) => ({ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } }, headers: { default: hdr }, footers: { default: ftr }, children: ch });

const sections = [
  // ====== Cover ======
  { properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } }, children: [
    ...[0,0,0,0,0].map(() => new Paragraph({ spacing: { after: 60 }, children: [] })),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: "扬光工程管理系统", size: 52, bold: true, font: "Arial", color: "1a365d" })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 600 }, children: [new TextRun({ text: "项目开发文档", size: 40, font: "Arial", color: "2563eb" })] }),
    ...[0,0].map(() => new Paragraph({ spacing: { after: 60 }, children: [] })),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: "文档版本：V2.0", size: 24, font: "Arial", color: "666666" })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: "编制日期：2026年5月", size: 24, font: "Arial", color: "666666" })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "青岛扬光科技有限公司", size: 24, font: "Arial", color: "666666" })] }),
  ]},

  // ====== TOC ======
  sec([
    h1("目录"),
    new TableOfContents("目录", { hyperlink: true, headingStyleRange: "1-3" }),
    pb(),
  ]),

  // ====== 1. 项目概述 ======
  sec([
    h1("一、项目概述"),
    h2("1.1 项目背景"),
    p("扬光工程管理系统（YG-XMGL）是为青岛扬光科技有限公司量身定制的工程项目全生命周期管理平台。系统旨在解决传统工程管理模式中信息孤岛严重、审批流程冗长、成本核算不透明等核心痛点，实现从项目立项到竣工结算的全链路数字化管理。"),
    h2("1.2 建设目标"),
    bl("建立统一的工程项目信息化管理平台"),
    bl("实现项目全流程数字化审批，提升管理效率"),
    bl("精细化核算项目成本，实时掌握项目利润"),
    bl("多角色权限管理，确保数据安全和业务合规"),
    h2("1.3 项目规模"),
    mt(["指标", "数值"], [
      ["后端模块数量", "27 个"],
      ["前端页面数量", "12 个模块，30+ 页面"],
      ["数据库表数量", "39 个"],
      ["后端代码量", "107 个 TypeScript 文件"],
      ["前端代码量", "59 个 TypeScript/TSX 文件"],
      ["API 端点数量", "100+"],
    ], [3000, 6360]),
    pb(),
  ]),

  // ====== 2. 技术架构 ======
  sec([
    h1("二、技术架构"),
    h2("2.1 技术栈"),
    mt(["层次", "技术", "版本"], [
      ["前端框架", "React + Vite", "React 19 / Vite 8"],
      ["UI 组件库", "Ant Design", "v6"],
      ["状态管理", "Zustand", "-"],
      ["数据请求", "Axios + TanStack Query", "-"],
      ["后端框架", "NestJS", "v11"],
      ["ORM", "Prisma", "v7"],
      ["数据库", "PostgreSQL", "v16"],
      ["认证方式", "JWT Token", "-"],
      ["图表库", "@ant-design/charts", "-"],
    ], [2000, 3600, 3760]),
    pb(),
    h2("2.2 系统架构图"),
    bp("前端（React + Vite）"),
    bl("Ant Design 组件库 + 自定义组件"),
    bl("Zustand 状态管理（authStore）"),
    bl("Axios HTTP 封装（请求拦截 + Token 注入）"),
    bl("TanStack Query 数据缓存"),
    bp("后端（NestJS）"),
    bl("模块化架构：27 个业务模块"),
    bl("JWT 认证 + 角色权限守卫（RolesGuard）"),
    bl("class-validator DTO 校验"),
    bl("Prisma ORM + PostgreSQL"),
    bp("部署方式"),
    bl("后端编译后直接运行（Node.js）"),
    bl("前端编译为静态文件，由后端统一托管"),
    bl("统一端口 12404，API 前缀 /api/v1"),
    pb(),
    h2("2.3 数据库设计"),
    p("系统共 39 个数据模型，主要分为以下分组："),
    mt(["分组", "模型"], [
      ["用户与认证", "User, UserRole(enum)"],
      ["项目管理", "Project, ProjectMember, ContractVariation, VariationItem"],
      ["采购管理", "PurchaseRequest(+Item), InquiryOrder(+Item), PurchaseConfirm(+Item), DeliveryNotice(+Item)"],
      ["库存管理", "MaterialLib, CompanyInventory(+Log), ProjectInventory(+Log), StockIn(+Item), StockOut(+Item), MaterialRequisition(+Item)"],
      ["劳务管理", "LaborContract, LaborVisa"],
      ["费用管理", "ProjectExpenseRequest, Reimbursement"],
      ["财务管理", "PaymentRequest, PaymentConfirmation, ProjectReceivable"],
      ["成本调整", "CostAdjustment"],
      ["台账", "ProjectLedger"],
      ["通知系统", "Notification"],
      ["操作审计", "OperationLog"],
      ["系统设置", "SystemConfig, Dictionary"],
      ["文件管理", "File"],
      ["审批记录", "ApprovalHistory"],
    ], [2000, 7360]),
    pb(),
  ]),

  // ====== 3. 模块说明 ======
  sec([
    h1("三、模块详细说明"),
    h2("3.1 项目管理"),
    p("包含项目立项、工程量变更、项目台账三个子模块。项目立项流程：销售/PM 创建 → 提交 → 领导审批。审批通过后可发起工程量变更。"),
    bp("关键数据结构"),
    bl("Project: code(自动编号), name, type, contractAmount, status(draft→pending→approved/rejected)"),
    bl("ContractVariation: 关联 Project，包含多个 VariationItem"),
    bl("ProjectLedger: 每个项目一条台账记录，存储汇总财务数据"),
    bp("自动编号格式：YGKI-JC-YYYYMMDD-NNN"),

    h2("3.2 采购管理"),
    p("四段式采购供应链：采购申请 → 采购询价 → 采购确认 → 供货通知。"),
    bp("采购申请"),
    bl("PM/采购员选项目、添加材料明细、填写收货信息"),
    bl("提交后审批通过才能进入下一步"),
    bp("采购询价"),
    bl("支持多供应商分组报价，同种材料可分配到不同供应商组"),
    bl("V2 新增：每组数量可独立编辑，解决多组重复计算问题"),
    bl("审批流：PM → Leader"),
    bp("采购确认"),
    bl("确定采购合同，支持多供应商分组"),
    bl("审批流：PM → Leader"),
    bp("供货通知"),
    bl("通知供应商发货、物流信息"),
    bl("审批通过自动生成入库单，自动增加项目库存"),
    bl("审批流：Purchaser → Leader"),

    h2("3.3 库存管理"),
    p("包含公司库存、项目库存、材料领用、转库记录四个模块。"),
    bl("公司库存：管理公司层面的材料库存"),
    bl("项目库存：供货通知审批通过后自动入库"),
    bl("材料领用：项目从公司库存领料，审批通过后库存转移"),
    bl("转库记录：项目退库至公司库存"),

    h2("3.4 劳务管理"),
    p("包含劳务合同确认和劳务签证两个子模块。"),
    bl("劳务合同确认：PM创建劳务合同，PM→Leader 审批"),
    bl("劳务签证：基于已审批合同发起金额调整（可正可负），Leader审批"),
    bp("关键逻辑"),
    bl("劳务签证审批通过后，签证金额自动计入合同总价"),
    bl("付款申请选择劳务合同付款时，总额=原合同额+签证金额汇总"),
    bl("项目台账劳务成本=合同金额+签证金额"),

    h2("3.5 费用管理"),
    p("包含费用申请和费用报销。"),
    bl("费用申请：Leader审批→Finance审批"),
    bl("费用报销：支持有发票/无发票，PM审批→Leader审批→Finance审批"),

    h2("3.6 财务管理"),
    p("包含付款申请、付款确认、项目回款。"),
    bl("付款申请：按合同类型（采购/劳务）选择，系统自动校验剩余可申请金额"),
    bl("支持按合同条目分项付款"),
    bl("审批流：Leader→Finance，财务确认实际付款"),
    bl("项目回款：录入甲方回款，直接生效无需审批"),

    h2("3.7 数据看板"),
    p("工作台首页，展示 KPI 概览和趋势分析。"),
    bl("KPI 卡片：待审批数、进行中项目、本月回款/支出"),
    bl("月度趋势图：近12个月回款/支出柱状图"),
    bl("待办审批列表：跨模块汇总"),
    bl("项目进展：进度百分比"),
    bl("快捷操作入口"),

    h2("3.8 通知系统"),
    p("全系统通知模块，13个业务模块的 submit/approve/reject/withdraw 操作自动触发通知。"),
    bl("后端：NotificationService + Controller，4个API端点"),
    bl("前端：右上角铃铛图标，Badge 未读计数，Popover 通知列表"),
    bl("30 秒轮询更新"),
    bl("点击通知跳转对应模块"),
    bl("支持全部已读、单条已读"),

    h2("3.9 系统设置"),
    p("配置管理、字典管理、操作日志、修改密码。"),
    bl("配置管理：系统全局键值对配置"),
    bl("字典管理：数据字典维护，支持增删改启禁"),
    bl("操作日志：全系统操作审计，支持筛选和展开查看变更详情"),
    bl("修改密码：所有用户可用"),

    h2("3.10 移动端 H5"),
    p("基于现有代码构建的移动端适配版本，通过 /m/* 路由访问。"),
    bl("底部 Tab 导航：工作台、审批、消息、我的"),
    bl("工作台：KPI 概览、待办列表"),
    bl("审批：跨模块待审批列表，支持通过/驳回"),
    bl("消息：通知列表、标记已读"),
    bl("个人中心：账户信息、修改密码、退出登录"),
    pb(),
  ]),

  // ====== 4. 权限体系 ======
  sec([
    h1("四、角色权限体系"),
    mt(["角色", "标识", "核心权限"], [
      ["系统管理员", "admin", "全部权限，含系统设置、用户管理"],
      ["总经理", "leader", "各模块领导层审批，查看所有数据"],
      ["项目经理", "pm", "项目管理、劳务管理、审批采购询价/确认/报销"],
      ["采购员", "purchaser", "采购全流程操作与审批、库存查看"],
      ["财务", "finance", "财务审批、付款确认、回款录入"],
      ["销售", "sales", "查看自己负责的项目和台账"],
      ["工程人员", "engineer", "查看参与的项目和库存信息"],
    ], [1800, 1400, 6160]),
    pb(),
    h2("4.1 权限矩阵"),
    mt(["模块/功能", "admin", "leader", "pm", "purchaser", "finance", "sales", "engineer"],
      [["项目立项-查看", "✓", "✓", "✓", "-", "-", "负责", "参与"],
       ["项目立项-新建/编辑", "✓", "-", "✓", "-", "-", "-", "-"],
       ["项目立项-审批", "✓", "✓", "-", "-", "-", "-", "-"],
       ["工程量变更", "✓", "审批", "全部", "-", "-", "-", "-"],
       ["项目台账", "✓", "✓", "✓", "-", "✓", "负责", "-"],
       ["采购申请", "✓", "审批", "-", "全部", "-", "-", "-"],
       ["采购询价", "✓", "审批", "审批", "全部", "-", "-", "-"],
       ["采购确认", "✓", "审批", "审批", "全部", "-", "-", "-"],
       ["供货通知", "✓", "审批", "-", "全部", "-", "-", "-"],
       ["公司库存", "✓", "✓", "-", "✓", "-", "-", "-"],
       ["项目库存", "✓", "✓", "✓", "✓", "-", "-", "查看"],
       ["材料领用", "✓", "审批", "-", "审批", "-", "-", "-"],
       ["转库记录", "✓", "审批", "-", "审批", "-", "-", "-"],
       ["劳务合同", "✓", "审批", "全部", "-", "-", "-", "-"],
       ["劳务签证", "✓", "审批", "全部", "-", "-", "-", "-"],
       ["费用申请", "✓", "审批", "-", "-", "审批", "-", "-"],
       ["费用报销", "✓", "审批", "审批", "-", "审批", "-", "-"],
       ["付款申请", "✓", "审批", "-", "-", "审批", "-", "-"],
       ["项目回款", "✓", "-", "-", "-", "全部", "-", "-"],
       ["数据看板", "✓", "✓", "✓", "✓", "✓", "✓", "✓"],
       ["系统设置", "✓", "-", "-", "-", "-", "-", "-"],
       ["用户管理", "✓", "-", "-", "-", "-", "-", "-"]],
      [1000, 800, 800, 800, 1000, 800, 800, 800]),
    pb(),
  ]),

  // ====== 5. API 文档 ======
  sec([
    h1("五、API 端点汇总"),
    h2("5.1 认证"),
    mt(["方法", "路径", "说明"], [
      ["POST", "/auth/login", "登录"],
      ["GET", "/auth/me", "获取当前用户信息"],
      ["POST", "/auth/change-password", "修改密码"],
    ], [1200, 4000, 4160]),
    h2("5.2 项目管理"),
    mt(["方法", "路径", "说明"], [
      ["GET", "/projects", "项目列表"],
      ["POST", "/projects", "创建项目"],
      ["GET", "/projects/:id", "项目详情"],
      ["PUT", "/projects/:id", "编辑项目"],
      ["POST", "/projects/:id/submit", "提交审批"],
      ["POST", "/projects/:id/approve", "通过审批"],
      ["POST", "/projects/:id/reject", "驳回"],
      ["DELETE", "/projects/:id", "删除项目(admin)"],
      ["GET", "/projects/ledger-list", "台账列表"],
      ["GET", "/projects/:id/ledger", "台账详情"],
    ], [1200, 4000, 4160]),
    h2("5.3 采购管理"),
    mt(["方法", "路径", "说明"], [
      ["GET", "/purchase-requests", "采购申请列表"],
      ["POST", "/purchase-requests", "创建采购申请"],
      ["GET", "/inquiry-orders", "询价单列表"],
      ["POST", "/inquiry-orders", "创建询价单"],
      ["GET", "/purchase-confirms", "采购确认列表"],
      ["POST", "/purchase-confirms", "创建采购确认"],
      ["GET", "/delivery-notices", "供货通知列表"],
      ["POST", "/delivery-notices", "创建供货通知"],
      ["DELETE", "各模块/:id", "删除(admin/draft)"],
    ], [1200, 4000, 4160]),
    h2("5.4 数据看板"),
    mt(["方法", "路径", "说明"], [
      ["GET", "/dashboard/stats", "KPI 数据"],
      ["GET", "/dashboard/pending-approvals", "待审批列表"],
      ["GET", "/dashboard/project-progress", "项目进展"],
      ["GET", "/dashboard/monthly-trend", "月度趋势"],
    ], [1200, 4000, 4160]),
    h2("5.5 系统设置"),
    mt(["方法", "路径", "说明"], [
      ["GET", "/settings/config", "配置列表"],
      ["PUT", "/settings/config/:key", "更新配置"],
      ["GET", "/settings/dict/types", "字典类型列表"],
      ["GET", "/settings/dict/:type", "字典条目"],
      ["POST/PUT/DELETE", "/settings/dict/...", "字典CRUD"],
      ["GET", "/settings/operation-logs", "操作日志"],
    ], [1200, 4000, 4160]),
    pb(),
  ]),

  // ====== 6. 开发进度 ======
  sec([
    h1("六、开发进度一览"),
    mt(["模块", "状态", "说明"], [
      ["项目立项", "✓ 已完成", "创建→审批→台账"],
      ["工程量变更", "✓ 已完成", "变更明细→审批→更新台账"],
      ["项目台账", "✓ 已完成", "完整财务视图、成本结构分析"],
      ["采购申请→供货通知", "✓ 已完成", "四段式采购全链路"],
      ["公司库存", "✓ 已完成", "入库、出库、库存管理"],
      ["项目库存", "✓ 已完成", "自动入库、转库、领用"],
      ["材料领用", "✓ 已完成", "公司库存→项目库存"],
      ["转库/退库", "✓ 已完成", "项目库存→公司库存"],
      ["劳务合同确认", "✓ 已完成", "金额确认、审批"],
      ["劳务签证", "✓ 已完成", "正负调整、计入合同总价"],
      ["费用申请", "✓ 已完成", "日常费用审批"],
      ["费用报销", "✓ 已完成", "有发票/无发票双模式"],
      ["付款申请", "✓ 已完成", "按合同付款、剩余校验"],
      ["付款确认", "✓ 已完成", "财务确认实际付款"],
      ["项目回款", "✓ 已完成", "回款录入"],
      ["数据看板", "✓ 已完成", "KPI+图表+待办"],
      ["通知系统", "✓ 已完成", "13模块消息推送"],
      ["系统设置", "✓ 已完成", "配置+字典+日志+改密"],
      ["用户管理", "✓ 已完成", "增删改查"],
      ["材料设备库", "✓ 已完成", "基础数据维护"],
      ["移动端 H5", "✓ 已完成", "Tab导航+审批+通知+个人"],
      ["删除功能", "✓ 已完成", "付款/回款/费用/报销"],
    ], [2000, 1600, 5760]),
    pb(),
    h2("6.2 后续规划"),
    mt(["功能", "优先级", "说明"], [
      ["PDF 表单导出", "中", "各类单据 PDF 带水印下载"],
      ["消息通知增强", "低", "企业微信/钉钉推送"],
      ["报表模块", "中", "自定义报表、Excel 导出"],
      ["移动端增强", "低", "完整的业务流程移动操作"],
      ["数据备份", "低", "自动备份与恢复"],
    ], [2000, 1600, 5760]),
    pb(),
  ]),

  // ====== 7. 部署运维 ======
  sec([
    h1("七、部署运维"),
    h2("7.1 环境要求"),
    bl("Node.js >= 20"),
    bl("PostgreSQL >= 14"),
    bl("npm 或 pnpm 包管理器"),
    h2("7.2 启动方式"),
    p("# 后端编译与启动"),
    p("cd backend && npm run build"),
    p("node dist/src/main.js"),
    p(""),
    p("# 前端编译与部署（开发时）"),
    p("cd frontend && npx vite build"),
    p("cp -r dist/* ../backend/public/"),
    h2("7.3 默认端口"),
    bl("服务端口：12404"),
    bl("API 前缀：/api/v1"),
    bl("静态文件：/（根路径）"),
    h2("7.4 构建产物"),
    p("前端编译后约 3.3MB（含 antd 和图表库）"),
    p("后端编译后约 1.2MB"),
    pb(),
  ]),
];

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Arial", color: "1a365d" }, paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: "2563eb" }, paragraph: { spacing: { before: 240, after: 160 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial" }, paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 2 } },
    ],
  },
  numbering: { config: [{ reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }] },
  sections,
});

const out = "C:\\Users\\Administrator\\Desktop\\xmwd\\yg-xmgl-new\\docs\\扬光工程管理系统_项目开发文档.docx";
Packer.toBuffer(doc).then(buf => { fs.writeFileSync(out, buf); console.log("OK: " + out); });
