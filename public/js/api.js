// ============================================================
// API Layer
// ============================================================
function apiJson(r) { if (!r.ok) throw new Error(r.status + ' ' + r.statusText); return r.json(); }

const API = {
  // 企業
  getCompanies: () => fetch('/api/companies').then(apiJson),
  createCompany: (c) => fetch('/api/companies', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c) }).then(apiJson),
  updateCompany: (id, c) => fetch('/api/companies/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c) }).then(apiJson),
  deleteCompany: (id) => fetch('/api/companies/' + id, { method: 'DELETE' }).then(apiJson),
  bulkImport: (arr) => fetch('/api/companies/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(arr) }).then(apiJson),
  exportCSV: () => fetch('/api/companies/export').then(r => r.blob()).then(b => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'companies.csv'; a.click();
  }),

  // 電話番号
  addPhone: (companyId, p) => fetch('/api/companies/' + companyId + '/phones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) }).then(apiJson),
  updatePhone: (id, p) => fetch('/api/phones/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) }).then(apiJson),
  deletePhone: (id) => fetch('/api/phones/' + id, { method: 'DELETE' }).then(apiJson),
  searchPhone: (q) => fetch('/api/phones/search?q=' + encodeURIComponent(q)).then(apiJson),

  // 営業行動
  getActivities: (companyId) => fetch('/api/companies/' + companyId + '/activities').then(apiJson),
  addActivity: (companyId, a) => fetch('/api/companies/' + companyId + '/activities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(a) }).then(apiJson),
  updateActivity: (id, a) => fetch('/api/activities/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(a) }).then(apiJson),
  deleteActivity: (id) => fetch('/api/activities/' + id, { method: 'DELETE' }).then(apiJson),

  // 案件
  getDeals: (params) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetch('/api/deals' + qs).then(apiJson);
  },
  getCompanyDeals: (companyId) => fetch('/api/companies/' + companyId + '/deals').then(apiJson),
  createDeal: (d) => fetch('/api/deals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }).then(apiJson),
  updateDeal: (id, d) => fetch('/api/deals/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }).then(apiJson),
  deleteDeal: (id) => fetch('/api/deals/' + id, { method: 'DELETE' }).then(apiJson),

  // ダッシュボード
  getDashboardStats: () => fetch('/api/dashboard/stats').then(apiJson),
  getDailyCalls: () => fetch('/api/dashboard/daily-calls').then(apiJson),
  getByAgent: () => fetch('/api/dashboard/by-agent').then(apiJson),
  getAgentReport: (name, from, to) => {
    let qs = '';
    if (from && to) qs = '?from=' + from + '&to=' + to;
    return fetch('/api/report/agent/' + encodeURIComponent(name) + qs).then(apiJson);
  },

  // カレンダー
  getCalendar: (year, month) => fetch('/api/calendar/' + year + '/' + month).then(apiJson),

  // マスタ
  getPlans: () => fetch('/api/plans').then(apiJson),
  createPlan: (p) => fetch('/api/plans', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) }).then(apiJson),
  updatePlan: (id, p) => fetch('/api/plans/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) }).then(apiJson),
  deletePlan: (id) => fetch('/api/plans/' + id, { method: 'DELETE' }).then(apiJson),

  getAgents: () => fetch('/api/agents').then(apiJson),
  createAgent: (name) => fetch('/api/agents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) }).then(apiJson),
  deleteAgent: (id) => fetch('/api/agents/' + id, { method: 'DELETE' }).then(apiJson),

  getCreditCompanies: () => fetch('/api/credit-companies').then(apiJson),
  createCreditCompany: (name) => fetch('/api/credit-companies', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) }).then(apiJson),
  deleteCreditCompany: (id) => fetch('/api/credit-companies/' + id, { method: 'DELETE' }).then(apiJson),

  // 検索条件
  getFilters: () => fetch('/api/filters').then(apiJson),
  saveFilter: (name, filters) => fetch('/api/filters', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, filters }) }).then(apiJson),
  deleteFilter: (id) => fetch('/api/filters/' + id, { method: 'DELETE' }).then(apiJson),
};
