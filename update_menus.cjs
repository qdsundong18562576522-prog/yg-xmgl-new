const fs = require('fs');

// 1. Update MainLayout.tsx - reorganize sidebar
let ml = fs.readFileSync('C:/Users/Administrator/Desktop/xmwd/yg-xmgl-new/frontend/src/layouts/MainLayout.tsx', 'utf8');

// Replace 项目管理 with submenu
ml = ml.replace(
  "{ key: '/projects', icon: <ProjectOutlined />, label: '项目管理' },",
  "{ key: 'projects', icon: <ProjectOutlined />, label: '项目管理', children: [\n      { key: '/projects', icon: <ProjectOutlined />, label: '项目立项' },\n      { key: '/projects/variations', icon: <FormOutlined />, label: '工程量变更' },\n    ] },"
);

// Replace 费用报销 with 项目费用管理 submenu
ml = ml.replace(
  "{ key: 'expenses', icon: <DollarOutlined />, label: '费用报销', children: [\n      { key: '/expenses/requests', icon: <FormOutlined />, label: '项目费用申请' },\n      { key: '/expenses/reimbursements', icon: <FileTextOutlined />, label: '项目报销' },\n      { key: '/expenses/variations', icon: <CheckCircleOutlined />, label: '工程量变更' },\n      { key: '/expenses/labor-contracts', icon: <CarryOutOutlined />, label: '劳务合同确认' },\n      { key: '/expenses/labor-visas', icon: <FileSearchOutlined />, label: '劳务签证' },\n    ] },"
);

// Check what the current expenses menu looks like - it might already have been changed
// Let me check
if (!ml.includes("项目费用管理")) {
  // Try alternative pattern
  ml = ml.replace(
    "{ key: 'expenses', icon: <DollarOutlined />, label: '费用报销', children: [",
    "{ key: 'expenses', icon: <DollarOutlined />, label: '项目费用管理', children: ["
  );
  ml = ml.replace(
    "{ key: '/expenses/requests', icon: <FormOutlined />, label: '项目费用申请' }",
    "{ key: '/expenses/requests', icon: <FormOutlined />, label: '费用申请' }"
  );
  ml = ml.replace(
    "{ key: '/expenses/reimbursements', icon: <FileTextOutlined />, label: '项目报销' }",
    "{ key: '/expenses/reimbursements', icon: <FileTextOutlined />, label: '费用报销' }"
  );
  // Remove 工程量变更 from expenses
  ml = ml.replace(
    ",\n      { key: '/expenses/variations', icon: <CheckCircleOutlined />, label: '工程量变更' }",
    ""
  );
  // Remove labor from expenses
  ml = ml.replace(
    ",\n      { key: '/expenses/labor-contracts', icon: <CarryOutOutlined />, label: '劳务合同确认' },\n      { key: '/expenses/labor-visas', icon: <FileSearchOutlined />, label: '劳务签证' }",
    ""
  );
}

// Add 劳务管理 submenu after 项目费用管理
ml = ml.replace(
  "},\n  { key: '/materials', icon: <DatabaseOutlined />, label: '材料设备库' },",
  "},\n  { key: 'labor', icon: <FileTextOutlined />, label: '劳务管理', children: [\n      { key: '/labor/contracts', icon: <CarryOutOutlined />, label: '劳务合同确认' },\n      { key: '/labor/visas', icon: <FileSearchOutlined />, label: '劳务签证' },\n    ] },\n  { key: '/materials', icon: <DatabaseOutlined />, label: '材料设备库' },"
);

fs.writeFileSync('C:/Users/Administrator/Desktop/xmwd/yg-xmgl-new/frontend/src/layouts/MainLayout.tsx', ml);
console.log('MainLayout.tsx updated');

// 2. Update App.tsx - routes
let ap = fs.readFileSync('C:/Users/Administrator/Desktop/xmwd/yg-xmgl-new/frontend/src/App.tsx', 'utf8');

// Add imports for labor pages (placeholder)
ap = ap.replace(
  "import LaborVisasPage from './pages/expenses/LaborVisas';",
  "import LaborVisasPage from './pages/labor/LaborVisas';\nimport LaborContractsPage from './pages/labor/LaborContracts';"
);
// Remove old labor contract import (since we have a new path)
ap = ap.replace(
  "import LaborContractsPage from './pages/expenses/LaborContracts';",
  ""
);

// Add import for variation redirect/page
ap = ap.replace(
  "import ContractVariationsPage from './pages/expenses/ContractVariations';",
  "import ContractVariationsPage from './pages/projects/ContractVariations';"
);

// Update routes
// Remove old routes
ap = ap.replace(
  "                <Route path=\"expenses/variations\" element={<ContractVariationsPage />} />\n",
  ""
);
ap = ap.replace(
  "                <Route path=\"expenses/labor-contracts\" element={<LaborContractsPage />} />\n",
  ""
);
ap = ap.replace(
  "                <Route path=\"expenses/labor-visas\" element={<LaborVisasPage />} />\n",
  ""
);

// Add new routes
ap = ap.replace(
  "<Route path=\"projects\" element={<ProjectsPage />} />",
  "<Route path=\"projects\" element={<ProjectsPage />} />\n                <Route path=\"projects/variations\" element={<ContractVariationsPage />} />"
);

ap = ap.replace(
  "<Route path=\"inventory/requisitions\" element={<MaterialRequisitionsPage />} />",
  "<Route path=\"inventory/requisitions\" element={<MaterialRequisitionsPage />} />\n                <Route path=\"labor/contracts\" element={<LaborContractsPage />} />\n                <Route path=\"labor/visas\" element={<LaborVisasPage />} />"
);

fs.writeFileSync('C:/Users/Administrator/Desktop/xmwd/yg-xmgl-new/frontend/src/App.tsx', ap);
console.log('App.tsx updated');
