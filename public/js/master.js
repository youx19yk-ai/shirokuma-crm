// ============================================================
// マスタ管理画面
// ============================================================
function MasterPage({ plans, agents, creditCompanies, onReload }) {
  var _tab = useState("plans"), tab = _tab[0], setTab = _tab[1];

  // セレクト項目管理
  var _selOpts = useState([]), selOpts = _selOpts[0], setSelOpts = _selOpts[1];
  var _selCat = useState("CALL_TYPES"), selCat = _selCat[0], setSelCat = _selCat[1];
  var _selNew = useState(""), selNew = _selNew[0], setSelNew = _selNew[1];
  var _selNewResult = useState(""), selNewResult = _selNewResult[0], setSelNewResult = _selNewResult[1];
  var _selCallType = useState(""), selCallType = _selCallType[0], setSelCallType = _selCallType[1]; // 紐づき編集用
  var SEL_CATEGORIES = [
    { key: "CALL_LINK", label: "通話分類・結果" },
    { key: "VISIT_RESULTS", label: "訪問結果" },
    { key: "STATUS_OPTIONS", label: "見込み分類" },
    { key: "DEAL_STATUSES", label: "案件ステータス" },
    { key: "INDUSTRY_OPTIONS", label: "業種" },
    { key: "PAYMENT_METHODS", label: "決済方法" }
  ];
  function loadSelOpts() {
    API.getSelectOptions().then(function(d) { setSelOpts(d); }).catch(function() { setSelOpts([]); });
  }
  useEffect(function() { loadSelOpts(); }, []);

  function getItems(cat) {
    return selOpts.filter(function(o) { return o.category === cat && !o.parent; });
  }
  function getLinkedResults(callType) {
    return selOpts.filter(function(o) { return o.category === 'CALL_TYPE_RESULTS' && o.parent === callType; });
  }
  function addSelOpt(cat, val, parent) {
    if (!val || !val.trim()) return;
    API.createSelectOption({ category: cat, value: val.trim(), parent: parent || '' }).then(function() { loadSelOpts(); });
  }
  function delSelOpt(id) {
    API.deleteSelectOption(id).then(function() { loadSelOpts(); });
  }

  // 目標設定
  var _targets = useState([]), targets = _targets[0], setTargets = _targets[1];
  var _tgLoad = useState(false), tgLoading = _tgLoad[0], setTgLoading = _tgLoad[1];
  var _tgMonth = useState(function() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0'); }), tgMonth = _tgMonth[0], setTgMonth = _tgMonth[1];
  var _tgEdit = useState({}), tgEdit = _tgEdit[0], setTgEdit = _tgEdit[1]; // { agentName: { grossProfitTarget, contractTarget } }

  function loadTargets() {
    setTgLoading(true);
    API.getTargets().then(function(data) { setTargets(data); setTgLoading(false); }).catch(function() { setTgLoading(false); });
  }
  useEffect(function() { loadTargets(); }, []);

  function getTargetForAgent(agentName, month) {
    return targets.find(function(t) { return t.agent === agentName && t.yearMonth === month; });
  }

  function saveTarget(agentName) {
    var edit = tgEdit[agentName];
    if (!edit) return;
    var existing = getTargetForAgent(agentName, tgMonth);
    var data = { agent: agentName, yearMonth: tgMonth, grossProfitTarget: parseInt(edit.grossProfitTarget) || 0, contractTarget: parseInt(edit.contractTarget) || 0 };
    var promise = existing ? API.updateTarget(existing.id, data) : API.createTarget(data);
    promise.then(function() { loadTargets(); });
  }

  function initEditForMonth(month) {
    var edits = {};
    (agents || []).forEach(function(a) {
      var t = targets.find(function(tt) { return tt.agent === a.name && tt.yearMonth === month; });
      edits[a.name] = { grossProfitTarget: t ? t.grossProfitTarget : 0, contractTarget: t ? t.contractTarget : 0 };
    });
    setTgEdit(edits);
  }

  useEffect(function() { initEditForMonth(tgMonth); }, [tgMonth, targets, agents]);

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
      [["plans","商品プラン"],["agents","担当者"],["credit","信販会社"],["targets","目標設定"],["selects","セレクト項目"]].map(function(t) {
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
    ),

    // ---- 目標設定 ----
    tab === "targets" && h("div", { className: "card" },
      h("div", { className: "card-header" },
        h("div", { className: "card-title" }, "目標設定"),
        h("div", { className: "flex gap-8" },
          h("input", { type: "month", className: "form-input", style: { maxWidth: 160, padding: "4px 8px", fontSize: 12 }, value: tgMonth,
            onChange: function(e) { setTgMonth(e.target.value); }
          })
        )
      ),
      tgLoading
        ? h("div", { className: "text-muted text-sm", style: { padding: 20 } }, "読み込み中...")
        : (agents || []).length === 0
          ? h("div", { className: "empty-state" }, "担当者を先に登録してください")
          : h("table", { className: "table" },
              h("thead", null,
                h("tr", null,
                  ["担当者","課","粗利目標","契約数目標","操作"].map(function(th) { return h("th", { key: th }, th); })
                )
              ),
              h("tbody", null,
                (agents || []).map(function(a) {
                  var edit = tgEdit[a.name] || { grossProfitTarget: 0, contractTarget: 0 };
                  var existing = getTargetForAgent(a.name, tgMonth);
                  return h("tr", { key: a.id, style: { cursor: "default" } },
                    h("td", { style: { fontWeight: 600 } }, a.name),
                    h("td", { className: "text-muted" }, a.team || "―"),
                    h("td", null,
                      h("input", { className: "search-input", type: "number", style: { width: 130 }, value: edit.grossProfitTarget,
                        onChange: function(e) { var v = e.target.value; setTgEdit(function(prev) { var n = Object.assign({}, prev); n[a.name] = Object.assign({}, n[a.name], { grossProfitTarget: v }); return n; }); }
                      })
                    ),
                    h("td", null,
                      h("input", { className: "search-input", type: "number", style: { width: 80 }, value: edit.contractTarget,
                        onChange: function(e) { var v = e.target.value; setTgEdit(function(prev) { var n = Object.assign({}, prev); n[a.name] = Object.assign({}, n[a.name], { contractTarget: v }); return n; }); }
                      })
                    ),
                    h("td", null,
                      h("button", { className: "btn btn-primary btn-sm", onClick: function() { saveTarget(a.name); } }, existing ? "更新" : "保存")
                    )
                  );
                })
              )
            )
    ),

    // ---- セレクト項目 ----
    tab === "selects" && h("div", null,
      // 初期データ投入ボタン
      selOpts.length === 0 && h("div", { className: "card mb-12", style: { textAlign: "center", padding: 20 } },
        h("div", { className: "text-muted mb-8" }, "セレクト項目が未登録です。デフォルト項目を投入しますか？"),
        h("button", { className: "btn btn-primary", onClick: function() {
          fetch('/api/select-options/seed-defaults', { method: 'POST' }).then(function() { loadSelOpts(); });
        } }, "デフォルト項目を投入")
      ),
      h("div", { className: "card" },
        h("div", { className: "card-header" },
          h("div", { className: "card-title" }, "セレクト項目管理")
        ),
        // カテゴリ選択
        h("div", { className: "flex gap-4 mb-12", style: { flexWrap: "wrap" } },
          SEL_CATEGORIES.map(function(c) {
            return h("button", { key: c.key, className: "btn btn-sm " + (selCat === c.key ? "btn-primary" : "btn-ghost"),
              onClick: function() { setSelCat(c.key); setSelCallType(""); }
            }, c.label);
          })
        ),

        // === 通話分類・結果（紐づき編集） ===
        selCat === "CALL_LINK" && (function() {
          var callTypes = getItems("CALL_TYPES");
          return h("div", null,
            // 通話分類一覧 + 追加
            h("div", { style: { marginBottom: 16 } },
              h("div", { style: { fontWeight: 600, fontSize: 13, marginBottom: 8, color: "#7c8cf8" } }, "通話分類"),
              h("div", { className: "flex gap-8 mb-8" },
                h("input", { className: "form-input", style: { maxWidth: 200 }, value: selNew, placeholder: "新しい通話分類",
                  onChange: function(e) { setSelNew(e.target.value); },
                  onKeyDown: function(e) { if (e.key === "Enter") { addSelOpt("CALL_TYPES", selNew); setSelNew(""); } }
                }),
                h("button", { className: "btn btn-primary btn-sm", onClick: function() { addSelOpt("CALL_TYPES", selNew); setSelNew(""); } }, "追加")
              ),
              callTypes.map(function(ct) {
                var isActive = selCallType === ct.value;
                return h("div", { key: ct.id, className: "master-item", style: { borderLeft: isActive ? "3px solid #7c8cf8" : "3px solid transparent", cursor: "pointer" },
                  onClick: function() { setSelCallType(isActive ? "" : ct.value); }
                },
                  h("span", { style: { fontWeight: 600, flex: 1 } }, ct.value),
                  h("span", { className: "text-xs text-muted", style: { marginRight: 8 } }, getLinkedResults(ct.value).length + "件の結果"),
                  h("button", { className: "btn-icon btn-sm", style: { color: "#ef4444" },
                    onClick: function(e) { e.stopPropagation(); delSelOpt(ct.id); }
                  }, "削除")
                );
              })
            ),
            // 選択中の通話分類に紐づく結果
            selCallType && h("div", { style: { marginTop: 8, padding: 14, background: "#252836", borderRadius: 8, border: "1px solid #3d4163" } },
              h("div", { style: { fontWeight: 600, fontSize: 13, marginBottom: 8, color: "#f97316" } }, selCallType + " の通話結果"),
              h("div", { className: "flex gap-8 mb-8" },
                h("input", { className: "form-input", style: { maxWidth: 200 }, value: selNewResult, placeholder: "新しい結果",
                  onChange: function(e) { setSelNewResult(e.target.value); },
                  onKeyDown: function(e) { if (e.key === "Enter") { addSelOpt("CALL_TYPE_RESULTS", selNewResult, selCallType); setSelNewResult(""); } }
                }),
                h("button", { className: "btn btn-primary btn-sm", onClick: function() { addSelOpt("CALL_TYPE_RESULTS", selNewResult, selCallType); setSelNewResult(""); } }, "追加")
              ),
              getLinkedResults(selCallType).length === 0
                ? h("div", { className: "text-muted text-sm" }, "結果が未登録です")
                : getLinkedResults(selCallType).map(function(r) {
                    return h("div", { key: r.id, className: "master-item" },
                      h("span", { style: { fontWeight: 600 } }, r.value),
                      h("button", { className: "btn-icon btn-sm", style: { color: "#ef4444" },
                        onClick: function() { delSelOpt(r.id); }
                      }, "削除")
                    );
                  })
            )
          );
        })(),

        // === 通常カテゴリ（一覧+追加+削除） ===
        selCat !== "CALL_LINK" && (function() {
          var items = getItems(selCat);
          return h("div", null,
            h("div", { className: "flex gap-8 mb-12" },
              h("input", { className: "form-input", style: { maxWidth: 250 }, value: selNew, placeholder: "新しい項目名",
                onChange: function(e) { setSelNew(e.target.value); },
                onKeyDown: function(e) { if (e.key === "Enter") { addSelOpt(selCat, selNew); setSelNew(""); } }
              }),
              h("button", { className: "btn btn-primary btn-sm", onClick: function() { addSelOpt(selCat, selNew); setSelNew(""); } }, "追加")
            ),
            items.length === 0
              ? h("div", { className: "text-muted text-sm", style: { padding: 12 } }, "項目がありません。上から追加するか、デフォルトを投入してください。")
              : items.map(function(item) {
                  return h("div", { key: item.id, className: "master-item" },
                    h("span", { style: { fontWeight: 600 } }, item.value),
                    h("button", { className: "btn-icon btn-sm", style: { color: "#ef4444" },
                      onClick: function() { delSelOpt(item.id); }
                    }, "削除")
                  );
                })
          );
        })()
      )
    )
  );
}
