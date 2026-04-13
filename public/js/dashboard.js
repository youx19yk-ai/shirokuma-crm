// ============================================================
// ダッシュボード画面（4タブ: 成績管理/当日タスク/営業スケジュール/制作管理）
// ============================================================
function DashboardPage({ onNavigate, agents, plans, creditCompanies }) {
  // --- タブ ---
  var _tab = useState("performance"), dashTab = _tab[0], setDashTab = _tab[1];

  // --- 成績管理 State ---
  var _period = useState("month"), period = _period[0], setPeriod = _period[1];
  var _offset = useState(0), periodOffset = _offset[0], setPeriodOffset = _offset[1];
  var _team = useState(""), filterTeam = _team[0], setFilterTeam = _team[1];
  var _agent = useState(""), filterAgent = _agent[0], setFilterAgent = _agent[1];
  var _kpi = useState(null), kpiData = _kpi[0], setKpiData = _kpi[1];
  var _kpiLoad = useState(false), kpiLoading = _kpiLoad[0], setKpiLoading = _kpiLoad[1];

  // --- 当日タスク State ---
  var _stats = useState(null), stats = _stats[0], setStats = _stats[1];
  var _daily = useState([]), dailyCalls = _daily[0], setDailyCalls = _daily[1];
  var _taskAgent = useState(""), taskAgent = _taskAgent[0], setTaskAgent = _taskAgent[1];

  // --- 営業スケジュール State ---
  var _calY = useState(new Date().getFullYear()), calYear = _calY[0], setCalYear = _calY[1];
  var _calM = useState(new Date().getMonth() + 1), calMonth = _calM[0], setCalMonth = _calM[1];
  var _calData = useState(null), calData = _calData[0], setCalData = _calData[1];
  var _calAgent = useState(""), calAgent = _calAgent[0], setCalAgent = _calAgent[1];

  // --- 制作管理 State ---
  var _deals = useState([]), deals = _deals[0], setDeals = _deals[1];
  var _prodAgent = useState(""), prodAgent = _prodAgent[0], setProdAgent = _prodAgent[1];
  var _prodStatus = useState(""), prodStatus = _prodStatus[0], setProdStatus = _prodStatus[1];
  var _prodPay = useState(""), prodPay = _prodPay[0], setProdPay = _prodPay[1];

  var _loading = useState(true), loading = _loading[0], setLoading = _loading[1];

  // ============================================================
  // 期間計算
  // ============================================================
  function calcPeriod(type, offset) {
    var now = new Date();
    var from, to, label;
    if (type === "day") {
      var d = new Date(now); d.setDate(d.getDate() + offset);
      var ds = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
      from = ds; to = ds;
      label = d.getFullYear() + "年" + (d.getMonth()+1) + "月" + d.getDate() + "日";
    } else if (type === "week") {
      var base = new Date(now); base.setDate(base.getDate() + offset * 7);
      var dow = base.getDay(); var mon = new Date(base); mon.setDate(mon.getDate() - ((dow + 6) % 7));
      var sun = new Date(mon); sun.setDate(sun.getDate() + 6);
      from = mon.getFullYear() + '-' + String(mon.getMonth()+1).padStart(2,'0') + '-' + String(mon.getDate()).padStart(2,'0');
      to = sun.getFullYear() + '-' + String(sun.getMonth()+1).padStart(2,'0') + '-' + String(sun.getDate()).padStart(2,'0');
      label = mon.getFullYear() + "年" + (mon.getMonth()+1) + "月" + mon.getDate() + "日〜" + sun.getDate() + "日";
    } else if (type === "month") {
      var m = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      from = m.getFullYear() + '-' + String(m.getMonth()+1).padStart(2,'0') + '-01';
      var last = new Date(m.getFullYear(), m.getMonth()+1, 0);
      to = last.getFullYear() + '-' + String(last.getMonth()+1).padStart(2,'0') + '-' + String(last.getDate()).padStart(2,'0');
      label = m.getFullYear() + "年" + (m.getMonth()+1) + "月";
    } else {
      var y = now.getFullYear() + offset;
      from = y + '-01-01'; to = y + '-12-31';
      label = y + "年";
    }
    return { from: from, to: to, label: label };
  }

  // ============================================================
  // データ読み込み
  // ============================================================
  function loadKpi() {
    setKpiLoading(true);
    var p = calcPeriod(period, periodOffset);
    var params = { from: p.from, to: p.to };
    if (filterTeam) params.team = filterTeam;
    if (filterAgent) params.agent = filterAgent;
    API.getKpi(params).then(function(data) {
      setKpiData(data);
      setKpiLoading(false);
    }).catch(function() {
      // デモデータ
      setKpiData({
        agents: [
          { name: "小林優人", team: "1課", totalProfit: 1280000, totalAmount: 2000000, contractCount: 8, completedDeals: 6, selfAppoCount: 5, assignedAppoCount: 6, visitCount: 24, selfVisitCount: 18, appoCount: 24, proposalCount: 15, decisionCount: 10, contactCount: 85, callCount: 320, avgProfit: 160000, contractRate: 33, completionRate: 75, visitRate: 75, appoRate: 7.5, proposalRate: 4.7, decisionRate: 3.1, callTypeRates: { "アポ": 7.5, "決済通話": 12.5, "担当者通話": 18.8, "受付通話": 8.1, "不通": 48.4, "提案完了": 4.7, "決裁": 0, "コールのみ": 0 }, targets: [{ yearMonth: p.from.slice(0,7), grossProfitTarget: 1500000, contractTarget: 10 }] },
          { name: "中川翔", team: "1課", totalProfit: 960000, totalAmount: 1500000, contractCount: 5, completedDeals: 4, selfAppoCount: 3, assignedAppoCount: 4, visitCount: 16, selfVisitCount: 12, appoCount: 16, proposalCount: 10, decisionCount: 7, contactCount: 62, callCount: 245, avgProfit: 192000, contractRate: 31, completionRate: 80, visitRate: 69, appoRate: 6.5, proposalRate: 4.1, decisionRate: 2.9, callTypeRates: { "アポ": 6.5, "決済通話": 11.0, "担当者通話": 16.3, "受付通話": 9.4, "不通": 52.7, "提案完了": 4.1, "決裁": 0, "コールのみ": 0 }, targets: [{ yearMonth: p.from.slice(0,7), grossProfitTarget: 1200000, contractTarget: 8 }] }
        ],
        totals: { totalProfit: 2240000, totalAmount: 3500000, contractCount: 13, appoCount: 40, visitCount: 40, callCount: 565, contactCount: 147, proposalCount: 25, decisionCount: 17, avgProfit: 172308 },
        period: { from: p.from, to: p.to }
      });
      setKpiLoading(false);
    });
  }

  function loadTasks() {
    Promise.all([
      API.getDashboardStats(),
      API.getDailyCalls()
    ]).then(function(res) {
      setStats(res[0]);
      setDailyCalls(res[1]);
    }).catch(function() {
      setStats({
        totalCompanies: 15, byStatus: { "見込み": 8, "顧客": 4, "休眠": 3 },
        monthCalls: 45, monthAppo: 12, monthDeals: 5,
        byProspectOwner: { "小林優人": 18, "中川翔": 15 },
        todayTasks: [
          { id: "t1", name: "株式会社山田建設", agent: "小林優人", date: todayStr(), memo: "見積もり確認" },
          { id: "t2", name: "有限会社ミライテック", agent: "中川翔", date: todayStr(), memo: "資料送付後" },
          { id: "t3", name: "株式会社ビューティーラボ", agent: "小林優人", date: todayStr(), memo: "見積もり回答待ち" },
          { id: "t4", name: "有限会社海鮮まつり", agent: "中川翔", date: todayStr(), memo: "新店舗オープン" },
          { id: "t5", name: "株式会社富士観光", agent: "小林優人", date: todayStr(), memo: "GW前に提案" }
        ],
        overdue: [
          { id: "o1", name: "有限会社鈴木電気", agent: "小林優人", date: "2026-04-06", memo: "" },
          { id: "o2", name: "株式会社松風建材", agent: "中川翔", date: "2026-04-09", memo: "" },
          { id: "o3", name: "合同会社クラフトビール東京", agent: "中川翔", date: "2026-04-09", memo: "" }
        ]
      });
      setDailyCalls(Array.from({ length: 30 }, function(_, i) {
        var d = new Date(); d.setDate(d.getDate() - 29 + i);
        return { date: d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'), count: String(Math.floor(Math.random() * 15) + 2) };
      }));
    });
  }

  function loadCalendar() {
    API.getCalendar(calYear, calMonth).then(function(data) {
      setCalData(data);
    }).catch(function() {
      setCalData({ calls: [], visits: [], deals: [] });
    });
  }

  function loadDeals() {
    API.getDeals().then(function(data) {
      setDeals(data);
    }).catch(function() {
      setDeals([
        { id: "d1", title: "HPプランB", companyName: "山田建設", agent: "小林優人", paymentMethod: "信販", contractDate: "2026-01-15", interviewDate: "2026-04-16", deliveryDate: "", status: "取材予定", contractAmount: 500000, grossProfit: 300000 },
        { id: "d2", title: "LPプランA", companyName: "鈴木電気", agent: "中川翔", paymentMethod: "現金", contractDate: "2026-02-01", interviewDate: "2026-02-20", deliveryDate: "2026-04-23", status: "納品予定", contractAmount: 300000, grossProfit: 180000 },
        { id: "d3", title: "HPプランA", companyName: "テクノソリューション", agent: "小林優人", paymentMethod: "信販", contractDate: "2026-01-20", interviewDate: "", deliveryDate: "", status: "審査中", contractAmount: 300000, grossProfit: 200000 },
        { id: "d4", title: "HPプランB", companyName: "コスモ不動産", agent: "小林優人", paymentMethod: "信販", contractDate: "2026-01-10", interviewDate: "2026-02-05", deliveryDate: "2026-03-01", status: "入金予定", contractAmount: 500000, grossProfit: 320000 },
        { id: "d5", title: "LPプランA", companyName: "ダイヤモンド工機", agent: "中川翔", paymentMethod: "現金", contractDate: "2025-12-20", interviewDate: "2026-01-15", deliveryDate: "2026-02-10", status: "入金済み", contractAmount: 150000, grossProfit: 90000 },
        { id: "d6", title: "HPプランA", companyName: "メディカルプラス", agent: "小林優人", paymentMethod: "信販", contractDate: "2025-11-10", interviewDate: "2025-12-01", deliveryDate: "2026-01-15", status: "入金済み", contractAmount: 300000, grossProfit: 180000 },
        { id: "d7", title: "HPプランA", companyName: "フレッシュフーズ", agent: "中川翔", paymentMethod: "現金", contractDate: "2026-02-15", interviewDate: "2026-03-10", deliveryDate: "", status: "取材完了", contractAmount: 300000, grossProfit: 180000 },
        { id: "d8", title: "HPプランB", companyName: "あおぞら会", agent: "小林優人", paymentMethod: "信販", contractDate: "2026-03-25", interviewDate: "", deliveryDate: "", status: "契約済", contractAmount: 500000, grossProfit: 300000 }
      ]);
    });
  }

  // 初回読み込み
  useEffect(function() {
    Promise.all([
      loadTasks(),
      loadDeals()
    ]).then(function() { setLoading(false); }).catch(function() { setLoading(false); });
    loadKpi();
    loadCalendar();
  }, []);

  // KPI再読み込み
  useEffect(function() { loadKpi(); }, [period, periodOffset, filterTeam, filterAgent]);
  useEffect(function() { loadCalendar(); }, [calYear, calMonth]);

  // ============================================================
  // タブ切替
  // ============================================================
  var TABS = [
    { key: "performance", label: "成績管理" },
    { key: "tasks", label: "当日タスク" },
    { key: "schedule", label: "営業スケジュール" },
    { key: "production", label: "制作管理" }
  ];

  // チーム別担当者
  var teamAgents = (agents || []).filter(function(a) {
    if (!filterTeam) return true;
    return a.team === filterTeam;
  });

  // ============================================================
  // 成績管理タブ
  // ============================================================
  function renderPerformance() {
    var p = calcPeriod(period, periodOffset);
    var data = kpiData || { agents: [], totals: {}, period: {} };
    var agentList = data.agents || [];

    // チーム別集計
    var teams = {};
    agentList.forEach(function(a) {
      var t = a.team || "未設定";
      if (!teams[t]) teams[t] = [];
      teams[t].push(a);
    });

    function teamTotal(teamAgents) {
      var t = {};
      var fields = ['totalProfit','totalAmount','contractCount','completedDeals','selfAppoCount','assignedAppoCount','visitCount','selfVisitCount','appoCount','proposalCount','decisionCount','contactCount','callCount'];
      fields.forEach(function(f) { t[f] = teamAgents.reduce(function(s, a) { return s + (a[f] || 0); }, 0); });
      t.avgProfit = t.contractCount > 0 ? Math.round(t.totalProfit / t.contractCount) : 0;
      t.contractRate = t.appoCount > 0 ? Math.round((t.contractCount / t.appoCount) * 100) : 0;
      t.completionRate = t.contractCount > 0 ? Math.round((t.completedDeals / t.contractCount) * 100) : 0;
      t.visitRate = t.appoCount > 0 ? Math.round((t.visitCount / t.appoCount) * 100) : 0;
      t.appoRate = t.callCount > 0 ? Math.round((t.appoCount / t.callCount) * 1000) / 10 : 0;
      t.proposalRate = t.callCount > 0 ? Math.round((t.proposalCount / t.callCount) * 1000) / 10 : 0;
      t.decisionRate = t.callCount > 0 ? Math.round((t.decisionCount / t.callCount) * 1000) / 10 : 0;
      // 各通話率
      t.callTypeRates = {};
      ['アポ','決済通話','担当者通話','受付通話','不通','提案完了','決裁','コールのみ'].forEach(function(ct) {
        var sum = teamAgents.reduce(function(s, a) { return s + (a.callTypeRates ? (a.callTypeRates[ct] || 0) * a.callCount / 100 : 0); }, 0);
        t.callTypeRates[ct] = t.callCount > 0 ? Math.round(sum / t.callCount * 1000) / 10 : 0;
      });
      // 目標合計
      t.grossProfitTarget = teamAgents.reduce(function(s, a) {
        var tgt = (a.targets || []).reduce(function(ss, tt) { return ss + (tt.grossProfitTarget || 0); }, 0);
        return s + tgt;
      }, 0);
      t.contractTarget = teamAgents.reduce(function(s, a) {
        var tgt = (a.targets || []).reduce(function(ss, tt) { return ss + (tt.contractTarget || 0); }, 0);
        return s + tgt;
      }, 0);
      return t;
    }

    var allTotal = teamTotal(agentList);

    // テーブルヘッダー列構築
    var cols = [];
    agentList.forEach(function(a) { cols.push({ key: 'agent_' + a.name, label: a.name, data: a, type: 'agent' }); });
    var teamKeys = Object.keys(teams);
    teamKeys.forEach(function(tk) {
      if (teams[tk].length > 1 || teamKeys.length > 1) {
        cols.push({ key: 'team_' + tk, label: tk + "計", data: teamTotal(teams[tk]), type: 'team' });
      }
    });
    cols.push({ key: 'total', label: "全体", data: allTotal, type: 'total' });

    function getTarget(agentData, field) {
      if (!agentData || !agentData.targets || agentData.targets.length === 0) return 0;
      return agentData.targets.reduce(function(s, t) { return s + (t[field] || 0); }, 0);
    }

    // KPI行定義
    var sections = [
      { title: "KGI", rows: [
        { label: "獲得粗利", field: "totalProfit", fmt: "money", cls: "vy" },
        { label: "目標", custom: function(d) { return d.type === 'agent' ? getTarget(d.data, 'grossProfitTarget') : (d.data.grossProfitTarget || 0); }, fmt: "money", cls: "v" },
        { label: "目標差異", custom: function(d) {
          var actual = d.data.totalProfit || 0;
          var target = d.type === 'agent' ? getTarget(d.data, 'grossProfitTarget') : (d.data.grossProfitTarget || 0);
          return actual - target;
        }, fmt: "money_diff", cls: "auto" }
      ]},
      { title: "KPI量", rows: [
        { label: "完了数", field: "completedDeals", cls: "vg" },
        { label: "契約数", field: "contractCount", cls: "vg" },
        { label: "自己アポ契約", field: "selfAppoCount", cls: "v" },
        { label: "自己アポ数", field: "selfAppoCount", cls: "v" },
        { label: "振りアポ数", field: "assignedAppoCount", cls: "v" },
        { label: "総行動数", field: "visitCount", cls: "v" },
        { label: "自己アポ行動", field: "selfVisitCount", cls: "v" }
      ]},
      { title: "活動指標", rows: [
        { label: "アポ数", field: "appoCount", cls: "v" },
        { label: "提案完了数", field: "proposalCount", cls: "v" },
        { label: "決裁数", field: "decisionCount", cls: "v" },
        { label: "接触数", field: "contactCount", cls: "v" },
        { label: "コール数", field: "callCount", cls: "v" }
      ]},
      { title: "歩留まり率", rows: [
        { label: "平均粗利", field: "avgProfit", fmt: "money", cls: "vy" },
        { label: "契約率", field: "contractRate", fmt: "pct", cls: "vb" },
        { label: "完了率", field: "completionRate", fmt: "pct", cls: "v" },
        { label: "行動率", field: "visitRate", fmt: "pct", cls: "v" },
        { label: "アポ率", field: "appoRate", fmt: "pct", cls: "v" },
        { label: "提案完了率", field: "proposalRate", fmt: "pct", cls: "v" },
        { label: "決裁率", field: "decisionRate", fmt: "pct", cls: "v" }
      ]},
      { title: "各通話率", rows: [
        { label: "アポ率", callType: "アポ", cls: "v" },
        { label: "決済通話率", callType: "決済通話", cls: "v" },
        { label: "担当者通話率", callType: "担当者通話", cls: "v" },
        { label: "受付通話率", callType: "受付通話", cls: "v" },
        { label: "不通率", callType: "不通", cls: "v" },
        { label: "提案完了率", callType: "提案完了", cls: "v" },
        { label: "コールのみ率", callType: "コールのみ", cls: "v" }
      ]}
    ];

    function fmtVal(val, fmt) {
      if (fmt === "money") return fmtMoney(val);
      if (fmt === "money_diff") return (val >= 0 ? "+" : "") + fmtMoney(val);
      if (fmt === "pct") return val + "%";
      return val;
    }

    function valClass(val, cls, fmt) {
      if (cls === "auto") {
        if (fmt === "money_diff") return val >= 0 ? "kpi-vg" : "kpi-vr";
        return "kpi-v";
      }
      return "kpi-" + cls;
    }

    function getCellVal(col, row) {
      if (row.custom) return row.custom(col);
      if (row.callType) {
        var rates = col.data.callTypeRates || {};
        return rates[row.callType] || 0;
      }
      return col.data[row.field] || 0;
    }

    return h("div", null,
      // フィルタバー
      h("div", { className: "dash-filter-bar" },
        h("div", { className: "period-btns" },
          ["day","week","month","year"].map(function(p) {
            var labels = { day: "日", week: "週", month: "月", year: "年" };
            return h("button", { key: p, className: "period-btn" + (period === p ? " active" : ""),
              onClick: function() { setPeriod(p); setPeriodOffset(0); }
            }, labels[p]);
          })
        ),
        h("button", { className: "dash-nav-btn", onClick: function() { setPeriodOffset(periodOffset - 1); } }, "<"),
        h("span", { className: "period-label" }, p.label),
        h("button", { className: "dash-nav-btn", onClick: function() { setPeriodOffset(periodOffset + 1); } }, ">"),
        h("div", { style: { flex: 1 } }),
        h("select", { className: "dash-sel", value: filterTeam, onChange: function(e) { setFilterTeam(e.target.value); setFilterAgent(""); } },
          h("option", { value: "" }, "全体"),
          h("option", { value: "1課" }, "1課"),
          h("option", { value: "2課" }, "2課")
        ),
        h("select", { className: "dash-sel", value: filterAgent, onChange: function(e) { setFilterAgent(e.target.value); } },
          h("option", { value: "" }, "全員"),
          teamAgents.map(function(a) { return h("option", { key: a.id, value: a.name }, a.name); })
        )
      ),
      // KPIテーブル
      kpiLoading
        ? h("div", { className: "flex-center", style: { height: 200 } }, h("div", { className: "text-muted" }, "読み込み中..."))
        : h("div", { style: { overflowX: "auto" } },
            h("table", { className: "kpi-table" },
              h("thead", null,
                h("tr", null,
                  h("th", { style: { width: 130 } }),
                  cols.map(function(c) {
                    return h("th", { key: c.key, className: c.type === 'team' ? "kpi-ct" : c.type === 'total' ? "kpi-ca" : "" }, c.label);
                  })
                )
              ),
              h("tbody", null,
                sections.map(function(sec) {
                  return [
                    h("tr", { key: "sh_" + sec.title, className: "kpi-sh" },
                      h("td", { colSpan: cols.length + 1 }, sec.title)
                    )
                  ].concat(sec.rows.map(function(row) {
                    return h("tr", { key: row.label },
                      h("td", { className: "kpi-rl" }, row.label),
                      cols.map(function(c) {
                        var val = getCellVal(c, row);
                        var fmt = row.fmt || (row.callType ? "pct" : undefined);
                        return h("td", { key: c.key, className: valClass(val, row.cls, fmt) + (c.type === 'team' ? " kpi-ct" : c.type === 'total' ? " kpi-ca" : "") },
                          fmtVal(val, fmt)
                        );
                      })
                    );
                  }));
                }).flat()
              )
            )
          )
    );
  }

  // ============================================================
  // 当日タスクタブ
  // ============================================================
  function renderTasks() {
    if (!stats) return h("div", { className: "flex-center", style: { height: 200 } }, h("div", { className: "text-muted" }, "読み込み中..."));

    var today = new Date();
    var dayNames = ["日","月","火","水","木","金","土"];
    var todayLabel = today.getFullYear() + "年" + (today.getMonth()+1) + "月" + today.getDate() + "日（" + dayNames[today.getDay()] + "）";

    var todayTasks = (stats.todayTasks || []).filter(function(t) { return !taskAgent || t.agent === taskAgent; });
    var overdueTasks = (stats.overdue || []).filter(function(t) { return !taskAgent || t.agent === taskAgent; });
    var byOwner = stats.byProspectOwner || {};

    return h("div", null,
      h("div", { className: "dash-filter-bar" },
        h("span", { className: "period-label" }, todayLabel),
        h("div", { style: { flex: 1 } }),
        h("select", { className: "dash-sel", value: taskAgent, onChange: function(e) { setTaskAgent(e.target.value); } },
          h("option", { value: "" }, "全員"),
          (agents || []).map(function(a) { return h("option", { key: a.id, value: a.name }, a.name); })
        )
      ),
      // タスク2列
      h("div", { className: "dashboard-grid" },
        h("div", { className: "card", style: { padding: 14 } },
          h("div", { className: "dash-card-title", style: { color: "#7c8cf8" } }, "今日のコール予定（" + todayTasks.length + "件）"),
          todayTasks.length === 0
            ? h("div", { className: "text-muted text-sm", style: { padding: 12 } }, "今日の予定はありません")
            : h("table", { className: "dash-task-table" },
                h("tbody", null, todayTasks.map(function(t) {
                  return h("tr", { key: t.id, onClick: function() { onNavigate("companies", t.id); } },
                    h("td", { style: { fontWeight: 600 } }, t.name),
                    h("td", null, h("span", { className: "badge badge-blue" }, t.agent)),
                    h("td", { style: { color: "#94a3b8" } }, t.memo)
                  );
                }))
              )
        ),
        h("div", { className: "card", style: { padding: 14 } },
          h("div", { className: "dash-card-title", style: { color: "#ef4444" } }, "期限切れ（" + overdueTasks.length + "件）"),
          overdueTasks.length === 0
            ? h("div", { className: "text-muted text-sm", style: { padding: 12 } }, "期限切れはありません")
            : h("table", { className: "dash-task-table" },
                h("tbody", null, overdueTasks.map(function(t) {
                  return h("tr", { key: t.id, onClick: function() { onNavigate("companies", t.id); } },
                    h("td", { style: { fontWeight: 600 } }, t.name),
                    h("td", null, h("span", { className: "badge badge-blue" }, t.agent)),
                    h("td", { className: "overdue-tag" }, fmtDate(t.date).slice(5) + "予定")
                  );
                }))
              )
        )
      ),
      // 下部2列
      h("div", { className: "dashboard-grid", style: { marginTop: 4 } },
        h("div", { className: "card", style: { padding: 14 } },
          h("div", { className: "dash-card-title" }, "見込み者別 保有数"),
          h("div", { style: { display: "flex", gap: 24 } },
            Object.keys(byOwner).length === 0
              ? h("div", { className: "text-muted text-sm" }, "データなし")
              : Object.keys(byOwner).map(function(name) {
                  return h("div", { key: name }, name + " ", h("span", { style: { color: "#7c8cf8", fontWeight: 700 } }, byOwner[name] + "件"));
                })
          )
        ),
        h("div", { className: "card", style: { padding: 14 } },
          h("div", { className: "dash-card-title" }, "直近30日 コール推移"),
          h("div", { className: "dash-graph-bar" },
            dailyCalls.map(function(d, i) {
              var max = Math.max.apply(null, dailyCalls.map(function(x) { return parseInt(x.count) || 0; }));
              var pct = max > 0 ? (parseInt(d.count) / max * 100) : 0;
              return h("div", { key: i, className: "dash-graph-col", title: d.date + ": " + d.count + "件", style: { height: Math.max(pct, 4) + "%" } });
            })
          )
        )
      )
    );
  }

  // ============================================================
  // 営業スケジュールタブ
  // ============================================================
  function renderSchedule() {
    // カレンダーデータ構築
    var first = new Date(calYear, calMonth - 1, 1);
    var last = new Date(calYear, calMonth, 0);
    var startDay = first.getDay(); // 0=Sun
    var daysInMonth = last.getDate();
    var today = new Date();
    var todayStr2 = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');

    // カレンダーイベント集約
    var events = {};
    if (calData) {
      (calData.calls || []).forEach(function(c) {
        if (calAgent && c.agent !== calAgent) return;
        var d = c.date; if (!events[d]) events[d] = [];
        events[d].push({ type: "call", label: "コール " + (c.companyName || c.name || "") });
      });
      (calData.visits || []).forEach(function(v) {
        if (calAgent && v.agent !== calAgent) return;
        var d = v.date; if (!events[d]) events[d] = [];
        events[d].push({ type: "visit", label: "訪問 " + (v.companyName || v.name || "") });
      });
      (calData.deals || []).forEach(function(dl) {
        if (calAgent && dl.agent !== calAgent) return;
        if (dl.interviewDate) {
          var id = dl.interviewDate;
          if (id.startsWith(calYear + '-' + String(calMonth).padStart(2,'0'))) {
            if (!events[id]) events[id] = [];
            events[id].push({ type: "interview", label: "取材 " + (dl.companyName || dl.title || "") });
          }
        }
        if (dl.deliveryDate) {
          var dd = dl.deliveryDate;
          if (dd.startsWith(calYear + '-' + String(calMonth).padStart(2,'0'))) {
            if (!events[dd]) events[dd] = [];
            events[dd].push({ type: "delivery", label: "納品 " + (dl.companyName || dl.title || "") });
          }
        }
        if (dl.contractDate) {
          var cd = dl.contractDate;
          if (cd.startsWith(calYear + '-' + String(calMonth).padStart(2,'0'))) {
            if (!events[cd]) events[cd] = [];
            events[cd].push({ type: "contract", label: "契約 " + (dl.companyName || dl.title || "") });
          }
        }
      });
    }

    // サマリーカード用の集計
    var thisWeekStart = new Date(today); thisWeekStart.setDate(today.getDate() - today.getDay());
    var thisWeekEnd = new Date(thisWeekStart); thisWeekEnd.setDate(thisWeekStart.getDate() + 6);
    var nextWeekStart = new Date(thisWeekEnd); nextWeekStart.setDate(thisWeekEnd.getDate() + 1);
    var nextWeekEnd = new Date(nextWeekStart); nextWeekEnd.setDate(nextWeekStart.getDate() + 6);

    function countInRange(start, end, type) {
      var count = 0;
      for (var d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        var key = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
        (events[key] || []).forEach(function(e) { if (e.type === type) count++; });
      }
      return count;
    }

    var summaryItems = [
      { label: "今週コール予定", value: countInRange(thisWeekStart, thisWeekEnd, "call"), color: "#60a5fa" },
      { label: "今週行動予定", value: countInRange(thisWeekStart, thisWeekEnd, "visit"), color: "#f97316" },
      { label: "来週コール予定", value: countInRange(nextWeekStart, nextWeekEnd, "call"), color: "#60a5fa" },
      { label: "来週行動予定", value: countInRange(nextWeekStart, nextWeekEnd, "visit"), color: "#f97316" },
      { label: "今月残コール", value: countInRange(today, last, "call"), color: "#60a5fa" },
      { label: "今月残行動", value: countInRange(today, last, "visit"), color: "#f97316" }
    ];

    // カレンダーグリッド
    var cells = [];
    // 前月の日
    var prevLast = new Date(calYear, calMonth - 1, 0);
    for (var i = 0; i < startDay; i++) {
      cells.push({ day: prevLast.getDate() - startDay + 1 + i, other: true });
    }
    // 当月
    for (var d = 1; d <= daysInMonth; d++) {
      var dateKey = calYear + '-' + String(calMonth).padStart(2,'0') + '-' + String(d).padStart(2,'0');
      cells.push({ day: d, today: dateKey === todayStr2, events: events[dateKey] || [] });
    }
    // 翌月
    var remain = 7 - (cells.length % 7);
    if (remain < 7) {
      for (var j = 1; j <= remain; j++) { cells.push({ day: j, other: true }); }
    }

    function prevMonth() {
      if (calMonth === 1) { setCalYear(calYear - 1); setCalMonth(12); }
      else setCalMonth(calMonth - 1);
    }
    function nextMonth() {
      if (calMonth === 12) { setCalYear(calYear + 1); setCalMonth(1); }
      else setCalMonth(calMonth + 1);
    }
    function goToday() {
      var now = new Date();
      setCalYear(now.getFullYear()); setCalMonth(now.getMonth() + 1);
    }

    return h("div", null,
      h("div", { className: "dash-filter-bar" },
        h("button", { className: "dash-nav-btn", onClick: prevMonth }, "<"),
        h("span", { className: "period-label" }, calYear + "年" + calMonth + "月"),
        h("button", { className: "dash-nav-btn", onClick: nextMonth }, ">"),
        h("button", { className: "dash-nav-btn", style: { marginLeft: 8 }, onClick: goToday }, "今月"),
        h("div", { style: { flex: 1 } }),
        h("select", { className: "dash-sel", value: calAgent, onChange: function(e) { setCalAgent(e.target.value); } },
          h("option", { value: "" }, "全員"),
          (agents || []).map(function(a) { return h("option", { key: a.id, value: a.name }, a.name); })
        )
      ),
      // サマリーカード
      h("div", { className: "summary-cards" },
        summaryItems.map(function(s) {
          return h("div", { key: s.label, className: "summary-card" },
            h("div", { className: "summary-sl" }, s.label),
            h("div", { className: "summary-sv", style: { color: s.color } }, s.value)
          );
        })
      ),
      // カレンダー
      h("div", { className: "cal-grid" },
        ["日","月","火","水","木","金","土"].map(function(d, i) {
          return h("div", { key: d, className: "cal-h", style: i === 0 ? { color: "#ef4444" } : i === 6 ? { color: "#3b82f6" } : {} }, d);
        }),
        cells.map(function(c, i) {
          return h("div", { key: i, className: "cal-d" + (c.today ? " today" : "") + (c.other ? " other" : "") },
            h("div", { className: "cal-dn" }, c.day),
            (c.events || []).slice(0, 3).map(function(ev, j) {
              return h("div", { key: j, className: "cal-ev " + ev.type }, ev.label);
            }),
            (c.events || []).length > 3 && h("div", { className: "cal-ev", style: { color: "#64748b" } }, "+" + ((c.events.length) - 3) + "件")
          );
        })
      ),
      // 凡例
      h("div", { className: "dash-legend" },
        [["call","コール","コール予定"],["visit","訪問","訪問予定"],["contract","契約","契約"],["interview","取材","取材"],["delivery","納品","納品"]].map(function(l) {
          return h("span", { key: l[0] },
            h("span", { className: "cal-ev " + l[0], style: { display: "inline", padding: "1px 4px" } }, l[1]),
            " " + l[2]
          );
        })
      )
    );
  }

  // ============================================================
  // 制作管理タブ
  // ============================================================
  function renderProduction() {
    // 制作ステータス（契約済以降）
    var prodStatuses = ["契約済","審査中","取材予定","取材完了","納品予定","納品完了","入金予定","入金済み"];
    var prodDeals = deals.filter(function(d) { return d.status !== "商談中"; });

    // フィルタ適用
    var filtered = prodDeals.filter(function(d) {
      if (prodAgent && d.agent !== prodAgent) return false;
      if (prodStatus && d.status !== prodStatus) return false;
      if (prodPay) {
        var payLabel = d.paymentMethod === "信販" ? "クレジット" : d.paymentMethod === "現金" ? "現金" : d.paymentMethod;
        if (prodPay !== payLabel) return false;
      }
      return true;
    });

    // サマリー集計
    var notInterviewed = filtered.filter(function(d) { return !d.interviewDate && ["契約済","審査中"].includes(d.status); }).length;
    var interviewPlanned = filtered.filter(function(d) { return d.status === "取材予定"; }).length;
    var interviewDone = filtered.filter(function(d) { return d.status === "取材完了"; }).length;
    var notDelivered = filtered.filter(function(d) { return !d.deliveryDate && ["契約済","審査中","取材予定","取材完了"].includes(d.status); }).length;
    var deliveryPlanned = filtered.filter(function(d) { return d.status === "納品予定"; }).length;
    var deliveryDone = filtered.filter(function(d) { return d.status === "納品完了"; }).length;
    var paymentPlanned = filtered.filter(function(d) { return d.status === "入金予定"; }).length;
    var paymentDone = filtered.filter(function(d) { return d.status === "入金済み"; }).length;

    var summaryItems = [
      { label: "未取材", value: notInterviewed, color: "#ef4444" },
      { label: "取材予定", value: interviewPlanned, color: "#eab308" },
      { label: "取材完了", value: interviewDone, color: "#84cc16" },
      { label: "未納品", value: notDelivered, color: "#ef4444" },
      { label: "納品予定", value: deliveryPlanned, color: "#06b6d4" },
      { label: "納品完了", value: deliveryDone, color: "#22c55e" },
      { label: "入金予定", value: paymentPlanned, color: "#f97316" },
      { label: "入金済み", value: paymentDone, color: "#22c55e" }
    ];

    // ステータスバッジ色
    var statusColors = {
      "契約済": { bg: "#3b82f6", fg: "#fff" },
      "審査中": { bg: "#a855f7", fg: "#fff" },
      "取材予定": { bg: "#eab308", fg: "#000" },
      "取材完了": { bg: "#84cc16", fg: "#000" },
      "納品予定": { bg: "#06b6d4", fg: "#fff" },
      "納品完了": { bg: "#22c55e", fg: "#fff" },
      "入金予定": { bg: "#f97316", fg: "#fff" },
      "入金済み": { bg: "#22c55e", fg: "#fff" }
    };

    var payColors = { "信販": { bg: "#a855f7" }, "現金": { bg: "#3b82f6" }, "振込": { bg: "#22c55e" } };

    // 今月のスケジュール
    var now = new Date();
    var monthStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0');
    var scheduleDeals = filtered.filter(function(d) {
      return (d.interviewDate && d.interviewDate.startsWith(monthStr) && d.status === "取材予定") ||
             (d.deliveryDate && d.deliveryDate.startsWith(monthStr) && d.status === "納品予定");
    });

    function handleStatusChange(dealId, newStatus) {
      API.updateDeal(dealId, { status: newStatus }).then(function() { loadDeals(); });
    }

    return h("div", null,
      h("div", { className: "dash-filter-bar" },
        h("select", { className: "dash-sel", value: prodAgent, onChange: function(e) { setProdAgent(e.target.value); } },
          h("option", { value: "" }, "全員"),
          (agents || []).map(function(a) { return h("option", { key: a.id, value: a.name }, a.name); })
        ),
        h("select", { className: "dash-sel", value: prodStatus, onChange: function(e) { setProdStatus(e.target.value); } },
          h("option", { value: "" }, "全ステータス"),
          prodStatuses.map(function(s) { return h("option", { key: s, value: s }, s); })
        ),
        h("select", { className: "dash-sel", value: prodPay, onChange: function(e) { setProdPay(e.target.value); } },
          h("option", { value: "" }, "全決済"),
          h("option", { value: "現金" }, "現金"),
          h("option", { value: "クレジット" }, "クレジット")
        ),
        h("div", { style: { flex: 1 } }),
        h("span", { style: { fontSize: 11, color: "#64748b" } }, filtered.length + "件表示")
      ),
      // サマリーカード
      h("div", { className: "summary-cards" },
        summaryItems.map(function(s) {
          return h("div", { key: s.label, className: "summary-card" },
            h("div", { className: "summary-sl" }, s.label),
            h("div", { className: "summary-sv", style: { color: s.color } }, s.value)
          );
        })
      ),
      // 案件テーブル
      h("div", { style: { overflowX: "auto" } },
        h("table", { className: "prod-table" },
          h("thead", null,
            h("tr", null,
              ["案件名","企業名","担当","決済","契約日","取材","納品","ステータス","契約額","粗利"].map(function(th) {
                return h("th", { key: th }, th);
              })
            )
          ),
          h("tbody", null,
            filtered.map(function(d) {
              var sc = statusColors[d.status] || { bg: "#64748b", fg: "#fff" };
              var pc = payColors[d.paymentMethod] || { bg: "#64748b" };
              var payLabel = d.paymentMethod === "信販" ? "クレジット" : (d.paymentMethod || "―");
              var intDate = d.interviewDate ? d.interviewDate.slice(5).replace("-", "/") : "";
              var delDate = d.deliveryDate ? d.deliveryDate.slice(5).replace("-", "/") : "";
              var needInterview = !d.interviewDate && ["契約済","審査中"].includes(d.status);
              var needDelivery = !d.deliveryDate && ["契約済","審査中","取材予定","取材完了"].includes(d.status);

              return h("tr", { key: d.id },
                h("td", { style: { fontWeight: 600 } }, d.title),
                h("td", null, d.companyName || ""),
                h("td", null, d.agent),
                h("td", null, h("span", { className: "prod-badge", style: { background: pc.bg } }, payLabel)),
                h("td", null, d.contractDate ? d.contractDate.slice(5).replace("-", "/") : ""),
                h("td", null,
                  needInterview ? h("span", { className: "status-warn" }, "未取材")
                  : d.status === "取材予定" ? h("span", { style: { color: "#eab308" } }, intDate + "予定")
                  : intDate
                ),
                h("td", null,
                  needDelivery ? h("span", { className: "status-warn" }, "未納品")
                  : d.status === "納品予定" ? h("span", { style: { color: "#06b6d4" } }, delDate + "予定")
                  : delDate
                ),
                h("td", null, h("span", { className: "prod-badge", style: { background: sc.bg, color: sc.fg } }, d.status)),
                h("td", null, fmtMoney(d.contractAmount)),
                h("td", { className: "kpi-vy" }, fmtMoney(d.grossProfit))
              );
            })
          )
        )
      ),
      // 今月の制作スケジュール
      scheduleDeals.length > 0 && h("div", { className: "card", style: { marginTop: 12, padding: 14 } },
        h("div", { className: "dash-card-title" }, "今月の制作スケジュール"),
        h("table", { className: "dash-task-table" },
          h("tbody", null,
            scheduleDeals.map(function(d) {
              var isInterview = d.status === "取材予定";
              var schedDate = isInterview ? d.interviewDate : d.deliveryDate;
              var evtClass = isInterview ? "interview" : "delivery";
              var evtLabel = isInterview ? "取材" : "納品";
              var nextStatus = isInterview ? "取材完了" : "納品完了";
              return h("tr", { key: d.id },
                h("td", { style: { color: "#64748b", width: 60 } }, schedDate ? schedDate.slice(5).replace("-", "/") : ""),
                h("td", null, h("span", { className: "cal-ev " + evtClass, style: { display: "inline", padding: "1px 6px" } }, evtLabel)),
                h("td", { style: { fontWeight: 600 } }, d.companyName || d.title),
                h("td", null, h("span", { className: "badge badge-blue" }, d.agent)),
                h("td", null,
                  h("select", { className: "dash-sel", style: { width: 90 }, value: d.status,
                    onChange: function(e) { handleStatusChange(d.id, e.target.value); }
                  },
                    h("option", { value: d.status }, d.status),
                    h("option", { value: nextStatus }, nextStatus)
                  )
                )
              );
            })
          )
        )
      )
    );
  }

  // ============================================================
  // メインレンダー
  // ============================================================
  if (loading) {
    return h("div", { className: "flex-center", style: { height: 200 } },
      h("div", { className: "text-muted" }, "読み込み中...")
    );
  }

  return h("div", { className: "dash-container" },
    // タブバー
    h("div", { className: "dash-tabs" },
      TABS.map(function(t) {
        return h("button", { key: t.key, className: "dash-tab" + (dashTab === t.key ? " active" : ""),
          onClick: function() { setDashTab(t.key); }
        }, t.label);
      })
    ),
    // タブコンテンツ
    dashTab === "performance" && renderPerformance(),
    dashTab === "tasks" && renderTasks(),
    dashTab === "schedule" && renderSchedule(),
    dashTab === "production" && renderProduction()
  );
}
