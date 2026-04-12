// ============================================================
// 共通コンポーネント & ユーティリティ
// ============================================================
const h = React.createElement;
const { useState, useEffect, useRef } = React;

// 定数
const PREFECTURES = ["北海道","青森県","岩手県","宮城県","秋田県","山形県","福島県","茨城県","栃木県","群馬県","埼玉県","千葉県","東京都","神奈川県","新潟県","富山県","石川県","福井県","山梨県","長野県","岐阜県","静岡県","愛知県","三重県","滋賀県","京都府","大阪府","兵庫県","奈良県","和歌山県","鳥取県","島根県","岡山県","広島県","山口県","徳島県","香川県","愛媛県","高知県","福岡県","佐賀県","長崎県","熊本県","大分県","宮崎県","鹿児島県","沖縄県"];
const STATUS_OPTIONS = ["見込み","顧客","関連会社","休眠","NG"];
const CORP_TYPES = ["株式会社","有限会社","合同会社","個人事業主","その他法人","チェーン店"];
const URL_TYPES = ["HP","求人LP","受注LP","ポータルサイト","求人サイト","無料サイト"];
const INDUSTRY_OPTIONS = ["ガテン系","IT/通信","製造業","小売業","飲食業","医療/福祉","教育","不動産","建設","運送","美容","その他"];
const CALL_TYPES = ["アポ","決済通話","担当者通話","受付通話","不通"];
const CALL_RESULTS = ["必要性のYES取れず","話し込めず再コール","諦め判断","アポ取得"];
const APPO_RESULTS = ["新規アポ","再訪アポ","クロスセルアポ","アップセルアポ","担当者アポ","来週アポ"];
const VISIT_RESULTS = ["未実施","契約","NG","検討","日変","訪問日変","前確NG"];
const VISIT_ROLES = ["アポ者","訪問者","リサーチ者"];
const PHONE_TYPES = ["固定","携帯","代表者携帯","FAX"];
const DEAL_STATUSES = ["商談中","契約済","審査中","制作中","取材待ち","取材済","納品済","完了"];
const PAYMENT_METHODS = ["信販","現金","振込"];
const CREDIT_STATUSES = ["申請中","承認","却下"];

// CSVヘッダーマッピング
const CSV_MAP = {
  "企業名":"name","会社名":"name","企業名カナ":"nameKana","カナ":"nameKana",
  "郵便番号":"zip","住所":"address","番地・建物名":"address","都道府県":"prefecture",
  "市区町村":"city","電話番号":"tel","電話":"tel","TEL":"tel","FAX":"fax","FAX番号":"fax",
  "URL":"url","代表者":"representative","代表者名":"representative","ステータス":"status",
  "顧客分類":"status","業種":"industry","業種詳細":"industryDetail",
  "リスト作成日":"listCreatedDate","リスト作成年月日":"listCreatedDate",
  "最終社長通話日":"lastPresidentCall","備考":"memo","メモ":"memo"
};

// ユーティリティ
function statusColor(s) {
  return { 顧客: "#22c55e", 見込み: "#3b82f6", 関連会社: "#a855f7", 休眠: "#94a3b8", NG: "#ef4444" }[s] || "#94a3b8";
}

function statusBadgeClass(s) {
  return { 顧客: "badge-green", 見込み: "badge-blue", 関連会社: "badge-purple", 休眠: "badge-gray", NG: "badge-red" }[s] || "badge-gray";
}

function fmtDate(d) {
  if (!d) return "―";
  const p = d.split("-");
  return p.length === 3 ? p[0] + "/" + p[1] + "/" + p[2] : d;
}

function fmtMoney(n) {
  if (!n && n !== 0) return "―";
  return "¥" + Number(n).toLocaleString();
}

function toHalfWidth(str) {
  if (!str) return str;
  return str.replace(/[０-９]/g, function(s) { return String.fromCharCode(s.charCodeAt(0) - 0xFEE0); });
}

function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function nowTimeStr() {
  const d = new Date();
  return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
}

// ---- フォーム部品 ----

function FormInput({ label, value, onChange, placeholder, type, multi, rows, className }) {
  var handleChange = function(e) { onChange(toHalfWidth(e.target.value)); };
  return h("div", { className: "form-group " + (className || "") },
    label && h("label", { className: "form-label" }, label),
    multi
      ? h("textarea", {
          className: "form-input", rows: rows || 3, value: value || "",
          placeholder: placeholder || "",
          onChange: handleChange
        })
      : h("input", {
          className: "form-input", type: type || "text", value: value || "",
          placeholder: placeholder || "",
          onChange: handleChange
        })
  );
}

function FormSelect({ label, options, value, onChange, placeholder }) {
  return h("div", { className: "form-group" },
    label && h("label", { className: "form-label" }, label),
    h("select", {
      className: "form-input", value: value || "",
      onChange: function(e) { onChange(e.target.value); }
    },
      h("option", { value: "" }, placeholder || "選択..."),
      options.map(function(o) {
        var val = typeof o === 'string' ? o : o.value;
        var txt = typeof o === 'string' ? o : o.label;
        return h("option", { key: val, value: val }, txt);
      })
    )
  );
}

function InfoRow({ label, value, link, highlight }) {
  return h("div", { className: "field-box field-inline" },
    h("span", { className: "info-label-inline" }, label),
    (link && value)
      ? h("a", { href: value.startsWith("http") ? value : "https://" + value, target: "_blank", rel: "noreferrer", className: "info-value" }, value)
      : h("span", { className: "info-value" + (highlight ? " text-highlight" : "") }, value || "―")
  );
}

// ---- 確認ダイアログ ----
function ConfirmDialog({ message, onOk, onCancel }) {
  return h("div", { className: "confirm-overlay", onClick: onCancel },
    h("div", { className: "confirm-box", onClick: function(e) { e.stopPropagation(); } },
      h("div", { className: "confirm-msg" }, message),
      h("div", { className: "confirm-buttons" },
        h("button", { className: "btn btn-danger", onClick: onOk }, "はい"),
        h("button", { className: "btn btn-secondary", onClick: onCancel }, "キャンセル")
      )
    )
  );
}

// ---- 備考メモエディタ ----
function MemoEditor({ value, onSave }) {
  var _e = useState(false), editing = _e[0], setEditing = _e[1];
  var _d = useState(value || ""), draft = _d[0], setDraft = _d[1];
  var ta = useRef(null);
  useEffect(function() { if (editing && ta.current) ta.current.focus(); }, [editing]);
  useEffect(function() { setDraft(value || ""); }, [value]);

  if (editing) {
    return h("div", { className: "form-group" },
      h("label", { className: "form-label" }, "備考メモ"),
      h("textarea", {
        ref: ta, className: "form-input", value: draft, rows: 5,
        onChange: function(e) { setDraft(e.target.value); },
        onKeyDown: function(e) { if (e.key === "Escape") { setDraft(value || ""); setEditing(false); } }
      }),
      h("div", { className: "flex gap-8 mt-8" },
        h("button", { className: "btn btn-primary btn-sm", onClick: function() { onSave(draft); setEditing(false); } }, "保存"),
        h("button", { className: "btn btn-secondary btn-sm", onClick: function() { setDraft(value || ""); setEditing(false); } }, "キャンセル")
      )
    );
  }
  return h("div", { className: "form-group" },
    h("label", { className: "form-label" }, "備考メモ ",
      h("span", { style: { color: "#7c8cf8", fontSize: 10, cursor: "pointer" }, onClick: function() { setEditing(true); } }, "[ 編集 ]")
    ),
    h("div", { className: "memo-view", onClick: function() { setEditing(true); } },
      value || h("span", { className: "text-muted", style: { fontStyle: "italic" } }, "クリックして編集...")
    )
  );
}

// ---- クリック編集フィールド ----
function EditableField({ label, value, onSave, type, link, highlight }) {
  var _e = useState(false), editing = _e[0], setEditing = _e[1];
  var _d = useState(value || ""), draft = _d[0], setDraft = _d[1];
  var inputRef = useRef(null);
  useEffect(function() { setDraft(value || ""); }, [value]);
  useEffect(function() { if (editing && inputRef.current) inputRef.current.focus(); }, [editing]);

  if (editing) {
    return h("div", { className: "field-box field-inline" },
      h("span", { className: "info-label-inline" }, label),
      h("input", { ref: inputRef, className: "form-input", type: type || "text", value: draft,
        style: { padding: "2px 6px", fontSize: 13, flex: 1 },
        onChange: function(e) { setDraft(toHalfWidth(e.target.value)); },
        onBlur: function() { if (draft !== (value || "")) onSave(draft); setEditing(false); },
        onKeyDown: function(e) { if (e.key === "Enter") { e.target.blur(); } if (e.key === "Escape") { setDraft(value || ""); setEditing(false); } }
      })
    );
  }
  return h("div", { className: "field-box field-inline", style: { cursor: "pointer" }, onClick: function() { setEditing(true); } },
    h("span", { className: "info-label-inline" }, label),
    (link && value)
      ? h("a", { href: value.startsWith("http") ? value : "https://" + value, target: "_blank", rel: "noreferrer", className: "info-value", onClick: function(e) { e.stopPropagation(); } }, value)
      : h("span", { className: "info-value" + (highlight ? " text-highlight" : "") }, value || "―")
  );
}

function EditableSelect({ label, value, options, onSave, vertical }) {
  var _e = useState(false), editing = _e[0], setEditing = _e[1];
  var cls = vertical ? "field-box" : "field-box field-inline";
  var lblCls = vertical ? "info-label" : "info-label-inline";
  var tag = vertical ? "div" : "span";

  if (editing) {
    return h("div", { className: cls },
      h(tag, { className: lblCls }, label),
      h("select", { className: "form-input", value: value || "", style: { padding: "2px 6px", fontSize: 13, flex: vertical ? undefined : 1 },
        onChange: function(e) { onSave(e.target.value); setEditing(false); },
        onBlur: function() { setEditing(false); }
      },
        h("option", { value: "" }, "選択..."),
        options.map(function(o) { return h("option", { key: o, value: o }, o); })
      )
    );
  }
  return h("div", { className: cls, style: { cursor: "pointer" }, onClick: function() { setEditing(true); } },
    h(tag, { className: lblCls }, label),
    h(tag, { className: "info-value" }, value || "―")
  );
}

// ---- 電話番号インライン編集 ----
function EditablePhone({ phone, onSave, onDelete }) {
  var _e = useState(false), editing = _e[0], setEditing = _e[1];
  var _d = useState(phone), draft = _d[0], setDraft = _d[1];
  useEffect(function() { setDraft(phone); }, [phone.number, phone.type, phone.label]);
  var doSave = function() { if (draft.number !== phone.number || draft.type !== phone.type || draft.label !== phone.label) onSave(draft); setEditing(false); };

  if (editing) {
    return h("div", { className: "phone-row", style: { gap: 4 } },
      h("input", { className: "form-input", style: { padding: "2px 6px", fontSize: 11, width: 110 }, value: draft.number,
        onChange: function(e) { setDraft(Object.assign({}, draft, { number: toHalfWidth(e.target.value) })); },
        onKeyDown: function(e) { if (e.key === "Enter") doSave(); } }),
      h("select", { className: "form-input", style: { padding: "2px 2px", fontSize: 10, width: 48 }, value: draft.type,
        onChange: function(e) { setDraft(Object.assign({}, draft, { type: e.target.value })); } },
        PHONE_TYPES.map(function(t) { return h("option", { key: t, value: t }, t); })
      ),
      h("input", { className: "form-input", style: { padding: "2px 6px", fontSize: 10, flex: 1 }, value: draft.label, placeholder: "ラベル",
        onChange: function(e) { setDraft(Object.assign({}, draft, { label: e.target.value })); },
        onBlur: doSave,
        onKeyDown: function(e) { if (e.key === "Enter") doSave(); } })
    );
  }
  return h("div", { className: "phone-row", style: { cursor: "pointer" }, onClick: function() { setEditing(true); } },
    h("span", { className: "phone-number" }, phone.number),
    h("span", { className: "phone-type" }, phone.type),
    h("span", { className: "phone-label" }, phone.label),
    h("button", { className: "btn btn-ghost btn-sm", style: { color: "#ef4444", padding: "0 4px", fontSize: 10 }, onClick: function(e) { e.stopPropagation(); onDelete(); } }, "削除")
  );
}

// ---- URL インライン編集 ----
function EditableUrl({ urlData, onSave, onDelete }) {
  var _e = useState(false), editing = _e[0], setEditing = _e[1];
  var _d = useState(urlData), draft = _d[0], setDraft = _d[1];
  useEffect(function() { setDraft(urlData); }, [urlData.url, urlData.type]);
  var doSave = function() { if (draft.url !== urlData.url || draft.type !== urlData.type) onSave(draft); setEditing(false); };

  if (editing) {
    return h("div", { className: "phone-row", style: { gap: 4 } },
      h("input", { className: "form-input", style: { padding: "2px 4px", fontSize: 11, flex: 1 }, value: draft.url, placeholder: "https://...",
        onChange: function(e) { setDraft(Object.assign({}, draft, { url: e.target.value })); },
        onBlur: doSave, onKeyDown: function(e) { if (e.key === "Enter") doSave(); } }),
      h("select", { className: "form-input", style: { padding: "2px 2px", fontSize: 10, width: 80 }, value: draft.type,
        onChange: function(e) { setDraft(Object.assign({}, draft, { type: e.target.value })); } },
        h("option", { value: "" }, "種別"),
        URL_TYPES.map(function(t) { return h("option", { key: t, value: t }, t); })
      )
    );
  }
  var href = urlData.url && (urlData.url.startsWith("http") ? urlData.url : "https://" + urlData.url);
  return h("div", { className: "phone-row", style: { cursor: "pointer" }, onClick: function() { setEditing(true); } },
    h("span", { style: { color: "#e2e8f0", fontSize: 11, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, urlData.url || "―"),
    h("span", { style: { color: "#94a3b8", fontSize: 10, minWidth: 55 } }, urlData.type || "―"),
    urlData.url && h("a", { href: href, target: "_blank", rel: "noreferrer",
      style: { color: "#fff", background: "#3b82f6", borderRadius: 4, padding: "1px 6px", fontSize: 10, textDecoration: "none", whiteSpace: "nowrap" },
      onClick: function(e) { e.stopPropagation(); }
    }, "アクセス"),
    h("button", { className: "btn btn-ghost btn-sm", style: { color: "#ef4444", padding: "0 4px", fontSize: 10 }, onClick: function(e) { e.stopPropagation(); onDelete(); } }, "削除")
  );
}

// ---- 企業フォーム ----
function CompanyForm({ data, onChange, agents }) {
  var s = function(k) { return function(v) { onChange(function(p) { var r = Object.assign({}, p); r[k] = v; return r; }); }; };

  return h("div", null,
    h("div", { className: "form-row form-row-2" },
      h(FormInput, { label: "企業名 *", value: data.name, onChange: s("name") }),
      h(FormInput, { label: "企業名カナ", value: data.nameKana, onChange: s("nameKana") })
    ),
    h("div", { className: "form-row form-row-3" },
      h(FormSelect, { label: "都道府県", options: PREFECTURES, value: data.prefecture, onChange: s("prefecture") }),
      h(FormInput, { label: "市区町村", value: data.city, onChange: s("city"), placeholder: "大阪市中央区" }),
      h(FormInput, { label: "郵便番号", value: data.zip, onChange: s("zip"), placeholder: "000-0000" })
    ),
    h("div", { className: "form-row" },
      h(FormInput, { label: "番地・建物名", value: data.address, onChange: s("address") })
    ),
    h("div", { className: "form-row form-row-2" },
      h(FormInput, { label: "URL", value: data.url, onChange: s("url") }),
      h(FormInput, { label: "代表者名", value: data.representative, onChange: s("representative") })
    ),
    h("div", { className: "form-row form-row-3" },
      h(FormSelect, { label: "顧客分類", options: STATUS_OPTIONS, value: data.status, onChange: s("status") }),
      h(FormSelect, { label: "業種", options: INDUSTRY_OPTIONS, value: data.industry, onChange: s("industry") }),
      h(FormInput, { label: "業種詳細", value: data.industryDetail, onChange: s("industryDetail") })
    ),
    h("div", { className: "form-row form-row-2" },
      h(FormInput, { label: "リスト作成年月日", type: "date", value: data.listCreatedDate, onChange: s("listCreatedDate") }),
      h(FormInput, { label: "次回コール予定日", type: "date", value: data.nextCallDate, onChange: s("nextCallDate") }),
      h(FormInput, { label: "次回コール時間", type: "time", value: data.nextCallTime, onChange: s("nextCallTime") })
    ),
    h(FormInput, { label: "次回コールメモ", value: data.nextCallMemo, onChange: s("nextCallMemo"), placeholder: "例: 見積もり確認" }),
    h(FormInput, { label: "備考メモ", value: data.memo, onChange: s("memo"), multi: true })
  );
}
