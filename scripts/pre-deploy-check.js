#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
//  PharmaDist Pro — Pre-Deploy Check Script
//  Syncs frontend files root → pages_dist
//  Runs sanity checks for hardcoded credentials, missing URLs, etc.
//  Run: node scripts/pre-deploy-check.js
// ─────────────────────────────────────────────────────────────

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT      = path.join(__dirname, '..');
const DIST      = path.join(ROOT, 'pages_dist');
const APPJS     = path.join(ROOT, 'app.js');
const WRANGLER  = path.join(ROOT, 'worker', 'wrangler.toml');

// Frontend files that are deployed to Cloudflare Pages
const FRONTEND_FILES = [
  'app.js',
  'index.html',
  'landing.html',
  'products.html',
  'style.css',
  'sw.js',
  'manifest.json',
];

let errors   = 0;
let warnings = 0;

function ok(msg)   { console.log(`  ✅  ${msg}`); }
function warn(msg) { console.warn(`  ⚠️   ${msg}`); warnings++; }
function fail(msg) { console.error(`  ❌  ${msg}`); errors++; }

// ── 1. Sync root → pages_dist ─────────────────────────────────
console.log('\n📦  Syncing frontend files → pages_dist/\n');

if (!fs.existsSync(DIST)) {
  fs.mkdirSync(DIST, { recursive: true });
  ok('Created pages_dist/ directory');
}

for (const file of FRONTEND_FILES) {
  const src  = path.join(ROOT, file);
  const dest = path.join(DIST, file);
  if (!fs.existsSync(src)) {
    warn(`Source file missing: ${file} — skipped`);
    continue;
  }
  const srcContent  = fs.readFileSync(src);
  const destContent = fs.existsSync(dest) ? fs.readFileSync(dest) : null;
  if (!destContent || !srcContent.equals(destContent)) {
    fs.copyFileSync(src, dest);
    ok(`Synced: ${file}`);
  } else {
    ok(`Up to date: ${file}`);
  }
}

// ── 2. Sanity Checks ──────────────────────────────────────────
console.log('\n🔍  Running pre-launch sanity checks…\n');

// 2a. Check app.js worker URL is not pointing to someone else's account
if (fs.existsSync(APPJS)) {
  const appSrc = fs.readFileSync(APPJS, 'utf8');

  // Check RAILWAY_URL is set and not the wrong person's account
  const urlMatch = appSrc.match(/const RAILWAY_URL\s*=\s*'([^']*)'/);
  // Get worker name from wrangler.toml to validate the URL
  let workerName = '';
  if (fs.existsSync(WRANGLER)) {
    const wt = fs.readFileSync(WRANGLER, 'utf8');
    const wm = wt.match(/^name\s*=\s*"([^"]+)"/m);
    if (wm) workerName = wm[1];
  }

  if (!urlMatch || !urlMatch[1]) {
    fail('RAILWAY_URL is empty in app.js — backend will not be reachable in production.');
  } else if (!urlMatch[1].startsWith('https://')) {
    warn(`RAILWAY_URL does not start with https://: ${urlMatch[1]}`);
  } else if (workerName && !urlMatch[1].includes(workerName)) {
    warn(`RAILWAY_URL (${urlMatch[1]}) does not contain the worker name "${workerName}" from wrangler.toml — double-check this is correct.`);
  } else {
    ok(`RAILWAY_URL: ${urlMatch[1]}`);
  }

  // Check for demo credentials still exposed in console output
  if (appSrc.includes('admin123') || appSrc.includes('pharmacy123')) {
    warn('Demo credentials (admin123 / pharmacy123) are still defined in app.js demo seed data. This is fine for demo mode but ensure real admin credentials differ in production.');
  } else {
    ok('No obvious default credential strings found in app.js');
  }
} else {
  fail('app.js not found at root');
}

// 2b. Check wrangler.toml APP_URL matches the Pages project
if (fs.existsSync(WRANGLER)) {
  const wranglerSrc = fs.readFileSync(WRANGLER, 'utf8');
  const appUrlMatch = wranglerSrc.match(/APP_URL\s*=\s*"([^"]*)"/);
  if (!appUrlMatch) {
    warn('APP_URL not found in worker/wrangler.toml — password reset links may be broken.');
  } else {
    const appUrl = appUrlMatch[1];
    if (appUrl.includes('pharmadist-pro.pages.dev')) {
      warn(`APP_URL in wrangler.toml is "${appUrl}" but the Pages project is "pharmadist-app"\n       → Password reset links will point to the wrong domain.\n       → Change APP_URL to "https://pharmadist-app.pages.dev" (or your custom domain).`);
    } else {
      ok(`APP_URL: ${appUrl}`);
    }
  }

  // Check required secrets are documented
  const requiredSecrets = ['JWT_SECRET', 'ADMIN_EMAIL', 'ADMIN_PASSWORD', 'RESEND_API_KEY'];
  for (const s of requiredSecrets) {
    if (wranglerSrc.includes(s)) {
      ok(`Secret documented in wrangler.toml: ${s}`);
    } else {
      warn(`Secret not mentioned in wrangler.toml: ${s} — run 'wrangler secret put ${s}'`);
    }
  }
} else {
  fail('worker/wrangler.toml not found');
}

// 2c. Check pages_dist is in sync with root for all frontend files
console.log('\n🔄  Verifying pages_dist sync…\n');
let allSynced = true;
for (const file of FRONTEND_FILES) {
  const src  = path.join(ROOT, file);
  const dest = path.join(DIST, file);
  if (!fs.existsSync(src) || !fs.existsSync(dest)) continue;
  const srcHash  = require('crypto').createHash('sha256').update(fs.readFileSync(src)).digest('hex');
  const destHash = require('crypto').createHash('sha256').update(fs.readFileSync(dest)).digest('hex');
  if (srcHash !== destHash) {
    fail(`pages_dist/${file} is out of sync with root/${file} — re-run this script to sync.`);
    allSynced = false;
  }
}
if (allSynced) ok('All frontend files are in sync with pages_dist/');

// 2d. Check .pagesignore exists
const pagesIgnore = path.join(ROOT, '.pagesignore');
if (fs.existsSync(pagesIgnore)) {
  const ignContent = fs.readFileSync(pagesIgnore, 'utf8');
  if (ignContent.includes('node_modules') && ignContent.includes('*.db')) {
    ok('.pagesignore looks correct (node_modules and *.db are excluded)');
  } else {
    warn('.pagesignore may be missing important exclusions (node_modules, *.db)');
  }
} else {
  warn('.pagesignore not found — sensitive files may be uploaded to Cloudflare Pages');
}

// 2e. Verify GitHub Actions workflow deploys pages_dist not .
const workflowPath = path.join(ROOT, '.github', 'workflows', 'deploy-cloudflare.yml');
if (fs.existsSync(workflowPath)) {
  const workflowSrc = fs.readFileSync(workflowPath, 'utf8');
  if (workflowSrc.includes('pages deploy pages_dist')) {
    ok('GitHub Actions deploys pages_dist/ (correct)');
  } else if (workflowSrc.includes('pages deploy .')) {
    fail('GitHub Actions deploys entire repo root (.) — backend code will be publicly exposed!\n       → Change to: pages deploy pages_dist --project-name=pharmadist-app --branch=main');
  } else {
    warn('Could not detect Cloudflare Pages deploy command in workflow file.');
  }
} else {
  warn('GitHub Actions workflow not found at .github/workflows/deploy-cloudflare.yml');
}

// ── 3. Summary ────────────────────────────────────────────────
console.log('\n' + '─'.repeat(56));
if (errors === 0 && warnings === 0) {
  console.log('🚀  All checks passed! Safe to deploy.\n');
  process.exit(0);
} else {
  if (errors > 0)   console.error(`❌  ${errors} error(s) found — fix before deploying!`);
  if (warnings > 0) console.warn( `⚠️   ${warnings} warning(s) — review before going live.`);
  console.log('');
  process.exit(errors > 0 ? 1 : 0);
}
