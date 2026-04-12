// ============================================================
// 企業管理画面
// ============================================================
function CompaniesPage({ companies, selectedId, onSelect, onReload, agents, plans, creditCompanies, savedFilters, onSaveFilter }) {
  var _v = useState("detail"), view = _v[0], setView = _v[1];
  var _em = useState(false), editMode = _em[0], setEditMode = _em[1];
  var _ed = useState(null), editData = _ed[0], setEditData = _ed[1];
  var _sm = useState(false), searchMode = _sm[0], setSearchMode = _sm[1];
  var _sq = useState({}), searchQuery = _sq[0], setSearchQuery = _sq[1];
  var _actTab = useState("コール"), actTab = _actTab[0], setActTab = _actTab[1];
  var _csv = useState(false), showCsv = _csv[0], setShowCsv = _csv[1];
  var _sav = useState(false), saving = _sav[0], setSaving = _sav[1];
  var _cf = useState(false), showConfirm = _cf[0], setShowConfirm = _cf[1];
  var _sort = useState("created"), sortBy = _sort[0], setSortBy = _sort[1];
  var _sortDir = useState("desc"), sortDir = _sortDir[0], setSortDir = _sortDir[1];
  var _showAct = useState(false), showActForm = _showAct[0], setShowActForm = _showAct[1];
  var _actType = useState("コール"), actType = _actType[0], setActType = _actType[1];
  var _act = useState({ date: todayStr(), time: nowTimeStr(), agent: "", callType: "", callResult: "", location: "", visitResult: "未実施", visitRole: "", appoType: "", content: "", nextCallDate: "", nextCallTime: "", nextCallMemo: "" }), actData = _act[0], setActData = _act[1];
  var _showPhone = useState(false), showPhoneForm = _showPhone[0], setShowPhoneForm = _showPhone[1];
  var _phone = useState({ number: "", type: "固定", label: "" }), phoneData = _phone[0], setPhoneData = _phone[1];
  var _editAct = useState(null), editActData = _editAct[0], setEditActData = _editAct[1];

  var sel = companies.find(function(c) { return c.id === selectedId; });

  // フィルタリング
  var filtered = companies.filter(function(c) {
    // FM式フィールド内検索
    var sq = searchQuery;
    if (sq.name && !c.name.includes(sq.name) && !(c.nameKana || "").includes(sq.name)) return false;
    if (sq.tel && !((c.phones || []).some(function(p) { return p.number.includes(sq.tel); }))) return false;
    if (sq.prefecture && !(c.prefecture || "").includes(sq.prefecture)) return false;
    if (sq.city && !(c.city || "").includes(sq.city)) return false;
    if (sq.address && !(c.address || "").includes(sq.address)) return false;
    if (sq.representative && !(c.representative || "").includes(sq.representative)) return false;
    if (sq.industry && !(c.industry || "").includes(sq.industry) && !(c.industryDetail || "").includes(sq.industry)) return false;
    if (sq.status && c.status !== sq.status) return false;
    if (sq.memo && !(c.memo || "").includes(sq.memo)) return false;
    // 営業行動での検索
    if (sq.agent && !(c.activities || []).some(function(a) { return (a.agent || "").includes(sq.agent); })) return false;
    if (sq.callResult && !(c.activities || []).some(function(a) { return (a.callResult || "").includes(sq.callResult); })) return false;
    if (sq.actContent && !(c.activities || []).some(function(a) { return (a.content || "").includes(sq.actContent); })) return false;
    if (sq.dateFrom && c.listCreatedDate && c.listCreatedDate < sq.dateFrom) return false;
    if (sq.dateTo && c.listCreatedDate && c.listCreatedDate > sq.dateTo) return false;
    return true;
  });

  // ソート
  filtered.sort(function(a, b) {
    var va, vb;
    if (sortBy === "name") { va = a.name; vb = b.name; }
    else if (sortBy === "calls") { va = a.callCount || 0; vb = b.callCount || 0; }
    else if (sortBy === "listDate") { va = a.listCreatedDate || ""; vb = b.listCreatedDate || ""; }
    else { va = a.createdAt || ""; vb = b.createdAt || ""; }
    if (va < vb) return sortDir === "asc" ? -1 : 1;
    if (va > vb) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  var activeCount = Object.values(searchQuery).filter(Boolean).length;

  // 保存
  var save = function() {
    setSaving(true);
    var fn = editData.id ? API.updateCompany(editData.id, editData) : API.createCompany(editData);
    fn.then(function(res) {
      if (!editData.id) { onSelect(res.id); }
      setEditMode(false); setEditData(null); setSaving(false);
      onReload();
    }).catch(function(e) { alert("保存失敗: " + e.message); setSaving(false); });
  };

  // 削除
  var doDelete = function() {
    API.deleteCompany(selectedId).then(function() {
      setShowConfirm(false); onSelect(null); onReload();
    });
  };

  // メモ保存
  var saveMemo = function(memo) {
    var updated = Object.assign({}, sel, { memo: memo });
    API.updateCompany(sel.id, updated).then(function() { onReload(); });
  };

  // 営業行動追加
  var addActivity = function() {
    if (!actData.date) return;
    var data = Object.assign({}, actData, { type: actType });
    API.addActivity(selectedId, data).then(function() {
      // アポ結果の場合、訪問予定レコードを自動作成
      if (actType === "コール" && actData.callType === "アポ" && APPO_RESULTS.includes(actData.callResult)) {
        API.addActivity(selectedId, {
          type: "アポ",
          date: actData.nextCallDate || "",
          time: actData.nextCallTime || "",
          agent: actData.agent,
          location: "",
          visitResult: "未実施",
          appoType: actData.callResult,
          content: ""
        });
      }
      setShowActForm(false);
      setActData({ date: todayStr(), time: nowTimeStr(), agent: "", callType: "", callResult: "", location: "", visitResult: "未実施", visitRole: "", appoType: "", content: "", nextCallDate: "", nextCallTime: "", nextCallMemo: "" });
      onReload();
    }).catch(function(e) { alert("保存失敗: " + e.message); });
  };

  // 行動削除
  var deleteActivity = function(actId) {
    API.deleteActivity(actId).then(function() { onReload(); });
  };

  // 行動編集保存
  var saveEditActivity = function() {
    API.updateActivity(editActData.id, editActData).then(function() {
      setEditActData(null); onReload();
    }).catch(function(e) { alert("保存失敗: " + e.message); });
  };
  var upEditAct = function(k) { return function(v) { setEditActData(function(p) { var r = Object.assign({}, p); r[k] = v; return r; }); }; };

  // 電話番号追加
  var addPhone = function() {
    if (!phoneData.number) return;
    API.addPhone(selectedId, phoneData).then(function() {
      setShowPhoneForm(false); setPhoneData({ number: "", type: "固定", label: "" }); onReload();
    }).catch(function(e) { alert("保存失敗: " + e.message); });
  };

  // 電話番号削除
  var deletePhone = function(phoneId) {
    API.deletePhone(phoneId).then(function() { onReload(); });
  };

  // CSVインポート
  var importCSV = function(rows) {
    setSaving(true);
    API.bulkImport(rows).then(function() {
      setShowCsv(false); setSaving(false); onReload();
      alert(rows.length + "件をインポートしました");
    }).catch(function(e) { alert("インポート失敗: " + e.message); setSaving(false); });
  };

  var upAct = function(k) { return function(v) { setActData(function(p) { var r = Object.assign({}, p); r[k] = v; return r; }); }; };
  var toggleSort = function(col) {
    if (sortBy === col) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("desc"); }
  };

  // ---- サイドバー ----
  var sidebar = h("div", { className: "sidebar" },
    h("div", { className: "sidebar-count" },
      h("span", null, filtered.length + " / " + companies.length + " 件"),
      h("span", { style: { float: "right", display: "flex", gap: 4 } },
        ["created", "name", "calls", "listDate"].map(function(col) {
          var label = { created: "登録", name: "名前", calls: "コール", listDate: "リスト" }[col];
          return h("button", { key: col, className: "btn-icon", title: label + "順",
            style: { fontSize: 10, color: sortBy === col ? "#7c8cf8" : "#64748b" },
            onClick: function() { toggleSort(col); }
          }, label + (sortBy === col ? (sortDir === "asc" ? "↑" : "↓") : ""));
        })
      )
    ),
    filtered.map(function(c) {
      return h("div", { key: c.id, className: "sidebar-item" + (selectedId === c.id ? " active" : ""),
        onClick: function() { onSelect(c.id); setView("detail"); setEditMode(false); }
      },
        h("div", { className: "flex gap-4", style: { marginBottom: 2 } },
          h("span", { className: "badge " + statusBadgeClass(c.status), style: { fontSize: 10 } }, c.status),
          c.prefecture && h("span", { className: "text-xs text-muted" }, c.prefecture)
        ),
        h("div", { className: "company-name" }, c.name),
        (c.phones && c.phones.length > 0) && h("div", { className: "company-tel" }, c.phones[0].number),
        c.nextCallDate && h("div", { className: "text-xs", style: { color: c.nextCallDate < todayStr() ? "#ef4444" : "#92863a", marginTop: 2 } },
          "次回: " + fmtDate(c.nextCallDate)
        ),
        c.listCreatedDate && h("div", { className: "text-xs text-muted", style: { marginTop: 1 } }, "リスト: " + fmtDate(c.listCreatedDate))
      );
    }),
    filtered.length === 0 && h("div", { className: "empty-state" }, "該当なし")
  );

  // ---- 詳細ビュー ----
  var detail = sel && h("div", null,
    // 企業情報カード
    h("div", { className: "card" },
      h("div", { className: "card-header" },
        h("div", null,
          h("div", { className: "flex gap-8 mb-8", style: { flexWrap: "wrap" } },
            h("span", { className: "badge " + statusBadgeClass(sel.status) }, sel.status),
            h("span", { className: "text-xs text-muted" }, "ID: " + sel.id),
            sel.listCreatedDate && h("span", { className: "badge badge-yellow" }, "リスト: " + fmtDate(sel.listCreatedDate))
          ),
          h("div", { style: { fontSize: 20, fontWeight: 700 } }, sel.name),
          sel.nameKana && h("div", { className: "text-xs text-muted" }, sel.nameKana)
        ),
        !editMode && h("div", { className: "flex gap-8" },
          h("button", { className: "btn btn-secondary btn-sm", onClick: function() { setEditData(Object.assign({}, sel)); setEditMode(true); } }, "編集"),
          h("button", { className: "btn btn-ghost btn-sm", style: { color: "#ef4444" }, onClick: function() { setShowConfirm(true); } }, "削除")
        )
      ),
      editMode
        ? h("div", null,
            h(CompanyForm, { data: editData, onChange: setEditData, agents: agents }),
            h("div", { className: "flex gap-10 mt-12" },
              h("button", { className: "btn btn-primary", onClick: save, disabled: saving }, saving ? "保存中..." : "保存"),
              h("button", { className: "btn btn-secondary", onClick: function() { setEditMode(false); } }, "キャンセル")
            )
          )
        : h("div", null,
            // 電話番号セクション
            h("div", { className: "mb-12" },
              h("div", { className: "flex-between mb-8" },
                h("div", { className: "text-sm", style: { fontWeight: 600 } }, "電話番号"),
                h("button", { className: "btn btn-ghost btn-sm", onClick: function() { setShowPhoneForm(!showPhoneForm); } }, "+ 追加")
              ),
              (sel.phones || []).length === 0 && !showPhoneForm && h("div", { className: "text-muted text-sm" }, "電話番号未登録"),
              (sel.phones || []).map(function(p) {
                return h("div", { key: p.id, className: "phone-row" },
                  h("span", { className: "phone-number" }, p.number),
                  h("span", { className: "phone-type" }, p.type),
                  h("span", { className: "phone-label" }, p.label),
                  h("button", { className: "btn-icon btn-sm", onClick: function() { deletePhone(p.id); } }, "×")
                );
              }),
              showPhoneForm && h("div", { style: { background: "#252836", borderRadius: 8, padding: 12, marginTop: 8 } },
                h("div", { className: "form-row form-row-3" },
                  h(FormInput, { label: "電話番号", value: phoneData.number, onChange: function(v) { setPhoneData(Object.assign({}, phoneData, { number: v })); } }),
                  h(FormSelect, { label: "種別", options: PHONE_TYPES, value: phoneData.type, onChange: function(v) { setPhoneData(Object.assign({}, phoneData, { type: v })); } }),
                  h(FormInput, { label: "ラベル", value: phoneData.label, onChange: function(v) { setPhoneData(Object.assign({}, phoneData, { label: v })); }, placeholder: "例: 山田社長携帯" })
                ),
                h("div", { className: "flex gap-8" },
                  h("button", { className: "btn btn-primary btn-sm", onClick: addPhone }, "追加"),
                  h("button", { className: "btn btn-secondary btn-sm", onClick: function() { setShowPhoneForm(false); } }, "キャンセル")
                )
              )
            ),
            // 基本情報
            h("div", { className: "info-grid mb-12" },
              h(InfoRow, { label: "住所", value: [sel.prefecture, sel.city, sel.address].filter(Boolean).join(" ") }),
              h(InfoRow, { label: "代表者", value: sel.representative }),
              h(InfoRow, { label: "URL", value: sel.url, link: true }),
              h(InfoRow, { label: "業種", value: sel.industry + (sel.industryDetail ? " / " + sel.industryDetail : "") }),
              h(InfoRow, { label: "次回コール", value: sel.nextCallDate ? fmtDate(sel.nextCallDate) + (sel.nextCallTime ? " " + sel.nextCallTime : "") + (sel.nextCallMemo ? " 「" + sel.nextCallMemo + "」" : "") : "―",
                highlight: sel.nextCallDate && sel.nextCallDate <= todayStr() }),
              h(InfoRow, { label: "コール数", value: sel.callCount || 0 })
            ),
            // 備考メモ
            h(MemoEditor, { key: "memo-" + sel.id, value: sel.memo, onSave: saveMemo })
          )
    ),

    // 営業履歴カード（タブ切替）
    h("div", { className: "card" },
      h("div", { className: "card-header" },
        h("div", { className: "flex gap-4" },
          [["コール","通話履歴"],["アポ","訪問履歴"],["受注","受注履歴"]].map(function(t) {
            return h("button", { key: t[0], className: "btn btn-sm " + (actTab === t[0] ? "btn-primary" : "btn-ghost"),
              onClick: function() { setActTab(t[0]); setShowActForm(false); }
            }, t[1]);
          })
        ),
        h("div", { className: "flex gap-4" },
          actTab !== "受注" && h("button", { className: "btn btn-sm " + (showActForm && actType === (actTab === "コール" ? "コール" : "アポ") ? "btn-primary" : "btn-ghost"),
            onClick: function() { setActType(actTab === "コール" ? "コール" : "アポ"); setShowActForm(true); }
          }, "+ 新規作成"),
        )
      ),
      // 記録フォーム
      showActForm && h("div", { style: { background: "#252836", borderRadius: 8, padding: 14, marginBottom: 14, border: "1px solid #3d4163" } },
        h("div", { className: "text-sm mb-8", style: { fontWeight: 600, color: "#7c8cf8" } }, actType + "を記録"),
        h("div", { className: "form-row form-row-3" },
          h(FormInput, { label: "日付 *", type: "date", value: actData.date, onChange: upAct("date") }),
          h(FormInput, { label: "時間", type: "time", value: actData.time, onChange: upAct("time") }),
          agents.length > 0
            ? h(FormSelect, { label: "担当者", options: agents.map(function(a) { return a.name; }), value: actData.agent, onChange: upAct("agent") })
            : h(FormInput, { label: "担当者", value: actData.agent, onChange: upAct("agent") })
        ),
        actType === "コール" && h("div", { className: "form-row form-row-2" },
          h(FormSelect, { label: "通話分類", options: CALL_TYPES, value: actData.callType, onChange: function(v) { upAct("callType")(v); upAct("callResult")(""); } }),
          h(FormSelect, { label: "通話結果", options: actData.callType === "アポ" ? APPO_RESULTS : CALL_RESULTS, value: actData.callResult, onChange: upAct("callResult") })
        ),
        (actType === "アポ" || actType === "商談") && h("div", null,
          h("div", { className: "flex gap-4 mb-8" },
            VISIT_ROLES.map(function(r) {
              return h("button", { key: r, className: "btn btn-sm " + (actData.visitRole === r ? "btn-primary" : "btn-ghost"),
                onClick: function() { upAct("visitRole")(r); }
              }, r);
            })
          ),
          h("div", { className: "form-row form-row-3" },
            h(FormInput, { label: "場所", value: actData.location, onChange: upAct("location"), placeholder: "例: 本社会議室" }),
            h(FormSelect, { label: "訪問結果", options: VISIT_RESULTS, value: actData.visitResult, onChange: upAct("visitResult") }),
            h(FormSelect, { label: "アポ種別", options: APPO_RESULTS, value: actData.appoType, onChange: upAct("appoType") })
          )
        ),
        h(FormInput, { label: "内容", value: actData.content, onChange: upAct("content") }),
        h("div", { className: "form-row form-row-3" },
          h(FormInput, { label: "次回コール予定日", type: "date", value: actData.nextCallDate, onChange: upAct("nextCallDate") }),
          h(FormInput, { label: "次回コール時間", type: "time", value: actData.nextCallTime, onChange: upAct("nextCallTime") }),
          h(FormInput, { label: "次回メモ", value: actData.nextCallMemo, onChange: upAct("nextCallMemo"), placeholder: "例: 見積もり確認" })
        ),
        h("div", { className: "flex gap-8" },
          h("button", { className: "btn btn-primary btn-sm", onClick: addActivity }, "記録する"),
          h("button", { className: "btn btn-secondary btn-sm", onClick: function() { setShowActForm(false); } }, "キャンセル")
        )
      ),
      // タブ別リスト
      (function() {
        var acts = sel.activities || [];
        var tabActs;
        if (actTab === "コール") tabActs = acts.filter(function(a) { return a.type === "コール" || a.type === "商談"; });
        else if (actTab === "アポ") tabActs = acts.filter(function(a) { return a.type === "アポ"; });
        else tabActs = []; // 受注は案件カードで表示

        if (actTab === "受注") {
          return (sel.deals || []).length === 0
            ? h("div", { className: "text-muted text-sm" }, "受注履歴なし")
            : h("table", { className: "table" },
                h("thead", null, h("tr", null,
                  ["案件名","ステータス","契約日","契約額","担当","粗利"].map(function(th) { return h("th", { key: th }, th); })
                )),
                h("tbody", null,
                  (sel.deals || []).map(function(d) {
                    return h("tr", { key: d.id },
                      h("td", { style: { fontWeight: 600 } }, d.title || "―"),
                      h("td", null, h("span", { className: "deal-status-" + d.status }, d.status)),
                      h("td", { className: "text-muted" }, fmtDate(d.contractDate)),
                      h("td", null, d.contractAmount ? fmtMoney(d.contractAmount) : "―"),
                      h("td", null, d.agent),
                      h("td", { style: { color: "#fbbf24" } }, d.grossProfit ? fmtMoney(d.grossProfit) : "―")
                    );
                  })
                )
              );
        }

        return tabActs.length === 0
          ? h("div", { className: "text-muted text-sm" }, (actTab === "コール" ? "通話" : "訪問") + "履歴なし")
          : tabActs.map(function(a) {
              var vrColor = a.visitResult === "契約" ? "#22c55e" : a.visitResult === "NG" || a.visitResult === "前確NG" ? "#ef4444" : a.visitResult === "検討" ? "#f97316" : a.visitResult === "未実施" ? "#64748b" : "#94a3b8";
              var crColor = a.callResult && (a.callResult.includes("アポ") ? "#22c55e" : a.callResult.includes("再コール") ? "#f97316" : a.callResult.includes("諦め") || a.callResult.includes("YES取れず") ? "#ef4444" : "#94a3b8");
              return h("div", { key: a.id, className: "activity-item", onClick: function() { setEditActData(Object.assign({}, a)); } },
                // 列1: 日付
                h("div", { className: "activity-date" }, fmtDate(a.date), a.time && h("div", { className: "text-xs text-muted" }, a.time)),
                // 列2: 分類/ロール
                h("div", { style: { fontSize: 12 } },
                  a.type === "コール" && h("span", { className: "text-muted" }, a.callType || "―"),
                  (a.type === "アポ" || a.type === "商談") && h("span", { className: "badge badge-purple", style: { fontSize: 10 } }, a.visitRole || "―")
                ),
                // 列3: 結果/アポ種別
                h("div", { style: { fontSize: 12 } },
                  a.type === "コール" && h("span", { style: { color: crColor, fontWeight: 600 } }, a.callResult || "―"),
                  (a.type === "アポ" || a.type === "商談") && h("div", null,
                    h("span", { style: { color: vrColor, fontWeight: 600 } }, a.visitResult || "未実施"),
                    a.appoType && h("div", { className: "text-xs", style: { color: "#7c8cf8" } }, a.appoType)
                  )
                ),
                // 列4: 内容
                h("div", { className: "activity-content" },
                  (a.type === "アポ" || a.type === "商談") && a.location && h("span", { className: "text-muted text-xs" }, a.location + " "),
                  a.content
                ),
                // 列5: 担当者
                h("div", { className: "activity-agent" }, a.agent),
                // 列6: 削除
                h("button", { className: "btn-icon", style: { fontSize: 12 }, onClick: function(e) { e.stopPropagation(); deleteActivity(a.id); } }, "×")
              );
            });
      })()
    ),

  );

  // ---- 一覧ビュー ----
  var listView = h("div", null,
    h("div", { className: "flex-between mb-12" },
      h("div", { className: "card-title" }, "企業一覧 (" + filtered.length + "件)"),
      h("div", { className: "flex gap-8" },
        h("button", { className: "btn btn-secondary btn-sm", onClick: function() { API.exportCSV(); } }, "CSVエクスポート")
      )
    ),
    h("div", { style: { overflowX: "auto" } },
      h("table", { className: "table" },
        h("thead", null, h("tr", null,
          ["顧客分類","企業名","都道府県","市区町村","電話番号","業種","リスト作成日","次回コール","コール数"].map(function(th) {
            return h("th", { key: th }, th);
          })
        )),
        h("tbody", null,
          filtered.map(function(c) {
            var phone = (c.phones && c.phones.length > 0) ? c.phones[0].number : "―";
            return h("tr", { key: c.id, onClick: function() { onSelect(c.id); setView("detail"); } },
              h("td", null, h("span", { className: "badge " + statusBadgeClass(c.status) }, c.status)),
              h("td", { style: { fontWeight: 600, whiteSpace: "nowrap" } }, c.name),
              h("td", { className: "text-muted" }, c.prefecture || "―"),
              h("td", { className: "text-muted" }, c.city || "―"),
              h("td", { className: "text-muted", style: { whiteSpace: "nowrap" } }, phone),
              h("td", { className: "text-muted" }, c.industry),
              h("td", { className: "text-highlight" }, fmtDate(c.listCreatedDate)),
              h("td", { style: { color: c.nextCallDate && c.nextCallDate <= todayStr() ? "#ef4444" : "#94a3b8" } }, fmtDate(c.nextCallDate)),
              h("td", { className: "text-muted text-center" }, c.callCount || 0)
            );
          })
        )
      )
    )
  );

  // ---- 新規登録ビュー ----
  var newView = h("div", null,
    h("div", { className: "card-title mb-16", style: { color: "#7c8cf8" } }, "新規企業登録"),
    editData && h(CompanyForm, { data: editData, onChange: setEditData, agents: agents }),
    h("div", { className: "flex gap-12 mt-16" },
      h("button", { className: "btn btn-primary", onClick: save, disabled: saving }, saving ? "登録中..." : "登録する"),
      h("button", { className: "btn btn-secondary", onClick: function() { setView("detail"); setEditData(null); } }, "キャンセル")
    )
  );

  // (旧検索パネル削除済み)

  return h("div", { style: { display: "flex", flexDirection: "column", flex: 1, overflow: "hidden", height: "100%" } },
    // ツールバー
    h("div", { style: { background: "#1a1d27", borderBottom: "1px solid #2d3148", padding: "6px 16px", display: "flex", gap: 8, alignItems: "center", flexShrink: 0 } },
      h("button", { className: "btn btn-sm " + (searchMode ? "btn-primary" : "btn-ghost"), style: { position: "relative" }, onClick: function() {
        if (searchMode) { setSearchMode(false); }
        else { setSearchMode(true); }
      } }, searchMode ? "検索解除" : "検索",
        activeCount > 0 && !searchMode && h("span", { style: { position: "absolute", top: -5, right: -5, background: "#7c8cf8", color: "#fff", borderRadius: "50%", width: 17, height: 17, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 } }, activeCount)
      ),
      activeCount > 0 && !searchMode && h("button", { className: "btn btn-ghost btn-sm", style: { color: "#ef4444" }, onClick: function() { setSearchQuery({}); } }, "条件クリア"),
      // 保存済み検索条件
      savedFilters && savedFilters.length > 0 && h("select", { className: "btn btn-ghost btn-sm", style: { background: "#252836", color: "#94a3b8", border: "1px solid #3d4163", borderRadius: 6, padding: "4px 8px", fontSize: 12 },
        onChange: function(e) {
          var f = savedFilters.find(function(x) { return x.id === e.target.value; });
          if (f) { setSearchQuery(typeof f.filters === 'string' ? JSON.parse(f.filters) : f.filters); setSearchMode(false); }
          e.target.value = "";
        }
      },
        h("option", { value: "" }, "保存済み条件"),
        savedFilters.map(function(f) { return h("option", { key: f.id, value: f.id }, f.name); })
      ),
      h("div", { style: { flex: 1 } }),
      h("button", { className: "btn btn-success btn-sm", onClick: function() { setShowCsv(true); } }, "CSV入力"),
      h("button", { className: "btn btn-secondary btn-sm", onClick: function() { API.exportCSV(); } }, "CSV出力"),
      h("button", { className: "btn btn-primary btn-sm", onClick: function() {
        setEditData({ name: "", nameKana: "", zip: "", prefecture: "", city: "", address: "", url: "", representative: "", status: "見込み", industry: "", industryDetail: "", listCreatedDate: "", nextCallDate: "", nextCallTime: "", nextCallMemo: "", memo: "" });
        setView("newCompany");
      } }, "+ 新規企業"),
      h("button", { className: "btn btn-ghost btn-sm", onClick: function() { setView(view === "list" ? "detail" : "list"); } }, view === "list" ? "詳細" : "一覧")
    ),
    h("div", { className: "main-content" },
      sidebar,
      h("div", { className: "content-area" },
        searchMode ? h(SearchModeView, {
          query: searchQuery,
          onChange: setSearchQuery,
          onSearch: function() { setSearchMode(false); },
          onCancel: function() { setSearchQuery({}); setSearchMode(false); },
          onSaveFilter: onSaveFilter,
          agents: agents
        })
        : view === "detail" ? (sel ? detail : h("div", { className: "empty-state" }, "企業を選択してください"))
        : view === "list" ? listView
        : newView
      )
    ),
    showCsv && h(CsvModal, { onClose: function() { setShowCsv(false); }, onImport: importCSV }),
    showConfirm && h(ConfirmDialog, { message: "「" + sel.name + "」を削除しますか？\n関連する電話番号・営業行動・案件もすべて削除されます。", onOk: doDelete, onCancel: function() { setShowConfirm(false); } }),
    editActData && h("div", { className: "modal-overlay", onClick: function() { setEditActData(null); } },
      h("div", { className: "modal", onClick: function(e) { e.stopPropagation(); } },
        h("div", { className: "modal-header" },
          h("div", { className: "modal-title" }, (editActData.type === "コール" ? "通話" : "訪問") + "レコード編集"),
          h("button", { className: "modal-close", onClick: function() { setEditActData(null); } }, "×")
        ),
        h("div", { className: "form-row form-row-3" },
          h(FormInput, { label: "日付", type: "date", value: editActData.date, onChange: upEditAct("date") }),
          h(FormInput, { label: "時間", type: "time", value: editActData.time, onChange: upEditAct("time") }),
          agents.length > 0
            ? h(FormSelect, { label: "担当者", options: agents.map(function(a) { return a.name; }), value: editActData.agent, onChange: upEditAct("agent") })
            : h(FormInput, { label: "担当者", value: editActData.agent, onChange: upEditAct("agent") })
        ),
        editActData.type === "コール" && h("div", { className: "form-row form-row-2" },
          h(FormSelect, { label: "通話分類", options: CALL_TYPES, value: editActData.callType, onChange: function(v) { upEditAct("callType")(v); upEditAct("callResult")(""); } }),
          h(FormSelect, { label: "通話結果", options: editActData.callType === "アポ" ? APPO_RESULTS : CALL_RESULTS, value: editActData.callResult, onChange: upEditAct("callResult") })
        ),
        (editActData.type === "アポ" || editActData.type === "商談") && h("div", null,
          h("div", { className: "flex gap-4 mb-8" },
            VISIT_ROLES.map(function(r) {
              return h("button", { key: r, className: "btn btn-sm " + (editActData.visitRole === r ? "btn-primary" : "btn-ghost"),
                onClick: function() { upEditAct("visitRole")(r); }
              }, r);
            })
          ),
          h("div", { className: "form-row form-row-3" },
            h(FormInput, { label: "場所", value: editActData.location, onChange: upEditAct("location") }),
            h(FormSelect, { label: "訪問結果", options: VISIT_RESULTS, value: editActData.visitResult, onChange: upEditAct("visitResult") }),
            h(FormSelect, { label: "アポ種別", options: APPO_RESULTS, value: editActData.appoType, onChange: upEditAct("appoType") })
          )
        ),
        h(FormInput, { label: "内容", value: editActData.content, onChange: upEditAct("content") }),
        h("div", { className: "flex gap-12 mt-16", style: { justifyContent: "flex-end" } },
          h("button", { className: "btn btn-secondary", onClick: function() { setEditActData(null); } }, "キャンセル"),
          h("button", { className: "btn btn-primary", onClick: saveEditActivity }, "保存")
        )
      )
    )
  );
}



// ---- CSVモーダル ----
function CsvModal({ onClose, onImport }) {
  var _s1 = useState(""), text = _s1[0], setText = _s1[1];
  var _s2 = useState(null), preview = _s2[0], setPreview = _s2[1];
  var _s3 = useState(""), error = _s3[0], setError = _s3[1];
  var fileRef = useRef(null);

  var parseCSV = function(raw) {
    var lines = raw.trim().split(/\r?\n/);
    if (lines.length < 2) { setError("データが2行以上必要です"); return; }
    var headers = lines[0].split(",").map(function(h) { return h.trim().replace(/^["']|["']$/g, ""); });
    var keys = headers.map(function(h) { return CSV_MAP[h] || h; });
    var rows = [];
    for (var i = 1; i < lines.length; i++) {
      var vals = lines[i].split(",").map(function(v) { return v.trim().replace(/^["']|["']$/g, ""); });
      if (vals.every(function(v) { return !v; })) continue;
      var obj = { callCount: 0, status: "見込み" };
      keys.forEach(function(k, j) { if (vals[j]) obj[k] = vals[j]; });
      if (!obj.prefecture && obj.address) {
        var m = obj.address.match(/^(..?.?[都道府県])(.+?[市区町村])(.*)/);
        if (m) { obj.prefecture = m[1]; obj.city = m[2]; obj.address = m[3]; }
      }
      rows.push(obj);
    }
    setError(""); setPreview(rows);
  };

  var handleFile = function(e) {
    var f = e.target.files[0]; if (!f) return;
    var r = new FileReader();
    r.onload = function(ev) { var t = ev.target.result; setText(t); parseCSV(t); };
    r.readAsText(f, "UTF-8");
  };

  return h("div", { className: "modal-overlay", onClick: onClose },
    h("div", { className: "modal", onClick: function(e) { e.stopPropagation(); } },
      h("div", { className: "modal-header" },
        h("div", { className: "modal-title" }, "CSV一括インポート"),
        h("button", { className: "modal-close", onClick: onClose }, "×")
      ),
      h("div", { style: { background: "#252836", borderRadius: 8, padding: 14, marginBottom: 16, border: "1px solid #2d3148" } },
        h("div", { className: "text-sm", style: { color: "#7c8cf8", fontWeight: 700, marginBottom: 6 } }, "対応CSVヘッダー"),
        h("div", { className: "text-xs text-muted", style: { lineHeight: 2 } }, "企業名 / 企業名カナ / 都道府県 / 市区町村 / 郵便番号 / 番地・建物名 / 電話番号 / 代表者 / 顧客分類 / 業種 / 業種詳細 / リスト作成日 / 備考")
      ),
      h("div", {
        onClick: function() { fileRef.current.click(); },
        style: { border: "2px dashed #3d4163", borderRadius: 8, padding: 20, textAlign: "center", cursor: "pointer", marginBottom: 14, background: "#13151f" }
      },
        h("div", { style: { fontSize: 28, marginBottom: 6 } }, "\uD83D\uDCC2"),
        h("div", { className: "text-muted text-sm" }, "CSVファイルを選択（UTF-8）")
      ),
      h("input", { ref: fileRef, type: "file", accept: ".csv", style: { display: "none" }, onChange: handleFile }),
      h("div", { className: "text-xs text-muted mb-8" }, "またはテキストを直接貼り付け"),
      h("textarea", { className: "form-input mb-12", value: text, rows: 4, placeholder: "企業名,電話番号,...",
        onChange: function(e) { setText(e.target.value); if (e.target.value) parseCSV(e.target.value); }
      }),
      error && h("div", { style: { color: "#ef4444", fontSize: 12, marginBottom: 12, padding: "8px 12px", background: "#2a1515", borderRadius: 6 } }, error),
      preview && preview.length > 0 && h("div", { className: "mb-12" },
        h("div", { style: { fontSize: 12, color: "#22c55e", marginBottom: 8, fontWeight: 600 } }, "OK: " + preview.length + "件"),
        h("div", { style: { overflowX: "auto", maxHeight: 180, border: "1px solid #2d3148", borderRadius: 6 } },
          h("table", { className: "table" },
            h("thead", null, h("tr", null, ["企業名","都道府県","電話番号","顧客分類"].map(function(th) { return h("th", { key: th }, th); }))),
            h("tbody", null, preview.slice(0, 20).map(function(r, i) {
              return h("tr", { key: i, style: { cursor: "default" } },
                h("td", null, r.name || "―"),
                h("td", { className: "text-muted" }, r.prefecture || "―"),
                h("td", { className: "text-muted" }, r.tel || "―"),
                h("td", null, h("span", { className: "badge " + statusBadgeClass(r.status) }, r.status || "見込み"))
              );
            }))
          )
        )
      ),
      h("div", { className: "flex gap-12", style: { justifyContent: "flex-end" } },
        h("button", { className: "btn btn-secondary", onClick: onClose }, "キャンセル"),
        preview && preview.length > 0 && h("button", { className: "btn btn-primary", onClick: function() { onImport(preview); } }, preview.length + "件をインポート")
      )
    )
  );
}

// ---- FM式検索モードビュー ----
function SearchModeView({ query, onChange, onSearch, onCancel, onSaveFilter, agents }) {
  var s = function(k) { return function(v) { onChange(function(p) { var r = Object.assign({}, p); r[k] = v; return r; }); }; };
  var _sn = useState(""), saveName = _sn[0], setSaveName = _sn[1];
  var _showSave = useState(false), showSave = _showSave[0], setShowSave = _showSave[1];

  return h("div", { onKeyDown: function(e) { if (e.key === "Enter") onSearch(); if (e.key === "Escape") onCancel(); } },
    h("div", { className: "card", style: { borderColor: "#7c8cf8", borderWidth: 2 } },
      h("div", { className: "card-header" },
        h("div", { style: { fontSize: 16, fontWeight: 700, color: "#7c8cf8" } }, "検索モード"),
        h("div", { className: "text-xs text-muted" }, "検索したいフィールドにテキストを入力 → Enter で検索")
      ),
      // 企業情報
      h("div", { className: "text-xs mb-8", style: { fontWeight: 600, color: "#64748b", borderBottom: "1px solid #2d3148", paddingBottom: 4 } }, "企業情報"),
      h("div", { className: "form-row form-row-2" },
        h(FormInput, { label: "企業名・カナ", value: query.name || "", onChange: s("name"), placeholder: "例: 山田建設" }),
        h(FormInput, { label: "電話番号", value: query.tel || "", onChange: s("tel"), placeholder: "例: 06-1111" })
      ),
      h("div", { className: "form-row form-row-3" },
        h(FormSelect, { label: "都道府県", options: PREFECTURES, value: query.prefecture || "", onChange: s("prefecture") }),
        h(FormInput, { label: "市区町村", value: query.city || "", onChange: s("city"), placeholder: "例: 大阪市" }),
        h(FormInput, { label: "番地・建物名", value: query.address || "", onChange: s("address") })
      ),
      h("div", { className: "form-row form-row-3" },
        h(FormInput, { label: "代表者名", value: query.representative || "", onChange: s("representative") }),
        h(FormSelect, { label: "顧客分類", options: STATUS_OPTIONS, value: query.status || "", onChange: s("status") }),
        h(FormInput, { label: "業種", value: query.industry || "", onChange: s("industry"), placeholder: "例: ガテン系" })
      ),
      h("div", { className: "form-row form-row-2" },
        h(FormInput, { label: "リスト作成 From", type: "date", value: query.dateFrom || "", onChange: s("dateFrom") }),
        h(FormInput, { label: "リスト作成 To", type: "date", value: query.dateTo || "", onChange: s("dateTo") })
      ),
      h(FormInput, { label: "備考メモ", value: query.memo || "", onChange: s("memo"), placeholder: "メモの内容で検索" }),
      // 営業行動
      h("div", { className: "text-xs mb-8 mt-16", style: { fontWeight: 600, color: "#64748b", borderBottom: "1px solid #2d3148", paddingBottom: 4 } }, "営業行動"),
      h("div", { className: "form-row form-row-3" },
        agents && agents.length > 0
          ? h(FormSelect, { label: "担当者", options: agents.map(function(a) { return a.name; }), value: query.agent || "", onChange: s("agent") })
          : h(FormInput, { label: "担当者", value: query.agent || "", onChange: s("agent") }),
        h(FormSelect, { label: "通話結果", options: CALL_RESULTS, value: query.callResult || "", onChange: s("callResult") }),
        h(FormInput, { label: "行動内容", value: query.actContent || "", onChange: s("actContent"), placeholder: "内容で検索" })
      ),
      // ボタン
      h("div", { className: "flex gap-8 mt-16", style: { flexWrap: "wrap" } },
        h("button", { className: "btn btn-primary", onClick: onSearch }, "検索する（Enter）"),
        h("button", { className: "btn btn-secondary", onClick: onCancel }, "キャンセル（Esc）"),
        h("button", { className: "btn btn-ghost", onClick: function() { onChange({}); } }, "条件クリア"),
        h("div", { style: { flex: 1 } }),
        !showSave
          ? h("button", { className: "btn btn-ghost btn-sm", onClick: function() { setShowSave(true); } }, "この条件を保存")
          : h("div", { className: "flex gap-4" },
              h("input", { className: "form-input", style: { width: 180, padding: "4px 8px", fontSize: 12 }, value: saveName, onChange: function(e) { setSaveName(e.target.value); }, placeholder: "条件名..." }),
              h("button", { className: "btn btn-primary btn-sm", onClick: function() { if (saveName && onSaveFilter) { onSaveFilter(saveName, query); setSaveName(""); setShowSave(false); } } }, "保存"),
              h("button", { className: "btn btn-ghost btn-sm", onClick: function() { setShowSave(false); } }, "×")
            )
      )
    ),
    h("div", { className: "text-muted text-sm mt-12", style: { textAlign: "center" } },
      "複数フィールドに入力するとAND検索になります"
    )
  );
}
