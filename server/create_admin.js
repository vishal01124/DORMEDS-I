const crypto = require('crypto');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:SaCnffbRJGuLCFzKFFrwHgstQEDeyvUY@shinkansen.proxy.rlwy.net:19969/railway',
  ssl: { rejectUnauthorized: false }
});

const hash = pw => crypto.createHash('sha256').update(pw).digest('hex');
const uid  = () => crypto.randomBytes(8).toString('hex');

// ── SET SECOND ADMIN DETAILS HERE ─────────────────────────────
const ADMIN2 = {
  name:     'Admin 2',
  email:    'admin2@dormed.com',
  password: 'DORMEDS2@2026'
};
// ──────────────────────────────────────────────────────────────

async function run() {
  await pool.query('SELECT 1');
  console.log('✅ Connected to Railway PostgreSQL');

  const aid = 'adm' + uid();
  await pool.query(
    'INSERT INTO admins(id,name,email,pass_hash,created_at,is_super) VALUES($1,$2,$3,$4,$5,false) ON CONFLICT(email) DO UPDATE SET pass_hash=EXCLUDED.pass_hash, name=EXCLUDED.name',
    [aid, ADMIN2.name, ADMIN2.email.toLowerCase(), hash(ADMIN2.password), new Date().toISOString()]
  );

  const { rows } = await pool.query('SELECT id, name, email, is_super FROM admins ORDER BY created_at');
  console.log('\n📋 All admin accounts in DB:');
  rows.forEach(r => console.log(` - [${r.is_super ? 'SUPER' : 'admin'}] ${r.name} <${r.email}>`));
  console.log('\n✅ Done! Admin2 can now log in at:');
  console.log('   https://web-production-e4fbb.up.railway.app');
  console.log('   Email:   ', ADMIN2.email);
  console.log('   Password:', ADMIN2.password);
  await pool.end();
}

run().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
