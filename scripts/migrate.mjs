/**
 * KidBank Database Migration Script
 * Runs against Supabase using the direct pg connection + Supabase Auth API
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... SUPABASE_DB_PASSWORD=... ADMIN_PASSWORD=... node scripts/migrate.mjs
 */
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123!'

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const PROJECT_REF = new URL(SUPABASE_URL).hostname.split('.')[0]
console.log(`📦 Project ref: ${PROJECT_REF}`)

// ─────────────────────────────────────────────
// 1. Run SQL migrations via pg (direct connection)
// ─────────────────────────────────────────────
async function runMigrations() {
  if (!DB_PASSWORD) {
    console.log('⚠️  No SUPABASE_DB_PASSWORD — skipping direct DB migrations')
    console.log('   Tables will need to be created manually via Supabase SQL Editor.')
    return false
  }

  const { default: pg } = await import('pg')
  const { Client } = pg

  const connectionString = `postgresql://postgres:${encodeURIComponent(DB_PASSWORD)}@db.${PROJECT_REF}.supabase.co:5432/postgres`

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } })

  try {
    await client.connect()
    console.log('✅ Connected to Supabase DB')

    const sql = readFileSync(join(__dirname, '../supabase/migrations/001_initial_schema.sql'), 'utf8')

    // Split on double newlines to run statement blocks
    const statements = sql
      .split(/;\s*\n/)
      .map(s => s.trim())
      .filter(s => s.length > 2 && !s.startsWith('--'))

    let ok = 0
    let skip = 0
    for (const stmt of statements) {
      try {
        await client.query(stmt + ';')
        ok++
      } catch (e) {
        if (e.message.includes('already exists') || e.message.includes('duplicate')) {
          skip++
        } else {
          console.warn(`  ⚠️  Statement warning: ${e.message.slice(0, 80)}`)
        }
      }
    }
    console.log(`✅ Migrations done: ${ok} statements executed, ${skip} already existed`)
    await client.end()
    return true
  } catch (err) {
    console.error('❌ DB connection failed:', err.message)
    await client.end().catch(() => {})
    return false
  }
}

// ─────────────────────────────────────────────
// 2. Create admin auth user via Supabase Auth API
// ─────────────────────────────────────────────
async function createAdminUser() {
  const adminEmail = 'admin@kidbank.app'
  console.log(`\n👤 Creating admin user: ${adminEmail}`)

  // Check if already exists
  const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(adminEmail)}`, {
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
  })

  const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: adminEmail,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: 'KidBank Admin', username: 'admin', role: 'admin' },
    }),
  })

  const createData = await createRes.json()

  if (createRes.ok && createData.id) {
    const userId = createData.id
    console.log(`✅ Auth user created: ${userId}`)

    // Upsert users table profile
    const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        id: userId,
        username: 'admin',
        display_name: 'KidBank Admin',
        role: 'admin',
        is_frozen: false,
      }),
    })

    if (profileRes.ok || profileRes.status === 201 || profileRes.status === 200) {
      console.log('✅ Admin profile saved to users table')
    } else {
      const e = await profileRes.text()
      console.log(`⚠️  Profile upsert: ${profileRes.status} ${e.slice(0,100)}`)
    }

    // Create accounts row
    const acctRes = await fetch(`${SUPABASE_URL}/rest/v1/accounts`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({ user_id: userId, balance: 0 }),
    })

    if (acctRes.ok || acctRes.status === 201 || acctRes.status === 200) {
      console.log('✅ Admin account row created')
    }

    return userId
  } else if (createData.msg?.includes('already been registered') || createData.code === 'email_exists') {
    console.log('ℹ️  Admin user already exists — skipping creation')
  } else {
    console.error('❌ Failed to create admin user:', JSON.stringify(createData).slice(0, 200))
  }
}

// ─────────────────────────────────────────────
// 3. Verify stocks were seeded (by the migration)
// ─────────────────────────────────────────────
async function verifyStocks() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/stocks?select=ticker,company_name`, {
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
  })

  if (res.ok) {
    const stocks = await res.json()
    if (Array.isArray(stocks) && stocks.length > 0) {
      console.log(`\n✅ Stocks seeded: ${stocks.map(s => s.ticker).join(', ')}`)
    } else {
      console.log('⚠️  Stocks table empty — seed data may need to be inserted manually')
    }
  } else {
    console.log('⚠️  Could not verify stocks (table may not exist yet)')
  }
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────
async function main() {
  console.log('🚀 KidBank Database Setup\n')

  const migrated = await runMigrations()

  if (!migrated) {
    console.log('\n📋 MANUAL SETUP REQUIRED:')
    console.log('1. Go to: https://supabase.com/dashboard/project/' + PROJECT_REF + '/sql/new')
    console.log('2. Paste the contents of: supabase/migrations/001_initial_schema.sql')
    console.log('3. Click "Run"\n')
    console.log('Then come back and run: node scripts/migrate.mjs (with DB password set)\n')
  }

  await createAdminUser()
  await verifyStocks()

  console.log('\n🎉 Setup complete!')
  console.log(`Admin login → username: admin  |  password: ${ADMIN_PASSWORD}`)
}

main().catch(console.error)
