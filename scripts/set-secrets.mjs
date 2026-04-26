/**
 * Sets all required GitHub Actions secrets for KidBank CI/CD.
 * Run once locally with credentials passed via environment variables:
 *
 *   GITHUB_TOKEN=ghp_... \
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   SUPABASE_ANON_KEY=eyJ... \
 *   VERCEL_TOKEN=vcp_... \
 *   node scripts/set-secrets.mjs
 */
import sodium from 'libsodium-wrappers'

const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const OWNER = process.env.GITHUB_OWNER || 'glowstonesq1'
const REPO = process.env.GITHUB_REPO || 'new_claude_BankingApp'
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY
const VERCEL_TOKEN = process.env.VERCEL_TOKEN

if (!GITHUB_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY || !VERCEL_TOKEN) {
  console.error('❌ Missing required environment variables.')
  console.error('Run: GITHUB_TOKEN=... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... SUPABASE_ANON_KEY=... VERCEL_TOKEN=... node scripts/set-secrets.mjs')
  process.exit(1)
}

async function encryptSecret(publicKeyBase64, secretValue) {
  await sodium.ready
  const binKey = sodium.from_base64(publicKeyBase64, sodium.base64_variants.ORIGINAL)
  const binSecret = sodium.from_string(secretValue)
  const encrypted = sodium.crypto_box_seal(binSecret, binKey)
  return sodium.to_base64(encrypted, sodium.base64_variants.ORIGINAL)
}

async function setSecret(keyId, keyBase64, name, value) {
  const encrypted = await encryptSecret(keyBase64, value)
  const res = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/actions/secrets/${name}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ encrypted_value: encrypted, key_id: keyId }),
    }
  )
  console.log(res.status === 201 || res.status === 204 ? `✅ ${name}` : `❌ ${name}: ${res.status}`)
}

async function main() {
  const pkRes = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/actions/secrets/public-key`,
    { headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' } }
  )
  const { key_id, key } = await pkRes.json()

  await setSecret(key_id, key, 'SUPABASE_URL', SUPABASE_URL)
  await setSecret(key_id, key, 'SUPABASE_SERVICE_ROLE_KEY', SUPABASE_SERVICE_ROLE_KEY)
  await setSecret(key_id, key, 'VITE_SUPABASE_URL', SUPABASE_URL)
  await setSecret(key_id, key, 'VITE_SUPABASE_ANON_KEY', SUPABASE_ANON_KEY)
  await setSecret(key_id, key, 'VERCEL_TOKEN', VERCEL_TOKEN)
}

main().catch(console.error)
