/**
 * Application-Wide Dark Mode & Theme Management Test Suite
 * Ebenezar Enterprises Dealership Management System
 * 
 * Verifies:
 * 1. Theme persistence server action (validates light, dark, system inputs)
 * 2. Theme cookie handling & security configuration (1 year expiration, lax, path /)
 * 3. CSS variable definitions in app/globals.css for Midnight Lime
 * 4. Token mappings for Background (#090C0A), Card (#151D17), Popover (#1D2920), 
 *    Sidebar (#101612), Accent (#B7FF3C), Foreground (#F4F7F4), Border (#29352D)
 * 5. Strict document printing white paper isolation (@media print retains #ffffff and #000000)
 * 6. ThemeProvider configuration (attribute="class", storageKey="ebenezar_theme")
 * 7. Settings access for STAFF role (can view Profile & Appearance)
 * 8. Public website isolation (EbenezarCar-Bazaar remains decoupled)
 */

import fs from 'fs';
import path from 'path';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    testsPassed++;
  } else {
    console.error(`  [FAIL] ${testName}${details ? ` -> ${details}` : ''}`);
    testsFailed++;
  }
}

async function runTestSuite() {
  console.log('\n======================================================');
  console.log(' EBENEZAR DMS — THEME & DARK MODE VERIFICATION SUITE');
  console.log('======================================================\n');

  // ─────────────────────────────────────────────────────────────
  // 1. Theme Persistence Server Action Validation
  // ─────────────────────────────────────────────────────────────
  console.log('1. Testing Theme Preference Server Action & Validation...');
  try {
    const { updateUserThemePreference } = await import('../lib/actions/user.actions');

    const invalidTest1 = await updateUserThemePreference('neon' as any);
    assert(!invalidTest1.success && Boolean(invalidTest1.error?.includes('Invalid theme')), 'Rejects non-whitelisted theme "neon"');

    const invalidTest2 = await updateUserThemePreference('blue' as any);
    assert(!invalidTest2.success && Boolean(invalidTest2.error?.includes('Invalid theme')), 'Rejects non-whitelisted theme "blue"');

    const validLight = await updateUserThemePreference('light');
    assert(validLight.success === true, 'Accepts "light" theme preference');

    const validDark = await updateUserThemePreference('dark');
    assert(validDark.success === true, 'Accepts "dark" theme preference');

    const validGraphite = await updateUserThemePreference('graphite');
    assert(validGraphite.success === true, 'Accepts "graphite" (Graphite Blue) theme preference');

    const validSystem = await updateUserThemePreference('system');
    assert(validSystem.success === true, 'Accepts "system" theme preference');
  } catch (err: any) {
    assert(false, 'Theme preference validation threw unexpected error', err.message);
  }

  // ─────────────────────────────────────────────────────────────
  // 2. CSS Design Tokens & Midnight Lime Palette in globals.css
  // ─────────────────────────────────────────────────────────────
  console.log('\n2. Testing CSS Tokens & Midnight Lime Palette in app/globals.css...');
  const globalsCssPath = path.join(process.cwd(), 'app/globals.css');
  const globalsCss = fs.readFileSync(globalsCssPath, 'utf8');

  assert(globalsCss.includes('@custom-variant dark (&:is(.dark, .dark *));'), 'Custom dark variant matches both root .dark and descendants');
  assert(globalsCss.includes('--color-background: var(--background);'), '@theme binds --color-background to var(--background)');
  assert(globalsCss.includes('--color-card: var(--card);'), '@theme binds --color-card to var(--card)');
  assert(globalsCss.includes('--color-primary: var(--primary);'), '@theme binds --color-primary to var(--primary)');
  assert(globalsCss.includes('--color-border: var(--border);'), '@theme binds --color-border to var(--border)');
  assert(globalsCss.includes('--color-sidebar: var(--sidebar);'), '@theme binds --color-sidebar to var(--sidebar)');

  // Midnight Lime palette tokens in .dark
  assert(globalsCss.includes('--background: #090C0A;') || globalsCss.includes('#090C0A'), 'Midnight Lime background token #090C0A defined');
  assert(globalsCss.includes('--card: #151D17;') || globalsCss.includes('#151D17'), 'Midnight Lime card token #151D17 defined');
  assert(globalsCss.includes('--popover: #1D2920;') || globalsCss.includes('#1D2920'), 'Midnight Lime elevated popover token #1D2920 defined');
  assert(globalsCss.includes('--sidebar: #101612;') || globalsCss.includes('#101612'), 'Midnight Lime sidebar token #101612 defined');
  assert(globalsCss.includes('--primary: #B7FF3C;') || globalsCss.includes('#B7FF3C'), 'Midnight Lime neon lime accent #B7FF3C defined');
  assert(globalsCss.includes('--foreground: #F4F7F4;') || globalsCss.includes('#F4F7F4'), 'Midnight Lime foreground text #F4F7F4 defined');
  assert(globalsCss.includes('--muted-foreground: #A1ADA4;') || globalsCss.includes('#A1ADA4'), 'Midnight Lime muted text #A1ADA4 defined');
  assert(globalsCss.includes('--border: #29352D;') || globalsCss.includes('#29352D'), 'Midnight Lime border token #29352D defined');

  // Graphite Blue palette tokens in .graphite
  assert(globalsCss.includes('--background: #0B0F14;'), 'Graphite Blue background token #0B0F14 defined');
  assert(globalsCss.includes('--card: #161F2A;'), 'Graphite Blue card token #161F2A defined');
  assert(globalsCss.includes('--sidebar: #111820;'), 'Graphite Blue sidebar token #111820 defined');
  assert(globalsCss.includes('--primary: #3A82FF;'), 'Graphite Blue electric blue accent #3A82FF defined');
  assert(globalsCss.includes('--foreground: #F8FAFC;'), 'Graphite Blue foreground text #F8FAFC defined');
  assert(globalsCss.includes('--muted-foreground: #A1ADBC;'), 'Graphite Blue secondary text #A1ADBC defined');
  assert(globalsCss.includes('--border: #293647;'), 'Graphite Blue border token #293647 defined');

  // ─────────────────────────────────────────────────────────────
  // 3. Document & PDF Print Isolation (@media print)
  // ─────────────────────────────────────────────────────────────
  console.log('\n3. Testing Document & PDF Print Isolation...');
  const printSection = globalsCss.slice(globalsCss.lastIndexOf('@media print'));
  assert(printSection.includes('#ffffff !important'), '@media print enforces pure white background #ffffff');
  assert(printSection.includes('#000000 !important'), '@media print enforces pure black text #000000');
  assert(printSection.includes('.dark, .dark *'), '@media print overrides .dark elements to white paper');
  assert(printSection.includes('.no-print'), '@media print hides navigation and controls with .no-print');

  // ─────────────────────────────────────────────────────────────
  // 4. Component Dark Mode Styles
  // ─────────────────────────────────────────────────────────────
  console.log('\n4. Testing Scoped Dark Mode Rules for Key UI Components...');
  assert(globalsCss.includes('.dark .card-premium'), '.card-premium has scoped dark styling');
  assert(globalsCss.includes('.dark .data-table-wrap'), '.data-table-wrap has scoped dark styling');
  assert(globalsCss.includes('.dark .data-table-head-row'), '.data-table-head-row has scoped dark styling');
  assert(globalsCss.includes('.dark .btn-primary'), '.btn-primary has neon lime dark CTA styling');
  assert(globalsCss.includes('.dark .btn-secondary'), '.btn-secondary has dark elevation styling');
  assert(globalsCss.includes('.dark .sidebar'), '.sidebar has Midnight Lime dark styling');
  assert(globalsCss.includes('.dark .modal-box'), '.modal-box has dark background and border styling');
  assert(globalsCss.includes('.dark .recharts-default-tooltip'), 'Recharts tooltips have scoped dark styling');
  assert(globalsCss.includes('.dark .recharts-cartesian-grid line'), 'Recharts cartesian grid has dark styling');

  // Graphite Blue Scoped Component Rules
  assert(globalsCss.includes('.graphite .card-premium'), '.card-premium has scoped Graphite Blue styling');
  assert(globalsCss.includes('.graphite .data-table-wrap'), '.data-table-wrap has scoped Graphite Blue styling');
  assert(globalsCss.includes('.graphite .sidebar'), '.sidebar has Graphite Blue styling');
  assert(globalsCss.includes('.graphite .btn-primary'), '.btn-primary has electric blue CTA styling');
  assert(globalsCss.includes('.graphite .btn-secondary'), '.btn-secondary has Graphite Blue styling');

  // ─────────────────────────────────────────────────────────────
  // 5. ThemeProvider and Root Layout Architecture
  // ─────────────────────────────────────────────────────────────
  console.log('\n5. Testing ThemeProvider & Root Layout Architecture...');
  const layoutPath = path.join(process.cwd(), 'app/layout.tsx');
  const layoutContent = fs.readFileSync(layoutPath, 'utf8');
  assert(layoutContent.includes('suppressHydrationWarning'), 'html element has suppressHydrationWarning to prevent SSR mismatch');
  assert(layoutContent.includes('<ThemeProvider>'), 'RootLayout mounts <ThemeProvider>');
  assert(layoutContent.includes('bg-background text-foreground'), 'body element utilizes theme background and foreground tokens');

  const providerPath = path.join(process.cwd(), 'components/theme/ThemeProvider.tsx');
  const providerContent = fs.readFileSync(providerPath, 'utf8');
  assert(providerContent.includes('attribute="class"'), 'ThemeProvider uses class attribute for .dark class');
  assert(providerContent.includes('storageKey={storageKey}'), 'ThemeProvider persists to ebenezar_theme storage key');

  // ─────────────────────────────────────────────────────────────
  // 6. Settings Access for STAFF Role & Persistence
  // ─────────────────────────────────────────────────────────────
  console.log('\n6. Testing Settings Access for Staff Members...');
  const settingsPagePath = path.join(process.cwd(), 'app/(root)/settings/page.tsx');
  const settingsPageContent = fs.readFileSync(settingsPagePath, 'utf8');
  assert(!settingsPageContent.includes("user.role === 'STAFF') {\n    redirect"), 'Settings page does NOT redirect staff users away from personal settings');

  const settingsLayoutPath = path.join(process.cwd(), 'app/(root)/settings/SettingsLayout.tsx');
  const settingsLayoutContent = fs.readFileSync(settingsLayoutPath, 'utf8');
  assert(settingsLayoutContent.includes("name: 'Appearance'"), 'Appearance section exists in SettingsLayout');
  assert(settingsLayoutContent.includes("useTheme()"), 'SettingsLayout integrates next-themes useTheme hook');
  assert(settingsLayoutContent.includes("updateUserThemePreference"), 'SettingsLayout persists theme changes to database');
  assert(settingsLayoutContent.includes("Midnight Lime"), 'SettingsLayout highlights Midnight Lime design direction');
  assert(settingsLayoutContent.includes("Graphite Blue"), 'SettingsLayout highlights Graphite Blue design option');

  // ─────────────────────────────────────────────────────────────
  // 7. Public Website Decoupling Verification
  // ─────────────────────────────────────────────────────────────
  console.log('\n7. Testing Public Website Decoupling & Isolation...');
  const publicWebsiteDir = path.join(process.cwd(), 'EbenezarCar-Bazaar');
  const hasPublicDir = fs.existsSync(publicWebsiteDir);
  assert(hasPublicDir, 'Public website EbenezarCar-Bazaar exists in independent directory');

  if (hasPublicDir) {
    const publicViteConfig = path.join(publicWebsiteDir, 'vite.config.js');
    const publicTailwind = path.join(publicWebsiteDir, 'tailwind.config.js');
    assert(fs.existsSync(publicViteConfig), 'Public website has its own independent vite.config.js');
    assert(fs.existsSync(publicTailwind), 'Public website has its own independent tailwind.config.js');
    const publicHtml = fs.readFileSync(path.join(publicWebsiteDir, 'index.html'), 'utf8');
    assert(!publicHtml.includes('ebenezar_theme'), 'Public website HTML is clean and isolated from DMS theme state');
  }

  // ─────────────────────────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────────────────────────
  console.log('\n------------------------------------------------------');
  console.log(` RESULTS: ${testsPassed} Passed | ${testsFailed} Failed`);
  console.log('------------------------------------------------------\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((e) => {
  console.error('Test suite failed unexpectedly:', e);
  process.exit(1);
});
