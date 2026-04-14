// ============================================================
// 企業管理画面
// ============================================================
function CompaniesPage({ companies, selectedId, onSelect, onReload, agents, plans, creditCompanies, savedFilters, onSaveFilter, selectOptions }) {
  var so = selectOptions || [];
  // ハッシュタグ
  var _ht = useState([]), compTags = _ht[0], setCompTags = _ht[1];
  var _allTags = useState([]), allTags = _allTags[0], setAllTags = _allTags[1];
  var _htInput = useState(""), htInput = _htInput[0], setHtInput = _htInput[1];
  var _htShow = useState(false), htShowSuggest = _htShow[0], setHtShowSuggest = _htShow[1];
  function loadHashtags(cid) {
    if (!cid) return;
    API.getCompanyHashtags(cid).then(function(d) { setCompTags(d); }).catch(function() { setCompTags([]); });
  }
  function loadAllTags() {
    API.getHashtags().then(function(d) { setAllTags(d); }).catch(function() { setAllTags([]); });
  }
  useEffect(function() { loadAllTags(); }, []);
  useEffect(function() { loadHashtags(selectedId); }, [selectedId]);
  var _v = useState("detail"), view = _v[0], setView = _v[1];
  var _ed = useState(null), editData = _ed[0], setEditData = _ed[1];
  var _undo = useState([]), undoStack = _undo[0], setUndoStack = _undo[1];
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
  var _act = useState({ date: todayStr(), time: nowTimeStr(), agent: "", callType: "", callResult: "", location: "", visitResult: "未実施", appoType: "", visitor: "", appointer: "", researcher: "", content: "", nextCallDate: "", nextCallTime: "", nextCallMemo: "" }), actData = _act[0], setActData = _act[1];
  var _showPhone = useState(false), showPhoneForm = _showPhone[0], setShowPhoneForm = _showPhone[1];
  var _phone = useState({ number: "", type: "固定", label: "" }), phoneData = _phone[0], setPhoneData = _phone[1];
  var _showUrl = useState(false), showUrlForm = _showUrl[0], setShowUrlForm = _showUrl[1];
  var _urlData = useState({ url: "", type: "" }), urlData = _urlData[0], setUrlData = _urlData[1];

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
    if (sq.industryDetail && !(c.industryDetail || "").includes(sq.industryDetail)) return false;
    if (sq.email && !(c.email || "").includes(sq.email)) return false;
    if (sq.agent && !(c.activities || []).some(function(a) { return (a.agent || "").includes(sq.agent); })) return false;
    if (sq.callType && !(c.activities || []).some(function(a) { return (a.callType || "").includes(sq.callType); })) return false;
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
  // インライン保存（デバウンス付き）
  var saveTimer = useRef(null);
  var saveCompany = function(data) {
    if (sel) setUndoStack(function(prev) { return [{ type: "company", id: sel.id, data: Object.assign({}, sel) }].concat(prev).slice(0, 20); });
    setSaving(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(function() {
      API.updateCompany(data.id, data).then(function() {
        setSaving(false); onReload();
      }).catch(function(e) { alert("保存失敗: " + e.message); setSaving(false); });
    }, 800);
  };

  // 新規企業保存
  var saveNewCompany = function() {
    setSaving(true);
    API.createCompany(editData).then(function(res) {
      onSelect(res.id); setEditData(null); setView("detail"); setSaving(false); onReload();
    }).catch(function(e) { alert("登録失敗: " + e.message); setSaving(false); });
  };



  // 削除
  var doDelete = function() {
    API.deleteCompany(selectedId).then(function() {
      setShowConfirm(false); onSelect(null); onReload();
    });
  };

  // メモ保存

  // 営業行動追加
  var addActivity = function() {
    if (!actData.date) return;
    var data = Object.assign({}, actData, { type: actType });
    API.addActivity(selectedId, data).then(function() {
      // アポ結果の場合、訪問予定レコードを自動作成
      if (actType === "コール" && actData.callType === "アポ" && getLinkedOpts(so, "アポ", APPO_RESULTS).includes(actData.callResult)) {
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
      setActData({ date: todayStr(), time: nowTimeStr(), agent: "", callType: "", callResult: "", location: "", visitResult: "未実施", appoType: "", visitor: "", appointer: "", researcher: "", content: "", nextCallDate: "", nextCallTime: "", nextCallMemo: "" });
      onReload();
    }).catch(function(e) { alert("保存失敗: " + e.message); });
  };

  // ひとつ戻す
  var undo = function() {
    if (undoStack.length === 0) return;
    var last = undoStack[0];
    setUndoStack(function(prev) { return prev.slice(1); });
    if (last.type === "company") {
      API.updateCompany(last.id, last.data).then(function() { onReload(); });
    }
  };

  // 行動削除
  var deleteActivity = function(actId) {
    API.deleteActivity(actId).then(function() { onReload(); });
  };

  // 行動編集保存

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

  // URL追加
  var addUrl = function() {
    if (!urlData.url) return;
    API.addUrl(selectedId, urlData).then(function() {
      setShowUrlForm(false); setUrlData({ url: "", type: "" }); onReload();
    });
  };
  var deleteUrl = function(urlId) {
    API.deleteUrl(urlId).then(function() { onReload(); });
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
      // 最終接触日を算出（activitiesの最新日付）
      var lastContact = (c.activities || []).reduce(function(latest, a) { return a.date > latest ? a.date : latest; }, "");
      return h("div", { key: c.id, className: "sidebar-item" + (selectedId === c.id ? " active" : ""),
        onClick: function() { onSelect(c.id); setView("detail"); }
      },
        // 1行目: 都道府県 | 業種
        h("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 2 } },
          h("span", { className: "text-xs text-muted" }, c.prefecture || "―"),
          h("span", { className: "text-xs text-muted" }, c.industry || "―")
        ),
        // 2行目: 会社名
        h("div", { className: "company-name" }, c.name),
        // 3行目: 最終接触日
        h("div", { className: "text-xs text-muted", style: { marginTop: 2 } }, "最終接触: " + (lastContact ? fmtDate(lastContact) : "―"))
      );
    }),
    filtered.length === 0 && h("div", { className: "empty-state" }, "該当なし")
  );

  // ---- 詳細ビュー ----
  var detail = sel && h("div", null,
    // 企業情報カード
    h("div", { className: "card" },
      // ツールバー
      h("div", { className: "flex-between mb-8" },
        h("div", { className: "flex gap-8", style: { alignItems: "center" } },
          h("span", { className: "info-label-inline", style: { fontSize: 10 } }, "WEB"),
          h("button", { className: "btn btn-sm " + (sel.hasWeb === "あり" ? "btn-primary" : "btn-ghost"), style: { padding: "1px 8px", fontSize: 10 },
            onClick: function() { saveCompany(Object.assign({}, sel, { hasWeb: "あり" })); } }, "あり"),
          h("button", { className: "btn btn-sm " + (sel.hasWeb === "なし" ? "btn-danger" : "btn-ghost"), style: { padding: "1px 8px", fontSize: 10 },
            onClick: function() { saveCompany(Object.assign({}, sel, { hasWeb: "なし" })); } }, "なし"),
          saving && h("span", { className: "text-xs text-muted", style: { marginLeft: 8 } }, "保存中...")
        ),
        h("div", { className: "flex gap-8" },
          h("button", { className: "btn btn-ghost btn-sm", style: { opacity: undoStack.length > 0 ? 1 : 0.3 }, onClick: undo, disabled: undoStack.length === 0 }, "戻す"),
          h("button", { className: "btn btn-ghost btn-sm", style: { color: "#ef4444" }, onClick: function() { setShowConfirm(true); } }, "削除")
        )
      ),

      // 集計
      (function() {
        var calls = (sel.activities || []).filter(function(a) { return a.type === "コール"; });
        sel._contactCount = calls.filter(function(a) { return a.callType === "担当者通話" || a.callType === "受付通話" || a.callType === "決済通話"; }).length;
        sel._tantoCount = calls.filter(function(a) { return a.callType === "担当者通話"; }).length;
        sel._uketsuke = calls.filter(function(a) { return a.callType === "受付通話"; }).length;
        sel._kessai = calls.filter(function(a) { return a.callType === "決済通話"; }).length;
      })(),
      // 左右2カラム
      h("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 } },
          // ---- 左カラム ----
          h("div", null,
            h("div", { style: { display: "flex", gap: 8, marginBottom: 4 } },
              h("div", { style: { flex: 1 } }, agents.length > 0
                ? h(EditableSelect, { label: "見込み者", value: sel.prospectOwner, options: agents.map(function(a) { return a.name; }), onSave: function(v) { saveCompany(Object.assign({}, sel, { prospectOwner: v })); } })
                : h(EditableField, { label: "見込み者", value: sel.prospectOwner, onSave: function(v) { saveCompany(Object.assign({}, sel, { prospectOwner: v })); } })
              ),
              h("div", { style: { flex: 1 } }, sel.listCreatedDate
                ? h(InfoRow, { label: "リスト作成日", value: fmtDate(sel.listCreatedDate) })
                : h(EditableField, { label: "リスト作成日", value: sel.listCreatedDate, type: "date", onSave: function(v) { saveCompany(Object.assign({}, sel, { listCreatedDate: v })); } })
              )
            ),
            // 会社名（大きく表示）+ 検索ボタン
            h("div", { style: { display: "flex", gap: 8, alignItems: "center", marginBottom: 6 } },
              h("div", { style: { flex: 1 } },
                h(EditableField, { label: "", value: sel.name, className: "company-name-big", onSave: function(v) { saveCompany(Object.assign({}, sel, { name: v })); } })
              ),
              h("button", { className: "btn btn-ghost btn-sm", style: { fontSize: 11, whiteSpace: "nowrap" },
                onClick: function() {
                  var q = sel.name + " " + (sel.prefecture || "") + " " + (sel.city || "");
                  navigator.clipboard.writeText(q).then(function() { window.open("https://www.google.com/search?q=" + encodeURIComponent(q), "_blank"); });
                }
              }, "検索")
            ),
            // 法人格+フリガナ（1行）
            h("div", { style: { display: "flex", gap: 6, marginBottom: 4 } },
              h("div", { style: { width: 100 } }, h(EditableSelect, { label: "法人格", value: sel.corpType, options: CORP_TYPES, onSave: function(v) { saveCompany(Object.assign({}, sel, { corpType: v })); } })),
              h("div", { style: { flex: 1 } }, h(EditableField, { label: "フリガナ", value: sel.nameKana, onSave: function(v) { saveCompany(Object.assign({}, sel, { nameKana: v })); } }))
            ),
            h("div", { style: { display: "flex", gap: 8, marginBottom: 4 } },
              h("div", { style: { width: 120 } }, h(EditableField, { label: "〒", value: sel.zip, onSave: function(v) { saveCompany(Object.assign({}, sel, { zip: toHalfWidth(v) })); } })),
              h("div", { style: { flex: 1 } }, h(EditableField, { label: "住所", value: [sel.prefecture, sel.city, sel.address].filter(Boolean).join(" "), onSave: function(v) {
                var m = v.match(/^(..?.?[都道府県])?\s*(.+?[市区町村郡])?\s*(.*)/);
                if (m) { saveCompany(Object.assign({}, sel, { prefecture: (m[1]||"").trim(), city: (m[2]||"").trim(), address: (m[3]||"").trim() })); }
                else { saveCompany(Object.assign({}, sel, { address: v })); }
              }}))
            ),
          ),
          // ---- 右カラム ----
          h("div", null,
            h("div", { style: { background: "#3d3520", border: "1px solid #665a2e", borderRadius: 4, padding: "2px 8px" } },
              h(EditableSelect, { label: "見込み分類", value: sel.status, options: getOpts(so, "STATUS_OPTIONS", STATUS_OPTIONS), onSave: function(v) { saveCompany(Object.assign({}, sel, { status: v })); } })
            ),
            h("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 4 } },
              h(EditableSelect, { label: "業種", value: sel.industry, options: getOpts(so, "INDUSTRY_OPTIONS", INDUSTRY_OPTIONS), onSave: function(v) { saveCompany(Object.assign({}, sel, { industry: v })); } }),
              h(EditableSelect, { label: "小分類", value: sel.industryDetail, options: getLinkedOpts(so, sel.industry, [], "INDUSTRY_SUB"), onSave: function(v) { saveCompany(Object.assign({}, sel, { industryDetail: v })); } })
            ),
            h("div", { style: { marginTop: 4 } },
              h(EditableField, { label: "代表者名", value: sel.representative, onSave: function(v) { saveCompany(Object.assign({}, sel, { representative: v })); } })
            ),
            h("div", { style: { marginTop: 4 } },
              h(EditableField, { label: "メールアドレス", value: sel.email, onSave: function(v) { saveCompany(Object.assign({}, sel, { email: v })); } })
            )
          )
      ),
      // TEL | URL（全幅2列）
      h("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 8 } },
        // TEL
        h("div", null,
          h("div", { className: "flex-between", style: { marginBottom: 2 } },
            h("div", { className: "info-label" }, "TEL"),
            h("button", { className: "btn btn-ghost btn-sm", style: { padding: "0px 5px", fontSize: 10 }, onClick: function() { setShowPhoneForm(!showPhoneForm); } }, "+")
          ),
          (sel.phones || []).map(function(p, idx) {
            return h(EditablePhone, { key: p.id, phone: p, canDelete: idx > 0, onSave: function(updated) {
              API.updatePhone(p.id, updated).then(function() { onReload(); });
            }, onDelete: function() { deletePhone(p.id); } });
          }),
          (sel.phones || []).length === 0 && h("div", { className: "text-muted text-xs" }, "未登録"),
          showPhoneForm && h("div", { style: { background: "#252836", borderRadius: 4, padding: 6, marginTop: 3 } },
            h("div", { className: "flex gap-4" },
              h("input", { className: "form-input", style: { padding: "2px 4px", fontSize: 11, width: 90 }, value: phoneData.number, placeholder: "番号",
                onChange: function(e) { setPhoneData(Object.assign({}, phoneData, { number: toHalfWidth(e.target.value) })); },
                onKeyDown: function(e) { if (e.key === "Enter") addPhone(); } }),
              h("select", { className: "form-input", style: { padding: "2px 2px", fontSize: 10, width: 44 }, value: phoneData.type,
                onChange: function(e) { setPhoneData(Object.assign({}, phoneData, { type: e.target.value })); } },
                PHONE_TYPES.map(function(t) { return h("option", { key: t, value: t }, t); })
              ),
              h("button", { className: "btn btn-primary btn-sm", style: { padding: "1px 6px", fontSize: 10 }, onClick: addPhone }, "保存")
            )
          )
        ),
        // URL
        h("div", null,
          h("div", { className: "flex-between", style: { marginBottom: 2 } },
            h("div", { className: "info-label" }, "URL"),
            h("button", { className: "btn btn-ghost btn-sm", style: { padding: "0px 5px", fontSize: 10 }, onClick: function() { setShowUrlForm(!showUrlForm); } }, "+")
          ),
          (sel.urls || []).map(function(u, idx) {
            return h(EditableUrl, { key: u.id, urlData: u, canDelete: idx > 0, onSave: function(updated) {
              API.updateUrl(u.id, updated).then(function() { onReload(); });
            }, onDelete: function() { deleteUrl(u.id); } });
          }),
          (sel.urls || []).length === 0 && h("div", { className: "text-muted text-xs" }, "未登録"),
          showUrlForm && h("div", { style: { background: "#252836", borderRadius: 4, padding: 6, marginTop: 3 } },
            h("div", { className: "flex gap-4" },
              h("input", { className: "form-input", style: { padding: "2px 4px", fontSize: 11, flex: 1 }, value: urlData.url, placeholder: "https://...",
                onChange: function(e) { setUrlData(Object.assign({}, urlData, { url: e.target.value })); },
                onKeyDown: function(e) { if (e.key === "Enter") addUrl(); } }),
              h("select", { className: "form-input", style: { padding: "2px 2px", fontSize: 10, width: 80 }, value: urlData.type,
                onChange: function(e) { setUrlData(Object.assign({}, urlData, { type: e.target.value })); } },
                h("option", { value: "" }, "種別"),
                URL_TYPES.map(function(t) { return h("option", { key: t, value: t }, t); })
              ),
              h("button", { className: "btn btn-primary btn-sm", style: { padding: "1px 6px", fontSize: 10 }, onClick: addUrl }, "保存")
            )
          )
        )
      ),
      // コール数 | 接触数 | 接触内訳（全幅）
      h("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginTop: 8 } },
        h(InfoRow, { label: "コール数", value: sel.callCount || 0 }),
        h(InfoRow, { label: "接触数", value: sel._contactCount || 0 }),
        h("div", { className: "field-box field-inline" },
          h("span", { className: "info-label-inline" }, "接触内訳"),
          h("span", { className: "info-value text-xs" }, "担当" + (sel._tantoCount||0) + " 受付" + (sel._uketsuke||0) + " 決済" + (sel._kessai||0))
        ),
        h(InfoRow, { label: "接触率", value: (sel.callCount > 0 ? Math.round((sel._contactCount || 0) / sel.callCount * 100) : 0) + "%" })
      ),
      // 次回コール
      h("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 8, marginBottom: 8 } },
        h(EditableField, { label: "次回コール", value: sel.nextCallDate, type: "date", onSave: function(v) { saveCompany(Object.assign({}, sel, { nextCallDate: v })); },
          highlight: sel.nextCallDate && sel.nextCallDate <= todayStr() }),
        agents.length > 0
          ? h(EditableSelect, { label: "予定者", value: sel.nextCallAgent, options: agents.map(function(a) { return a.name; }), onSave: function(v) { saveCompany(Object.assign({}, sel, { nextCallAgent: v })); } })
          : h(EditableField, { label: "予定者", value: sel.nextCallAgent, onSave: function(v) { saveCompany(Object.assign({}, sel, { nextCallAgent: v })); } }),
        h(EditableField, { label: "次回メモ", value: sel.nextCallMemo, onSave: function(v) { saveCompany(Object.assign({}, sel, { nextCallMemo: v })); } })
      ),
      // 備考メモ
      h(MemoEditor, { key: "memo-" + sel.id, value: sel.memo, onSave: function(v) { saveCompany(Object.assign({}, sel, { memo: v })); } }),
      // ハッシュタグ
      h("div", { style: { marginTop: 8 } },
        h("div", { className: "info-label", style: { marginBottom: 4 } }, "ハッシュタグ"),
        h("div", { style: { display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" } },
          compTags.map(function(t) {
            return h("span", { key: t.id, style: { background: "#252836", border: "1px solid #3d4163", borderRadius: 12, padding: "2px 10px", fontSize: 11, color: "#7c8cf8", display: "inline-flex", alignItems: "center", gap: 4 } },
              "#" + t.tag,
              h("span", { style: { cursor: "pointer", color: "#ef4444", marginLeft: 2, fontSize: 10 }, onClick: function() {
                API.removeCompanyHashtag(sel.id, t.id).then(function() { loadHashtags(sel.id); });
              } }, "×")
            );
          }),
          h("div", { style: { position: "relative" } },
            h("input", { className: "form-input", style: { width: 130, padding: "2px 6px", fontSize: 11 }, value: htInput, placeholder: "#タグを追加",
              onChange: function(e) { setHtInput(e.target.value); setHtShowSuggest(true); },
              onKeyDown: function(e) {
                if (e.key === "Enter" && htInput.trim()) {
                  var tag = htInput.trim().replace(/^#/, "");
                  if (tag) { API.addCompanyHashtag(sel.id, tag).then(function() { setHtInput(""); loadHashtags(sel.id); loadAllTags(); }); }
                }
              },
              onFocus: function() { setHtShowSuggest(true); },
              onBlur: function() { setTimeout(function() { setHtShowSuggest(false); }, 200); }
            }),
            htShowSuggest && htInput.length === 0 && allTags.length > 0 && h("div", { style: { position: "absolute", top: "100%", left: 0, background: "#1a1d27", border: "1px solid #3d4163", borderRadius: 4, zIndex: 10, maxHeight: 120, overflowY: "auto", width: 160 } },
              allTags.filter(function(t) { return !compTags.some(function(ct) { return ct.id === t.id; }); }).map(function(t) {
                return h("div", { key: t.id, style: { padding: "4px 8px", fontSize: 11, cursor: "pointer", color: "#7c8cf8" },
                  onMouseDown: function() {
                    API.addCompanyHashtag(sel.id, t.tag).then(function() { loadHashtags(sel.id); });
                  }
                }, "#" + t.tag);
              })
            ),
            htShowSuggest && htInput.length > 0 && h("div", { style: { position: "absolute", top: "100%", left: 0, background: "#1a1d27", border: "1px solid #3d4163", borderRadius: 4, zIndex: 10, maxHeight: 120, overflowY: "auto", width: 160 } },
              allTags.filter(function(t) { return t.tag.indexOf(htInput.replace(/^#/, "")) >= 0 && !compTags.some(function(ct) { return ct.id === t.id; }); }).map(function(t) {
                return h("div", { key: t.id, style: { padding: "4px 8px", fontSize: 11, cursor: "pointer", color: "#7c8cf8" },
                  onMouseDown: function() {
                    API.addCompanyHashtag(sel.id, t.tag).then(function() { setHtInput(""); loadHashtags(sel.id); });
                  }
                }, "#" + t.tag);
              }),
              htInput.replace(/^#/, "").length > 0 && !allTags.some(function(t) { return t.tag === htInput.replace(/^#/, ""); }) && h("div", { style: { padding: "4px 8px", fontSize: 11, cursor: "pointer", color: "#22c55e", borderTop: "1px solid #2d3148" },
                onMouseDown: function() {
                  var tag = htInput.trim().replace(/^#/, "");
                  API.addCompanyHashtag(sel.id, tag).then(function() { setHtInput(""); loadHashtags(sel.id); loadAllTags(); });
                }
              }, "「" + htInput.replace(/^#/, "") + "」を新規追加")
            )
          )
        )
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
          h(FormSelect, { label: "通話分類", options: getOpts(so, "CALL_TYPES", CALL_TYPES), value: actData.callType, onChange: function(v) { upAct("callType")(v); upAct("callResult")(""); } }),
          h(FormSelect, { label: "通話結果", options: getLinkedOpts(so, actData.callType, actData.callType === "アポ" ? APPO_RESULTS : CALL_RESULTS), value: actData.callResult, onChange: upAct("callResult") })
        ),
        (actType === "アポ" || actType === "商談") && h("div", null,
          h("div", { className: "form-row form-row-3", style: { marginBottom: 6 } },
            agents.length > 0
              ? h(FormSelect, { label: "訪問者", options: agents.map(function(a) { return a.name; }), value: actData.visitor, onChange: upAct("visitor") })
              : h(FormInput, { label: "訪問者", value: actData.visitor, onChange: upAct("visitor") }),
            agents.length > 0
              ? h(FormSelect, { label: "アポ", options: agents.map(function(a) { return a.name; }), value: actData.appointer, onChange: upAct("appointer") })
              : h(FormInput, { label: "アポ", value: actData.appointer, onChange: upAct("appointer") }),
            agents.length > 0
              ? h(FormSelect, { label: "リサーチ", options: agents.map(function(a) { return a.name; }), value: actData.researcher, onChange: upAct("researcher") })
              : h(FormInput, { label: "リサーチ", value: actData.researcher, onChange: upAct("researcher") })
          ),
          h("div", { className: "form-row form-row-2" },
            h(FormSelect, { label: "訪問結果", options: getOpts(so, "VISIT_RESULTS", VISIT_RESULTS), value: actData.visitResult, onChange: upAct("visitResult") }),
            h(FormSelect, { label: "アポ種別", options: getLinkedOpts(so, "アポ", APPO_RESULTS), value: actData.appoType, onChange: upAct("appoType") })
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

        var saveAct = function(act, key, val) {
          var updated = Object.assign({}, act); updated[key] = val;
          API.updateActivity(act.id, updated).then(function() { onReload(); });
        };
        var agentOpts = agents.map(function(ag) { return ag.name; });
        return tabActs.length === 0
          ? h("div", { className: "text-muted text-sm" }, (actTab === "コール" ? "通話" : "訪問") + "履歴なし")
          : tabActs.map(function(a) {
              if (a.type === "コール") {
                // 通話: 日付|分類(2行)|結果(2行)|内容(3行)|通話者|削除(縦長)
                return h("div", { key: a.id, className: "activity-item", style: { display: "grid", gridTemplateColumns: "90px 80px 100px 1fr 60px 28px", gap: 4, alignItems: "stretch" } },
                  h(EditableField, { label: "日付", value: a.date, type: "date", onSave: function(v) { saveAct(a, "date", v); } }),
                  h(EditableSelect, { label: "分類", value: a.callType, options: getOpts(so, "CALL_TYPES", CALL_TYPES), onSave: function(v) { saveAct(a, "callType", v); } }),
                  h(EditableSelect, { label: "結果", value: a.callResult, options: getLinkedOpts(so, a.callType, a.callType === "アポ" ? APPO_RESULTS : CALL_RESULTS), onSave: function(v) { saveAct(a, "callResult", v); } }),
                  h(EditableField, { label: "内容", value: a.content, onSave: function(v) { saveAct(a, "content", v); }, multi: true }),
                  agents.length > 0
                    ? h(EditableSelect, { label: "通話者", value: a.agent, options: agentOpts, onSave: function(v) { saveAct(a, "agent", v); } })
                    : h(EditableField, { label: "通話者", value: a.agent, onSave: function(v) { saveAct(a, "agent", v); } }),
                  h("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", height: "100%", borderLeft: "1px solid #3d4163" } },
                    h("button", { className: "btn btn-ghost btn-sm", style: { color: "#ef4444", padding: "2px 2px", fontSize: 9, writingMode: "vertical-rl" }, onClick: function() { deleteActivity(a.id); } }, "削除")
                  )
                );
              } else {
                // 訪問: 日付|訪問分類(2行)|結果(2行)|内容(3行)|訪問者|アポ|リサーチ|削除(縦長)
                return h("div", { key: a.id, className: "activity-item", style: { display: "grid", gridTemplateColumns: "90px 80px 80px 1fr 52px 52px 52px 28px", gap: 4, alignItems: "stretch" } },
                  h(EditableField, { label: "日付", value: a.date, type: "date", onSave: function(v) { saveAct(a, "date", v); } }),
                  h("div", { className: "field-box", style: { minHeight: 48 } },
                    h("div", { className: "info-label" }, "訪問分類"),
                    h("div", { className: "info-value", style: { fontSize: 11 } }, a.appoType || "―")
                  ),
                  h(EditableSelect, { label: "結果", value: a.visitResult, options: getOpts(so, "VISIT_RESULTS", VISIT_RESULTS), onSave: function(v) { saveAct(a, "visitResult", v); } }),
                  h(EditableField, { label: "内容", value: a.content, onSave: function(v) { saveAct(a, "content", v); }, multi: true }),
                  agents.length > 0 ? h(EditableSelect, { label: "訪問者", value: a.visitor, options: agentOpts, onSave: function(v) { saveAct(a, "visitor", v); } }) : h(EditableField, { label: "訪問者", value: a.visitor, onSave: function(v) { saveAct(a, "visitor", v); } }),
                  agents.length > 0 ? h(EditableSelect, { label: "アポ", value: a.appointer, options: agentOpts, onSave: function(v) { saveAct(a, "appointer", v); } }) : h(EditableField, { label: "アポ", value: a.appointer, onSave: function(v) { saveAct(a, "appointer", v); } }),
                  agents.length > 0 ? h(EditableSelect, { label: "リサーチ", value: a.researcher, options: agentOpts, onSave: function(v) { saveAct(a, "researcher", v); } }) : h(EditableField, { label: "リサーチ", value: a.researcher, onSave: function(v) { saveAct(a, "researcher", v); } }),
                  h("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", height: "100%", borderLeft: "1px solid #3d4163" } },
                    h("button", { className: "btn btn-ghost btn-sm", style: { color: "#ef4444", padding: "2px 2px", fontSize: 9, writingMode: "vertical-rl" }, onClick: function() { deleteActivity(a.id); } }, "削除")
                  )
                );
              }
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
          ["企業名","都道府県","市区町村","電話番号","業種","リスト作成日","次回コール","コール数"].map(function(th) {
            return h("th", { key: th }, th);
          })
        )),
        h("tbody", null,
          filtered.map(function(c) {
            var phone = (c.phones && c.phones.length > 0) ? c.phones[0].number : "―";
            return h("tr", { key: c.id, onClick: function() { onSelect(c.id); setView("detail"); } },
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
      h("button", { className: "btn btn-primary", onClick: saveNewCompany, disabled: saving }, saving ? "登録中..." : "登録する"),
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
        setEditData({ name: "", nameKana: "", corpType: "", zip: "", prefecture: "", city: "", address: "", url: "", email: "", representative: "", status: "見込み", industry: "", industryDetail: "", listCreatedDate: "", nextCallDate: "", nextCallTime: "", nextCallMemo: "", nextCallAgent: "", prospectOwner: "", hasWeb: "", memo: "" });
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
        : view === "newCompany" ? newView
        : h("div", { className: "empty-state" }, "企業を選択してください")
      )
    ),
    showCsv && h(CsvModal, { onClose: function() { setShowCsv(false); }, onImport: importCSV }),
    showConfirm && h(ConfirmDialog, { message: "「" + sel.name + "」を削除しますか？\n関連する電話番号・営業行動・案件もすべて削除されます。", onOk: doDelete, onCancel: function() { setShowConfirm(false); } }),
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
        h("div", { className: "text-xs text-muted", style: { lineHeight: 2 } }, "企業名 / 企業名カナ / 都道府県 / 市区町村 / 郵便番号 / 番地・建物名 / 電話番号 / 代表者 / 見込み分類 / 業種 / 業種詳細 / リスト作成日 / 備考")
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
            h("thead", null, h("tr", null, ["企業名","都道府県","電話番号"].map(function(th) { return h("th", { key: th }, th); }))),
            h("tbody", null, preview.slice(0, 20).map(function(r, i) {
              return h("tr", { key: i, style: { cursor: "default" } },
                h("td", null, r.name || "―"),
                h("td", { className: "text-muted" }, r.prefecture || "―"),
                h("td", { className: "text-muted" }, r.tel || "―")
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
        h("div", { className: "text-xs text-muted" }, "Enter で検索 / Esc でキャンセル")
      ),
      // 左右2カラム（企業詳細と同じ配置）
      h("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 } },
        // 左カラム
        h("div", null,
          h("div", { style: { display: "flex", gap: 8, marginBottom: 4 } },
            agents && agents.length > 0
              ? h(FormSelect, { label: "見込み者", options: agents.map(function(a) { return a.name; }), value: query.agent || "", onChange: s("agent") })
              : h(FormInput, { label: "見込み者", value: query.agent || "", onChange: s("agent") }),
            h(FormInput, { label: "リスト作成 From", type: "date", value: query.dateFrom || "", onChange: s("dateFrom") }),
            h(FormInput, { label: "リスト作成 To", type: "date", value: query.dateTo || "", onChange: s("dateTo") })
          ),
          h(FormInput, { label: "会社名・カナ", value: query.name || "", onChange: s("name"), placeholder: "例: 山田建設" }),
          h(FormInput, { label: "住所", value: query.address || "", onChange: s("address"), placeholder: "都道府県・市区町村・番地" }),
          h(FormInput, { label: "電話番号", value: query.tel || "", onChange: s("tel"), placeholder: "例: 06-1111" })
        ),
        // 右カラム
        h("div", null,
          h(FormSelect, { label: "見込み分類", options: getOpts(so, "STATUS_OPTIONS", STATUS_OPTIONS), value: query.status || "", onChange: s("status") }),
          h("div", { style: { display: "flex", gap: 8 } },
            h("div", { style: { flex: 1 } }, h(FormSelect, { label: "業種", options: getOpts(so, "INDUSTRY_OPTIONS", INDUSTRY_OPTIONS), value: query.industry || "", onChange: s("industry") })),
            h("div", { style: { flex: 1 } }, h(FormInput, { label: "小分類", value: query.industryDetail || "", onChange: s("industryDetail") }))
          ),
          h(FormInput, { label: "代表者名", value: query.representative || "", onChange: s("representative") }),
          h(FormInput, { label: "メールアドレス", value: query.email || "", onChange: s("email") })
        )
      ),
      // 営業行動
      h("div", { className: "text-xs mb-8 mt-12", style: { fontWeight: 600, color: "#64748b", borderBottom: "1px solid #2d3148", paddingBottom: 4 } }, "営業行動"),
      h("div", { style: { display: "flex", gap: 8 } },
        h("div", { style: { flex: 1 } }, h(FormSelect, { label: "通話分類", options: getOpts(so, "CALL_TYPES", CALL_TYPES), value: query.callType || "", onChange: s("callType") })),
        h("div", { style: { flex: 1 } }, h(FormSelect, { label: "通話結果", options: getOpts(so, "CALL_RESULTS", CALL_RESULTS).concat(getLinkedOpts(so, "アポ", APPO_RESULTS)), value: query.callResult || "", onChange: s("callResult") })),
        h("div", { style: { flex: 1 } }, h(FormInput, { label: "内容", value: query.actContent || "", onChange: s("actContent"), placeholder: "内容で検索" })),
        h("div", { style: { flex: 1 } }, h(FormInput, { label: "備考メモ", value: query.memo || "", onChange: s("memo"), placeholder: "メモで検索" }))
      ),
      // ボタン
      h("div", { className: "flex gap-8 mt-12", style: { flexWrap: "wrap" } },
        h("button", { className: "btn btn-primary", onClick: onSearch }, "検索する"),
        h("button", { className: "btn btn-secondary", onClick: onCancel }, "キャンセル"),
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
    )
  );
}
