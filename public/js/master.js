// ============================================================
// マスタ管理画面
// ============================================================
function MasterPage({ plans, agents, creditCompanies, onReload }) {
  var _tab = useState("plans"), tab = _tab[0], setTab = _tab[1];

  // プラン追加
  var _pn = useState({ name: "", category: "", price: 0, description: "" }), planData = _pn[0], setPlanData = _pn[1];
  var _sp = useState(false), showPlanForm = _sp[0], setShowPlanForm = _sp[1];
  var _ep = useState(null), editPlan = _ep[0], setEditPlan = _ep[1];

  var addPlan = function() {
    if (!planData.name) return;
    API.createPlan(planData).then(function() {
      setPlanData({ name: "", category: "", price: 0, description: "" }); setShowPlanForm(false); onReload();
    });
  };

  var updatePlan = function() {
    API.updatePlan(editPlan.id, editPlan).then(function() { setEditPlan(null); onReload(); });
  };

  var deletePlan = function(id) {
    API.deletePlan(id).then(function() { onReload(); });
  };

  // 担当者追加
  var _an = useState(""), agentName = _an[0], setAgentName = _an[1];
  var _at = useState(""), agentTeam = _at[0], setAgentTeam = _at[1];
  var addAgent = function() {
    if (!agentName) return;
    API.createAgent({ name: agentName, team: agentTeam }).then(function() { setAgentName(""); setAgentTeam(""); onReload(); });
  };
  var deleteAgent = function(id) { API.deleteAgent(id).then(function() { onReload(); }); };

  // 信販会社追加
  var _cn = useState(""), creditName = _cn[0], setCreditName = _cn[1];
  var addCredit = function() {
    if (!creditName) return;
    API.createCreditCompany(creditName).then(function() { setCreditName(""); onReload(); });
  };
  var deleteCredit = function(id) { API.deleteCreditCompany(id).then(function() { onReload(); }); };

  var CATEGORIES = ["HP","LP","SEO","広告","その他"];

  return h("div", null,
    // タブ
    h("div", { className: "flex gap-4 mb-16" },
      [["plans","商品プラン"],["agents","担当者"],["credit","信販会社"]].map(function(t) {
        return h("button", { key: t[0], className: "btn btn-sm " + (tab === t[0] ? "btn-primary" : "btn-ghost"),
          onClick: function() { setTab(t[0]); }
        }, t[1]);
      })
    ),

    // ---- 商品プラン ----
    tab === "plans" && h("div", { className: "card" },
      h("div", { className: "card-header" },
        h("div", { className: "card-title" }, "商品プラン"),
        h("button", { className: "btn btn-primary btn-sm", onClick: function() { setShowPlanForm(!showPlanForm); } }, "+ プラン追加")
      ),
      showPlanForm && h("div", { style: { background: "#252836", borderRadius: 8, padding: 14, marginBottom: 14, border: "1px solid #3d4163" } },
        h("div", { className: "form-row form-row-4" },
          h(FormInput, { label: "プラン名 *", value: planData.name, onChange: function(v) { setPlanData(Object.assign({}, planData, { name: v })); } }),
          h(FormSelect, { label: "カテゴリ", options: CATEGORIES, value: planData.category, onChange: function(v) { setPlanData(Object.assign({}, planData, { category: v })); } }),
          h(FormInput, { label: "標準価格", type: "number", value: planData.price, onChange: function(v) { setPlanData(Object.assign({}, planData, { price: parseInt(v) || 0 })); } }),
          h(FormInput, { label: "説明", value: planData.description, onChange: function(v) { setPlanData(Object.assign({}, planData, { description: v })); } })
        ),
        h("div", { className: "flex gap-8" },
          h("button", { className: "btn btn-primary btn-sm", onClick: addPlan }, "追加"),
          h("button", { className: "btn btn-secondary btn-sm", onClick: function() { setShowPlanForm(false); } }, "キャンセル")
        )
      ),
      plans.length === 0
        ? h("div", { className: "empty-state" }, "プランが登録されていません")
        : h("table", { className: "table" },
            h("thead", null, h("tr", null, ["プラン名","カテゴリ","標準価格","説明","状態","操作"].map(function(th) { return h("th", { key: th }, th); }))),
            h("tbody", null,
              plans.map(function(p) {
                if (editPlan && editPlan.id === p.id) {
                  return h("tr", { key: p.id, style: { cursor: "default" } },
                    h("td", null, h("input", { className: "search-input", value: editPlan.name, onChange: function(e) { setEditPlan(Object.assign({}, editPlan, { name: e.target.value })); } })),
                    h("td", null, h("select", { className: "search-input", value: editPlan.category, onChange: function(e) { setEditPlan(Object.assign({}, editPlan, { category: e.target.value })); } },
                      h("option", { value: "" }, "―"), CATEGORIES.map(function(c) { return h("option", { key: c, value: c }, c); }))),
                    h("td", null, h("input", { className: "search-input", type: "number", value: editPlan.price, onChange: function(e) { setEditPlan(Object.assign({}, editPlan, { price: parseInt(e.target.value) || 0 })); } })),
                    h("td", null, h("input", { className: "search-input", value: editPlan.description || "", onChange: function(e) { setEditPlan(Object.assign({}, editPlan, { description: e.target.value })); } })),
                    h("td", null, h("button", { className: "btn-icon btn-sm", onClick: function() { setEditPlan(Object.assign({}, editPlan, { active: !editPlan.active })); } }, editPlan.active ? "有効" : "無効")),
                    h("td", null,
                      h("div", { className: "flex gap-4" },
                        h("button", { className: "btn btn-primary btn-sm", onClick: updatePlan }, "保存"),
                        h("button", { className: "btn btn-secondary btn-sm", onClick: function() { setEditPlan(null); } }, "×")
                      )
                    )
                  );
                }
                return h("tr", { key: p.id, onClick: function() { setEditPlan(Object.assign({}, p)); } },
                  h("td", { style: { fontWeight: 600 } }, p.name),
                  h("td", { className: "text-muted" }, p.category || "―"),
                  h("td", null, fmtMoney(p.price)),
                  h("td", { className: "text-muted" }, p.description || "―"),
                  h("td", null, h("span", { style: { color: p.active ? "#22c55e" : "#64748b" } }, p.active ? "有効" : "無効")),
                  h("td", null, h("button", { className: "btn-icon btn-sm", onClick: function(e) { e.stopPropagation(); deletePlan(p.id); } }, "×"))
                );
              })
            )
          )
    ),

    // ---- 担当者 ----
    tab === "agents" && h("div", { className: "card" },
      h("div", { className: "card-header" },
        h("div", { className: "card-title" }, "担当者")
      ),
      h("div", { className: "flex gap-8 mb-12" },
        h("input", { className: "form-input", style: { maxWidth: 200 }, value: agentName, onChange: function(e) { setAgentName(e.target.value); }, placeholder: "担当者名",
          onKeyDown: function(e) { if (e.key === "Enter") addAgent(); }
        }),
        h("select", { className: "form-input", style: { maxWidth: 100 }, value: agentTeam, onChange: function(e) { setAgentTeam(e.target.value); } },
          h("option", { value: "" }, "課"),
          h("option", { value: "1課" }, "1課"),
          h("option", { value: "2課" }, "2課")
        ),
        h("button", { className: "btn btn-primary btn-sm", onClick: addAgent }, "追加")
      ),
      agents.length === 0
        ? h("div", { className: "empty-state" }, "担当者が登録されていません")
        : h("table", { className: "table" },
            h("thead", null, h("tr", null, ["担当者名","課","操作"].map(function(th) { return h("th", { key: th }, th); }))),
            h("tbody", null, agents.map(function(a) {
              return h("tr", { key: a.id, style: { cursor: "default" } },
                h("td", { style: { fontWeight: 600 } }, a.name),
                h("td", null,
                  h("select", { className: "form-input", style: { padding: "2px 4px", fontSize: 12, width: 70 }, value: a.team || "",
                    onChange: function(e) { API.updateAgent(a.id, { name: a.name, team: e.target.value }).then(function() { onReload(); }); }
                  },
                    h("option", { value: "" }, "―"),
                    h("option", { value: "1課" }, "1課"),
                    h("option", { value: "2課" }, "2課")
                  )
                ),
                h("td", null, h("button", { className: "btn-icon btn-sm", onClick: function() { deleteAgent(a.id); } }, "×"))
              );
            }))
          )
    ),

    // ---- 信販会社 ----
    tab === "credit" && h("div", { className: "card" },
      h("div", { className: "card-header" },
        h("div", { className: "card-title" }, "信販会社")
      ),
      h("div", { className: "flex gap-8 mb-12" },
        h("input", { className: "form-input", style: { maxWidth: 300 }, value: creditName, onChange: function(e) { setCreditName(e.target.value); }, placeholder: "信販会社名を入力",
          onKeyDown: function(e) { if (e.key === "Enter") addCredit(); }
        }),
        h("button", { className: "btn btn-primary btn-sm", onClick: addCredit }, "追加")
      ),
      creditCompanies.length === 0
        ? h("div", { className: "empty-state" }, "信販会社が登録されていません")
        : creditCompanies.map(function(c) {
            return h("div", { key: c.id, className: "master-item" },
              h("span", { style: { fontWeight: 600 } }, c.name),
              h("button", { className: "btn-icon btn-sm", onClick: function() { deleteCredit(c.id); } }, "×")
            );
          })
    )
  );
}
