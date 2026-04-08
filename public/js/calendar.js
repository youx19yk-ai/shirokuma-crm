// ============================================================
// カレンダー画面
// ============================================================
function CalendarPage({ onNavigate }) {
  var now = new Date();
  var _y = useState(now.getFullYear()), year = _y[0], setYear = _y[1];
  var _m = useState(now.getMonth() + 1), month = _m[0], setMonth = _m[1];
  var _events = useState([]), events = _events[0], setEvents = _events[1];
  var _view = useState("month"), calView = _view[0], setCalView = _view[1];

  useEffect(function() {
    API.getCalendar(year, String(month)).then(function(data) { setEvents(data); }).catch(function() {
      var m = String(month).padStart(2,"0");
      setEvents([
        {id:"demo1",name:"山田建設",date:year+"-"+m+"-08",memo:"見積もり確認"},
        {id:"demo2",name:"鈴木電気",date:year+"-"+m+"-10",memo:"納品確認"},
        {id:"demo1",name:"山田建設",date:year+"-"+m+"-16",memo:"再コール"},
        {id:"demo3",name:"田中商事",date:year+"-"+m+"-22",memo:""}
      ]);
    });
  }, [year, month]);

  var prevMonth = function() {
    if (month === 1) { setMonth(12); setYear(year - 1); }
    else setMonth(month - 1);
  };
  var nextMonth = function() {
    if (month === 12) { setMonth(1); setYear(year + 1); }
    else setMonth(month + 1);
  };
  var goToday = function() { setYear(now.getFullYear()); setMonth(now.getMonth() + 1); };

  // カレンダー日付生成
  var firstDay = new Date(year, month - 1, 1).getDay(); // 0=日曜
  var daysInMonth = new Date(year, month, 0).getDate();
  var daysInPrevMonth = new Date(year, month - 1, 0).getDate();
  var todayDate = todayStr();

  var days = [];
  // 前月の日
  for (var i = firstDay - 1; i >= 0; i--) {
    days.push({ day: daysInPrevMonth - i, otherMonth: true, dateStr: "" });
  }
  // 今月の日
  for (var d = 1; d <= daysInMonth; d++) {
    var dateStr = year + "-" + String(month).padStart(2, "0") + "-" + String(d).padStart(2, "0");
    var dayEvents = events.filter(function(e) { return e.date === dateStr; });
    days.push({ day: d, otherMonth: false, dateStr: dateStr, events: dayEvents, isToday: dateStr === todayDate });
  }
  // 次月の日（6行になるまで）
  var remaining = 42 - days.length;
  for (var i = 1; i <= remaining; i++) {
    days.push({ day: i, otherMonth: true, dateStr: "" });
  }

  var weekDays = ["日","月","火","水","木","金","土"];

  return h("div", null,
    // ヘッダー
    h("div", { className: "flex-between mb-16" },
      h("div", { className: "flex gap-12", style: { alignItems: "center" } },
        h("div", { style: { fontSize: 20, fontWeight: 700 } }, year + "年" + month + "月"),
        h("div", { className: "flex gap-4" },
          h("button", { className: "btn btn-ghost btn-sm", onClick: prevMonth }, "<"),
          h("button", { className: "btn btn-ghost btn-sm", onClick: goToday }, "今月"),
          h("button", { className: "btn btn-ghost btn-sm", onClick: nextMonth }, ">")
        )
      ),
      h("div", { className: "flex gap-4" },
        h("button", { className: "btn btn-sm " + (calView === "month" ? "btn-primary" : "btn-ghost"), onClick: function() { setCalView("month"); } }, "月表示"),
        h("button", { className: "btn btn-sm " + (calView === "week" ? "btn-primary" : "btn-ghost"), onClick: function() { setCalView("week"); } }, "週表示")
      )
    ),

    // カレンダーグリッド
    h("div", { className: "cal-grid" },
      // 曜日ヘッダー
      weekDays.map(function(w, i) {
        return h("div", { key: w, className: "cal-header", style: { color: i === 0 ? "#ef4444" : i === 6 ? "#3b82f6" : "#64748b" } }, w);
      }),
      // 日セル
      days.map(function(d, i) {
        return h("div", { key: i, className: "cal-day" + (d.isToday ? " today" : "") + (d.otherMonth ? " other-month" : "") },
          h("div", { className: "day-num" }, d.day),
          (d.events || []).map(function(e, j) {
            return h("div", { key: j, className: "cal-event", title: e.name + (e.memo ? " - " + e.memo : ""),
              style: { cursor: "pointer" },
              onClick: function() { onNavigate("companies", e.id); }
            }, e.name);
          })
        );
      })
    ),

    // 今月のイベント一覧
    events.length > 0 && h("div", { className: "card mt-16" },
      h("div", { className: "card-header" },
        h("div", { className: "card-title" }, month + "月のコール予定 (" + events.length + "件)")
      ),
      h("table", { className: "table" },
        h("thead", null, h("tr", null, ["日付","企業名","メモ"].map(function(th) { return h("th", { key: th }, th); }))),
        h("tbody", null,
          events.sort(function(a, b) { return a.date < b.date ? -1 : 1; }).map(function(e) {
            return h("tr", { key: e.id, onClick: function() { onNavigate("companies", e.id); } },
              h("td", { style: { color: e.date < todayDate ? "#ef4444" : "#94a3b8" } }, fmtDate(e.date)),
              h("td", { style: { fontWeight: 600 } }, e.name),
              h("td", { className: "text-muted" }, e.memo || "―")
            );
          })
        )
      )
    )
  );
}
