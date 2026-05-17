const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat,
  TableOfContents, HeadingLevel, BorderStyle, WidthType, ShadingType,
  PageNumber, PageBreak, ImageRun
} = require("docx");

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 60, bottom: 60, left: 100, right: 100 };

function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 200 }, children: [new TextRun({ text, bold: true, size: 32, font: "Arial" })] });
}
function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 160 }, children: [new TextRun({ text, bold: true, size: 28, font: "Arial" })] });
}
function h3(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 120 }, children: [new TextRun({ text, bold: true, size: 24, font: "Arial" })] });
}
function p(text, opts = {}) {
  return new Paragraph({ spacing: { after: 120 }, indent: opts.indent ? { left: 360 } : undefined, children: [new TextRun({ text, size: 22, font: "Arial", ...opts })] });
}
function bold(text) {
  return p(text, { bold: true });
}
function placeholder(text) {
  return new Paragraph({ spacing: { before: 120, after: 120 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text, italics: true, size: 20, font: "Arial", color: "888888" })] });
}
function bullet(text, level = 0) {
  return new Paragraph({ numbering: { reference: "bullets", level }, spacing: { after: 60 }, children: [new TextRun({ text, size: 22, font: "Arial" })] });
}
function emptyLine() {
  return new Paragraph({ spacing: { after: 60 }, children: [] });
}

// ====== Headers/Footers ======
const header = new Header({
  children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "扬光工程管理系统 · 系统说明文档", size: 18, font: "Arial", color: "888888" })] })]
});
const footer = new Footer({
  children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
    new TextRun({ text: "第 ", size: 18, font: "Arial", color: "888888" }),
    new TextRun({ children: [PageNumber.CURRENT], size: 18, font: "Arial", color: "888888" }),
    new TextRun({ text: " 页", size: 18, font: "Arial", color: "888888" }),
  ]})]
});

// ====== Helper: create a table from data ======
function makeTable(headers, rows, colWidths) {
  const totalWidth = colWidths.reduce((a, b) => a + b, 0);
  const headerRow = new TableRow({
    children: headers.map((h, i) => new TableCell({
      borders, width: { size: colWidths[i], type: WidthType.DXA }, margins: cellMargins,
      shading: { fill: "D5E8F0", type: ShadingType.CLEAR },
      children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 20, font: "Arial" })] })],
    })),
  });
  const dataRows = rows.map(row => new TableRow({
    children: row.map((cell, i) => new TableCell({
      borders, width: { size: colWidths[i], type: WidthType.DXA }, margins: cellMargins,
      children: [new Paragraph({ children: [new TextRun({ text: String(cell), size: 20, font: "Arial" })] })],
    })),
  }));
  return new Table({ width: { size: totalWidth, type: WidthType.DXA }, columnWidths: colWidths, rows: [headerRow, ...dataRows] });
}

// ====== Document Content ======

const coverSection = {
  properties: {
    page: {
      size: { width: 12240, height: 15840 },
      margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
    },
  },
  children: [
    emptyLine(), emptyLine(), emptyLine(), emptyLine(), emptyLine(),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
      children: [new TextRun({ text: "扬光工程管理系统", size: 56, bold: true, font: "Arial", color: "1a365d" })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 600 },
      children: [new TextRun({ text: "系统说明文档", size: 40, font: "Arial", color: "2563eb" })] }),
    emptyLine(), emptyLine(),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 },
      children: [new TextRun({ text: "文档版本：V1.0", size: 24, font: "Arial", color: "666666" })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 },
      children: [new TextRun({ text: "编制日期：2026年5月", size: 24, font: "Arial", color: "666666" })] }),
    new Paragraph({ alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "青岛扬光科技有限公司", size: 24, font: "Arial", color: "666666" })] }),
  ],
};

const tocSection = {
  properties: {
    page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
  },
  headers: { default: header },
  footers: { default: footer },
  children: [
    h1("目录"),
    new TableOfContents("目录", { hyperlink: true, headingStyleRange: "1-3" }),
    new Paragraph({ children: [new PageBreak()] }),
  ],
};

// ====== 1. 系统概述 ======
const section1 = [
  h1("一、系统概述"),
  h2("1.1 系统简介"),
  p("扬光工程管理系统（YG-XMGL）是一款面向工程企业的综合管理平台，旨在解决工程项目全生命周期管理中的信息孤岛、流程繁琐、数据不透明等痛点。系统涵盖从项目立项、采购供应链、库存管理、劳务管理到财务核算的全链路数字化管理。"),
  p("系统采用前后端分离架构，后端基于 NestJS + Prisma + PostgreSQL，前端基于 React + Ant Design + Vite，支持 PC 端和移动 H5 端双端访问。"),

  h2("1.2 系统架构"),
  p("系统采用 B/S 架构，用户通过浏览器访问即可使用，无需安装任何客户端软件。核心架构如下："),
  placeholder("【截图：系统架构图】"),

  h2("1.3 适用对象"),
  p("本系统适用于各类工程企业，特别是以下类型的组织："),
  bullet("弱电工程、系统集成类企业"),
  bullet("机电安装工程企业"),
  bullet("工程项目管理公司"),
  bullet("需要精细化项目成本核算的企业"),

  new Paragraph({ children: [new PageBreak()] }),
];

// ====== 2. 主要功能 ======
const section2 = [
  h1("二、主要功能清单"),

  makeTable(["模块", "功能点", "功能说明"], [
    ["项目管理", "项目立项", "创建项目、填写合同信息、提交审批"],
    ["项目管理", "工程量变更", "对已立项项目发起工程量调整"],
    ["项目管理", "项目台账", "查看项目的完整财务数据、成本分析、利润分析"],
    ["采购管理", "采购申请", "发起采购需求、提交审批"],
    ["采购管理", "采购询价", "多家供应商询价对比、分组报价"],
    ["采购管理", "采购确认", "确认采购合同、多供应商分组管理"],
    ["采购管理", "供货通知", "通知供应商发货、跟踪物流"],
    ["库存管理", "公司库存", "管理公司层面的材料库存"],
    ["库存管理", "项目库存", "管理每个项目的材料设备库存"],
    ["库存管理", "材料领用", "项目从公司库存领用材料"],
    ["库存管理", "转库管理", "项目间材料调拨、退库"],
    ["劳务管理", "劳务合同确认", "确认劳务分包合同金额"],
    ["劳务管理", "劳务签证", "劳务合同金额调整（正负签证）"],
    ["费用管理", "费用申请", "项目日常费用申请及审批"],
    ["费用管理", "费用报销", "项目费用报销（支持有发票/无发票）"],
    ["财务管理", "付款申请", "按合同付款申请、多级审批"],
    ["财务管理", "付款确认", "财务确认实际付款"],
    ["财务管理", "项目回款", "录入甲方回款记录"],
    ["数据看板", "工作台", "KPI概览、待办审批、项目进展"],
    ["数据看板", "月度趋势", "回款/支出月度图表分析"],
    ["系统设置", "配置管理", "系统全局配置"],
    ["系统设置", "字典管理", "数据字典维护"],
    ["系统设置", "操作日志", "全系统操作审计日志"],
    ["系统设置", "修改密码", "用户自助修改密码"],
    ["通知系统", "消息通知", "审批状态变更实时通知、铃铛提醒"],
  ], [1800, 1600, 5960]),

  new Paragraph({ children: [new PageBreak()] }),
];

// ====== 3. 系统优势 ======
const section3 = [
  h1("三、系统优势"),

  h2("3.1 全链路数字化"),
  p("从项目立项到采购、入库、劳务、费用、付款、回款，形成完整的数据闭环。每个环节的数据自动流转，无需重复录入。"),

  h2("3.2 精细化成本管理"),
  p("系统自动计算项目的采购成本（含入库、跨项目调整）、劳务成本（含合同金额与签证调整）、其他成本（费用+报销），实时生成项目台账，准确反映项目利润。"),

  h2("3.3 灵活的审批流程"),
  p("支持多级审批（PM→领导→财务），每个模块可配置独立的审批流。审批历史完整记录，便于追溯。"),

  h2("3.4 角色权限体系"),
  p("七种角色（admin/leader/pm/purchaser/finance/sales/engineer），精细化权限控制，确保数据安全。"),

  h2("3.5 数据可视化"),
  p("工作台提供 KPI 卡片、项目进展、月度回款/支出趋势图，帮助管理者快速掌握全局。"),

  h2("3.6 自动编号与防错机制"),
  p("每张单据自动生成唯一编号（前缀+日期+流水号），付款申请包含剩余金额校验，防止超额申请。"),

  new Paragraph({ children: [new PageBreak()] }),
];

// ====== 4. 分模块使用说明 ======
const section4 = [
  h1("四、分模块使用说明"),

  // 4.1 工作台
  h2("4.1 数据看板（工作台）"),
  p("工作台是用户登录后的默认首页，展示关键业务数据概览。"),
  h3("功能说明"),
  bullet("KPI 卡片：待审批数量、进行中项目数、本月回款、本月支出"),
  bullet("月度趋势图：近12个月的回款与支出对比柱状图"),
  bullet("待办审批列表：跨模块的待审批事项汇总，点击跳转对应模块"),
  bullet("项目进展：展示各项目的进度百分比"),
  bullet("快捷操作：新建项目、发起采购、录入回款、费用申请"),
  placeholder("【截图：数据看板页面】"),

  // 4.2 项目管理
  h2("4.2 项目管理"),
  p("项目管理模块包含项目立项、工程量变更、项目台账三个子模块。"),
  h3("4.2.1 项目立项"),
  p("创建新项目，填写项目名称、类型（集成/供货）、合同金额、销售、项目经理、计划工期等信息。提交后进入审批流程（销售→领导审批）。"),
  placeholder("【截图：项目立项表单】"),
  p("项目状态流转：草稿 → 审批中 → 已通过 / 已驳回。已通过的项目可进行后续操作。"),
  placeholder("【截图：项目列表页】"),

  h3("4.2.2 工程量变更"),
  p("对已立项项目发起工程量变更，添加变更材料明细。变更审批通过后，自动更新项目台账中的变更金额。"),
  placeholder("【截图：工程量变更页面】"),

  h3("4.2.3 项目台账"),
  p("项目台账是项目的完整财务视图，展示："),
  bullet("合同金额、工程量变更金额、调整后金额"),
  bullet("预期结算额（合同+变更）"),
  bullet("采购成本净额、劳务成本、其他成本"),
  bullet("总成本、预期利润、利润率"),
  bullet("成本结构占比（采购/劳务/其他）"),
  bullet("已回款金额、回款率"),
  bullet("已付款金额、付款明细"),
  bullet("采购入库明细、劳务合同明细等"),
  placeholder("【截图：项目台账详情页】"),

  new Paragraph({ children: [new PageBreak()] }),

  // 4.3 采购管理
  h2("4.3 采购管理"),
  p("采购管理包含采购申请、采购询价、采购确认、供货通知四个环节，形成完整的采购供应链。"),
  h3("4.3.1 采购申请"),
  p("项目经理或采购员发起采购申请，选择项目、填写材料明细（从材料库选择）、指定收货信息。提交后进入审批流程。"),
  placeholder("【截图：采购申请表单】"),

  h3("4.3.2 采购询价"),
  p("采购员对已审批的采购申请发起询价，支持多供应商分组报价，每个组可选择不同的采购明细并填写采购单价。"),
  p("支持添加额外费用项（可正可负），每个分组的材料数量可独立编辑。"),
  placeholder("【截图：采购询价表单-多供应商分组】"),
  p("审批流程：PM审批 → 领导审批。"),

  h3("4.3.3 采购确认"),
  p("询价审批通过后，采购员进行采购确认，确定最终的采购合同内容。支持多供应商分组管理。"),
  placeholder("【截图：采购确认页面】"),
  p("审批流程：PM审批 → 领导审批。"),

  h3("4.3.4 供货通知"),
  p("采购确认审批通过后，创建供货通知单，通知供应商发货。填写物流信息、收货信息等。"),
  p("供货通知审批通过后，系统自动生成入库单，自动增加项目库存数量。"),
  placeholder("【截图：供货通知页面】"),
  p("审批流程：采购审批 → 领导审批。"),

  new Paragraph({ children: [new PageBreak()] }),

  // 4.4 库存管理
  h2("4.4 库存管理"),
  p("库存管理包含公司库存、项目库存、材料领用、转库记录四个子模块。"),
  h3("4.4.1 公司库存"),
  p("管理公司层面的材料设备库存，展示材料名称、品牌、规格、库存数量、成本单价等信息。"),
  placeholder("【截图：公司库存页面】"),

  h3("4.4.2 项目库存"),
  p("展示各项目的库存材料，材料数量来源于供货通知审批后自动入库。"),
  placeholder("【截图：项目库存页面】"),

  h3("4.4.3 材料领用"),
  p("项目从公司库存领用材料，填写领用单后提交审批。审批通过后，公司库存减少，项目库存增加。"),
  placeholder("【截图：材料领用页面】"),

  h3("4.4.4 转库记录"),
  p("将材料从项目库存转回公司库存（退库），填写退库原因（设计变更、方案优化、采购错误等），提交审批。"),
  placeholder("【截图：转库记录页面】"),

  new Paragraph({ children: [new PageBreak()] }),

  // 4.5 劳务管理
  h2("4.5 劳务管理"),
  h3("4.5.1 劳务合同确认"),
  p("项目经理新建劳务合同，填写合同金额、施工队信息等。提交后进入审批流程（PM审批 → 领导审批）。"),
  placeholder("【截图：劳务合同确认页面】"),

  h3("4.5.2 劳务签证"),
  p("基于已审批的劳务合同发起签证，填写签证原因和金额变更（可正可负）。领导审批通过后，签证金额自动计入劳务合同总价，影响项目台账的劳务成本。"),
  p("例如：劳务合同确认金额100万，签证-20万，则劳务成本为80万。"),
  placeholder("【截图：劳务签证页面】"),

  new Paragraph({ children: [new PageBreak()] }),

  // 4.6 费用管理
  h2("4.6 费用管理"),
  h3("4.6.1 费用申请"),
  p("项目日常费用申请，填写费用原因、金额、支付方式。审批流程：领导审批 → 财务审批。"),
  placeholder("【截图：费用申请页面】"),

  h3("4.6.2 费用报销"),
  p("项目费用报销，支持有发票和无发票两种方式。有发票时可上传发票文件，无发票时需填写原因。"),
  p("审批流程：PM审批（如需要）→ 领导审批 → 财务审批。"),
  placeholder("【截图：费用报销页面】"),

  new Paragraph({ children: [new PageBreak()] }),

  // 4.7 财务管理
  h2("4.7 财务管理"),
  h3("4.7.1 付款申请"),
  p("基于采购合同或劳务合同发起付款申请。选择合同类型、合同编号，系统自动计算该合同的剩余可申请金额，防止超额申请。"),
  p("支持按合同条目分项付款，显示每项已付金额和剩余金额。"),
  p("审批流程：领导审批 → 财务审批。审批通过后，财务进行付款确认。"),
  placeholder("【截图：付款申请页面】"),

  h3("4.7.2 项目回款"),
  p("录入甲方回款记录，填写回款金额、回款方式、回款时间。回款直接生效，无需审批。"),
  placeholder("【截图：项目回款页面】"),

  new Paragraph({ children: [new PageBreak()] }),

  // 4.8 系统设置
  h2("4.8 系统设置"),
  p("系统设置仅管理员可见，包含四个标签页："),
  h3("配置管理"),
  p("管理系统全局配置项，如公司名称、联系电话等键值对配置。"),
  placeholder("【截图：系统配置页面】"),

  h3("字典管理"),
  p("管理数据字典，左侧展示字典类型列表，右侧展示该类型下的条目。支持新增、编辑、删除、启用/禁用。"),
  p("预置字典类型包括：项目标签、费用类别、付款方式等。"),
  placeholder("【截图：字典管理页面】"),

  h3("操作日志"),
  p("记录所有用户的操作行为，支持按业务类型、操作类型、时间范围筛选，可展开查看变更详情。"),
  placeholder("【截图：操作日志页面】"),

  h3("修改密码"),
  p("所有用户均可修改自己的登录密码，需要输入原密码和新密码。"),
  placeholder("【截图：修改密码页面】"),

  new Paragraph({ children: [new PageBreak()] }),
];

// ====== 5. 角色权限说明 ======
const section5 = [
  h1("五、分角色权限说明"),

  p("系统共设七种角色，每种角色的权限范围和可见功能不同。以下详细说明各角色的权限。"),

  // Role comparison table
  makeTable(["角色", "英文标识", "说明"],
    [["管理员", "admin", "系统最高权限，可查看和操作所有模块"],
     ["总经理", "leader", "负责领导层级审批，可查看所有业务数据"],
     ["项目经理", "pm", "管理项目及劳务，审批采购询价等"],
     ["采购员", "purchaser", "负责采购全流程操作和审批"],
     ["财务", "finance", "负责财务审批和付款确认"],
     ["销售", "sales", "查看自己负责的项目"],
     ["工程人员", "engineer", "查看参与的项目和库存"]],
    [1600, 1600, 6160]),

  emptyLine(),

  // 5.1 Admin
  h2("5.1 管理员（admin）"),
  p("管理员拥有系统的全部权限，包括："),
  bullet("所有模块的查看、新增、编辑、删除权限"),
  bullet("所有审批节点的审批权限"),
  bullet("系统设置的完整访问权限（配置管理、字典管理、操作日志）"),
  bullet("用户管理（新增/编辑/删除用户）"),

  bold("首页菜单："),
  bullet("工作台、项目管理（含立项、变更、台账）、采购管理（全部子模块）、库存管理（全部子模块）、劳务管理、费用管理、财务管理、材料设备库、用户管理、系统设置"),

  bold("典型使用场景："),
  bullet("系统初始化配置-设置公司名称等全局参数"),
  bullet("管理数据字典-维护下拉选项"),
  bullet("查看全系统操作日志-审计追踪"),
  bullet("在所有审批节点作为后备审批人"),
  placeholder("【截图：管理员视角的左侧菜单】"),

  // 5.2 Leader
  h2("5.2 总经理（leader）"),
  p("总经理负责各模块的领导层级审批，可查看所有业务数据但不可删除。"),

  bold("核心职责："),
  bullet("审批项目立项（领导审批节点）"),
  bullet("审批采购询价（领导审批节点）"),
  bullet("审批采购确认（领导审批节点）"),
  bullet("审批供货通知（领导审批节点）"),
  bullet("审批劳务合同（领导审批节点）"),
  bullet("审批劳务签证（领导审批节点）"),
  bullet("审批费用申请（领导审批节点）"),
  bullet("审批费用报销（领导审批节点）"),
  bullet("审批付款申请（领导审批节点）"),
  bullet("查看数据看板、项目台账、各类报表"),

  bold("无权限："),
  bullet("用户管理、系统设置（仅admin可见）"),
  bullet("删除任何业务数据"),

  placeholder("【截图：总经理视角的待审批列表】"),

  // 5.3 PM
  h2("5.3 项目经理（pm）"),
  p("项目经理是项目的核心管理者，负责项目日常管理和劳务管理。"),

  bold("核心权限："),
  bullet("新建项目、编辑自己负责的项目"),
  bullet("提交项目立项审批"),
  bullet("管理工程量变更"),
  bullet("查看项目台账"),
  bullet("审批采购询价（PM审批节点）"),
  bullet("审批采购确认（PM审批节点）"),
  bullet("管理劳务合同：新建、提交审批"),
  bullet("管理劳务签证：新建、提交审批"),
  bullet("审批费用报销（PM审批节点）"),

  bold("无权限："),
  bullet("采购申请、采购询价、采购确认的新建权限（采购员职责）"),
  bullet("用户管理、系统设置"),
  bullet("财务模块的审批权限"),

  placeholder("【截图：项目经理视角的项目列表】"),

  // 5.4 Purchaser
  h2("5.4 采购员（purchaser）"),
  p("采购员负责采购全流程的操作与审批。"),

  bold("核心权限："),
  bullet("发起采购申请、提交审批"),
  bullet("创建采购询价单、管理供应商分组"),
  bullet("确认采购合同"),
  bullet("创建供货通知单"),
  bullet("审批供货通知（采购审批节点）"),
  bullet("查看库存信息"),
  bullet("管理材料设备库"),

  bold("无权限："),
  bullet("项目管理、劳务管理、财务管理"),
  bullet("费用申请、报销"),
  bullet("用户管理、系统设置"),

  placeholder("【截图：采购员视角的采购管理页】"),

  // 5.5 Finance
  h2("5.5 财务（finance）"),
  p("财务负责财务相关的审批和付款确认操作。"),

  bold("核心权限："),
  bullet("审批费用申请（财务审批节点）"),
  bullet("审批费用报销（财务审批节点）"),
  bullet("审批付款申请（财务审批节点）"),
  bullet("付款确认-对已审批的付款申请确认实际付款"),
  bullet("录入项目回款"),
  bullet("查看项目台账"),
  bullet("查看数据看板"),

  bold("无权限："),
  bullet("项目管理的新建和编辑"),
  bullet("采购管理全流程"),
  bullet("劳务管理"),
  bullet("用户管理、系统设置"),

  placeholder("【截图：财务视角的付款申请页】"),

  // 5.6 Sales
  h2("5.6 销售（sales）"),
  p("销售可以查看自己负责的项目信息和台账。"),

  bold("核心权限："),
  bullet("查看自己负责的/参与的项目列表"),
  bullet("查看项目台账"),
  bullet("查看数据看板"),

  bold("无权限："),
  bullet("项目立项（编辑权限受限）"),
  bullet("采购管理、库存管理"),
  bullet("劳务管理"),
  bullet("费用管理"),
  bullet("财务管理"),
  bullet("用户管理、系统设置"),

  placeholder("【截图：销售视角的项目列表】"),

  // 5.7 Engineer
  h2("5.7 工程人员（engineer）"),
  p("工程人员可以查看参与的项目和库存信息。"),

  bold("核心权限："),
  bullet("查看参与的项目信息"),
  bullet("查看项目库存"),
  bullet("查看公司库存"),
  bullet("查看数据看板"),

  bold("无权限："),
  bullet("所有审批操作"),
  bullet("业务数据的新增、编辑、删除"),
  bullet("财务管理"),
  bullet("系统设置"),

  placeholder("【截图：工程人员视角的库存页】"),

  new Paragraph({ children: [new PageBreak()] }),
];

// ====== 6. 技术架构 ======
const section6 = [
  h1("六、技术架构与部署"),

  h2("6.1 技术栈"),
  makeTable(["层次", "技术", "版本"],
    [["前端框架", "React + Vite", "React 19 / Vite 8"],
     ["UI 组件库", "Ant Design", "v6"],
     ["后端框架", "NestJS", "v11"],
     ["数据库", "PostgreSQL", "v16"],
     ["ORM", "Prisma", "v7"],
     ["认证", "JWT", "-"]],
    [2000, 3600, 3760]),

  emptyLine(),

  h2("6.2 部署要求"),
  bullet("Node.js >= 20"),
  bullet("PostgreSQL >= 14"),
  bullet("支持现代浏览器的 PC 或移动设备"),

  h2("6.3 运行方式"),
  p("npm run build    # 编译后端"),
  p("npm run start    # 启动服务（默认 12404 端口）"),
  p("前端编译后部署到后端的 public 目录，统一提供服务。"),

  new Paragraph({ children: [new PageBreak()] }),
];

// ====== 7. 常见问题 ======
const section7 = [
  h1("七、常见问题"),

  h2("7.1 忘记密码怎么办？"),
  p("联系管理员在后台用户管理中重置密码。"),

  h2("7.2 为什么我的待审批列表是空的？"),
  p("可能的原因：没有符合您审批权限的待审批单据，或者所有单据已被处理。"),

  h2("7.3 付款申请提示\"剩余可申请金额不足\"怎么办？"),
  p("说明该合同的已申请付款金额已达到或超过合同总额（含签证调整），需联系财务确认付款情况。"),

  h2("7.4 项目台账数据不更新？"),
  p("台账数据实时计算，如果发现数据异常，请检查相关业务单据的状态是否已审批通过。"),
];

// ====== Build ======
const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Arial", color: "1a365d" },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: "2563eb" },
        paragraph: { spacing: { before: 240, after: 160 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: "333333" },
        paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 2 } },
    ],
  },
  numbering: {
    config: [{
      reference: "bullets",
      levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } } }],
    }],
  },
  sections: [
    coverSection,
    tocSection,
    { properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } }, headers: { default: header }, footers: { default: footer }, children: section1 },
    { properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } }, headers: { default: header }, footers: { default: footer }, children: section2 },
    { properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } }, headers: { default: header }, footers: { default: footer }, children: section3 },
    { properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } }, headers: { default: header }, footers: { default: footer }, children: section4 },
    { properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } }, headers: { default: header }, footers: { default: footer }, children: section5 },
    { properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } }, headers: { default: header }, footers: { default: footer }, children: section6 },
    { properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } }, headers: { default: header }, footers: { default: footer }, children: section7 },
  ],
});

Packer.toBuffer(doc).then(buffer => {
  const outPath = "C:\\Users\\Administrator\\Desktop\\xmwd\\yg-xmgl-new\\docs\\扬光工程管理系统_系统说明文档.docx";
  fs.writeFileSync(outPath, buffer);
  console.log("Document created: " + outPath);
});
