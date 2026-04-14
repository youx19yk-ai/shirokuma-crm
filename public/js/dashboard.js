// ============================================================
// ダッシュボード画面（4タブ: 成績管理/当日タスク/営業スケジュール/制作管理）
// ============================================================
function DashboardPage(_props) {
  var onNavigate = _props.onNavigate;
  var agents = _props.agents || [];
  var plans = _props.plans || [];
  var dashTab = _props.tab || "performance";

  // --- 成績管理 State ---
  var _period = useState("month"), period = _period[0], setPeriod = _period[1];
  var _offset = useState(0), periodOffset = _offset[0], setPeriodOffset = _offset[1];
  var _team = useState(""), filterTeam = _team[0], setFilterTeam = _team[1];
  var _agent2 = useState(""), filterAgent = _agent2[0], setFilterAgent = _agent2[1];
  var _kpi = useState(null), kpiData = _kpi[0], setKpiData = _kpi[1];
  var _kpiLoad = useState(true), kpiLoading = _kpiLoad[0], setKpiLoading = _kpiLoad[1];

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

  // ============================================================
  // 期間計算（純粋関数）
  // ============================================================
  function calcPeriod(type, offset) {
    var now = new Date();
    if (type === "day") {
      var d = new Date(now); d.setDate(d.getDate() + offset);
      var ds = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
      return { from: ds, to: ds, label: d.getFullYear() + "年" + (d.getMonth()+1) + "月" + d.getDate() + "日" };
    }
    if (type === "week") {
      var base = new Date(now); base.setDate(base.getDate() + offset * 7);
      var dow = base.getDay(); var mon = new Date(base); mon.setDate(mon.getDate() - ((dow + 6) % 7));
      var sun = new Date(mon); sun.setDate(sun.getDate() + 6);
      var f = mon.getFullYear() + '-' + String(mon.getMonth()+1).padStart(2,'0') + '-' + String(mon.getDate()).padStart(2,'0');
      var t = sun.getFullYear() + '-' + String(sun.getMonth()+1).padStart(2,'0') + '-' + String(sun.getDate()).padStart(2,'0');
      return { from: f, to: t, label: mon.getFullYear() + "年" + (mon.getMonth()+1) + "月" + mon.getDate() + "日〜" + sun.getDate() + "日" };
    }
    if (type === "month") {
      var m = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      var last = new Date(m.getFullYear(), m.getMonth()+1, 0);
      return {
        from: m.getFullYear() + '-' + String(m.getMonth()+1).padStart(2,'0') + '-01',
        to: last.getFullYear() + '-' + String(last.getMonth()+1).padStart(2,'0') + '-' + String(last.getDate()).padStart(2,'0'),
        label: m.getFullYear() + "年" + (m.getMonth()+1) + "月"
      };
    }
    var y = now.getFullYear() + offset;
    return { from: y + '-01-01', to: y + '-12-31', label: y + "年" };
  }

  // ============================================================
  // データ読み込み（初回のみ + フィルタ変更時）
  // ============================================================
  useEffect(function() {
    var cancelled = false;
    API.getDashboardStats().then(function(d) { if (!cancelled) setStats(d); }).catch(function() {
      if (!cancelled) setStats({ totalCompanies: 0, byStatus: {}, monthCalls: 0, monthAppo: 0, monthDeals: 0, byProspectOwner: {}, todayTasks: [], overdue: [] });
    });
    API.getDailyCalls().then(function(d) { if (!cancelled) setDailyCalls(d); }).catch(function() { if (!cancelled) setDailyCalls([]); });
    API.getDeals().then(function(d) { if (!cancelled) setDeals(d); }).catch(function() { if (!cancelled) setDeals([]); });
    return function() { cancelled = true; };
  }, []);

  // KPI読み込み（期間・フィルタ変更時）
  useEffect(function() {
    var cancelled = false;
    setKpiLoading(true);
    var p = calcPeriod(period, periodOffset);
    var params = { from: p.from, to: p.to };
    if (filterTeam) params.team = filterTeam;
    if (filterAgent) params.agent = filterAgent;
    API.getKpi(params).then(function(data) {
      if (!cancelled) { setKpiData(data); setKpiLoading(false); }
    }).catch(function() {
      if (!cancelled) { setKpiData({ agents: [], totals: {}, period: { from: p.from, to: p.to } }); setKpiLoading(false); }
    });
    return function() { cancelled = true; };
  }, [period, periodOffset, filterTeam, filterAgent]);

  // カレンダー読み込み
  useEffect(function() {
    var cancelled = false;
    API.getCalendar(calYear, calMonth).then(function(data) { if (!cancelled) setCalData(data); }).catch(function() {
      if (!cancelled) setCalData({ calls: [], visits: [], deals: [] });
    });
    return function() { cancelled = true; };
  }, [calYear, calMonth]);

  // ============================================================
  // チーム別担当者
  // ============================================================
  var teamAgents = agents.filter(function(a) {
    return !filterTeam || a.team === filterTeam;
  });

  // ============================================================
  // 成績管理タブ
  // ============================================================
  function renderPerformance() {
    var p = calcPeriod(period, periodOffset);

    if (kpiLoading) {
      return h("div", null,
        renderFilterBar(p),
        h("div", { className: "flex-center", style: { height: 200 } }, h("div", { className: "text-muted" }, "読み込み中..."))
      );
    }

    var data = kpiData || { agents: [], totals: {} };
    var agentList = data.agents || [];

    // チーム別集計
    var teams = {};
    agentList.forEach(function(a) {
      var t = a.team || "未設定";
      if (!teams[t]) teams[t] = [];
      teams[t].push(a);
    });

    function sumField(arr, field) { return arr.reduce(function(s, a) { return s + (a[field] || 0); }, 0); }

    function makeTeamTotal(tarr) {
      var tc = tarr.length;
      var o = {};
      ['totalProfit','totalAmount','contractCount','completedDeals','selfAppoCount','assignedAppoCount','visitCount','selfVisitCount','appoCount','proposalCount','decisionCount','contactCount','callCount'].forEach(function(f) { o[f] = sumField(tarr, f); });
      o.avgProfit = o.contractCount > 0 ? Math.round(o.totalProfit / o.contractCount) : 0;
      o.contractRate = o.appoCount > 0 ? Math.round(o.contractCount / o.appoCount * 100) : 0;
      o.completionRate = o.contractCount > 0 ? Math.round(o.completedDeals / o.contractCount * 100) : 0;
      o.visitRate = o.appoCount > 0 ? Math.round(o.visitCount / o.appoCount * 100) : 0;
      o.appoRate = o.callCount > 0 ? Math.round(o.appoCount / o.callCount * 1000) / 10 : 0;
      o.proposalRate = o.callCount > 0 ? Math.round(o.proposalCount / o.callCount * 1000) / 10 : 0;
      o.decisionRate = o.callCount > 0 ? Math.round(o.decisionCount / o.callCount * 1000) / 10 : 0;
      o.callTypeRates = {};
      ['アポ','決済通話','担当者通話','受付通話','不通','提案完了','決裁','コールのみ'].forEach(function(ct) {
        var s = tarr.reduce(function(ss, a) { return ss + ((a.callTypeRates && a.callTypeRates[ct]) || 0) * (a.callCount || 0) / 100; }, 0);
        o.callTypeRates[ct] = o.callCount > 0 ? Math.round(s / o.callCount * 1000) / 10 : 0;
      });
      o.grossProfitTarget = tarr.reduce(function(s, a) { return s + ((a.targets || []).reduce(function(ss, tt) { return ss + (tt.grossProfitTarget || 0); }, 0)); }, 0);
      return o;
    }

    var allTotal = makeTeamTotal(agentList);

    // 列構築
    var cols = [];
    agentList.forEach(function(a) { cols.push({ k: 'a_' + a.name, l: a.name, d: a, t: 'agent' }); });
    var tks = Object.keys(teams);
    tks.forEach(function(tk) {
      if (tks.length > 1 || teams[tk].length > 1) {
        cols.push({ k: 'tm_' + tk, l: tk + "計", d: makeTeamTotal(teams[tk]), t: 'team' });
      }
    });
    cols.push({ k: 'total', l: "全体", d: allTotal, t: 'total' });

    function getTarget(ag) {
      if (!ag || !ag.targets) return 0;
      return ag.targets.reduce(function(s, tt) { return s + (tt.grossProfitTarget || 0); }, 0);
    }

    // KPIテーブル行生成
    var rows = [];
    function addSH(title) { rows.push({ type: 'sh', title: title }); }
    function addRow(key, label, getter, fmt, cls) { rows.push({ type: 'row', key: key, label: label, getter: getter, fmt: fmt, cls: cls }); }

    addSH("KGI");
    addRow("kgi_profit", "獲得粗利", function(c) { return c.d.totalProfit || 0; }, "money", "vy");
    addRow("kgi_target", "目標", function(c) { return c.t === 'agent' ? getTarget(c.d) : (c.d.grossProfitTarget || 0); }, "money", "v");
    addRow("kgi_diff", "目標差異", function(c) { var a = c.d.totalProfit || 0; var tg = c.t === 'agent' ? getTarget(c.d) : (c.d.grossProfitTarget || 0); return a - tg; }, "money_diff", "auto");

    addSH("KPI量");
    addRow("kpi_done", "完了数", function(c) { return c.d.completedDeals || 0; }, null, "vg");
    addRow("kpi_cont", "契約数", function(c) { return c.d.contractCount || 0; }, null, "vg");
    addRow("kpi_selfac", "自己アポ契約", function(c) { return c.d.selfAppoCount || 0; }, null, "v");
    addRow("kpi_selfap", "自己アポ数", function(c) { return c.d.selfAppoCount || 0; }, null, "v");
    addRow("kpi_assign", "振りアポ数", function(c) { return c.d.assignedAppoCount || 0; }, null, "v");
    addRow("kpi_visit", "総行動数", function(c) { return c.d.visitCount || 0; }, null, "v");
    addRow("kpi_selfv", "自己アポ行動", function(c) { return c.d.selfVisitCount || 0; }, null, "v");

    addSH("活動指標");
    addRow("act_appo", "アポ数", function(c) { return c.d.appoCount || 0; }, null, "v");
    addRow("act_prop", "提案完了数", function(c) { return c.d.proposalCount || 0; }, null, "v");
    addRow("act_dec", "決裁数", function(c) { return c.d.decisionCount || 0; }, null, "v");
    addRow("act_cont", "接触数", function(c) { return c.d.contactCount || 0; }, null, "v");
    addRow("act_call", "コール数", function(c) { return c.d.callCount || 0; }, null, "v");

    addSH("歩留まり率");
    addRow("rt_avg", "平均粗利", function(c) { return c.d.avgProfit || 0; }, "money", "vy");
    addRow("rt_contr", "契約率", function(c) { return c.d.contractRate || 0; }, "pct", "vb");
    addRow("rt_comp", "完了率", function(c) { return c.d.completionRate || 0; }, "pct", "v");
    addRow("rt_visit", "行動率", function(c) { return c.d.visitRate || 0; }, "pct", "v");
    addRow("rt_appo", "アポ率", function(c) { return c.d.appoRate || 0; }, "pct", "v");
    addRow("rt_prop", "提案完了率", function(c) { return c.d.proposalRate || 0; }, "pct", "v");
    addRow("rt_dec", "決裁率", function(c) { return c.d.decisionRate || 0; }, "pct", "v");

    addSH("各通話率");
    addRow("ct_appo", "アポ率", function(c) { return (c.d.callTypeRates || {})["アポ"] || 0; }, "pct", "v");
    addRow("ct_kessai", "決済通話率", function(c) { return (c.d.callTypeRates || {})["決済通話"] || 0; }, "pct", "v");
    addRow("ct_tanto", "担当者通話率", function(c) { return (c.d.callTypeRates || {})["担当者通話"] || 0; }, "pct", "v");
    addRow("ct_uketsuke", "受付通話率", function(c) { return (c.d.callTypeRates || {})["受付通話"] || 0; }, "pct", "v");
    addRow("ct_futsu", "不通率", function(c) { return (c.d.callTypeRates || {})["不通"] || 0; }, "pct", "v");
    addRow("ct_teian", "提案完了率", function(c) { return (c.d.callTypeRates || {})["提案完了"] || 0; }, "pct", "v");
    addRow("ct_callonly", "コールのみ率", function(c) { return (c.d.callTypeRates || {})["コールのみ"] || 0; }, "pct", "v");

    function fmtV(val, fmt) {
      if (fmt === "money") return fmtMoney(val);
      if (fmt === "money_diff") return (val >= 0 ? "+" : "") + fmtMoney(val);
      if (fmt === "pct") return val + "%";
      return String(val);
    }
    function clsV(val, cls, fmt) {
      if (cls === "auto") return val >= 0 ? "kpi-vg" : "kpi-vr";
      return "kpi-" + cls;
    }

    // テーブルレンダリング
    var trs = [];
    for (var ri = 0; ri < rows.length; ri++) {
      var r = rows[ri];
      if (r.type === 'sh') {
        trs.push(h("tr", { key: "sh" + ri, className: "kpi-sh" }, h("td", { colSpan: cols.length + 1 }, r.title)));
      } else {
        var tds = [h("td", { key: "lb", className: "kpi-rl" }, r.label)];
        for (var ci = 0; ci < cols.length; ci++) {
          var c = cols[ci];
          var val = r.getter(c);
          var cls2 = clsV(val, r.cls, r.fmt) + (c.t === 'team' ? " kpi-ct" : c.t === 'total' ? " kpi-ca" : "");
          tds.push(h("td", { key: c.k, className: cls2 }, fmtV(val, r.fmt)));
        }
        trs.push(h("tr", { key: r.key }, tds));
      }
    }

    return h("div", null,
      renderFilterBar(p),
      h("div", { style: { overflowX: "auto" } },
        h("table", { className: "kpi-table" },
          h("thead", null,
            h("tr", null,
              [h("th", { key: "lbl", style: { width: 130 } })].concat(
                cols.map(function(c) { return h("th", { key: c.k, className: c.t === 'team' ? "kpi-ct" : c.t === 'total' ? "kpi-ca" : "" }, c.l); })
              )
            )
          ),
          h("tbody", null, trs)
        )
      )
    );
  }

  function renderFilterBar(p) {
    return h("div", { className: "dash-filter-bar" },
      h("div", { className: "period-btns" },
        [["day","日"],["week","週"],["month","月"],["year","年"]].map(function(x) {
          return h("button", { key: x[0], className: "period-btn" + (period === x[0] ? " active" : ""),
            onClick: function() { setPeriod(x[0]); setPeriodOffset(0); }
          }, x[1]);
        })
      ),
      h("button", { className: "dash-nav-btn", onClick: function() { setPeriodOffset(periodOffset - 1); } }, "\u003C"),
      h("span", { className: "period-label" }, p.label),
      h("button", { className: "dash-nav-btn", onClick: function() { setPeriodOffset(periodOffset + 1); } }, "\u003E"),
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
    );
  }

  // ============================================================
  // 当日タスクタブ
  // ============================================================
  function renderTasks() {
    if (!stats) return h("div", { className: "flex-center", style: { height: 200 } }, h("div", { className: "text-muted" }, "読み込み中..."));

    var today = new Date();
    var dn = ["日","月","火","水","木","金","土"];
    var todayLabel = today.getFullYear() + "年" + (today.getMonth()+1) + "月" + today.getDate() + "日（" + dn[today.getDay()] + "）";
    var todayTasks = (stats.todayTasks || []).filter(function(t) { return !taskAgent || t.agent === taskAgent; });
    var overdueTasks = (stats.overdue || []).filter(function(t) { return !taskAgent || t.agent === taskAgent; });
    var byOwner = stats.byProspectOwner || {};

    return h("div", null,
      h("div", { className: "dash-filter-bar" },
        h("span", { className: "period-label" }, todayLabel),
        h("div", { style: { flex: 1 } }),
        h("select", { className: "dash-sel", value: taskAgent, onChange: function(e) { setTaskAgent(e.target.value); } },
          h("option", { value: "" }, "全員"),
          agents.map(function(a) { return h("option", { key: a.id, value: a.name }, a.name); })
        )
      ),
      h("div", { className: "dashboard-grid" },
        h("div", { className: "card", style: { padding: 14 } },
          h("div", { className: "dash-card-title", style: { color: "#7c8cf8" } }, "今日のコール予定（" + todayTasks.length + "件）"),
          todayTasks.length === 0
            ? h("div", { className: "text-muted text-sm", style: { padding: 12 } }, "今日の予定はありません")
            : h("table", { className: "dash-task-table" }, h("tbody", null,
                todayTasks.map(function(t) {
                  return h("tr", { key: t.id, onClick: function() { onNavigate("companies", t.id); } },
                    h("td", { style: { fontWeight: 600 } }, t.name),
                    h("td", null, h("span", { className: "badge badge-blue" }, t.agent)),
                    h("td", { style: { color: "#94a3b8" } }, t.memo || "")
                  );
                })
              ))
        ),
        h("div", { className: "card", style: { padding: 14 } },
          h("div", { className: "dash-card-title", style: { color: "#ef4444" } }, "期限切れ（" + overdueTasks.length + "件）"),
          overdueTasks.length === 0
            ? h("div", { className: "text-muted text-sm", style: { padding: 12 } }, "期限切れはありません")
            : h("table", { className: "dash-task-table" }, h("tbody", null,
                overdueTasks.map(function(t) {
                  return h("tr", { key: t.id, onClick: function() { onNavigate("companies", t.id); } },
                    h("td", { style: { fontWeight: 600 } }, t.name),
                    h("td", null, h("span", { className: "badge badge-blue" }, t.agent)),
                    h("td", { className: "overdue-tag" }, fmtDate(t.date).slice(5) + "予定")
                  );
                })
              ))
        )
      ),
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
            dailyCalls.length > 0 ? dailyCalls.map(function(d, i) {
              var max = Math.max.apply(null, dailyCalls.map(function(x) { return parseInt(x.count) || 0; }));
              var pct = max > 0 ? (parseInt(d.count) / max * 100) : 0;
              return h("div", { key: i, className: "dash-graph-col", title: d.date + ": " + d.count + "件", style: { height: Math.max(pct, 4) + "%" } });
            }) : h("div", { className: "text-muted text-sm" }, "データなし")
          )
        )
      )
    );
  }

  // ============================================================
  // 営業スケジュールタブ
  // ============================================================
  function renderSchedule() {
    var first = new Date(calYear, calMonth - 1, 1);
    var last = new Date(calYear, calMonth, 0);
    var startDay = first.getDay();
    var daysInMonth = last.getDate();
    var today = new Date();
    var todayKey = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');

    // イベント集約
    var events = {};
    if (calData) {
      (calData.calls || []).forEach(function(c) {
        if (calAgent && c.agent !== calAgent) return;
        if (!events[c.date]) events[c.date] = [];
        events[c.date].push({ type: "call", label: "コール " + (c.companyName || c.name || "") });
      });
      (calData.visits || []).forEach(function(v) {
        if (calAgent && v.agent !== calAgent) return;
        if (!events[v.date]) events[v.date] = [];
        events[v.date].push({ type: "visit", label: "訪問 " + (v.companyName || v.name || "") });
      });
      var mp = calYear + '-' + String(calMonth).padStart(2,'0');
      (calData.deals || []).forEach(function(dl) {
        if (calAgent && dl.agent !== calAgent) return;
        if (dl.interviewDate && dl.interviewDate.indexOf(mp) === 0) {
          if (!events[dl.interviewDate]) events[dl.interviewDate] = [];
          events[dl.interviewDate].push({ type: "interview", label: "取材 " + (dl.companyName || dl.title || "") });
        }
        if (dl.deliveryDate && dl.deliveryDate.indexOf(mp) === 0) {
          if (!events[dl.deliveryDate]) events[dl.deliveryDate] = [];
          events[dl.deliveryDate].push({ type: "delivery", label: "納品 " + (dl.companyName || dl.title || "") });
        }
        if (dl.contractDate && dl.contractDate.indexOf(mp) === 0) {
          if (!events[dl.contractDate]) events[dl.contractDate] = [];
          events[dl.contractDate].push({ type: "contract", label: "契約 " + (dl.companyName || dl.title || "") });
        }
      });
    }

    // サマリー集計（簡易）
    function countEventsInWeek(startDate, type) {
      var count = 0;
      for (var i = 0; i < 7; i++) {
        var dd = new Date(startDate); dd.setDate(dd.getDate() + i);
        var k = dd.getFullYear() + '-' + String(dd.getMonth()+1).padStart(2,'0') + '-' + String(dd.getDate()).padStart(2,'0');
        (events[k] || []).forEach(function(e) { if (e.type === type) count++; });
      }
      return count;
    }
    var thisWeekStart = new Date(today); thisWeekStart.setDate(today.getDate() - today.getDay());
    var nextWeekStart = new Date(thisWeekStart); nextWeekStart.setDate(nextWeekStart.getDate() + 7);

    // 今月残（today〜月末）
    var monthRemainCalls = 0, monthRemainVisits = 0;
    for (var di = today.getDate(); di <= daysInMonth; di++) {
      var dk = calYear + '-' + String(calMonth).padStart(2,'0') + '-' + String(di).padStart(2,'0');
      (events[dk] || []).forEach(function(e) {
        if (e.type === "call") monthRemainCalls++;
        if (e.type === "visit") monthRemainVisits++;
      });
    }

    var summaryItems = [
      { label: "今週コール予定", value: countEventsInWeek(thisWeekStart, "call"), color: "#60a5fa" },
      { label: "今週行動予定", value: countEventsInWeek(thisWeekStart, "visit"), color: "#f97316" },
      { label: "来週コール予定", value: countEventsInWeek(nextWeekStart, "call"), color: "#60a5fa" },
      { label: "来週行動予定", value: countEventsInWeek(nextWeekStart, "visit"), color: "#f97316" },
      { label: "今月残コール", value: monthRemainCalls, color: "#60a5fa" },
      { label: "今月残行動", value: monthRemainVisits, color: "#f97316" }
    ];

    // カレンダーグリッド
    var cells = [];
    var prevLast = new Date(calYear, calMonth - 1, 0);
    for (var i = 0; i < startDay; i++) { cells.push({ day: prevLast.getDate() - startDay + 1 + i, other: true }); }
    for (var d = 1; d <= daysInMonth; d++) {
      var dateKey = calYear + '-' + String(calMonth).padStart(2,'0') + '-' + String(d).padStart(2,'0');
      cells.push({ day: d, isToday: dateKey === todayKey, events: events[dateKey] || [] });
    }
    var remain = 7 - (cells.length % 7);
    if (remain < 7) { for (var j = 1; j <= remain; j++) { cells.push({ day: j, other: true }); } }

    return h("div", null,
      h("div", { className: "dash-filter-bar" },
        h("button", { className: "dash-nav-btn", onClick: function() { if (calMonth === 1) { setCalYear(calYear - 1); setCalMonth(12); } else { setCalMonth(calMonth - 1); } } }, "\u003C"),
        h("span", { className: "period-label" }, calYear + "年" + calMonth + "月"),
        h("button", { className: "dash-nav-btn", onClick: function() { if (calMonth === 12) { setCalYear(calYear + 1); setCalMonth(1); } else { setCalMonth(calMonth + 1); } } }, "\u003E"),
        h("button", { className: "dash-nav-btn", style: { marginLeft: 8 }, onClick: function() { var n = new Date(); setCalYear(n.getFullYear()); setCalMonth(n.getMonth() + 1); } }, "今月"),
        h("div", { style: { flex: 1 } }),
        h("select", { className: "dash-sel", value: calAgent, onChange: function(e) { setCalAgent(e.target.value); } },
          h("option", { value: "" }, "全員"),
          agents.map(function(a) { return h("option", { key: a.id, value: a.name }, a.name); })
        )
      ),
      h("div", { className: "summary-cards" },
        summaryItems.map(function(s) {
          return h("div", { key: s.label, className: "summary-card" },
            h("div", { className: "summary-sl" }, s.label),
            h("div", { className: "summary-sv", style: { color: s.color } }, s.value)
          );
        })
      ),
      h("div", { className: "cal-grid" },
        ["日","月","火","水","木","金","土"].map(function(dd, ii) {
          return h("div", { key: dd, className: "cal-h", style: ii === 0 ? { color: "#ef4444" } : ii === 6 ? { color: "#3b82f6" } : {} }, dd);
        }),
        cells.map(function(c, idx) {
          var cls = "cal-d" + (c.isToday ? " today" : "") + (c.other ? " other" : "");
          return h("div", { key: idx, className: cls },
            h("div", { className: "cal-dn" }, c.day),
            (c.events || []).slice(0, 3).map(function(ev, j2) {
              return h("div", { key: j2, className: "cal-ev " + ev.type }, ev.label);
            }),
            (c.events || []).length > 3 ? h("div", { style: { fontSize: 9, color: "#64748b" } }, "+" + ((c.events || []).length - 3) + "件") : null
          );
        })
      ),
      h("div", { className: "dash-legend" },
        [["call","コール","コール予定"],["visit","訪問","訪問予定"],["contract","契約","契約"],["interview","取材","取材"],["delivery","納品","納品"]].map(function(l) {
          return h("span", { key: l[0] }, h("span", { className: "cal-ev " + l[0], style: { display: "inline", padding: "1px 4px" } }, l[1]), " " + l[2]);
        })
      )
    );
  }

  // ============================================================
  // 制作管理タブ
  // ============================================================
  function renderProduction() {
    var prodStatuses = ["契約済","審査中","取材予定","取材完了","納品予定","納品完了","入金予定","入金済み"];
    var prodDeals = deals.filter(function(d) { return d.status !== "商談中"; });
    var filtered = prodDeals.filter(function(d) {
      if (prodAgent && d.agent !== prodAgent) return false;
      if (prodStatus && d.status !== prodStatus) return false;
      if (prodPay) {
        var pl = d.paymentMethod === "信販" ? "クレジット" : d.paymentMethod === "現金" ? "現金" : d.paymentMethod;
        if (prodPay !== pl) return false;
      }
      return true;
    });

    var sc = [
      { l: "未取材", v: filtered.filter(function(d) { return !d.interviewDate && (d.status === "契約済" || d.status === "審査中"); }).length, c: "#ef4444" },
      { l: "取材予定", v: filtered.filter(function(d) { return d.status === "取材予定"; }).length, c: "#eab308" },
      { l: "取材完了", v: filtered.filter(function(d) { return d.status === "取材完了"; }).length, c: "#84cc16" },
      { l: "未納品", v: filtered.filter(function(d) { return !d.deliveryDate && ["契約済","審査中","取材予定","取材完了"].indexOf(d.status) >= 0; }).length, c: "#ef4444" },
      { l: "納品予定", v: filtered.filter(function(d) { return d.status === "納品予定"; }).length, c: "#06b6d4" },
      { l: "納品完了", v: filtered.filter(function(d) { return d.status === "納品完了"; }).length, c: "#22c55e" },
      { l: "入金予定", v: filtered.filter(function(d) { return d.status === "入金予定"; }).length, c: "#f97316" },
      { l: "入金済み", v: filtered.filter(function(d) { return d.status === "入金済み"; }).length, c: "#22c55e" }
    ];

    var stColors = { "契約済":"#3b82f6","審査中":"#a855f7","取材予定":"#eab308","取材完了":"#84cc16","納品予定":"#06b6d4","納品完了":"#22c55e","入金予定":"#f97316","入金済み":"#22c55e" };
    var stFg = { "取材予定":"#000","取材完了":"#000" };
    var payBg = { "信販":"#a855f7","現金":"#3b82f6","振込":"#22c55e" };

    var now = new Date();
    var monthStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0');
    var schedDeals = filtered.filter(function(d) {
      return (d.interviewDate && d.interviewDate.indexOf(monthStr) === 0 && d.status === "取材予定") ||
             (d.deliveryDate && d.deliveryDate.indexOf(monthStr) === 0 && d.status === "納品予定");
    });

    return h("div", null,
      h("div", { className: "dash-filter-bar" },
        h("select", { className: "dash-sel", value: prodAgent, onChange: function(e) { setProdAgent(e.target.value); } },
          h("option", { value: "" }, "全員"), agents.map(function(a) { return h("option", { key: a.id, value: a.name }, a.name); })
        ),
        h("select", { className: "dash-sel", value: prodStatus, onChange: function(e) { setProdStatus(e.target.value); } },
          h("option", { value: "" }, "全ステータス"), prodStatuses.map(function(s) { return h("option", { key: s, value: s }, s); })
        ),
        h("select", { className: "dash-sel", value: prodPay, onChange: function(e) { setProdPay(e.target.value); } },
          h("option", { value: "" }, "全決済"), h("option", { value: "現金" }, "現金"), h("option", { value: "クレジット" }, "クレジット")
        ),
        h("div", { style: { flex: 1 } }),
        h("span", { style: { fontSize: 11, color: "#64748b" } }, filtered.length + "件表示")
      ),
      h("div", { className: "summary-cards" },
        sc.map(function(s) {
          return h("div", { key: s.l, className: "summary-card" },
            h("div", { className: "summary-sl" }, s.l),
            h("div", { className: "summary-sv", style: { color: s.c } }, s.v)
          );
        })
      ),
      h("div", { style: { overflowX: "auto" } },
        h("table", { className: "prod-table" },
          h("thead", null, h("tr", null,
            ["案件名","企業名","担当","決済","契約日","取材","納品","ステータス","契約額","粗利"].map(function(th) { return h("th", { key: th }, th); })
          )),
          h("tbody", null,
            filtered.map(function(d) {
              var payLabel = d.paymentMethod === "信販" ? "クレジット" : (d.paymentMethod || "―");
              var intDate = d.interviewDate ? d.interviewDate.slice(5).replace("-", "/") : "";
              var delDate = d.deliveryDate ? d.deliveryDate.slice(5).replace("-", "/") : "";
              var noInt = !d.interviewDate && (d.status === "契約済" || d.status === "審査中");
              var noDel = !d.deliveryDate && ["契約済","審査中","取材予定","取材完了"].indexOf(d.status) >= 0;
              return h("tr", { key: d.id },
                h("td", { style: { fontWeight: 600 } }, d.title),
                h("td", null, d.companyName || ""),
                h("td", null, d.agent),
                h("td", null, h("span", { className: "prod-badge", style: { background: payBg[d.paymentMethod] || "#64748b" } }, payLabel)),
                h("td", null, d.contractDate ? d.contractDate.slice(5).replace("-", "/") : ""),
                h("td", null, noInt ? h("span", { className: "status-warn" }, "未取材") : d.status === "取材予定" ? h("span", { style: { color: "#eab308" } }, intDate + "予定") : intDate),
                h("td", null, noDel ? h("span", { className: "status-warn" }, "未納品") : d.status === "納品予定" ? h("span", { style: { color: "#06b6d4" } }, delDate + "予定") : delDate),
                h("td", null, h("span", { className: "prod-badge", style: { background: stColors[d.status] || "#64748b", color: stFg[d.status] || "#fff" } }, d.status)),
                h("td", null, fmtMoney(d.contractAmount)),
                h("td", { className: "kpi-vy" }, fmtMoney(d.grossProfit))
              );
            })
          )
        )
      ),
      schedDeals.length > 0 ? h("div", { className: "card", style: { marginTop: 12, padding: 14 } },
        h("div", { className: "dash-card-title" }, "今月の制作スケジュール"),
        h("table", { className: "dash-task-table" }, h("tbody", null,
          schedDeals.map(function(d) {
            var isInt = d.status === "取材予定";
            var sd = isInt ? d.interviewDate : d.deliveryDate;
            var ec = isInt ? "interview" : "delivery";
            var el = isInt ? "取材" : "納品";
            var ns = isInt ? "取材完了" : "納品完了";
            return h("tr", { key: d.id },
              h("td", { style: { color: "#64748b", width: 60 } }, sd ? sd.slice(5).replace("-", "/") : ""),
              h("td", null, h("span", { className: "cal-ev " + ec, style: { display: "inline", padding: "1px 6px" } }, el)),
              h("td", { style: { fontWeight: 600 } }, d.companyName || d.title),
              h("td", null, h("span", { className: "badge badge-blue" }, d.agent)),
              h("td", null, h("select", { className: "dash-sel", style: { width: 90 }, value: d.status,
                onChange: function(e) { API.updateDeal(d.id, { status: e.target.value }).then(function() { API.getDeals().then(function(data) { setDeals(data); }); }); }
              }, h("option", { value: d.status }, d.status), h("option", { value: ns }, ns)))
            );
          })
        ))
      ) : null
    );
  }

  // ============================================================
  // メインレンダー
  // ============================================================
  var hide = { display: "none" };
  var show = {};
  return h("div", { className: "dash-container" },
    h("div", { style: dashTab === "performance" ? show : hide }, renderPerformance()),
    h("div", { style: dashTab === "tasks" ? show : hide }, renderTasks()),
    h("div", { style: dashTab === "schedule" ? show : hide }, renderSchedule()),
    h("div", { style: dashTab === "production" ? show : hide }, renderProduction())
  );
}
