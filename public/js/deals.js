// ============================================================
// 案件管理画面
// ============================================================
function DealsPage({ agents, plans, creditCompanies, onNavigate, selectOptions }) {
  var so = selectOptions || [];
  var _d = useState([]), deals = _d[0], setDeals = _d[1];
  var _l = useState(true), loading = _l[0], setLoading = _l[1];
  var _fa = useState(""), filterAgent = _fa[0], setFilterAgent = _fa[1];
  var _fs = useState(""), filterStatus = _fs[0], setFilterStatus = _fs[1];
  var _edit = useState(null), editDeal = _edit[0], setEditDeal = _edit[1];
  var _sav = useState(false), saving = _sav[0], setSaving = _sav[1];
  var _report = useState(null), report = _report[0], setReport = _report[1];
  var _rf = useState(""), reportFrom = _rf[0], setReportFrom = _rf[1];
  var _rt = useState(""), reportTo = _rt[0], setReportTo = _rt[1];
  var _ra = useState(""), reportAgent = _ra[0], setReportAgent = _ra[1];

  var loadDeals = function() {
    var params = {};
    if (filterAgent) params.agent = filterAgent;
    if (filterStatus) params.status = filterStatus;
    API.getDeals(params).then(function(data) { setDeals(data); setLoading(false); }).catch(function() {
      setDeals([
        {id:"d1",companyId:"demo1",companyName:"株式会社山田建設",planId:"",title:"HPプランB",status:"制作中",agent:"佐藤",contractDate:"2026-03-15",contractAmount:500000,paymentMethod:"信販",creditCompany:"オリコ",creditStatus:"承認",creditDate:"2026-03-18",creditAmount:500000,interviewDate:"2026-04-10",deliveryDate:"",cost:200000,grossProfit:300000,memo:""},
        {id:"d2",companyId:"demo2",companyName:"有限会社鈴木電気",planId:"",title:"LPプランA",status:"納品済",agent:"田中",contractDate:"2026-02-01",contractAmount:300000,paymentMethod:"現金",creditCompany:"",creditStatus:"",creditDate:"",creditAmount:0,interviewDate:"2026-02-20",deliveryDate:"2026-03-10",cost:120000,grossProfit:180000,memo:""}
      ]);
      setLoading(false);
    });
  };

  useEffect(loadDeals, [filterAgent, filterStatus]);

  // 案件編集
  var s = function(k) { return function(v) { setEditDeal(function(p) { var r = Object.assign({}, p); r[k] = v; return r; }); }; };

  var saveDeal = function() {
    setSaving(true);
    API.updateDeal(editDeal.id, editDeal).then(function() {
      setSaving(false); setEditDeal(null); loadDeals();
    }).catch(function(e) { alert("保存失敗: " + e.message); setSaving(false); });
  };

  var deleteDeal = function(id) {
    if (!confirm("この案件を削除しますか？")) return;
    API.deleteDeal(id).then(function() { loadDeals(); });
  };

  // 個人レポート
  var showReport = function() {
    if (!reportAgent) return;
    API.getAgentReport(reportAgent, reportFrom, reportTo).then(function(data) { setReport(data); });
  };

  // 集計
  var contracted = deals.filter(function(d) { return d.status !== "商談中"; });
  var totalAmount = contracted.reduce(function(s, d) { return s + (d.contractAmount || 0); }, 0);
  var totalProfit = contracted.reduce(function(s, d) { return s + (d.grossProfit || 0); }, 0);

  if (loading) return h("div", { className: "flex-center", style: { height: 200 } }, h("div", { className: "text-muted" }, "読み込み中..."));

  return h("div", null,
    // フィルタ
    h("div", { className: "flex gap-12 mb-16", style: { flexWrap: "wrap" } },
      h("div", null,
        h("div", { className: "form-label" }, "担当者"),
        h("select", { className: "search-input", value: filterAgent, onChange: function(e) { setFilterAgent(e.target.value); } },
          h("option", { value: "" }, "全員"),
          agents.map(function(a) { return h("option", { key: a.id, value: a.name }, a.name); })
        )
      ),
      h("div", null,
        h("div", { className: "form-label" }, "ステータス"),
        h("select", { className: "search-input", value: filterStatus, onChange: function(e) { setFilterStatus(e.target.value); } },
          h("option", { value: "" }, "すべて"),
          getOpts(so, "DEAL_STATUSES", DEAL_STATUSES).map(function(s) { return h("option", { key: s, value: s }, s); })
        )
      ),
      h("div", { style: { flex: 1 } }),
      h("div", { className: "flex gap-8", style: { alignItems: "end" } },
        h("div", null,
          h("div", { className: "form-label" }, "担当者"),
          h("select", { className: "search-input", value: reportAgent, onChange: function(e) { setReportAgent(e.target.value); } },
            h("option", { value: "" }, "選択..."),
            agents.map(function(a) { return h("option", { key: a.id, value: a.name }, a.name); })
          )
        ),
        h("div", null, h("div", { className: "form-label" }, "From"),
          h("input", { type: "date", className: "search-input", value: reportFrom, onChange: function(e) { setReportFrom(e.target.value); } })),
        h("div", null, h("div", { className: "form-label" }, "To"),
          h("input", { type: "date", className: "search-input", value: reportTo, onChange: function(e) { setReportTo(e.target.value); } })),
        h("button", { className: "btn btn-secondary btn-sm", onClick: showReport }, "個人レポート")
      )
    ),

    // サマリー
    h("div", { className: "stat-cards mb-16" },
      h("div", { className: "stat-card" },
        h("div", { className: "stat-label" }, "案件数"),
        h("div", { className: "stat-value" }, deals.length)
      ),
      h("div", { className: "stat-card" },
        h("div", { className: "stat-label" }, "契約済"),
        h("div", { className: "stat-value", style: { color: "#22c55e" } }, contracted.length)
      ),
      h("div", { className: "stat-card" },
        h("div", { className: "stat-label" }, "契約額合計"),
        h("div", { className: "stat-value" }, fmtMoney(totalAmount))
      ),
      h("div", { className: "stat-card" },
        h("div", { className: "stat-label" }, "粗利合計"),
        h("div", { className: "stat-value", style: { color: "#fbbf24" } }, fmtMoney(totalProfit))
      )
    ),

    // 案件テーブル
    h("div", { className: "card" },
      h("div", { className: "card-header" },
        h("div", { className: "card-title" }, "案件一覧 (" + deals.length + "件)")
      ),
      h("div", { style: { overflowX: "auto" } },
        h("table", { className: "table" },
          h("thead", null, h("tr", null,
            ["案件名","企業名","ステータス","担当","契約日","契約額","決済","信販","粗利","操作"].map(function(th) { return h("th", { key: th }, th); })
          )),
          h("tbody", null,
            deals.length === 0
              ? h("tr", null, h("td", { colSpan: 10, className: "text-center text-muted", style: { padding: 24 } }, "案件なし"))
              : deals.map(function(d) {
                  return h("tr", { key: d.id, onClick: function() { setEditDeal(Object.assign({}, d)); } },
                    h("td", { style: { fontWeight: 600 } }, d.title || "―"),
                    h("td", null, h("span", { style: { cursor: "pointer", color: "#7c8cf8" }, onClick: function(e) { e.stopPropagation(); onNavigate("companies", d.companyId); } }, d.companyName)),
                    h("td", null, h("span", { className: "deal-status-" + d.status }, d.status)),
                    h("td", null, d.agent),
                    h("td", { className: "text-muted" }, fmtDate(d.contractDate)),
                    h("td", null, d.contractAmount ? fmtMoney(d.contractAmount) : "―"),
                    h("td", { className: "text-muted" }, d.paymentMethod || "―"),
                    h("td", null,
                      d.paymentMethod === "信販" ? h("span", { style: { color: d.creditStatus === "承認" ? "#22c55e" : d.creditStatus === "却下" ? "#ef4444" : "#a855f7" } }, d.creditStatus || "―") : "―"
                    ),
                    h("td", { style: { color: "#fbbf24", fontWeight: 600 } }, d.grossProfit ? fmtMoney(d.grossProfit) : "―"),
                    h("td", null, h("button", { className: "btn-icon btn-sm", onClick: function(e) { e.stopPropagation(); deleteDeal(d.id); } }, "×"))
                  );
                })
          )
        )
      )
    ),

    // 案件編集モーダル
    editDeal && h("div", { className: "modal-overlay", onClick: function() { setEditDeal(null); } },
      h("div", { className: "modal", onClick: function(e) { e.stopPropagation(); } },
        h("div", { className: "modal-header" },
          h("div", { className: "modal-title" }, "案件編集: " + (editDeal.title || "―")),
          h("button", { className: "modal-close", onClick: function() { setEditDeal(null); } }, "×")
        ),
        h("div", { className: "form-row form-row-2" },
          h(FormInput, { label: "案件名", value: editDeal.title, onChange: s("title") }),
          h(FormSelect, { label: "ステータス", options: getOpts(so, "DEAL_STATUSES", DEAL_STATUSES), value: editDeal.status, onChange: s("status") })
        ),
        h("div", { className: "form-row form-row-3" },
          agents.length > 0
            ? h(FormSelect, { label: "担当営業", options: agents.map(function(a) { return a.name; }), value: editDeal.agent, onChange: s("agent") })
            : h(FormInput, { label: "担当営業", value: editDeal.agent, onChange: s("agent") }),
          h(FormInput, { label: "契約日", type: "date", value: editDeal.contractDate, onChange: s("contractDate") }),
          h(FormInput, { label: "契約金額", type: "number", value: editDeal.contractAmount, onChange: function(v) { s("contractAmount")(parseInt(v) || 0); } })
        ),
        h("div", { className: "form-row form-row-3" },
          h(FormSelect, { label: "決済方法", options: getOpts(so, "PAYMENT_METHODS", PAYMENT_METHODS), value: editDeal.paymentMethod, onChange: s("paymentMethod") }),
          h(FormInput, { label: "原価", type: "number", value: editDeal.cost, onChange: function(v) { s("cost")(parseInt(v) || 0); } }),
          h("div", null,
            h("div", { className: "form-label" }, "粗利（自動計算）"),
            h("div", { style: { color: "#fbbf24", fontWeight: 700, fontSize: 16, padding: "7px 0" } }, fmtMoney((editDeal.contractAmount || 0) - (editDeal.cost || 0)))
          )
        ),
        editDeal.paymentMethod === "信販" && h("div", null,
          h("div", { className: "text-sm mb-8 mt-8", style: { fontWeight: 600, color: "#a855f7" } }, "信販情報"),
          h("div", { className: "form-row form-row-3" },
            creditCompanies.length > 0
              ? h(FormSelect, { label: "信販会社", options: creditCompanies.map(function(c) { return c.name; }), value: editDeal.creditCompany, onChange: s("creditCompany") })
              : h(FormInput, { label: "信販会社", value: editDeal.creditCompany, onChange: s("creditCompany") }),
            h(FormSelect, { label: "審査ステータス", options: CREDIT_STATUSES, value: editDeal.creditStatus, onChange: s("creditStatus") }),
            h(FormInput, { label: "信販実行額", type: "number", value: editDeal.creditAmount, onChange: function(v) { s("creditAmount")(parseInt(v) || 0); } })
          )
        ),
        h("div", { className: "text-sm mb-8 mt-12", style: { fontWeight: 600, color: "#06b6d4" } }, "取材・納品"),
        h("div", { className: "form-row form-row-2" },
          h(FormInput, { label: "取材日", type: "date", value: editDeal.interviewDate, onChange: s("interviewDate") }),
          h(FormInput, { label: "納品日", type: "date", value: editDeal.deliveryDate, onChange: s("deliveryDate") })
        ),
        h(FormInput, { label: "メモ", value: editDeal.memo, onChange: s("memo"), multi: true }),
        h("div", { className: "flex gap-12 mt-16", style: { justifyContent: "flex-end" } },
          h("button", { className: "btn btn-secondary", onClick: function() { setEditDeal(null); } }, "キャンセル"),
          h("button", { className: "btn btn-primary", onClick: saveDeal, disabled: saving }, saving ? "保存中..." : "保存")
        )
      )
    ),

    // 個人レポートモーダル
    report && h("div", { className: "modal-overlay", onClick: function() { setReport(null); } },
      h("div", { className: "modal", onClick: function(e) { e.stopPropagation(); } },
        h("div", { className: "modal-header" },
          h("div", { className: "modal-title" }, report.agent + " 個人レポート"),
          h("button", { className: "modal-close", onClick: function() { setReport(null); } }, "×")
        ),
        h("div", { className: "text-xs text-muted mb-12" }, "期間: " + report.period.from + " 〜 " + report.period.to),
        h("div", { className: "stat-cards mb-16" },
          h("div", { className: "stat-card" }, h("div", { className: "stat-label" }, "コール"), h("div", { className: "stat-value" }, report.calls)),
          h("div", { className: "stat-card" }, h("div", { className: "stat-label" }, "アポ"), h("div", { className: "stat-value", style: { color: "#f97316" } }, report.appos)),
          h("div", { className: "stat-card" }, h("div", { className: "stat-label" }, "商談"), h("div", { className: "stat-value" }, report.meetings)),
          h("div", { className: "stat-card" }, h("div", { className: "stat-label" }, "契約"), h("div", { className: "stat-value", style: { color: "#22c55e" } }, report.contracts)),
          h("div", { className: "stat-card" }, h("div", { className: "stat-label" }, "契約率"), h("div", { className: "stat-value" }, report.contractRate + "%")),
          h("div", { className: "stat-card" }, h("div", { className: "stat-label" }, "粗利合計"), h("div", { className: "stat-value", style: { color: "#fbbf24" } }, fmtMoney(report.totalProfit)))
        ),
        report.deals.length > 0 && h("table", { className: "table" },
          h("thead", null, h("tr", null, ["案件名","ステータス","契約日","契約額","粗利"].map(function(th) { return h("th", { key: th }, th); }))),
          h("tbody", null, report.deals.map(function(d) {
            return h("tr", { key: d.id, style: { cursor: "default" } },
              h("td", { style: { fontWeight: 600 } }, d.title || "―"),
              h("td", null, h("span", { className: "deal-status-" + d.status }, d.status)),
              h("td", { className: "text-muted" }, fmtDate(d.contractDate)),
              h("td", null, fmtMoney(d.contractAmount)),
              h("td", { style: { color: "#fbbf24" } }, fmtMoney(d.grossProfit))
            );
          }))
        )
      )
    )
  );
}
