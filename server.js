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
      corp_type TEXT DEFAULT '',
      zip TEXT DEFAULT '',
      prefecture TEXT DEFAULT '',
      city TEXT DEFAULT '',
      address TEXT DEFAULT '',
      url TEXT DEFAULT '',
      email TEXT DEFAULT '',
      representative TEXT DEFAULT '',
      status TEXT DEFAULT '見込み',
      industry TEXT DEFAULT '',
      industry_detail TEXT DEFAULT '',
      list_created_date TEXT DEFAULT '',
      next_call_date TEXT DEFAULT '',
      next_call_memo TEXT DEFAULT '',
      next_call_time TEXT DEFAULT '',
      next_call_agent TEXT DEFAULT '',
      prospect_owner TEXT DEFAULT '',
      has_web TEXT DEFAULT '',
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

    -- URL管理
    CREATE TABLE IF NOT EXISTS company_urls (
      id TEXT PRIMARY KEY,
      company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
      url TEXT DEFAULT '',
      type TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW()
    );

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
      appo_type TEXT DEFAULT '',
      visit_role TEXT DEFAULT '',
      visitor TEXT DEFAULT '',
      appointer TEXT DEFAULT '',
      researcher TEXT DEFAULT '',
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
      team TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- マスタ: 信販会社
    CREATE TABLE IF NOT EXISTS credit_companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- 目標設定
    CREATE TABLE IF NOT EXISTS targets (
      id TEXT PRIMARY KEY,
      agent TEXT NOT NULL,
      year_month TEXT NOT NULL,
      gross_profit_target INTEGER DEFAULT 0,
      contract_target INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS hashtags (
      id TEXT PRIMARY KEY,
      tag TEXT NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS company_hashtags (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      hashtag_id TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS select_options (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      value TEXT NOT NULL,
      parent TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      active BOOLEAN DEFAULT true,
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
  try { await pool.query("ALTER TABLE activities ADD COLUMN appo_type TEXT DEFAULT ''"); } catch(e) {}
  try { await pool.query("ALTER TABLE companies ADD COLUMN corp_type TEXT DEFAULT ''"); } catch(e) {}
  try { await pool.query("ALTER TABLE companies ADD COLUMN email TEXT DEFAULT ''"); } catch(e) {}
  try { await pool.query("ALTER TABLE companies ADD COLUMN prospect_owner TEXT DEFAULT ''"); } catch(e) {}
  try { await pool.query("ALTER TABLE companies ADD COLUMN has_web TEXT DEFAULT ''"); } catch(e) {}
  try { await pool.query("ALTER TABLE agents ADD COLUMN team TEXT DEFAULT ''"); } catch(e) {}
  try { await pool.query("ALTER TABLE agents ADD COLUMN department TEXT DEFAULT ''"); } catch(e) {}
  try { await pool.query("ALTER TABLE agents ADD COLUMN section TEXT DEFAULT ''"); } catch(e) {}
  try { await pool.query("ALTER TABLE agents ADD COLUMN role TEXT DEFAULT '一般'"); } catch(e) {}
  try { await pool.query("ALTER TABLE agents ADD COLUMN member_id TEXT DEFAULT ''"); } catch(e) {}
  try { await pool.query("ALTER TABLE companies ADD COLUMN next_call_agent TEXT DEFAULT ''"); } catch(e) {}
  try { await pool.query("ALTER TABLE activities ADD COLUMN visit_role TEXT DEFAULT ''"); } catch(e) {}
  try { await pool.query("ALTER TABLE activities ADD COLUMN visitor TEXT DEFAULT ''"); } catch(e) {}
  try { await pool.query("ALTER TABLE activities ADD COLUMN appointer TEXT DEFAULT ''"); } catch(e) {}
  try { await pool.query("ALTER TABLE activities ADD COLUMN researcher TEXT DEFAULT ''"); } catch(e) {}
  for (const [col, def] of newCols) {
    try {
      await pool.query(`ALTER TABLE companies ADD COLUMN ${col} ${def}`);
    } catch (e) {
      // 既に存在する場合は無視
    }
  }
  // select_optionsにparentカラム追加（既存DB対応）
  try { await pool.query("ALTER TABLE select_options ADD COLUMN parent TEXT DEFAULT ''"); } catch(e) {}

  // セレクト項目のデフォルト自動投入
  try {
    const selCount = await pool.query('SELECT COUNT(*) FROM select_options');
    if (parseInt(selCount.rows[0].count) === 0) {
      console.log('セレクト項目デフォルト投入中...');
      const genSId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      const selDefaults = {
        CALL_TYPES: ['アポ','決済通話','担当者通話','受付通話','不通','提案完了','決裁','コールのみ'],
        VISIT_RESULTS: ['未実施','契約','NG','検討','日変','訪問日変','前確NG'],
        STATUS_OPTIONS: ['顧客','見込み','とりあえず保有','過去NG','アポ禁止'],
        DEAL_STATUSES: ['商談中','契約済','審査中','取材予定','取材完了','納品予定','納品完了','入金予定','入金済み'],
        INDUSTRY_OPTIONS: ['ガテン系','IT/通信','製造業','小売業','飲食業','医療/福祉','教育','不動産','建設','運送','美容','その他'],
        PAYMENT_METHODS: ['信販','現金','振込']
      };
      const callTypeResults = {
        'アポ': ['新規アポ','再訪アポ','クロスセルアポ','アップセルアポ','担当者アポ','来週アポ'],
        '決済通話': ['必要性のYES取れず','話し込めず再コール','諦め判断'],
        '担当者通話': ['必要性のYES取れず','話し込めず再コール','諦め判断'],
        '受付通話': ['必要性のYES取れず','話し込めず再コール','諦め判断'],
        '不通': [],
        '提案完了': ['必要性のYES取れず','話し込めず再コール','諦め判断'],
        '決裁': ['必要性のYES取れず','話し込めず再コール','諦め判断'],
        'コールのみ': []
      };
      for (const [cat, vals] of Object.entries(selDefaults)) {
        for (let i = 0; i < vals.length; i++) {
          await pool.query('INSERT INTO select_options (id, category, value, parent, sort_order) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING', [genSId(), cat, vals[i], '', i]);
        }
      }
      for (const [ct, results] of Object.entries(callTypeResults)) {
        for (let i = 0; i < results.length; i++) {
          await pool.query('INSERT INTO select_options (id, category, value, parent, sort_order) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING', [genSId(), 'CALL_TYPE_RESULTS', results[i], ct, i]);
        }
      }
      // 部署デフォルト
      const depts = ['営業部','制作部','管理本部'];
      for (let i = 0; i < depts.length; i++) {
        await pool.query('INSERT INTO select_options (id, category, value, parent, sort_order) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING', [genSId(), 'DEPARTMENTS', depts[i], '', i]);
      }
      const sections = { '営業部': ['営業1課','営業2課'], '制作部': ['制作課'], '管理本部': ['管理課'] };
      for (const [dept, secs] of Object.entries(sections)) {
        for (let i = 0; i < secs.length; i++) {
          await pool.query('INSERT INTO select_options (id, category, value, parent, sort_order) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING', [genSId(), 'SECTIONS', secs[i], dept, i]);
        }
      }
      const roles = ['部長','課長','主任','一般'];
      for (let i = 0; i < roles.length; i++) {
        await pool.query('INSERT INTO select_options (id, category, value, parent, sort_order) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING', [genSId(), 'ROLES', roles[i], '', i]);
      }
      console.log('セレクト項目デフォルト投入完了');
    }
  } catch(e) { console.error('セレクト項目投入エラー:', e.message); }

  // 中川・小林のデフォルトメンバーID設定
  try {
    await pool.query("UPDATE agents SET member_id='0001' WHERE name='中川翔' AND (member_id IS NULL OR member_id = '' OR member_id LIKE 'M%')");
    await pool.query("UPDATE agents SET member_id='0002' WHERE name='小林優人' AND (member_id IS NULL OR member_id = '' OR member_id LIKE 'M%')");
  } catch(e) {}

  // デフォルトハッシュタグ投入
  try {
    const htCount = await pool.query('SELECT COUNT(*) FROM hashtags');
    if (parseInt(htCount.rows[0].count) === 0) {
      const defaultTags = ['雨','折り返し来る人','女性社長','オラオラ系'];
      const genHId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      for (const tag of defaultTags) {
        await pool.query('INSERT INTO hashtags (id, tag) VALUES ($1, $2) ON CONFLICT DO NOTHING', [genHId(), tag]);
      }
    }
  } catch(e) {}

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
    const urls = await pool.query('SELECT * FROM company_urls ORDER BY created_at');
    const acts = await pool.query('SELECT * FROM activities ORDER BY date DESC, created_at DESC');
    const dealRows = await pool.query('SELECT * FROM deals ORDER BY created_at DESC');

    const companies = rows.map(c => ({
      id: c.id,
      name: c.name,
      nameKana: c.name_kana,
      corpType: c.corp_type,
      email: c.email,
      prospectOwner: c.prospect_owner,
      hasWeb: c.has_web,
      nextCallAgent: c.next_call_agent,
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
      urls: urls.rows.filter(u => u.company_id === c.id).map(u => ({
        id: u.id, url: u.url, type: u.type
      })),
      activities: acts.rows.filter(a => a.company_id === c.id).map(a => ({
        id: a.id, type: a.type, date: a.date, time: a.time, agent: a.agent,
        callType: a.call_type, callResult: a.call_result, location: a.location, visitResult: a.visit_result, appoType: a.appo_type, visitor: a.visitor, appointer: a.appointer, researcher: a.researcher, content: a.content
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
      INSERT INTO companies (id, name, name_kana, corp_type, zip, prefecture, city, address, url, email,
        representative, status, industry, industry_detail, list_created_date,
        next_call_date, next_call_memo, next_call_time, next_call_agent, prospect_owner, has_web, memo)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
    `, [id, c.name, c.nameKana||'', c.corpType||'', c.zip||'', c.prefecture||'', c.city||'', c.address||'',
        c.url||'', c.email||'', c.representative||'', c.status||'見込み', c.industry||'', c.industryDetail||'',
        c.listCreatedDate||'', c.nextCallDate||'', c.nextCallMemo||'', c.nextCallTime||'', c.nextCallAgent||'', c.prospectOwner||'', c.hasWeb||'', c.memo||'']);
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
        name=$1, name_kana=$2, corp_type=$3, zip=$4, prefecture=$5, city=$6, address=$7, url=$8, email=$9,
        representative=$10, status=$11, industry=$12, industry_detail=$13,
        list_created_date=$14, next_call_date=$15, next_call_memo=$16, next_call_time=$17,
        next_call_agent=$18, prospect_owner=$19, has_web=$20, memo=$21,
        updated_at=NOW()
      WHERE id=$22
    `, [c.name, c.nameKana||'', c.corpType||'', c.zip||'', c.prefecture||'', c.city||'', c.address||'',
        c.url||'', c.email||'', c.representative||'', c.status||'見込み', c.industry||'', c.industryDetail||'',
        c.listCreatedDate||'', c.nextCallDate||'', c.nextCallMemo||'', c.nextCallTime||'', c.nextCallAgent||'', c.prospectOwner||'', c.hasWeb||'', c.memo||'', req.params.id]);
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
    // 既存電話番号を全取得して重複チェック用
    const existingPhones = await pool.query('SELECT p.number, c.name as company_name FROM phone_numbers p JOIN companies c ON p.company_id = c.id');
    const phoneMap = {};
    existingPhones.rows.forEach(r => { phoneMap[r.number.replace(/[-\s]/g, '')] = r.company_name; });
    const duplicates = [];
    let imported = 0;

    for (const c of companies) {
      // 電話番号重複チェック
      if (c.tel) {
        var cleanNum = c.tel.replace(/[-\s]/g, '');
        if (phoneMap[cleanNum]) {
          duplicates.push({ name: c.name, tel: c.tel, existingCompany: phoneMap[cleanNum] });
          continue;
        }
      }
      const id = c.id || genId();
      await pool.query(`
        INSERT INTO companies (id, name, name_kana, corp_type, zip, prefecture, city, address, url, email,
          representative, status, industry, industry_detail, list_created_date, prospect_owner, memo)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
        ON CONFLICT (id) DO NOTHING
      `, [id, c.name||'', c.nameKana||'', c.corpType||'', c.zip||'', c.prefecture||'', c.city||'',
          c.address||'', c.url||'', c.email||'', c.representative||'', c.status||'見込み',
          c.industry||'', c.industryDetail||'', c.listCreatedDate||'', c.prospectOwner||'', c.memo||'']);
      // 電話番号があれば追加
      if (c.tel) {
        await pool.query('INSERT INTO phone_numbers (id, company_id, number, type, label) VALUES ($1,$2,$3,$4,$5)',
          [genId(), id, c.tel, '固定', '']);
        phoneMap[c.tel.replace(/[-\s]/g, '')] = c.name;
      }
      imported++;
    }
    res.json({ ok: true, count: imported, duplicates: duplicates });
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
    const header = '企業名,企業名カナ,都道府県,市区町村,郵便番号,番地・建物名,電話番号,代表者,見込み分類,業種,業種詳細,リスト作成日,次回コール予定日,備考';
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
// URL API
app.post('/api/companies/:id/urls', async (req, res) => {
  const u = req.body; const id = genId();
  try {
    await pool.query('INSERT INTO company_urls (id, company_id, url, type) VALUES ($1,$2,$3,$4)', [id, req.params.id, u.url||'', u.type||'']);
    res.json({ id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/urls/:id', async (req, res) => {
  const u = req.body;
  try {
    await pool.query('UPDATE company_urls SET url=$1, type=$2 WHERE id=$3', [u.url||'', u.type||'', req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/urls/:id', async (req, res) => {
  try { await pool.query('DELETE FROM company_urls WHERE id=$1', [req.params.id]); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

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
      callType: a.call_type, callResult: a.call_result, location: a.location, visitResult: a.visit_result, appoType: a.appo_type, visitor: a.visitor, appointer: a.appointer, researcher: a.researcher, content: a.content
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
      INSERT INTO activities (id, company_id, type, date, time, agent, call_type, call_result, location, visit_result, appo_type, visitor, appointer, researcher, content)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
    `, [id, req.params.id, a.type||'コール', a.date||'', a.time||'', a.agent||'',
        a.callType||'', a.callResult||'', a.location||'', a.visitResult||'', a.appoType||'', a.visitor||'', a.appointer||'', a.researcher||'', a.content||'']);

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
        call_result=$6, location=$7, visit_result=$8, appo_type=$9, visitor=$10, appointer=$11, researcher=$12, content=$13
      WHERE id=$14
    `, [a.type||'コール', a.date||'', a.time||'', a.agent||'',
        a.callType||'', a.callResult||'', a.location||'', a.visitResult||'', a.appoType||'', a.visitor||'', a.appointer||'', a.researcher||'', a.content||'', req.params.id]);
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
      "SELECT c.id, c.name, c.next_call_date, c.next_call_memo, c.next_call_time, c.next_call_agent FROM companies c WHERE c.next_call_date = $1",
      [todayStr]
    );
    const overdue = await pool.query(
      "SELECT c.id, c.name, c.next_call_date, c.next_call_memo, c.next_call_time, c.next_call_agent FROM companies c WHERE c.next_call_date < $1 AND c.next_call_date != ''",
      [todayStr]
    );

    // 今日の訪問予定
    const todayVisits = await pool.query(
      "SELECT a.id, a.company_id, a.date, a.time, a.agent, c.name as company_name FROM activities a JOIN companies c ON a.company_id = c.id WHERE a.type='アポ' AND a.date = $1 ORDER BY a.time",
      [todayStr]
    );
    // 今日の取材・納品予定
    const todayInterviews = await pool.query(
      "SELECT d.id, d.company_id, d.title, d.agent, d.interview_date, c.name as company_name FROM deals d JOIN companies c ON d.company_id = c.id WHERE d.interview_date = $1",
      [todayStr]
    );
    const todayDeliveries = await pool.query(
      "SELECT d.id, d.company_id, d.title, d.agent, d.delivery_date, c.name as company_name FROM deals d JOIN companies c ON d.company_id = c.id WHERE d.delivery_date = $1",
      [todayStr]
    );

    res.json({
      totalCompanies: parseInt(total.rows[0].count),
      byStatus: byStatus.rows.reduce((acc, r) => { acc[r.status] = parseInt(r.count); return acc; }, {}),
      monthCalls: parseInt(monthCalls.rows[0].count),
      monthAppo: parseInt(monthAppo.rows[0].count),
      monthDeals: parseInt(monthDeals.rows[0].count),
      todayTasks: todayTasks.rows.map(r => ({ id: r.id, name: r.name, date: r.next_call_date, memo: r.next_call_memo, time: r.next_call_time, agent: r.next_call_agent })),
      overdue: overdue.rows.map(r => ({ id: r.id, name: r.name, date: r.next_call_date, memo: r.next_call_memo, time: r.next_call_time, agent: r.next_call_agent })),
      todayVisits: todayVisits.rows.map(r => ({ id: r.company_id, name: r.company_name, time: r.time, agent: r.agent })),
      todayInterviews: todayInterviews.rows.map(r => ({ id: r.company_id, name: r.company_name, title: r.title, agent: r.agent })),
      todayDeliveries: todayDeliveries.rows.map(r => ({ id: r.company_id, name: r.company_name, title: r.title, agent: r.agent })),
      byProspectOwner: (await pool.query("SELECT prospect_owner, COUNT(*) FROM companies WHERE prospect_owner != '' GROUP BY prospect_owner ORDER BY count DESC")).rows.reduce((acc, r) => { acc[r.prospect_owner] = parseInt(r.count); return acc; }, {})
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// KPI集計API（期間・担当者・チーム指定可能）
app.get('/api/dashboard/kpi', async (req, res) => {
  try {
    const { from, to, agent, team } = req.query;
    const dateFrom = from || '2000-01-01';
    const dateTo = to || '2099-12-31';

    // 担当者リスト取得（チームフィルタ用）
    const agentsRes = await pool.query('SELECT * FROM agents');
    const allAgents = agentsRes.rows;
    let agentNames = allAgents.map(a => a.name);
    if (team) agentNames = allAgents.filter(a => a.team === team || a.section === team).map(a => a.name);
    if (agent) agentNames = [agent];

    // 全活動取得
    const actsRes = await pool.query("SELECT * FROM activities WHERE date >= $1 AND date <= $2", [dateFrom, dateTo]);
    const acts = actsRes.rows;

    // 全案件取得
    const dealsRes = await pool.query("SELECT * FROM deals WHERE contract_date >= $1 AND contract_date <= $2", [dateFrom, dateTo]);
    const deals = dealsRes.rows;

    // 目標取得
    const targetsRes = await pool.query('SELECT * FROM targets');
    const targets = targetsRes.rows;

    // 担当者ごとの集計
    const agentKpis = agentNames.map(name => {
      const myActs = acts.filter(a => a.agent === name);
      const myCalls = myActs.filter(a => a.type === 'コール');
      const myVisits = myActs.filter(a => a.type === 'アポ');
      const myDeals = deals.filter(d => d.agent === name && d.status !== '商談中');

      const callCount = myCalls.length;
      const contactCount = myCalls.filter(a => ['担当者通話','受付通話','決済通話','提案完了','決裁'].includes(a.call_type)).length;
      const proposalCount = myCalls.filter(a => a.call_type === '提案完了').length;
      const decisionCount = myCalls.filter(a => a.call_type === '決裁').length;
      const appoCallCount = myCalls.filter(a => a.call_type === 'アポ').length;

      // アポ数（通話結果がアポ系のもの）
      const appoResults = myCalls.filter(a => ['新規アポ','再訪アポ','クロスセルアポ','アップセルアポ','担当者アポ','来週アポ'].includes(a.call_result));
      const appoCount = appoResults.length;

      // 自己アポ（アポ者=自分）vs 振りアポ
      const selfAppoCount = myVisits.filter(v => v.appointer === name).length;
      const assignedAppoCount = myVisits.filter(v => v.appointer && v.appointer !== name).length;

      // 行動数（訪問実施）
      const visitCount = myVisits.length;
      const selfVisitCount = myVisits.filter(v => v.visitor === name).length;

      // 契約
      const contractCount = myDeals.length;
      const totalAmount = myDeals.reduce((s, d) => s + (d.contract_amount || 0), 0);
      const totalProfit = myDeals.reduce((s, d) => s + (d.gross_profit || 0), 0);
      const avgProfit = contractCount > 0 ? Math.round(totalProfit / contractCount) : 0;

      // 訪問結果が契約のもの
      const contractVisits = myVisits.filter(v => v.visit_result === '契約').length;
      const completedDeals = myDeals.filter(d => ['納品完了','入金予定','入金済み'].includes(d.status)).length;

      // 歩留まり率
      const contractRate = appoCount > 0 ? Math.round((contractVisits / appoCount) * 100) : 0;
      const visitRate = appoCount > 0 ? Math.round((visitCount / appoCount) * 100) : 0;
      const appoRate = callCount > 0 ? Math.round((appoCount / callCount) * 100) : 0;
      const proposalRate = callCount > 0 ? Math.round((proposalCount / callCount) * 100) : 0;
      const decisionRate = callCount > 0 ? Math.round((decisionCount / callCount) * 100) : 0;
      const completionRate = contractCount > 0 ? Math.round((completedDeals / contractCount) * 100) : 0;

      // 各通話率
      const callTypeRates = {};
      ['アポ','決済通話','担当者通話','受付通話','不通','提案完了','決裁','コールのみ'].forEach(t => {
        callTypeRates[t] = callCount > 0 ? Math.round((myCalls.filter(a => a.call_type === t).length / callCount) * 100) : 0;
      });

      // 目標
      const myTargets = targets.filter(t => t.agent === name);

      return {
        name,
        team: (allAgents.find(a => a.name === name) || {}).team || '',
        // KGI
        totalProfit,
        totalAmount,
        // KPI量
        contractCount,
        completedDeals,
        selfAppoCount,
        assignedAppoCount,
        visitCount,
        selfVisitCount,
        // 活動指標
        appoCount,
        proposalCount,
        decisionCount,
        contactCount,
        callCount,
        // 歩留まり率
        avgProfit,
        contractRate,
        completionRate,
        visitRate,
        appoRate,
        proposalRate,
        decisionRate,
        callTypeRates,
        // 目標
        targets: myTargets.map(t => ({ yearMonth: t.year_month, grossProfitTarget: t.gross_profit_target, contractTarget: t.contract_target }))
      };
    });

    // 全体集計
    const totals = {
      totalProfit: agentKpis.reduce((s, a) => s + a.totalProfit, 0),
      totalAmount: agentKpis.reduce((s, a) => s + a.totalAmount, 0),
      contractCount: agentKpis.reduce((s, a) => s + a.contractCount, 0),
      appoCount: agentKpis.reduce((s, a) => s + a.appoCount, 0),
      visitCount: agentKpis.reduce((s, a) => s + a.visitCount, 0),
      callCount: agentKpis.reduce((s, a) => s + a.callCount, 0),
      contactCount: agentKpis.reduce((s, a) => s + a.contactCount, 0),
      proposalCount: agentKpis.reduce((s, a) => s + a.proposalCount, 0),
      decisionCount: agentKpis.reduce((s, a) => s + a.decisionCount, 0),
      avgProfit: agentKpis.reduce((s, a) => s + a.contractCount, 0) > 0
        ? Math.round(agentKpis.reduce((s, a) => s + a.totalProfit, 0) / agentKpis.reduce((s, a) => s + a.contractCount, 0)) : 0
    };

    res.json({ agents: agentKpis, totals, period: { from: dateFrom, to: dateTo } });
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


// ============================================================
// カレンダー API
// ============================================================

app.get('/api/calendar/:year/:month', async (req, res) => {
  const { year, month } = req.params;
  const monthStr = `${year}-${month.padStart(2, '0')}`;
  try {
    // コール予定（企業の次回コール日）
    const callsRes = await pool.query(
      "SELECT id, name, next_call_date, next_call_memo, next_call_agent FROM companies WHERE next_call_date LIKE $1",
      [monthStr + '%']
    );
    const calls = callsRes.rows.map(r => ({
      id: r.id, companyName: r.name, date: r.next_call_date, memo: r.next_call_memo, agent: r.next_call_agent || ''
    }));

    // 訪問予定（アポ活動）
    const visitsRes = await pool.query(
      "SELECT a.id, a.company_id, a.date, a.agent, a.visitor, a.visit_result, a.time, c.name as company_name FROM activities a JOIN companies c ON a.company_id = c.id WHERE a.type='アポ' AND a.date LIKE $1 ORDER BY a.date",
      [monthStr + '%']
    );
    const visits = visitsRes.rows.map(r => ({
      id: r.id, companyId: r.company_id, companyName: r.company_name, date: r.date, agent: r.agent || r.visitor || '', time: r.time, visitResult: r.visit_result
    }));

    // 案件（契約・取材・納品の日程）
    const dealsRes = await pool.query(
      "SELECT d.id, d.company_id, d.title, d.status, d.agent, d.contract_date, d.interview_date, d.delivery_date, c.name as company_name FROM deals d JOIN companies c ON d.company_id = c.id WHERE d.status != '商談中'"
    );
    const deals = dealsRes.rows.map(r => ({
      id: r.id, companyId: r.company_id, title: r.title, companyName: r.company_name, status: r.status, agent: r.agent || '',
      contractDate: r.contract_date, interviewDate: r.interview_date, deliveryDate: r.delivery_date
    }));

    res.json({ calls, visits, deals });
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
    res.json(rows.map(p => ({ id: p.id, name: p.name, category: p.category, price: p.price, description: p.description, active: p.active, sortOrder: p.sort_order })));
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
    const { rows } = await pool.query('SELECT * FROM agents ORDER BY department, section, created_at');
    res.json(rows.map(a => ({ id: a.id, name: a.name, team: a.team || '', department: a.department || '', section: a.section || '', role: a.role || '一般', memberId: a.member_id || '' })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/agents', async (req, res) => {
  const id = genId();
  const b = req.body;
  const mid = b.memberId || '';
  try {
    await pool.query('INSERT INTO agents (id, name, team, department, section, role, member_id) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [id, b.name, b.team||'', b.department||'', b.section||'', b.role||'一般', mid]);
    res.json({ id, memberId: mid });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/agents/:id', async (req, res) => {
  const b = req.body;
  try {
    await pool.query('UPDATE agents SET name=$1, team=$2, department=$3, section=$4, role=$5, member_id=$6 WHERE id=$7',
      [b.name, b.team||'', b.department||'', b.section||'', b.role||'一般', b.memberId||'', req.params.id]);
    res.json({ ok: true });
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
// 目標設定 API
app.get('/api/targets', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM targets ORDER BY year_month DESC, agent');
    res.json(rows.map(t => ({ id: t.id, agent: t.agent, yearMonth: t.year_month, grossProfitTarget: t.gross_profit_target, contractTarget: t.contract_target })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/targets', async (req, res) => {
  const t = req.body; const id = genId();
  try {
    await pool.query('INSERT INTO targets (id, agent, year_month, gross_profit_target, contract_target) VALUES ($1,$2,$3,$4,$5)',
      [id, t.agent, t.yearMonth, t.grossProfitTarget||0, t.contractTarget||0]);
    res.json({ id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/targets/:id', async (req, res) => {
  const t = req.body;
  try {
    await pool.query('UPDATE targets SET agent=$1, year_month=$2, gross_profit_target=$3, contract_target=$4 WHERE id=$5',
      [t.agent, t.yearMonth, t.grossProfitTarget||0, t.contractTarget||0, req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/targets/:id', async (req, res) => {
  try { await pool.query('DELETE FROM targets WHERE id=$1', [req.params.id]); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// セレクト項目管理 API
// ============================================================
app.get('/api/select-options', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM select_options ORDER BY category, sort_order, created_at');
    res.json(rows.map(r => ({ id: r.id, category: r.category, value: r.value, parent: r.parent || '', sortOrder: r.sort_order, active: r.active })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/select-options', async (req, res) => {
  const { category, value, parent } = req.body; const id = genId();
  try {
    await pool.query('INSERT INTO select_options (id, category, value, parent) VALUES ($1,$2,$3,$4)', [id, category, value, parent || '']);
    res.json({ id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/select-options/:id', async (req, res) => {
  try { await pool.query('DELETE FROM select_options WHERE id=$1', [req.params.id]); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
// 並び替え
app.put('/api/select-options/reorder', async (req, res) => {
  try {
    const items = req.body.items || [];
    for (const item of items) {
      await pool.query('UPDATE select_options SET sort_order=$1 WHERE id=$2', [item.sortOrder, item.id]);
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
// デフォルト項目一括投入
app.post('/api/select-options/seed-defaults', async (req, res) => {
  try {
    const defaults = {
      CALL_TYPES: ['アポ','決済通話','担当者通話','受付通話','不通','提案完了','決裁','コールのみ'],
      CALL_RESULTS: ['必要性のYES取れず','話し込めず再コール','諦め判断','アポ取得'],
      VISIT_RESULTS: ['未実施','契約','NG','検討','日変','訪問日変','前確NG'],
      STATUS_OPTIONS: ['顧客','見込み','とりあえず保有','過去NG','アポ禁止'],
      DEAL_STATUSES: ['商談中','契約済','審査中','取材予定','取材完了','納品予定','納品完了','入金予定','入金済み'],
      INDUSTRY_OPTIONS: ['ガテン系','IT/通信','製造業','小売業','飲食業','医療/福祉','教育','不動産','建設','運送','美容','その他'],
      PAYMENT_METHODS: ['信販','現金','振込']
    };
    // 通話分類→結果の紐づき
    const callTypeResults = {
      'アポ': ['新規アポ','再訪アポ','クロスセルアポ','アップセルアポ','担当者アポ','来週アポ'],
      '決済通話': ['必要性のYES取れず','話し込めず再コール','諦め判断'],
      '担当者通話': ['必要性のYES取れず','話し込めず再コール','諦め判断'],
      '受付通話': ['必要性のYES取れず','話し込めず再コール','諦め判断'],
      '不通': [],
      '提案完了': ['必要性のYES取れず','話し込めず再コール','諦め判断'],
      '決裁': ['必要性のYES取れず','話し込めず再コール','諦め判断'],
      'コールのみ': []
    };
    let count = 0;
    for (const [cat, vals] of Object.entries(defaults)) {
      for (let i = 0; i < vals.length; i++) {
        const exists = await pool.query('SELECT id FROM select_options WHERE category=$1 AND value=$2 AND parent=$3', [cat, vals[i], '']);
        if (exists.rows.length === 0) {
          await pool.query('INSERT INTO select_options (id, category, value, parent, sort_order) VALUES ($1,$2,$3,$4,$5)', [genId(), cat, vals[i], '', i]);
          count++;
        }
      }
    }
    // 通話分類→結果の紐づき
    for (const [callType, results] of Object.entries(callTypeResults)) {
      for (let i = 0; i < results.length; i++) {
        const exists = await pool.query('SELECT id FROM select_options WHERE category=$1 AND value=$2 AND parent=$3', ['CALL_TYPE_RESULTS', results[i], callType]);
        if (exists.rows.length === 0) {
          await pool.query('INSERT INTO select_options (id, category, value, parent, sort_order) VALUES ($1,$2,$3,$4,$5)', [genId(), 'CALL_TYPE_RESULTS', results[i], callType, i]);
          count++;
        }
      }
    }
    res.json({ ok: true, inserted: count });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ハッシュタグ API
// ============================================================
app.get('/api/hashtags', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM hashtags ORDER BY tag');
    res.json(rows.map(h => ({ id: h.id, tag: h.tag })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/hashtags', async (req, res) => {
  const id = genId();
  try {
    await pool.query('INSERT INTO hashtags (id, tag) VALUES ($1, $2) ON CONFLICT (tag) DO NOTHING', [id, req.body.tag]);
    res.json({ id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/companies/:id/hashtags', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT h.id, h.tag FROM company_hashtags ch JOIN hashtags h ON ch.hashtag_id = h.id WHERE ch.company_id = $1 ORDER BY ch.created_at',
      [req.params.id]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/companies/:id/hashtags', async (req, res) => {
  const cid = req.params.id;
  const tag = req.body.tag;
  try {
    // ハッシュタグがなければ作成
    let htRes = await pool.query('SELECT id FROM hashtags WHERE tag = $1', [tag]);
    let htId;
    if (htRes.rows.length === 0) {
      htId = genId();
      await pool.query('INSERT INTO hashtags (id, tag) VALUES ($1, $2)', [htId, tag]);
    } else {
      htId = htRes.rows[0].id;
    }
    // 紐づけ（重複防止）
    const exists = await pool.query('SELECT id FROM company_hashtags WHERE company_id=$1 AND hashtag_id=$2', [cid, htId]);
    if (exists.rows.length === 0) {
      await pool.query('INSERT INTO company_hashtags (id, company_id, hashtag_id) VALUES ($1, $2, $3)', [genId(), cid, htId]);
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/companies/:companyId/hashtags/:hashtagId', async (req, res) => {
  try {
    await pool.query('DELETE FROM company_hashtags WHERE company_id=$1 AND hashtag_id=$2', [req.params.companyId, req.params.hashtagId]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

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

// ============================================================
// ダミーデータ投入（/api/seed で実行）
// ============================================================
app.post('/api/seed', async (req, res) => {
  try {
    // === 既存の自動生成データをクリア ===
    await pool.query("DELETE FROM activities WHERE content='自動生成データ' OR content='訪問実施'");
    await pool.query("DELETE FROM targets WHERE id IN (SELECT id FROM targets)");

    // === 担当者（5名体制） ===
    const agentData = [
      { name: '小林優人', team: '1課' },
      { name: '中川翔', team: '1課' },
      { name: '佐藤美咲', team: '2課' },
      { name: '田中健太', team: '2課' },
      { name: '渡辺亮', team: '1課' }
    ];
    for (const a of agentData) {
      const exists = await pool.query('SELECT id FROM agents WHERE name=$1', [a.name]);
      if (exists.rows.length === 0) {
        await pool.query('INSERT INTO agents (id, name, team) VALUES ($1, $2, $3)', [genId(), a.name, a.team]);
      } else {
        await pool.query('UPDATE agents SET team=$1 WHERE name=$2', [a.team, a.name]);
      }
    }

    // === 商品プラン ===
    const planData = [
      { name: 'HPプランA', category: 'HP', price: 300000, description: '基本HP制作' },
      { name: 'HPプランB', category: 'HP', price: 500000, description: 'スタンダードHP' },
      { name: 'LPプランA', category: 'LP', price: 150000, description: 'LP制作' },
      { name: 'SEOプラン', category: 'SEO', price: 200000, description: 'SEO対策' }
    ];
    for (const p of planData) {
      const exists = await pool.query('SELECT id FROM plans WHERE name=$1', [p.name]);
      if (exists.rows.length === 0) {
        await pool.query('INSERT INTO plans (id, name, category, price, description, active, sort_order) VALUES ($1,$2,$3,$4,$5,true,0)', [genId(), p.name, p.category, p.price, p.description]);
      }
    }

    // === 信販会社 ===
    for (const cn of ['オリコ','アプラス','ジャックス']) {
      const exists = await pool.query('SELECT id FROM credit_companies WHERE name=$1', [cn]);
      if (exists.rows.length === 0) {
        await pool.query('INSERT INTO credit_companies (id, name) VALUES ($1, $2)', [genId(), cn]);
      }
    }

    // === 企業（20社） ===
    const agentNames = agentData.map(a => a.name);
    const companies = [
      { name: '株式会社山田建設', kana: 'ヤマダケンセツ', pref: '大阪府', city: '大阪市北区', status: '見込み', industry: 'ガテン系', owner: '小林優人', callAgent: '小林優人', callDate: '2026-04-14', callMemo: '見積もり確認' },
      { name: '有限会社鈴木電気', kana: 'スズキデンキ', pref: '東京都', city: '渋谷区', status: '顧客', industry: 'IT/通信', owner: '小林優人', callAgent: '小林優人', callDate: '2026-04-15', callMemo: '納品確認' },
      { name: '株式会社ビューティーラボ', kana: 'ビューティーラボ', pref: '東京都', city: '港区', status: '見込み', industry: '美容', owner: '小林優人', callAgent: '小林優人', callDate: '2026-04-14', callMemo: '見積もり回答待ち' },
      { name: '有限会社ミライテック', kana: 'ミライテック', pref: '神奈川県', city: '横浜市中区', status: '見込み', industry: 'IT/通信', owner: '中川翔', callAgent: '中川翔', callDate: '2026-04-14', callMemo: '資料送付後' },
      { name: '有限会社海鮮まつり', kana: 'カイセンマツリ', pref: '北海道', city: '札幌市中央区', status: '見込み', industry: '飲食業', owner: '中川翔', callAgent: '中川翔', callDate: '2026-04-16', callMemo: '新店舗オープン' },
      { name: '株式会社富士観光', kana: 'フジカンコウ', pref: '静岡県', city: '富士市', status: '見込み', industry: '不動産', owner: '小林優人', callAgent: '渡辺亮', callDate: '2026-04-17', callMemo: 'GW前に提案' },
      { name: '株式会社松風建材', kana: 'マツカゼケンザイ', pref: '愛知県', city: '名古屋市中区', status: '見込み', industry: 'ガテン系', owner: '中川翔', callAgent: '中川翔', callDate: '2026-04-18', callMemo: 'フォロー' },
      { name: '合同会社クラフトビール東京', kana: 'クラフトビールトウキョウ', pref: '東京都', city: '世田谷区', status: '見込み', industry: '飲食業', owner: '中川翔', callAgent: '渡辺亮', callDate: '2026-04-15', callMemo: '提案資料' },
      { name: '株式会社テクノソリューション', kana: 'テクノソリューション', pref: '東京都', city: '千代田区', status: '顧客', industry: 'IT/通信', owner: '小林優人' },
      { name: '株式会社コスモ不動産', kana: 'コスモフドウサン', pref: '大阪府', city: '大阪市中央区', status: '顧客', industry: '不動産', owner: '小林優人' },
      { name: '株式会社ダイヤモンド工機', kana: 'ダイヤモンドコウキ', pref: '愛知県', city: '豊田市', status: '顧客', industry: '製造業', owner: '中川翔' },
      { name: '株式会社メディカルプラス', kana: 'メディカルプラス', pref: '東京都', city: '新宿区', status: '顧客', industry: '医療/福祉', owner: '小林優人' },
      { name: '株式会社フレッシュフーズ', kana: 'フレッシュフーズ', pref: '千葉県', city: '千葉市', status: '顧客', industry: '飲食業', owner: '中川翔' },
      { name: '社会福祉法人あおぞら会', kana: 'アオゾラカイ', pref: '埼玉県', city: 'さいたま市', status: '顧客', industry: '医療/福祉', owner: '佐藤美咲' },
      { name: '株式会社グリーンテック', kana: 'グリーンテック', pref: '福岡県', city: '福岡市博多区', status: '見込み', industry: '製造業', owner: '佐藤美咲', callAgent: '佐藤美咲', callDate: '2026-04-16', callMemo: '初回提案' },
      { name: '株式会社サンライズ工業', kana: 'サンライズコウギョウ', pref: '広島県', city: '広島市中区', status: '見込み', industry: 'ガテン系', owner: '田中健太', callAgent: '田中健太', callDate: '2026-04-14', callMemo: 'HP提案' },
      { name: '有限会社ブルースカイ', kana: 'ブルースカイ', pref: '宮城県', city: '仙台市青葉区', status: '見込み', industry: '小売業', owner: '田中健太', callAgent: '田中健太', callDate: '2026-04-17', callMemo: 'LP提案' },
      { name: '株式会社ノースランド', kana: 'ノースランド', pref: '北海道', city: '札幌市北区', status: '見込み', industry: '建設', owner: '渡辺亮', callAgent: '渡辺亮', callDate: '2026-04-15', callMemo: 'HP提案フォロー' },
      { name: '合同会社ウエスト商事', kana: 'ウエストショウジ', pref: '大阪府', city: '大阪市西区', status: '顧客', industry: '小売業', owner: '渡辺亮' },
      { name: '株式会社トータルサポート', kana: 'トータルサポート', pref: '東京都', city: '品川区', status: '見込み', industry: '教育', owner: '佐藤美咲', callAgent: '佐藤美咲', callDate: '2026-04-18', callMemo: 'SEO提案' }
    ];

    const companyIds = {};
    for (const c of companies) {
      const exists = await pool.query('SELECT id FROM companies WHERE name=$1', [c.name]);
      if (exists.rows.length > 0) {
        companyIds[c.name] = exists.rows[0].id;
        if (c.callDate) await pool.query('UPDATE companies SET next_call_date=$1, next_call_memo=$2, next_call_agent=$3, prospect_owner=$4 WHERE id=$5', [c.callDate, c.callMemo||null, c.callAgent||null, c.owner||null, exists.rows[0].id]);
        continue;
      }
      const id = genId(); companyIds[c.name] = id;
      await pool.query(
        `INSERT INTO companies (id, name, name_kana, prefecture, city, zip, representative, status, industry, next_call_date, next_call_memo, next_call_agent, prospect_owner, list_created_date) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [id, c.name, c.kana, c.pref, c.city, '000-0000', c.name.replace(/株式会社|有限会社|合同会社|社会福祉法人/g,'').slice(0,3)+'代表', c.status, c.industry, c.callDate||null, c.callMemo||null, c.callAgent||null, c.owner||null, '2026-01-01']
      );
      await pool.query('INSERT INTO phone_numbers (id, company_id, number, type, label) VALUES ($1,$2,$3,$4,$5)', [genId(), id, '03-' + String(Math.floor(Math.random()*9000+1000)) + '-' + String(Math.floor(Math.random()*9000+1000)), '固定', '代表']);
    }

    // === 案件（全ステータス網羅、5名分） ===
    const dealData = [
      { co: '株式会社山田建設', title: 'HPプランB', st: '取材予定', ag: '小林優人', cd: '2026-02-15', amt: 500000, gp: 300000, pm: '信販', cc: 'オリコ', cs: '承認', id2: '2026-04-20', dd: null },
      { co: '有限会社鈴木電気', title: 'LPプランA', st: '納品予定', ag: '中川翔', cd: '2026-02-01', amt: 300000, gp: 180000, pm: '現金', id2: '2026-02-20', dd: '2026-04-25' },
      { co: '株式会社テクノソリューション', title: 'HPプランA', st: '審査中', ag: '小林優人', cd: '2026-03-20', amt: 300000, gp: 200000, pm: '信販', cc: 'アプラス', cs: '申請中' },
      { co: '株式会社コスモ不動産', title: 'HPプランB', st: '入金予定', ag: '小林優人', cd: '2026-01-10', amt: 500000, gp: 320000, pm: '信販', cc: 'オリコ', cs: '承認', id2: '2026-02-05', dd: '2026-03-01' },
      { co: '株式会社ダイヤモンド工機', title: 'LPプランA', st: '入金済み', ag: '中川翔', cd: '2026-01-20', amt: 150000, gp: 90000, pm: '現金', id2: '2026-02-15', dd: '2026-03-10' },
      { co: '株式会社メディカルプラス', title: 'HPプランA', st: '入金済み', ag: '小林優人', cd: '2025-12-10', amt: 300000, gp: 180000, pm: '信販', cc: 'ジャックス', cs: '承認', id2: '2026-01-01', dd: '2026-02-15' },
      { co: '株式会社フレッシュフーズ', title: 'HPプランA', st: '取材完了', ag: '中川翔', cd: '2026-02-15', amt: 300000, gp: 180000, pm: '現金', id2: '2026-03-10' },
      { co: '社会福祉法人あおぞら会', title: 'HPプランB', st: '契約済', ag: '佐藤美咲', cd: '2026-03-25', amt: 500000, gp: 300000, pm: '信販', cc: 'オリコ', cs: '申請中' },
      { co: '株式会社ビューティーラボ', title: 'HPプランA', st: '商談中', ag: '小林優人', cd: '2026-04-01', amt: 300000, gp: 180000, pm: '現金' },
      { co: '有限会社ミライテック', title: 'SEOプラン', st: '納品完了', ag: '中川翔', cd: '2026-01-05', amt: 200000, gp: 140000, pm: '現金', id2: '2026-01-20', dd: '2026-02-28' },
      { co: '株式会社グリーンテック', title: 'LPプランA', st: '入金済み', ag: '佐藤美咲', cd: '2026-01-01', amt: 150000, gp: 90000, pm: '現金', id2: '2026-01-20', dd: '2026-02-25' },
      { co: '株式会社サンライズ工業', title: 'HPプランB', st: '取材予定', ag: '田中健太', cd: '2026-03-10', amt: 500000, gp: 300000, pm: '信販', cc: 'アプラス', cs: '承認', id2: '2026-04-22' },
      { co: '有限会社ブルースカイ', title: 'LPプランA', st: '契約済', ag: '田中健太', cd: '2026-04-01', amt: 150000, gp: 90000, pm: '現金' },
      { co: '株式会社ノースランド', title: 'HPプランA', st: '納品予定', ag: '渡辺亮', cd: '2026-02-20', amt: 300000, gp: 200000, pm: '信販', cc: 'ジャックス', cs: '承認', id2: '2026-03-15', dd: '2026-04-28' },
      { co: '合同会社ウエスト商事', title: 'SEOプラン', st: '入金済み', ag: '渡辺亮', cd: '2026-01-15', amt: 200000, gp: 140000, pm: '現金', id2: '2026-02-10', dd: '2026-03-20' },
      { co: '株式会社トータルサポート', title: 'HPプランA', st: '商談中', ag: '佐藤美咲', cd: '2026-04-05', amt: 300000, gp: 180000, pm: '現金' }
    ];
    // 既存案件削除して再投入
    await pool.query("DELETE FROM deals WHERE memo='' OR memo IS NULL");
    for (const d of dealData) {
      const cid = companyIds[d.co];
      if (!cid) continue;
      await pool.query(
        `INSERT INTO deals (id, company_id, title, status, agent, contract_date, contract_amount, payment_method, credit_company, credit_status, credit_amount, interview_date, delivery_date, cost, gross_profit, memo) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
        [genId(), cid, d.title, d.st, d.ag, d.cd, d.amt, d.pm, d.cc||null, d.cs||null, d.amt, d.id2||null, d.dd||null, d.amt-(d.gp||0), d.gp||0, '']
      );
    }

    // === 活動データ: コール（2-3月＋4月前半、5名、平日のみ） ===
    const callTypes = ['アポ','決済通話','担当者通話','受付通話','不通','提案完了','決裁','コールのみ'];
    const callResults = ['必要性のYES取れず','話し込めず再コール','諦め判断','アポ取得'];
    const companyNames = Object.keys(companyIds);
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];

    for (let dayOffset = 0; dayOffset < 75; dayOffset++) {
      const d = new Date(2026, 1, 1); d.setDate(d.getDate() + dayOffset); // 2026-02-01から
      if (d.getDay() === 0 || d.getDay() === 6) continue;
      if (d > new Date()) continue; // 未来日はスキップ
      const dateStr = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');

      for (const agentName of agentNames) {
        const numCalls = Math.floor(Math.random() * 6) + 3; // 3-8件/日
        for (let i = 0; i < numCalls; i++) {
          const co = pick(companyNames);
          const cid = companyIds[co];
          const ct = pick(callTypes);
          const cr = ct === 'アポ' ? 'アポ取得' : pick(callResults);
          const hour = 9 + Math.floor(Math.random() * 8);
          const minute = Math.floor(Math.random() * 60);
          await pool.query(
            'INSERT INTO activities (id, company_id, type, date, time, agent, call_type, call_result, content) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
            [genId(), cid, 'コール', dateStr, String(hour).padStart(2,'0')+':'+String(minute).padStart(2,'0'), agentName, ct, cr, '自動生成データ']
          );
        }
      }
    }

    // === 訪問データ（2-3月＋4月前半、各エージェント週1-2回） ===
    const visitResults = ['未実施','契約','NG','検討','日変'];
    for (let dayOffset = 0; dayOffset < 75; dayOffset++) {
      const d = new Date(2026, 1, 1); d.setDate(d.getDate() + dayOffset);
      if (d.getDay() === 0 || d.getDay() === 6) continue;
      if (d > new Date()) continue;
      const dateStr = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
      // 各エージェント: 約30%の確率で訪問あり
      for (const agentName of agentNames) {
        if (Math.random() > 0.3) continue;
        const co = pick(companyNames);
        const cid = companyIds[co];
        const hour = 10 + Math.floor(Math.random() * 6);
        await pool.query(
          'INSERT INTO activities (id, company_id, type, date, time, agent, visit_result, appointer, visitor, content) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
          [genId(), cid, 'アポ', dateStr, String(hour).padStart(2,'0')+':00', agentName, pick(visitResults), agentName, agentName, '訪問実施']
        );
      }
    }

    // === 目標データ（2-4月、5名分） ===
    const months = ['2026-02','2026-03','2026-04'];
    for (const m of months) {
      for (const a of agentData) {
        const gp = a.team === '1課' ? (a.name === '小林優人' ? 1500000 : a.name === '渡辺亮' ? 1000000 : 1200000) : 800000;
        const ct = a.team === '1課' ? (a.name === '小林優人' ? 10 : 8) : 5;
        await pool.query(
          'INSERT INTO targets (id, agent, year_month, gross_profit_target, contract_target) VALUES ($1,$2,$3,$4,$5)',
          [genId(), a.name, m, gp, ct]
        );
      }
    }

    res.json({ ok: true, message: 'ダミーデータ投入完了（5名・2-4月）' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

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
