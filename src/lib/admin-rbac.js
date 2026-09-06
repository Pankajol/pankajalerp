export const PERMISSION_ACTIONS = [
  "create", "view", "edit", "delete", "print", "approve", "reject",
  "import", "export", "upload", "download", "email", "copy", "whatsapp",
];

export const ADMIN_NAVIGATION = {
  "Company": [
    { label: "Company Settings", path: "/admin/company", action: "view" },
    { label: "Countries", path: "/admin/Countries", action: "view" },
    { label: "States", path: "/admin/State", action: "view" },
    { label: "Backup Settings", path: "/admin/backup-settings", action: "edit" },
  ],
  "Customers": [
    { label: "Customer View", path: "/admin/customer-view", action: "view" },
    { label: "Create Customer", path: "/admin/createCustomers", action: "create" },
  ],
  "Suppliers": [
    { label: "Supplier View", path: "/admin/supplier", action: "view" },
    { label: "Create Supplier", path: "/admin/createSupplier", action: "create" },
  ],
  "Items": [
    { label: "Item View", path: "/admin/item", action: "view" },
    { label: "Create Item", path: "/admin/createItem", action: "create" },
  ],
  "Users": [{ label: "Users", path: "/admin/users", action: "view" }],
  "Accounts": [
    { label: "Account Heads", path: "/admin/account-head-view", action: "view" },
    { label: "General Ledger", path: "/admin/bank-head-details-view", action: "view" },
    { label: "Create Account Head", path: "/admin/account-bankhead", action: "create" },
    { label: "Create Ledger", path: "/admin/bank-head-details", action: "create" },
  ],
  "Sales Quotation": [{ label: "Quotations", path: "/admin/sales-quotation-view", action: "view" }, { label: "Create Quotation", path: "/admin/sales-quotation", action: "create" }],
  "Sales Order": [{ label: "Sales Orders", path: "/admin/sales-order-view", action: "view" }, { label: "Create Sales Order", path: "/admin/sales-order", action: "create" }],
  "Sales Invoice": [{ label: "Sales Invoices", path: "/admin/sales-invoice-view", action: "view" }],
  "Delivery": [{ label: "Deliveries", path: "/admin/delivery-view", action: "view" }],
  "Credit Memo": [{ label: "Credit Memos", path: "/admin/credit-memo-veiw", action: "view" }],
  "Sales Report": [{ label: "Sales Reports", path: "/admin/sales-report", action: "view" }, { label: "Sales Board", path: "/admin/sales-board", action: "view" }, { label: "POS Reports", path: "/admin/pos/reports", action: "view" }],
  "Purchase Quotation": [{ label: "Purchase Quotations", path: "/admin/PurchaseQuotationList", action: "view" }],
  "Purchase Order": [{ label: "Purchase Orders", path: "/admin/purchase-order-view", action: "view" }],
  "Purchase Invoice": [{ label: "Purchase Invoices", path: "/admin/purchaseInvoice-view", action: "view" }],
  "GRN": [{ label: "GRN", path: "/admin/grn-view", action: "view" }],
  "Debit Notes": [{ label: "Debit Notes", path: "/admin/debit-notes-view", action: "view" }],
  "Purchase Report": [{ label: "Purchase Reports", path: "/admin/purchase-report", action: "view" }],
  "Inventory": [
    { label: "Inventory", path: "/admin/InventoryView", action: "view" },
    { label: "Inventory Entry", path: "/admin/InventoryEntry", action: "create" },
    { label: "Inventory Ledger", path: "/admin/InventoryAdjustmentsView", action: "view" },
  ],
  "BoM": [{ label: "BoM", path: "/admin/bom-view", action: "view" }],
  "Production Order": [{ label: "Production Orders", path: "/admin/ProductionOrder", action: "view" }],
  "PPC": [
    { label: "PPC Dashboard", path: "/admin/ppc", action: "view" }, { label: "Operators", path: "/admin/ppc/operatorsPage", action: "view" },
    { label: "Machines", path: "/admin/ppc/machinesPage", action: "view" }, { label: "Resources", path: "/admin/ppc/resourcesPage", action: "view" },
    { label: "Machine Outputs", path: "/admin/ppc/machineOutputPage", action: "view" }, { label: "Holidays", path: "/admin/ppc/holidaysPage", action: "view" },
    { label: "Operations", path: "/admin/ppc/operations", action: "view" }, { label: "Job Cards", path: "/admin/ppc/jobcards", action: "view" },
    { label: "Production Planning", path: "/admin/ppc/productionOrderPage", action: "view" }, { label: "Downtime", path: "/admin/ppc/downtime", action: "view" },
  ],
  "Lead Generation": [{ label: "Leads", path: "/admin/crm/leads-view", action: "view" }, { label: "Lead Pipeline", path: "/admin/crm/lead-pipeline", action: "view" }],
  "Opportunity": [{ label: "Opportunities", path: "/admin/crm/opportunities", action: "view" }],
  "Campaign": [{ label: "Campaigns", path: "/admin/crm/campaign", action: "view" }],
  "Email Templates": [{ label: "Email Templates", path: "/admin/email-templates", action: "view" }],
  "Project": [{ label: "Projects", path: "/admin/project", action: "view" }, { label: "Workspaces", path: "/admin/project/workspaces", action: "view" }, { label: "Project Tasks", path: "/admin/project/tasks", action: "view" }, { label: "Project Board", path: "/admin/project/tasks/board", action: "view" }],
  "Task": [{ label: "Tasks", path: "/admin/tasks", action: "view" }, { label: "Task Board", path: "/admin/tasks/board", action: "view" }],
  "employees": [{ label: "Employees", path: "/admin/hr/employees", action: "view" }, { label: "Profile", path: "/admin/hr/profile", action: "view" }, { label: "Employee Dashboard", path: "/admin/hr/Dashboard", action: "view" }, { label: "Employee Onboarding", path: "/admin/hr/employee-onboarding", action: "create" }, { label: "HR Masters", path: "/admin/hr/masters", action: "view" }],
  "attendance": [{ label: "Attendance", path: "/admin/hr/attendance", action: "view" }],
  "leaves": [{ label: "Leaves", path: "/admin/hr/leaves", action: "view" }],
  "payroll": [{ label: "Payroll", path: "/admin/hr/payroll", action: "view" }],
  "Payment Entry": [{ label: "Payments", path: "/admin/Payment", action: "create" }],
  "Journal Entry": [{ label: "Journal Entry", path: "/admin/finance/journal-entry", action: "create" }],
  "Reports": [{ label: "Financial Reports", path: "/admin/finance/report", action: "view" }, { label: "Trial Balance", path: "/admin/finance/report/trial-balance", action: "view" }, { label: "Profit & Loss", path: "/admin/finance/report/profit-loss", action: "view" }, { label: "Balance Sheet", path: "/admin/finance/report/balance-sheet", action: "view" }],
  "Tickets": [{ label: "Tickets", path: "/admin/helpdesk/tickets", action: "view" }],
};

const MODULE_ALIASES = {
  Customers: ["Customer View", "Customer Masters"],
  "Lead Generation": ["Lead Management"],
  Campaign: ["Campaigns"],
  "Sales Report": ["CRM Reports"],
  employees: ["Employees"],
};

const ADMIN_ROUTE_OVERRIDES = [
  { path: "/admin/users", moduleName: "Users", action: "view" },
  { path: "/admin/roles", moduleName: "Users", action: "view" },
  { path: "/admin/company", moduleName: "Company", action: "view" },
  { path: "/admin/Countries", moduleName: "Company", action: "view" },
  { path: "/admin/State", moduleName: "Company", action: "view" },
  { path: "/admin/backup-settings", moduleName: "Company", action: "edit" },
  { path: "/admin/createCustomers", moduleName: "Customers", action: "create" },
  { path: "/admin/customer-view", moduleName: "Customers", action: "view" },
  { path: "/admin/createSupplier", moduleName: "Suppliers", action: "create" },
  { path: "/admin/supplier", moduleName: "Suppliers", action: "view" },
  { path: "/admin/createItem", moduleName: "Items", action: "create" },
  { path: "/admin/item", moduleName: "Items", action: "view" },
  { path: "/admin/item-view", moduleName: "Items", action: "view" },
  { path: "/admin/account-bankhead", moduleName: "Accounts", action: "create" },
  { path: "/admin/account-head-view", moduleName: "Accounts", action: "view" },
  { path: "/admin/bank-head-details", moduleName: "Accounts", action: "create" },
  { path: "/admin/bank-head-details-view", moduleName: "Accounts", action: "view" },
  { path: "/admin/sales-quotation", moduleName: "Sales Quotation", action: "create" },
  { path: "/admin/sales-quotation-view", moduleName: "Sales Quotation", action: "view" },
  { path: "/admin/sales-order", moduleName: "Sales Order", action: "create" },
  { path: "/admin/sales-order-view", moduleName: "Sales Order", action: "view" },
  { path: "/admin/sales-invoice-view", moduleName: "Sales Invoice", action: "view" },
  { path: "/admin/pos", moduleName: "Sales Report", action: "view" },
  { path: "/admin/pos/reports", moduleName: "Sales Report", action: "view" },
  { path: "/admin/sales-report", moduleName: "Sales Report", action: "view" },
  { path: "/admin/sales-board", moduleName: "Sales Report", action: "view" },
  { path: "/admin/delivery-view", moduleName: "Delivery", action: "view" },
  { path: "/admin/credit-memo-veiw", moduleName: "Credit Memo", action: "view" },
  { path: "/admin/PurchaseQuotationList", moduleName: "Purchase Quotation", action: "view" },
  { path: "/admin/purchase-order", moduleName: "Purchase Order", action: "create" },
  { path: "/admin/purchase-order-view", moduleName: "Purchase Order", action: "view" },
  { path: "/admin/purchaseInvoice-view", moduleName: "Purchase Invoice", action: "view" },
  { path: "/admin/grn-view", moduleName: "GRN", action: "view" },
  { path: "/admin/GRN", moduleName: "GRN", action: "create" },
  { path: "/admin/debit-notes-view", moduleName: "Debit Notes", action: "view" },
  { path: "/admin/purchase-report", moduleName: "Purchase Report", action: "view" },
  { path: "/admin/InventoryView", moduleName: "Inventory", action: "view" },
  { path: "/admin/InventoryEntry", moduleName: "Inventory", action: "create" },
  { path: "/admin/InventoryAdjustmentsView", moduleName: "Inventory", action: "view" },
  { path: "/admin/gate-entry", moduleName: "Inventory", action: "create" },
  { path: "/admin/bom", moduleName: "BoM", action: "create" },
  { path: "/admin/bom-view", moduleName: "BoM", action: "view" },
  { path: "/admin/ProductionOrder", moduleName: "Production Order", action: "view" },
  { path: "/admin/production-board", moduleName: "Production Order", action: "view" },
  { path: "/admin/production", moduleName: "Production Order", action: "view" },
  { path: "/admin/production/reports", moduleName: "Production Order", action: "view" },
  { path: "/admin/ppc", moduleName: "PPC", action: "view" },
  { path: "/admin/ppc/operatorsPage", moduleName: "PPC", action: "view" },
  { path: "/admin/ppc/machinesPage", moduleName: "PPC", action: "view" },
  { path: "/admin/ppc/resourcesPage", moduleName: "PPC", action: "view" },
  { path: "/admin/ppc/machineOutputPage", moduleName: "PPC", action: "view" },
  { path: "/admin/ppc/holidaysPage", moduleName: "PPC", action: "view" },
  { path: "/admin/ppc/operatorMachineMappingPage", moduleName: "PPC", action: "view" },
  { path: "/admin/ppc/operations", moduleName: "PPC", action: "view" },
  { path: "/admin/ppc/productionOrderPage", moduleName: "PPC", action: "view" },
  { path: "/admin/ppc/jobcards", moduleName: "PPC", action: "view" },
  { path: "/admin/ppc/downtime", moduleName: "PPC", action: "view" },
  { path: "/admin/crm/leads-view", moduleName: "Lead Generation", action: "view" },
  { path: "/admin/crm/lead-pipeline", moduleName: "Lead Generation", action: "view" },
  { path: "/admin/crm/opportunities", moduleName: "Opportunity", action: "view" },
  { path: "/admin/crm/campaign", moduleName: "Campaign", action: "view" },
  { path: "/admin/crm/calls", moduleName: "Campaign", action: "view" },
  { path: "/admin/email-templates", moduleName: "Email Templates", action: "view" },
  { path: "/admin/email-masters", moduleName: "Email Templates", action: "view" },
  { path: "/admin/project", moduleName: "Project", action: "view" },
  { path: "/admin/project/projects", moduleName: "Project", action: "view" },
  { path: "/admin/project/workspaces", moduleName: "Project", action: "view" },
  { path: "/admin/project/tasks", moduleName: "Task", action: "view" },
  { path: "/admin/project/tasks/board", moduleName: "Task", action: "view" },
  { path: "/admin/tasks", moduleName: "Task", action: "view" },
  { path: "/admin/tasks/board", moduleName: "Task", action: "view" },
  { path: "/admin/hr/employees", moduleName: "employees", action: "view" },
  { path: "/admin/hr/profile", moduleName: "employees", action: "view" },
  { path: "/admin/hr/Dashboard", moduleName: "employees", action: "view" },
  { path: "/admin/hr/employee-onboarding", moduleName: "employees", action: "create" },
  { path: "/admin/hr/masters", moduleName: "employees", action: "view" },
  { path: "/admin/hr/attendance", moduleName: "attendance", action: "view" },
  { path: "/admin/hr/my-attendance", moduleName: "attendance", action: "view" },
  { path: "/admin/hr/my-attendance/history", moduleName: "attendance", action: "view" },
  { path: "/admin/hr/leaves", moduleName: "leaves", action: "view" },
  { path: "/admin/hr/my-leaves", moduleName: "leaves", action: "view" },
  { path: "/admin/hr/payroll", moduleName: "payroll", action: "view" },
  { path: "/admin/hr/salary", moduleName: "payroll", action: "view" },
  { path: "/admin/hr/my-salary", moduleName: "payroll", action: "view" },
  { path: "/admin/Payment", moduleName: "Payment Entry", action: "create" },
  { path: "/admin/finance/journal-entry", moduleName: "Journal Entry", action: "create" },
  { path: "/admin/finance/report", moduleName: "Reports", action: "view" },
  { path: "/admin/finance/report/trial-balance", moduleName: "Reports", action: "view" },
  { path: "/admin/finance/report/profit-loss", moduleName: "Reports", action: "view" },
  { path: "/admin/finance/report/balance-sheet", moduleName: "Reports", action: "view" },
  { path: "/admin/finance/report/cash-flow", moduleName: "Reports", action: "view" },
  { path: "/admin/finance/report/bank-reconciliation", moduleName: "Reports", action: "view" },
  { path: "/admin/finance/report/gst", moduleName: "Reports", action: "view" },
  { path: "/admin/finance/budget", moduleName: "Reports", action: "view" },
  { path: "/admin/finance/report/ageing/customer", moduleName: "Reports", action: "view" },
  { path: "/admin/finance/report/ageing/supplier", moduleName: "Reports", action: "view" },
  { path: "/admin/finance/report/statement/customer", moduleName: "Reports", action: "view" },
  { path: "/admin/finance/report/statement/supplier", moduleName: "Reports", action: "view" },
  { path: "/admin/finance/report/statement/bank", moduleName: "Reports", action: "view" },
  { path: "/admin/helpdesk/tickets", moduleName: "Tickets", action: "view" },
  { path: "/admin/helpdesk/agents", moduleName: "Tickets", action: "view" },
  { path: "/admin/helpdesk/feedback", moduleName: "Tickets", action: "view" },
  { path: "/admin/helpdesk/feedback/analytics", moduleName: "Tickets", action: "view" },
  { path: "/admin/helpdesk/analytics", moduleName: "Tickets", action: "view" },
  { path: "/admin/helpdesk/report", moduleName: "Tickets", action: "view" },
  { path: "/admin/helpdesk/sla", moduleName: "Tickets", action: "view" },
  { path: "/admin/helpdesk/categories", moduleName: "Tickets", action: "view" },
  { path: "/admin/helpdesk/page", moduleName: "Tickets", action: "view" },
];

export function isFullAccessUser(user) {
  return user?.type?.toLowerCase() === "company" || user?.roles?.includes("Admin");
}

export function hasAnyAdminAccess(user) {
  if (isFullAccessUser(user)) return true;
  const normalizedModules = normalizeModules(user?.modules);
  return Object.values(normalizedModules).some((module) => {
    if (module.selected) return true;
    return Object.values(module.permissions || {}).some(Boolean);
  });
}

export function hasModulePermission(user, moduleName, action = "view") {
  if (isFullAccessUser(user)) return true;
  const candidates = [moduleName, moduleName?.toLowerCase(), ...(MODULE_ALIASES[moduleName] || [])];
  return candidates.some((name) => {
    const module = user?.modules?.[name];
    return Boolean(module?.selected && module.permissions?.[action]);
  });
}

export function getVisibleAdminNavigation(user) {
  if (isFullAccessUser(user)) return ADMIN_NAVIGATION;
  return Object.fromEntries(Object.entries(ADMIN_NAVIGATION)
    .map(([moduleName, routes]) => [moduleName, routes.filter((route) => hasModulePermission(user, moduleName, route.action))])
    .filter(([, routes]) => routes.length));
}

export function findAdminRoute(pathname) {
  const routes = Object.entries(ADMIN_NAVIGATION).flatMap(([moduleName, entries]) =>
    entries.map((entry) => ({ ...entry, moduleName }))
  );
  const explicitRoute = routes
    .filter((entry) => pathname === entry.path || pathname.startsWith(`${entry.path}/`))
    .sort((left, right) => right.path.length - left.path.length)[0] || null;

  if (explicitRoute) return explicitRoute;

  return ADMIN_ROUTE_OVERRIDES
    .filter((entry) => pathname === entry.path || pathname.startsWith(`${entry.path}/`))
    .sort((left, right) => right.path.length - left.path.length)[0] || null;
}

export function canAccessAdminPath(user, pathname) {
  if (!user) return false;
  if (isFullAccessUser(user)) return true;
  if (pathname === "/admin" || pathname === "/admin/") {
    return hasAnyAdminAccess(user);
  }
  const route = findAdminRoute(pathname);
  return Boolean(route && hasModulePermission(user, route.moduleName, route.action));
}

export function normalizeModules(modules = {}) {
  if (!modules || typeof modules !== "object" || Array.isArray(modules)) return {};
  return Object.fromEntries(Object.entries(modules).map(([moduleName, config]) => {
    const permissions = Object.fromEntries(PERMISSION_ACTIONS.map((action) => [action, config?.permissions?.[action] === true]));
    return [moduleName.trim(), { selected: config?.selected === true, permissions }];
  }).filter(([moduleName]) => moduleName));
}
