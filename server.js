const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// ============================================================
// DB初期化
// ============================================================
async function initDB(retries = 10, delay = 3000) {
  for (let i = 0; i < retries; i++) {
    try {
      await pool.query('SELECT 1');
      break;
    } catch (e) {
      console.log(`DB接続待ち... (${i + 1}/${retries})`);
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, delay));
    }
  }

  await pool.query(`
    -- T1: 企業
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      name_kana TEXT DEFAULT '',
      zip TEXT DEFAULT '',
      prefecture TEXT DEFAULT '',
      city TEXT DEFAULT '',
      address TEXT DEFAULT '',
      url TEXT DEFAULT '',
      representative TEXT DEFAULT '',
      status TEXT DEFAULT '見込み',
      industry TEXT DEFAULT '',
      industry_detail TEXT DEFAULT '',
      list_created_date TEXT DEFAULT '',
      next_call_date TEXT DEFAULT '',
      next_call_memo TEXT DEFAULT '',
      next_call_time TEXT DEFAULT '',
      memo TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- T2: 電話番号
    CREATE TABLE IF NOT EXISTS phone_numbers (
      id TEXT PRIMARY KEY,
      company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
      number TEXT,
      type TEXT DEFAULT '',
      label TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_phone_number ON phone_numbers(number) WHERE number != '';

    -- T3: 営業行動
    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
      type TEXT DEFAULT 'コール',
      date TEXT DEFAULT '',
      time TEXT DEFAULT '',
      agent TEXT DEFAULT '',
      call_type TEXT DEFAULT '',
      call_result TEXT DEFAULT '',
      location TEXT DEFAULT '',
      visit_result TEXT DEFAULT '',
      content TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- T4: 案件
    CREATE TABLE IF NOT EXISTS deals (
      id TEXT PRIMARY KEY,
      company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
      plan_id TEXT DEFAULT '',
      title TEXT DEFAULT '',
      status TEXT DEFAULT '商談中',
      agent TEXT DEFAULT '',
      contract_date TEXT DEFAULT '',
      contract_amount INTEGER DEFAULT 0,
      payment_method TEXT DEFAULT '',
      credit_company TEXT DEFAULT '',
      credit_status TEXT DEFAULT '',
      credit_date TEXT DEFAULT '',
      credit_amount INTEGER DEFAULT 0,
      interview_date TEXT DEFAULT '',
      delivery_date TEXT DEFAULT '',
      cost INTEGER DEFAULT 0,
      gross_profit INTEGER DEFAULT 0,
      memo TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- T5: 商品マスタ
    CREATE TABLE IF NOT EXISTS plans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT DEFAULT '',
      price INTEGER DEFAULT 0,
      description TEXT DEFAULT '',
      active BOOLEAN DEFAULT true,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- T6: 保存済み検索条件
    CREATE TABLE IF NOT EXISTS saved_filters (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      filters JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- マスタ: 担当者
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- マスタ: 信販会社
    CREATE TABLE IF NOT EXISTS credit_companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // 既存のcallsテーブルからactivitiesへの移行
  try {
    const { rows } = await pool.query(`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'calls')`);
    if (rows[0].exists) {
      const callsExist = await pool.query('SELECT COUNT(*) FROM calls');
      if (parseInt(callsExist.rows[0].count) > 0) {
        await pool.query(`
          INSERT INTO activities (id, company_id, type, date, time, agent, call_type, call_result, content, created_at)
          SELECT id, company_id, 'コール', date, time, agent, type, result, content, created_at
          FROM calls
          ON CONFLICT (id) DO NOTHING
        `);
        console.log('calls → activities 移行完了');
      }
    }
  } catch (e) {
    // callsテーブルがない場合は無視
  }

  // companiesテーブルに新カラム追加（既存DB対応）
  const newCols = [
    ['next_call_date', "TEXT DEFAULT ''"],
    ['next_call_memo', "TEXT DEFAULT ''"],
    ['next_call_time', "TEXT DEFAULT ''"]
  ];
  // activitiesテーブルの新カラム
  try { await pool.query("ALTER TABLE activities ADD COLUMN visit_result TEXT DEFAULT ''"); } catch(e) {}
  for (const [col, def] of newCols) {
    try {
      await pool.query(`ALTER TABLE companies ADD COLUMN ${col} ${def}`);
    } catch (e) {
      // 既に存在する場合は無視
    }
  }

  console.log('DB initialized');
}

// ============================================================
// ヘルパー
// ============================================================
const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// ============================================================
// 企業 API
// ============================================================

// 全件取得
app.get('/api/companies', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM companies ORDER BY created_at DESC');
    const phones = await pool.query('SELECT * FROM phone_numbers ORDER BY created_at');
    const acts = await pool.query('SELECT * FROM activities ORDER BY date DESC, created_at DESC');
    const dealRows = await pool.query('SELECT * FROM deals ORDER BY created_at DESC');

    const companies = rows.map(c => ({
      id: c.id,
      name: c.name,
      nameKana: c.name_kana,
      zip: c.zip,
      prefecture: c.prefecture,
      city: c.city,
      address: c.address,
      url: c.url,
      representative: c.representative,
      status: c.status,
      industry: c.industry,
      industryDetail: c.industry_detail,
      listCreatedDate: c.list_created_date,
      nextCallDate: c.next_call_date,
      nextCallMemo: c.next_call_memo,
      nextCallTime: c.next_call_time,
      memo: c.memo,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      phones: phones.rows.filter(p => p.company_id === c.id).map(p => ({
        id: p.id, number: p.number, type: p.type, label: p.label
      })),
      activities: acts.rows.filter(a => a.company_id === c.id).map(a => ({
        id: a.id, type: a.type, date: a.date, time: a.time, agent: a.agent,
        callType: a.call_type, callResult: a.call_result, location: a.location, visitResult: a.visit_result, content: a.content
      })),
      deals: dealRows.rows.filter(d => d.company_id === c.id).map(d => ({
        id: d.id, planId: d.plan_id, title: d.title, status: d.status, agent: d.agent,
        contractDate: d.contract_date, contractAmount: d.contract_amount,
        paymentMethod: d.payment_method, creditCompany: d.credit_company,
        creditStatus: d.credit_status, creditDate: d.credit_date, creditAmount: d.credit_amount,
        interviewDate: d.interview_date, deliveryDate: d.delivery_date,
        cost: d.cost, grossProfit: d.gross_profit, memo: d.memo
      })),
      callCount: acts.rows.filter(a => a.company_id === c.id && a.type === 'コール').length
    }));

    res.json(companies);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// 新規作成
app.post('/api/companies', async (req, res) => {
  const c = req.body;
  const id = c.id || genId();
  try {
    await pool.query(`
      INSERT INTO companies (id, name, name_kana, zip, prefecture, city, address, url,
        representative, status, industry, industry_detail, list_created_date,
        next_call_date, next_call_memo, next_call_time, memo)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
    `, [id, c.name, c.nameKana||'', c.zip||'', c.prefecture||'', c.city||'', c.address||'',
        c.url||'', c.representative||'', c.status||'見込み', c.industry||'', c.industryDetail||'',
        c.listCreatedDate||'', c.nextCallDate||'', c.nextCallMemo||'', c.nextCallTime||'', c.memo||'']);
    res.json({ id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// 更新
app.put('/api/companies/:id', async (req, res) => {
  const c = req.body;
  try {
    await pool.query(`
      UPDATE companies SET
        name=$1, name_kana=$2, zip=$3, prefecture=$4, city=$5, address=$6, url=$7,
        representative=$8, status=$9, industry=$10, industry_detail=$11,
        list_created_date=$12, next_call_date=$13, next_call_memo=$14, next_call_time=$15, memo=$16,
        updated_at=NOW()
      WHERE id=$17
    `, [c.name, c.nameKana||'', c.zip||'', c.prefecture||'', c.city||'', c.address||'',
        c.url||'', c.representative||'', c.status||'見込み', c.industry||'', c.industryDetail||'',
        c.listCreatedDate||'', c.nextCallDate||'', c.nextCallMemo||'', c.nextCallTime||'', c.memo||'', req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// 削除
app.delete('/api/companies/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM companies WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// CSV一括インポート
app.post('/api/companies/bulk', async (req, res) => {
  const companies = req.body;
  try {
    for (const c of companies) {
      const id = c.id || genId();
      await pool.query(`
        INSERT INTO companies (id, name, name_kana, zip, prefecture, city, address, url,
          representative, status, industry, industry_detail, list_created_date, memo)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
        ON CONFLICT (id) DO NOTHING
      `, [id, c.name||'', c.nameKana||'', c.zip||'', c.prefecture||'', c.city||'',
          c.address||'', c.url||'', c.representative||'', c.status||'見込み',
          c.industry||'', c.industryDetail||'', c.listCreatedDate||'', c.memo||'']);
    }
    res.json({ ok: true, count: companies.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// CSVエクスポート
app.get('/api/companies/export', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM companies ORDER BY created_at DESC');
    const phones = await pool.query('SELECT * FROM phone_numbers ORDER BY created_at');
    const header = '企業名,企業名カナ,都道府県,市区町村,郵便番号,番地・建物名,電話番号,代表者,顧客分類,業種,業種詳細,リスト作成日,次回コール予定日,備考';
    const csvRows = rows.map(c => {
      const ph = phones.rows.filter(p => p.company_id === c.id).map(p => p.number).join(';');
      return [c.name, c.name_kana, c.prefecture, c.city, c.zip, c.address, ph,
              c.representative, c.status, c.industry, c.industry_detail,
              c.list_created_date, c.next_call_date, c.memo]
        .map(v => '"' + (v||'').replace(/"/g, '""') + '"').join(',');
    });
    const csv = '\uFEFF' + header + '\n' + csvRows.join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=companies.csv');
    res.send(csv);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// 電話番号 API
// ============================================================

app.post('/api/companies/:id/phones', async (req, res) => {
  const p = req.body;
  const id = genId();
  try {
    await pool.query(
      'INSERT INTO phone_numbers (id, company_id, number, type, label) VALUES ($1,$2,$3,$4,$5)',
      [id, req.params.id, p.number||'', p.type||'', p.label||'']
    );
    res.json({ id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/phones/:id', async (req, res) => {
  const p = req.body;
  try {
    await pool.query(
      'UPDATE phone_numbers SET number=$1, type=$2, label=$3 WHERE id=$4',
      [p.number||'', p.type||'', p.label||'', req.params.id]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/phones/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM phone_numbers WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/phones/search', async (req, res) => {
  const q = req.query.q || '';
  try {
    const { rows } = await pool.query(
      `SELECT p.*, c.name as company_name, c.id as company_id
       FROM phone_numbers p JOIN companies c ON p.company_id = c.id
       WHERE p.number LIKE $1`,
      ['%' + q + '%']
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// 営業行動 API
// ============================================================

app.get('/api/companies/:id/activities', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM activities WHERE company_id=$1 ORDER BY date DESC, created_at DESC',
      [req.params.id]
    );
    res.json(rows.map(a => ({
      id: a.id, type: a.type, date: a.date, time: a.time, agent: a.agent,
      callType: a.call_type, callResult: a.call_result, location: a.location, visitResult: a.visit_result, content: a.content
    })));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/companies/:id/activities', async (req, res) => {
  const a = req.body;
  const id = genId();
  try {
    await pool.query(`
      INSERT INTO activities (id, company_id, type, date, time, agent, call_type, call_result, location, visit_result, content)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    `, [id, req.params.id, a.type||'コール', a.date||'', a.time||'', a.agent||'',
        a.callType||'', a.callResult||'', a.location||'', a.visitResult||'', a.content||'']);

    // 次回コール予定日の更新（指定されていれば）
    if (a.nextCallDate) {
      await pool.query(
        'UPDATE companies SET next_call_date=$1, next_call_memo=$2, next_call_time=$3, updated_at=NOW() WHERE id=$4',
        [a.nextCallDate, a.nextCallMemo||'', a.nextCallTime||'', req.params.id]
      );
    }

    res.json({ id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/activities/:id', async (req, res) => {
  const a = req.body;
  try {
    await pool.query(`
      UPDATE activities SET type=$1, date=$2, time=$3, agent=$4, call_type=$5,
        call_result=$6, location=$7, visit_result=$8, content=$9
      WHERE id=$10
    `, [a.type||'コール', a.date||'', a.time||'', a.agent||'',
        a.callType||'', a.callResult||'', a.location||'', a.visitResult||'', a.content||'', req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/activities/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM activities WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// 案件 API
// ============================================================

app.get('/api/deals', async (req, res) => {
  try {
    let query = `
      SELECT d.*, c.name as company_name, c.prefecture, c.city
      FROM deals d JOIN companies c ON d.company_id = c.id
    `;
    const conditions = [];
    const params = [];
    let idx = 1;

    if (req.query.agent) { conditions.push(`d.agent = $${idx++}`); params.push(req.query.agent); }
    if (req.query.status) { conditions.push(`d.status = $${idx++}`); params.push(req.query.status); }
    if (req.query.dateFrom) { conditions.push(`d.contract_date >= $${idx++}`); params.push(req.query.dateFrom); }
    if (req.query.dateTo) { conditions.push(`d.contract_date <= $${idx++}`); params.push(req.query.dateTo); }

    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY d.created_at DESC';

    const { rows } = await pool.query(query, params);
    res.json(rows.map(d => ({
      id: d.id, companyId: d.company_id, companyName: d.company_name,
      planId: d.plan_id, title: d.title, status: d.status, agent: d.agent,
      contractDate: d.contract_date, contractAmount: d.contract_amount,
      paymentMethod: d.payment_method, creditCompany: d.credit_company,
      creditStatus: d.credit_status, creditDate: d.credit_date, creditAmount: d.credit_amount,
      interviewDate: d.interview_date, deliveryDate: d.delivery_date,
      cost: d.cost, grossProfit: d.gross_profit, memo: d.memo
    })));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/companies/:id/deals', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM deals WHERE company_id=$1 ORDER BY created_at DESC',
      [req.params.id]
    );
    res.json(rows.map(d => ({
      id: d.id, planId: d.plan_id, title: d.title, status: d.status, agent: d.agent,
      contractDate: d.contract_date, contractAmount: d.contract_amount,
      paymentMethod: d.payment_method, creditCompany: d.credit_company,
      creditStatus: d.credit_status, creditDate: d.credit_date, creditAmount: d.credit_amount,
      interviewDate: d.interview_date, deliveryDate: d.delivery_date,
      cost: d.cost, grossProfit: d.gross_profit, memo: d.memo
    })));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/deals', async (req, res) => {
  const d = req.body;
  const id = genId();
  const grossProfit = (d.contractAmount || 0) - (d.cost || 0);
  try {
    await pool.query(`
      INSERT INTO deals (id, company_id, plan_id, title, status, agent,
        contract_date, contract_amount, payment_method, credit_company, credit_status,
        credit_date, credit_amount, interview_date, delivery_date, cost, gross_profit, memo)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
    `, [id, d.companyId, d.planId||'', d.title||'', d.status||'商談中', d.agent||'',
        d.contractDate||'', d.contractAmount||0, d.paymentMethod||'', d.creditCompany||'',
        d.creditStatus||'', d.creditDate||'', d.creditAmount||0,
        d.interviewDate||'', d.deliveryDate||'', d.cost||0, grossProfit, d.memo||'']);

    // 企業ステータスを「顧客」に更新（契約済以降の場合）
    if (['契約済','審査中','制作中','取材待ち','取材済','納品済','完了'].includes(d.status)) {
      await pool.query("UPDATE companies SET status='顧客', updated_at=NOW() WHERE id=$1", [d.companyId]);
    }

    res.json({ id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/deals/:id', async (req, res) => {
  const d = req.body;
  const grossProfit = (d.contractAmount || 0) - (d.cost || 0);
  try {
    await pool.query(`
      UPDATE deals SET
        plan_id=$1, title=$2, status=$3, agent=$4, contract_date=$5, contract_amount=$6,
        payment_method=$7, credit_company=$8, credit_status=$9, credit_date=$10,
        credit_amount=$11, interview_date=$12, delivery_date=$13, cost=$14,
        gross_profit=$15, memo=$16, updated_at=NOW()
      WHERE id=$17
    `, [d.planId||'', d.title||'', d.status||'商談中', d.agent||'',
        d.contractDate||'', d.contractAmount||0, d.paymentMethod||'', d.creditCompany||'',
        d.creditStatus||'', d.creditDate||'', d.creditAmount||0,
        d.interviewDate||'', d.deliveryDate||'', d.cost||0, grossProfit, d.memo||'', req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/deals/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM deals WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// ダッシュボード API
// ============================================================

app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;

    const total = await pool.query('SELECT COUNT(*) FROM companies');
    const byStatus = await pool.query('SELECT status, COUNT(*) FROM companies GROUP BY status');
    const monthCalls = await pool.query(
      "SELECT COUNT(*) FROM activities WHERE type='コール' AND date >= $1", [monthStart]
    );
    const monthAppo = await pool.query(
      "SELECT COUNT(*) FROM activities WHERE type='アポ' AND date >= $1", [monthStart]
    );
    const monthDeals = await pool.query(
      "SELECT COUNT(*) FROM deals WHERE contract_date >= $1 AND status != '商談中'", [monthStart]
    );
    const todayStr = now.toISOString().split('T')[0];
    const todayTasks = await pool.query(
      "SELECT c.id, c.name, c.next_call_date, c.next_call_memo, c.next_call_time FROM companies c WHERE c.next_call_date = $1",
      [todayStr]
    );
    const overdue = await pool.query(
      "SELECT c.id, c.name, c.next_call_date, c.next_call_memo, c.next_call_time FROM companies c WHERE c.next_call_date < $1 AND c.next_call_date != ''",
      [todayStr]
    );

    res.json({
      totalCompanies: parseInt(total.rows[0].count),
      byStatus: byStatus.rows.reduce((acc, r) => { acc[r.status] = parseInt(r.count); return acc; }, {}),
      monthCalls: parseInt(monthCalls.rows[0].count),
      monthAppo: parseInt(monthAppo.rows[0].count),
      monthDeals: parseInt(monthDeals.rows[0].count),
      todayTasks: todayTasks.rows.map(r => ({ id: r.id, name: r.name, date: r.next_call_date, memo: r.next_call_memo, time: r.next_call_time })),
      overdue: overdue.rows.map(r => ({ id: r.id, name: r.name, date: r.next_call_date, memo: r.next_call_memo, time: r.next_call_time }))
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/dashboard/daily-calls', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT date, COUNT(*) as count FROM activities
      WHERE type='コール' AND date >= (CURRENT_DATE - INTERVAL '30 days')::TEXT
      GROUP BY date ORDER BY date
    `);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/dashboard/by-agent', async (req, res) => {
  try {
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;

    const calls = await pool.query(
      "SELECT agent, COUNT(*) FROM activities WHERE type='コール' AND date >= $1 GROUP BY agent",
      [monthStart]
    );
    const appos = await pool.query(
      "SELECT agent, COUNT(*) FROM activities WHERE type='アポ' AND date >= $1 GROUP BY agent",
      [monthStart]
    );
    const deals = await pool.query(
      "SELECT agent, COUNT(*) as count, SUM(contract_amount) as total, SUM(gross_profit) as profit FROM deals WHERE contract_date >= $1 AND status != '商談中' GROUP BY agent",
      [monthStart]
    );

    // 全担当者を統合
    const agentMap = {};
    const addAgent = (name) => {
      if (!name) return;
      if (!agentMap[name]) agentMap[name] = { name, calls: 0, appos: 0, deals: 0, total: 0, profit: 0 };
    };
    calls.rows.forEach(r => { addAgent(r.agent); agentMap[r.agent].calls = parseInt(r.count); });
    appos.rows.forEach(r => { addAgent(r.agent); agentMap[r.agent].appos = parseInt(r.count); });
    deals.rows.forEach(r => {
      addAgent(r.agent);
      agentMap[r.agent].deals = parseInt(r.count);
      agentMap[r.agent].total = parseInt(r.total || 0);
      agentMap[r.agent].profit = parseInt(r.profit || 0);
    });

    res.json(Object.values(agentMap));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// 個人レポート
app.get('/api/report/agent/:name', async (req, res) => {
  const { name } = req.params;
  const { from, to } = req.query;
  try {
    const callsQ = from && to
      ? await pool.query("SELECT COUNT(*) FROM activities WHERE agent=$1 AND type='コール' AND date BETWEEN $2 AND $3", [name, from, to])
      : await pool.query("SELECT COUNT(*) FROM activities WHERE agent=$1 AND type='コール'", [name]);
    const apposQ = from && to
      ? await pool.query("SELECT COUNT(*) FROM activities WHERE agent=$1 AND type='アポ' AND date BETWEEN $2 AND $3", [name, from, to])
      : await pool.query("SELECT COUNT(*) FROM activities WHERE agent=$1 AND type='アポ'", [name]);
    const meetingsQ = from && to
      ? await pool.query("SELECT COUNT(*) FROM activities WHERE agent=$1 AND type='商談' AND date BETWEEN $2 AND $3", [name, from, to])
      : await pool.query("SELECT COUNT(*) FROM activities WHERE agent=$1 AND type='商談'", [name]);
    const dealsQ = from && to
      ? await pool.query("SELECT * FROM deals WHERE agent=$1 AND contract_date BETWEEN $2 AND $3 ORDER BY contract_date DESC", [name, from, to])
      : await pool.query("SELECT * FROM deals WHERE agent=$1 ORDER BY contract_date DESC", [name]);

    const dealsList = dealsQ.rows;
    const contracted = dealsList.filter(d => d.status !== '商談中');
    const totalAmount = contracted.reduce((s, d) => s + (d.contract_amount || 0), 0);
    const totalProfit = contracted.reduce((s, d) => s + (d.gross_profit || 0), 0);
    const callCount = parseInt(callsQ.rows[0].count);
    const appoCount = parseInt(apposQ.rows[0].count);

    res.json({
      agent: name,
      period: { from: from || '全期間', to: to || '' },
      calls: callCount,
      appos: appoCount,
      meetings: parseInt(meetingsQ.rows[0].count),
      contracts: contracted.length,
      contractRate: callCount > 0 ? Math.round((contracted.length / callCount) * 100) : 0,
      totalAmount,
      totalProfit,
      deals: dealsList.map(d => ({
        id: d.id, title: d.title, status: d.status,
        contractDate: d.contract_date, contractAmount: d.contract_amount,
        grossProfit: d.gross_profit, companyId: d.company_id
      }))
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// カレンダー API
// ============================================================

app.get('/api/calendar/:year/:month', async (req, res) => {
  const { year, month } = req.params;
  const monthStr = `${year}-${month.padStart(2, '0')}`;
  try {
    const { rows } = await pool.query(
      "SELECT id, name, next_call_date, next_call_memo, next_call_time FROM companies WHERE next_call_date LIKE $1",
      [monthStr + '%']
    );
    res.json(rows.map(r => ({
      id: r.id, name: r.name, date: r.next_call_date, memo: r.next_call_memo, time: r.next_call_time
    })));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// マスタ API
// ============================================================

// 商品プラン
app.get('/api/plans', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM plans ORDER BY sort_order, created_at');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/plans', async (req, res) => {
  const p = req.body;
  const id = genId();
  try {
    await pool.query(
      'INSERT INTO plans (id, name, category, price, description, active, sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [id, p.name, p.category||'', p.price||0, p.description||'', p.active !== false, p.sortOrder||0]
    );
    res.json({ id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/plans/:id', async (req, res) => {
  const p = req.body;
  try {
    await pool.query(
      'UPDATE plans SET name=$1, category=$2, price=$3, description=$4, active=$5, sort_order=$6 WHERE id=$7',
      [p.name, p.category||'', p.price||0, p.description||'', p.active !== false, p.sortOrder||0, req.params.id]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/plans/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM plans WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 担当者マスタ
app.get('/api/agents', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM agents ORDER BY created_at');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/agents', async (req, res) => {
  const id = genId();
  try {
    await pool.query('INSERT INTO agents (id, name) VALUES ($1, $2)', [id, req.body.name]);
    res.json({ id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/agents/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM agents WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 信販会社マスタ
app.get('/api/credit-companies', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM credit_companies ORDER BY created_at');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/credit-companies', async (req, res) => {
  const id = genId();
  try {
    await pool.query('INSERT INTO credit_companies (id, name) VALUES ($1, $2)', [id, req.body.name]);
    res.json({ id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/credit-companies/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM credit_companies WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// 検索条件 API
// ============================================================

app.get('/api/filters', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM saved_filters ORDER BY created_at DESC');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/filters', async (req, res) => {
  const id = genId();
  try {
    await pool.query(
      'INSERT INTO saved_filters (id, name, filters) VALUES ($1, $2, $3)',
      [id, req.body.name, JSON.stringify(req.body.filters)]
    );
    res.json({ id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/filters/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM saved_filters WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// ヘルスチェック + SPA フォールバック
// ============================================================

app.get('/api/health', (req, res) => res.json({ ok: true }));

// SPAルーティング：API以外のリクエストはindex.htmlを返す
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api/')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

const PORT = process.env.PORT || 3000;
initDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
