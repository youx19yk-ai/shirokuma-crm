// ============================================================
// ダッシュボード画面
// ============================================================
function DashboardPage({ onNavigate, agents }) {
  var _s = useState(null), stats = _s[0], setStats = _s[1];
  var _d = useState([]), dailyCalls = _d[0], setDailyCalls = _d[1];
  var _a = useState([]), agentStats = _a[0], setAgentStats = _a[1];
  var _l = useState(true), loading = _l[0], setLoading = _l[1];
  var _fa = useState(""), filterAgent = _fa[0], setFilterAgent = _fa[1];

  useEffect(function() {
    Promise.all([
      API.getDashboardStats(),
      API.getDailyCalls(),
      API.getByAgent()
    ]).then(function(res) {
      setStats(res[0]);
      setDailyCalls(res[1]);
      setAgentStats(res[2]);
      setLoading(false);
    }).catch(function() {
      // デモデータ
      setStats({
        totalCompanies: 3, byStatus: {"見込み":1,"顧客":1,"休眠":1},
        monthCalls: 8, monthAppo: 3, monthDeals: 1,
        todayTasks: [{id:"demo1",name:"株式会社山田建設",date:todayStr(),memo:"見積もり確認"}],
        overdue: [{id:"demo2",name:"有限会社鈴木電気",date:"2026-04-06",memo:"納品確認"}]
      });
      setDailyCalls([
        {date:"2026-03-10",count:"3"},{date:"2026-03-12",count:"5"},{date:"2026-03-15",count:"2"},
        {date:"2026-03-18",count:"7"},{date:"2026-03-20",count:"4"},{date:"2026-03-22",count:"6"},
        {date:"2026-03-25",count:"3"},{date:"2026-03-28",count:"8"},{date:"2026-04-01",count:"5"},
        {date:"2026-04-03",count:"4"},{date:"2026-04-05",count:"6"},{date:"2026-04-07",count:"2"}
      ]);
      setAgentStats([
        {name:"佐藤",calls:25,appos:5,deals:2,total:800000,profit:380000},
        {name:"田中",calls:18,appos:3,deals:1,total:300000,profit:180000}
      ]);
      setLoading(false);
    });
  }, []);

  if (loading || !stats) {
    return h("div", { className: "flex-center", style: { height: 200 } },
      h("div", { className: "text-muted" }, "読み込み中...")
    );
  }

  var byStatus = stats.byStatus || {};
  var byOwner = stats.byProspectOwner || {};

  // フィルタ: 営業マンごとのタスク
  var filteredToday = (stats.todayTasks || []).filter(function(t) { return !filterAgent || t.agent === filterAgent; });
  var filteredOverdue = (stats.overdue || []).filter(function(t) { return !filterAgent || t.agent === filterAgent; });

  return h("div", null,
    // 営業マン切替
    h("div", { className: "flex-between mb-16" },
      h("div", { style: { fontSize: 16, fontWeight: 700 } }, filterAgent ? filterAgent + " のダッシュボード" : "全体ダッシュボード"),
      h("div", { className: "flex gap-8" },
        h("button", { className: "btn btn-sm " + (!filterAgent ? "btn-primary" : "btn-ghost"), onClick: function() { setFilterAgent(""); } }, "管理者（全体）"),
        (agents || []).map(function(a) {
          return h("button", { key: a.id, className: "btn btn-sm " + (filterAgent === a.name ? "btn-primary" : "btn-ghost"),
            onClick: function() { setFilterAgent(a.name); }
          }, a.name);
        })
      )
    ),
    // 数値カード
    h("div", { className: "stat-cards" },
      h("div", { className: "stat-card" },
        h("div", { className: "stat-label" }, "総企業数"),
        h("div", { className: "stat-value" }, stats.totalCompanies)
      ),
      h("div", { className: "stat-card" },
        h("div", { className: "stat-label" }, "見込み"),
        h("div", { className: "stat-value", style: { color: "#3b82f6" } }, byStatus["見込み"] || 0)
      ),
      h("div", { className: "stat-card" },
        h("div", { className: "stat-label" }, "今月コール数"),
        h("div", { className: "stat-value" }, stats.monthCalls)
      ),
      h("div", { className: "stat-card" },
        h("div", { className: "stat-label" }, "今月アポ数"),
        h("div", { className: "stat-value", style: { color: "#f97316" } }, stats.monthAppo)
      ),
      h("div", { className: "stat-card" },
        h("div", { className: "stat-label" }, "今月契約数"),
        h("div", { className: "stat-value", style: { color: "#22c55e" } }, stats.monthDeals)
      )
    ),

    // 今日のタスク + 期限切れ
    h("div", { className: "dashboard-grid mb-16" },
      h("div", { className: "card" },
        h("div", { className: "card-header" },
          h("div", { className: "card-title" }, "今日のコール予定 (" + filteredToday.length + "件)")
        ),
        filteredToday.length === 0
          ? h("div", { className: "text-muted text-sm" }, "今日の予定はありません")
          : h("ul", { className: "task-list" },
              filteredToday.map(function(t) {
                return h("li", { key: t.id, className: "task-item", onClick: function() { onNavigate("companies", t.id); } },
                  h("span", null, t.name),
                  t.agent && h("span", { className: "badge badge-blue", style: { fontSize: 9, marginLeft: 4 } }, t.agent),
                  t.memo && h("span", { className: "text-muted text-xs" }, " - " + t.memo)
                );
              })
            )
      ),
      h("div", { className: "card" },
        h("div", { className: "card-header" },
          h("div", { className: "card-title", style: { color: "#ef4444" } }, "期限切れ (" + filteredOverdue.length + "件)")
        ),
        filteredOverdue.length === 0
          ? h("div", { className: "text-muted text-sm" }, "期限切れはありません")
          : h("ul", { className: "task-list" },
              filteredOverdue.map(function(t) {
                return h("li", { key: t.id, className: "task-item", onClick: function() { onNavigate("companies", t.id); } },
                  h("span", null, t.name),
                  t.agent && h("span", { className: "badge badge-blue", style: { fontSize: 9, marginLeft: 4 } }, t.agent),
                  h("span", { className: "overdue-tag" }, " (" + fmtDate(t.date) + "予定)")
                );
              })
            )
      )
    ),

    // 日別コール数グラフ（シンプルバー）
    h("div", { className: "card mb-16" },
      h("div", { className: "card-header" },
        h("div", { className: "card-title" }, "直近30日間 コール数推移")
      ),
      dailyCalls.length === 0
        ? h("div", { className: "text-muted text-sm" }, "データなし")
        : h("div", { style: { display: "flex", alignItems: "end", gap: 2, height: 120, padding: "0 4px" } },
            dailyCalls.map(function(d, i) {
              var max = Math.max.apply(null, dailyCalls.map(function(x) { return parseInt(x.count); }));
              var pct = max > 0 ? (parseInt(d.count) / max * 100) : 0;
              return h("div", {
                key: i,
                title: d.date + ": " + d.count + "件",
                style: {
                  flex: 1, background: "#7c8cf8", borderRadius: "3px 3px 0 0",
                  height: Math.max(pct, 4) + "%", minWidth: 4, maxWidth: 20,
                  transition: "height 0.3s"
                }
              });
            })
          )
    ),

    // ステータス別 + 担当者別
    h("div", { className: "dashboard-grid" },
      h("div", { className: "card" },
        h("div", { className: "card-header" },
          h("div", { className: "card-title" }, "ステータス別")
        ),
        h("div", null,
          STATUS_OPTIONS.map(function(s) {
            var count = byStatus[s] || 0;
            var total = stats.totalCompanies || 1;
            var pct = Math.round(count / total * 100);
            return h("div", { key: s, className: "flex-between", style: { padding: "6px 0", borderBottom: "1px solid #1e2133" } },
              h("div", { className: "flex gap-8" },
                h("span", { className: "badge badge-" + statusBadgeClass(s).split("-")[1] }, s),
                h("span", { className: "text-sm text-muted" }, count + "件")
              ),
              h("div", { style: { display: "flex", alignItems: "center", gap: 8 } },
                h("div", { style: { width: 80, height: 6, background: "#252836", borderRadius: 3, overflow: "hidden" } },
                  h("div", { style: { width: pct + "%", height: "100%", background: statusColor(s), borderRadius: 3 } })
                ),
                h("span", { className: "text-xs text-muted", style: { minWidth: 30, textAlign: "right" } }, pct + "%")
              )
            );
          })
        )
      ),
      // 見込み者別保有数
      h("div", { className: "card" },
        h("div", { className: "card-header" },
          h("div", { className: "card-title" }, "見込み者別 保有数")
        ),
        Object.keys(byOwner).length === 0
          ? h("div", { className: "text-muted text-sm" }, "データなし")
          : Object.keys(byOwner).map(function(name) {
              return h("div", { key: name, className: "flex-between", style: { padding: "6px 0", borderBottom: "1px solid #1e2133" } },
                h("span", { style: { fontWeight: 600 } }, name),
                h("span", { style: { color: "#7c8cf8", fontWeight: 700 } }, byOwner[name] + "件")
              );
            })
      ),
      h("div", { className: "card" },
        h("div", { className: "card-header" },
          h("div", { className: "card-title" }, "担当者別成績（今月）")
        ),
        agentStats.length === 0
          ? h("div", { className: "text-muted text-sm" }, "データなし")
          : h("table", { className: "table" },
              h("thead", null,
                h("tr", null,
                  ["担当者","コール","アポ","契約","粗利"].map(function(th) {
                    return h("th", { key: th }, th);
                  })
                )
              ),
              h("tbody", null,
                agentStats.map(function(a) {
                  return h("tr", { key: a.name, style: { cursor: "default" } },
                    h("td", { style: { fontWeight: 600 } }, a.name),
                    h("td", null, a.calls),
                    h("td", { style: { color: "#f97316" } }, a.appos),
                    h("td", { style: { color: "#22c55e" } }, a.deals),
                    h("td", { style: { color: "#fbbf24" } }, fmtMoney(a.profit))
                  );
                })
              )
            )
      )
    )
  );
}
