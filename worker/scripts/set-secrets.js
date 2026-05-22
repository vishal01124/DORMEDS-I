#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
//  PharmaDist Pro — Cloudflare Worker Secrets Setup Script
//  Run: node scripts/set-secrets.js
//  Or:  npm run secrets   (from the worker/ directory)
//
//  This script uses `wrangler secret put` to configure all
//  required secrets for the Worker. Values are read from:
//    1. Environment variables (CI/CD friendly)
//    2. A local .env file (worker/.env — git-ignored)
//    3. Interactive prompts (if neither is available)
// ─────────────────────────────────────────────────────────────

'use strict';

const { execSync, spawnSync } = require('child_process');
const readline = require('readline');
const path     = require('path');
const fs       = require('fs');

// ── Load .env file if it exists ───────────────────────────────
const envFile = path.join(__dirname, '..', '.env');
if (fs.existsSync(envFile)) {
  console.log(`\n📂  Loading values from ${envFile}\n`);
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*"?(.+?)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} else {
  console.log('\n💡  Tip: Create worker/.env with your secrets to skip prompts.\n');
}

// ── Required secrets ──────────────────────────────────────────
const SECRETS = [
  {
    key:     'JWT_SECRET',
    desc:    'JWT signing secret (long random string — min 32 chars)',
    example: 'Use: openssl rand -hex 32',
    required: true,
  },
  {
    key:     'ADMIN_EMAIL',
    desc:    'Admin login email for the distributor account',
    example: 'admin@yourdomain.com',
    required: true,
  },
  {
    key:     'ADMIN_PASSWORD',
    desc:    'Admin login password (min 8 chars)',
    example: 'StrongP@ssw0rd123',
    required: true,
  },
  {
    key:     'RESEND_API_KEY',
    desc:    'Resend API key for email (password reset, notifications)',
    example: 'Get from: https://resend.com/api-keys',
    required: false,
  },
  {
    key:     'WA_VERIFY_TOKEN',
    desc:    'WhatsApp webhook verify token (optional)',
    example: 'Any random string you set in Meta Dashboard',
    required: false,
  },
  {
    key:     'WA_ACCESS_TOKEN',
    desc:    'WhatsApp Business API access token (optional)',
    example: 'From Meta Developer Console',
    required: false,
  },
  {
    key:     'WA_PHONE_ID',
    desc:    'WhatsApp Business Phone Number ID (optional)',
    example: 'From Meta Developer Console',
    required: false,
  },
];

// ── Check wrangler is available ───────────────────────────────
function checkWrangler() {
  try {
    execSync('npx wrangler --version', { stdio: 'pipe' });
    return true;
  } catch {
    console.error('❌  Wrangler is not installed. Run: npm install -g wrangler');
    process.exit(1);
  }
}

// ── Set a single secret ───────────────────────────────────────
function setSecret(key, value) {
  const result = spawnSync(
    'npx',
    ['wrangler', 'secret', 'put', key],
    {
      input: value + '\n',
      encoding: 'utf8',
      cwd: path.join(__dirname, '..'),
      stdio: ['pipe', 'pipe', 'pipe'],
    }
  );
  if (result.status === 0) {
    console.log(`  ✅  ${key} — set successfully`);
    return true;
  } else {
    console.error(`  ❌  ${key} — failed to set`);
    console.error('     ', (result.stderr || '').trim());
    return false;
  }
}

// ── Interactive prompt ─────────────────────────────────────────
async function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// ── Validation ─────────────────────────────────────────────────
function validate(key, value) {
  if (!value || value.length === 0) return false;
  if (key === 'JWT_SECRET'      && value.length < 32) { console.warn(`  ⚠️   JWT_SECRET should be at least 32 characters for security.`); }
  if (key === 'ADMIN_PASSWORD'  && value.length < 8)  { console.error(`  ❌  ADMIN_PASSWORD must be at least 8 characters.`); return false; }
  return true;
}

// ── Main ──────────────────────────────────────────────────────
async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  PharmaDist Pro — Cloudflare Worker Secrets  ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  checkWrangler();

  let set = 0, skipped = 0, failed = 0;

  for (const secret of SECRETS) {
    console.log(`\n🔑  ${secret.key}`);
    console.log(`    ${secret.desc}`);
    if (!secret.required) console.log(`    (optional — press Enter to skip)`);

    // Get value from env or prompt
    let value = process.env[secret.key] || '';

    if (!value) {
      console.log(`    Example: ${secret.example}`);
      value = await prompt(`    Value: `);
    } else {
      console.log(`    Value: [loaded from environment]`);
    }

    if (!value) {
      if (secret.required) {
        console.error(`  ❌  ${secret.key} is required — skipping (FIX THIS before deploying!)`);
        failed++;
      } else {
        console.log(`  ⏭️   ${secret.key} skipped (optional)`);
        skipped++;
      }
      continue;
    }

    if (!validate(secret.key, value)) { failed++; continue; }

    const ok = setSecret(secret.key, value);
    if (ok) set++; else failed++;
  }

  console.log('\n' + '─'.repeat(48));
  console.log(`  ✅  ${set} secret(s) set`);
  if (skipped > 0) console.log(`  ⏭️   ${skipped} optional secret(s) skipped`);
  if (failed > 0)  console.error(`  ❌  ${failed} secret(s) failed — fix before deploying!`);
  console.log('');

  if (failed > 0) process.exit(1);

  console.log('🚀  All required secrets are configured!');
  console.log('    Next: cd .. && npm run deploy  (or push to main)\n');
}

main().catch(e => { console.error(e); process.exit(1); });
