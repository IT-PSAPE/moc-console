// Build console and start node test/scripts/serve-console-preview.mjs, then:
// playwright-cli -s=console-quality open http://127.0.0.1:5188
// playwright-cli -s=console-quality run-code --filename test/scripts/console-quality.browser-test.js
// All API traffic is intercepted. Unexpected operations fail; no live writes occur.
async (page) => {
  const origin = new URL(page.url()).origin;
  if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) throw new Error('Use an isolated loopback preview.');
  page.removeAllListeners('dialog');
  page.on('dialog', dialog => dialog.accept());
  const user = { id: 'audit-user', email: 'audit@example.test', name: 'Craig', surname: 'Reviewer', emailVerified: true, image: null };
  const role = { id: 'audit-admin', name: 'Admin', can_create: true, can_read: true, can_update: true, can_delete: true, can_manage_roles: true };
  const equipment = [{ id: 'audit-camera', name: 'Sony FX3 cinema camera', serialNumber: 'FX3-001', category: 'camera', status: 'available', location: 'Media cupboard', lastActiveDate: new Date().toISOString(), bookedBy: null, thumbnail: null }];
  const requests = [{ id: 'audit-request', title: 'Sunday service livestream', status: 'not_started', category: 'video', categoryName: 'Video', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), dueDate: new Date(Date.now() + 3600000).toISOString(), requestedBy: 'Worship team', who: 'Media volunteers', what: 'Stream the morning service', when: 'Sunday morning', where: 'Main auditorium', why: 'Remote congregation', how: 'Use production cameras', flow: '' }];
  const checklists = [{ id: 'audit-checklist', kind: 'instance', name: 'Sunday production checks', description: 'Prepare the room and production desk.', items: [], sections: [{ id: 'audit-section', name: 'Before service', items: [{ id: 'audit-check', label: 'Check camera batteries', checked: false }] }], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];
  const bookings = [{ id: 'audit-booking', trackingCode: 'AUDIT123', title: 'Sunday camera kit', bookedBy: 'Media team', checkedOutDate: new Date().toISOString(), expectedReturnAt: new Date(Date.now() + 86400000).toISOString(), returnedDate: null, duration: '1 day', status: 'booked', items: [{ id: 'audit-booking-item', equipmentId: equipment[0].id, equipmentName: equipment[0].name, serialNumber: equipment[0].serialNumber, equipmentCategory: 'camera', equipmentThumbnail: null }], createdAt: new Date().toISOString() }];
  const missing = new Set();
  const pageErrors = [];
  page.removeAllListeners('pageerror');
  page.on('pageerror', error => pageErrors.push(error.message));
  let failEquipmentSave = false;
  let failSession = false;
  let failRefresh = false;
  const empty = new Set(['requests.listArchived','requests.listAssignedIds','venues.list','venues.listEvents','venueBookings.list','streams.list','streams.listZoomMeetings','overview.scheduledMessages','users.all','users.requestAssignees','users.withRoles','users.invitations','users.memberTypes','broadcasts.list','telegram.listGroups','notification-settings.templates','notification-settings.telegramGroups']);
  await page.unroute('**/api/**');
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/auth/get-session' && failSession) return route.fulfill({ status: 502, json: { error: { code: 'unavailable', message: 'Temporarily unavailable' } } });
    if (path === '/api/auth/get-session') return route.fulfill({ json: { session: { id: 'audit-session', userId: user.id, expiresAt: '2099-01-01T00:00:00Z' }, user } });
    if (!path.startsWith('/api/platform/')) { missing.add(path); return route.fulfill({ status: 404, json: { error: { code: 'fixture_missing', message: path } } }); }
    const { operation, input } = route.request().postDataJSON();
    const key = `${path.split('/').pop()}.${operation}`;
    let json;
    if (key === 'users.getProfile') json = { ...user, avatarUrl: null, telegramChatId: null, currentDuty: null, statusMessage: null };
    else if (key === 'users.getPreferences') json = { defaultCalendarView: 'week', overviewItemKinds: ['request','equipment','venue','stream','message'] };
    else if (key === 'workspaces.directory') json = { workspaces: [{ id: 'audit-workspace', name: 'Media team', slug: 'media-team', description: null }], memberships: [{ workspaceId: 'audit-workspace', userId: user.id, role }] };
    else if (key === 'dailyQuotes.getDaily') json = { quote: null, date: '2026-11-09', timezone: 'Africa/Johannesburg', overridden: false };
    else if (key === 'equipment.list') {
      if (failRefresh) return route.fulfill({ status: 503, json: { error: { code: 'unavailable', message: 'Try again' } } });
      json = equipment;
    }
    else if (key === 'equipment.getById') json = equipment.find(item => item.id === input.id) ?? null;
    else if (key === 'equipment.update') {
      if (failEquipmentSave) return route.fulfill({ status: 503, json: { error: { code: 'unavailable', message: 'Please retry your change.' } } });
      equipment[0] = input.equipment;
      json = equipment[0];
    }
    else if (key === 'requests.list') json = requests;
    else if (key === 'requests.getById') json = requests.find(item => item.id === input.id) ?? null;
    else if (key === 'requests.listCategories') json = [{ id: 'video', key: 'video', name: 'Video', description: null, active: true }];
    else if (key === 'checklists.list') json = checklists;
    else if (key === 'checklists.getById') json = checklists.find(item => item.id === input.id) ?? null;
    else if (key === 'checklists.save') { checklists[0] = input.checklist; json = input.checklist; }
    else if (key === 'bookings.list') json = bookings;
    else if (key === 'bookings.getById') json = bookings.find(item => item.id === input.id) ?? null;
    else if (key === 'bookings.update') { bookings[0] = input.booking; json = input.booking; }
    else if (key === 'users.availableRoles') json = [role];
    else if (key === 'users.checklistAssignees') json = {};
    else if (key === 'discussion.listComments' || key === 'discussion.listActivity') json = { items: [], nextCursor: null };
    else if (key === 'notification-settings.get') json = { workspaceId: 'audit-workspace', timezone: 'Africa/Johannesburg', dateFormat: 'day-month-year-time', autoArchiveCompletedRequestsDays: 7, autoArchiveReturnedBookingsDays: 7 };
    else if (key === 'streams.getYouTubeConnection' || key === 'streams.getZoomConnection') json = null;
    else if (empty.has(key)) json = [];
    else { missing.add(key); return route.fulfill({ status: 500, json: { error: { code: 'fixture_missing', message: key } } }); }
    return route.fulfill({ json });
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  failSession = true;
  await page.goto(`${origin}/equipment`);
  await page.getByRole('heading', { name: "Couldn't check your sign-in status", exact: true }).waitFor();
  if (await page.getByRole('button', { name: 'Retry', exact: true }).count() !== 1) throw new Error('Initial load failure duplicates retry actions');
  await page.screenshot({ path: 'output/playwright/sign-in-recovery.png' });
  failSession = false;
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await page.getByRole('heading', { name: 'Equipment', exact: true }).waitFor();
  await page.getByText(equipment[0].name, { exact: true }).first().waitFor();
  await page.screenshot({ path: 'output/playwright/equipment-desktop.png' });
  await page.getByRole('button', { name: /^Sony FX3 cinema camera/ }).click();
  const location = page.getByRole('textbox', { name: 'Equipment location', exact: true });
  await location.fill('Annex studio');
  failEquipmentSave = true;
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByText('Failed to save equipment', { exact: true }).first().waitFor();
  if (await location.inputValue() !== 'Annex studio') throw new Error('Failed save discarded draft');
  failSession = true;
  const focusRequest = page.waitForResponse(response => response.url().endsWith('/api/auth/get-session'));
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await focusRequest;
  if (await location.inputValue() !== 'Annex studio') throw new Error('Transient session failure discarded draft');
  await page.getByText("Couldn't check your sign-in status", { exact: true }).first().waitFor();
  failSession = false;
  await page.getByText('Retry', { exact: true }).first().click();
  await page.getByText("Couldn't check your sign-in status", { exact: true }).first().waitFor({ state: 'hidden' });
  const dismiss = page.locator('button[aria-label="Dismiss"]');
  for (const button of await dismiss.all()) { await button.click(); await button.waitFor({ state: 'hidden' }); }
  failEquipmentSave = false;
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByText('Equipment saved', { exact: true }).first().waitFor();
  for (const button of await dismiss.all()) { await button.click(); await button.waitFor({ state: 'hidden' }); }
  await page.getByRole('button', { name: 'Close equipment', exact: true }).click();
  failRefresh = true;
  await page.evaluate(() => { const now = Date.now(); Date.now = () => now + 3_600_000; });
  await page.getByRole('link', { name: 'Work', exact: true }).click();
  await page.getByRole('button', { name: 'People & resources', exact: true }).click();
  await page.getByRole('link', { name: 'Equipment', exact: true }).click();
  await page.getByText('Some information may be out of date', { exact: true }).first().waitFor();
  await page.getByText(equipment[0].name, { exact: true }).first().waitFor();
  await page.screenshot({ path: 'output/playwright/refresh-recovery.png' });
  failRefresh = false;
  await page.getByText('Retry', { exact: true }).first().click();
  await page.getByText('Some information may be out of date', { exact: true }).first().waitFor({ state: 'hidden' });
  await page.goto(`${origin}/checklists/audit-checklist`);
  await page.getByRole('button', { name: 'Toggle section Before service', exact: true }).waitFor();
  const toggle = page.getByRole('button', { name: 'Toggle section Before service', exact: true });
  await toggle.click();
  if (await toggle.getAttribute('aria-expanded') !== 'false') throw new Error('Section did not collapse');
  await page.getByRole('button', { name: 'Edit Section name: Before service', exact: true }).click();
  const sectionName = page.getByRole('textbox', { name: 'Section name: Before service', exact: true });
  await sectionName.fill('Camera preparation');
  await sectionName.press('Enter');
  const renamedToggle = page.getByRole('button', { name: 'Toggle section Camera preparation', exact: true });
  await renamedToggle.waitFor();
  if (await renamedToggle.getAttribute('aria-expanded') !== 'false') throw new Error('Rename toggled section');
  await renamedToggle.click();
  await page.screenshot({ path: 'output/playwright/checklist-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${origin}/equipment`);
  await page.getByRole('heading', { name: 'Equipment', exact: true }).waitFor();
  await page.getByText(equipment[0].name, { exact: true }).first().waitFor();
  await page.screenshot({ path: 'output/playwright/equipment-phone.png' });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  if (overflow) throw new Error('Phone layout overflows horizontally');
  await page.getByRole('link', { name: /^Sony FX3 cinema camera/ }).click();
  await page.getByRole('heading', { name: equipment[0].name, exact: true }).waitFor();
  await page.screenshot({ path: 'output/playwright/equipment-detail-phone.png' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${origin}/equipment`);
  await page.getByRole('button', { name: /^Sony FX3 cinema camera/ }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('dialog', { name: 'Equipment details', exact: true }).waitFor();
  await page.keyboard.press('Escape');
  await page.getByRole('dialog', { name: 'Equipment details', exact: true }).waitFor({ state: 'hidden' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${origin}/account/settings`);
  await page.getByRole('combobox', { name: 'Default work view', exact: true }).waitFor();
  await page.screenshot({ path: 'output/playwright/settings-desktop.png' });
  await page.goto(`${origin}/requests`);
  await page.getByText('Sunday service livestream', { exact: true }).waitFor();
  await page.screenshot({ path: 'output/playwright/requests-desktop.png' });
  await page.goto(`${origin}/bookings/audit-booking`);
  await page.getByRole('heading', { name: 'Sunday camera kit', exact: true }).waitFor();
  await page.screenshot({ path: 'output/playwright/booking-desktop.png' });
  await page.evaluate(() => {
    if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('No camera attached', 'NotFoundError'); };
  });
  await page.getByRole('button', { name: 'Scan', exact: true }).click();
  const scanner = page.getByRole('dialog', { name: 'Scan booking items', exact: true });
  await scanner.getByRole('textbox', { name: 'Equipment code', exact: true }).fill('FX3-001');
  await scanner.getByRole('textbox', { name: 'Equipment code', exact: true }).press('Enter');
  await scanner.waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: 'All scanned', exact: true }).waitFor();
  await page.goto(`${origin}/equipment/audit-camera`);
  await page.getByRole('button', { name: 'Print', exact: true }).waitFor();
  await page.route('https://images.example.test/thumbnail.png', route => route.fulfill({ contentType: 'image/png', headers: { 'Access-Control-Allow-Origin': '*' }, body: 'image fixture' }));
  const imageStatus = await page.evaluate(() => fetch('https://images.example.test/thumbnail.png', { credentials: 'omit', referrerPolicy: 'no-referrer' }).then(response => response.status));
  if (imageStatus !== 200) throw new Error('HTTPS thumbnail request blocked by deployment CSP');
  // Replace only the native print dialog; the app's load/print listeners still run under CSP.
  await page.evaluate(() => {
    const open = window.open;
    window.open = function (...args) {
      const popup = open.apply(window, args);
      if (popup) popup.print = () => { popup.document.body.dataset.printInvoked = 'true'; };
      return popup;
    };
  });
  const popupEvent = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Print', exact: true }).click();
  const popup = await popupEvent;
  await popup.locator('body[data-print-invoked="true"]').waitFor();
  if (await popup.locator('script').count()) throw new Error('QR label includes an inline script');
  await popup.getByRole('heading', { name: equipment[0].name, exact: true }).waitFor();
  await popup.screenshot({ path: 'output/playwright/qr-print.png' });
  const closed = popup.waitForEvent('close');
  await popup.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  await closed;
  if (pageErrors.length) throw new Error(`Browser exceptions: ${pageErrors.join('; ')}`);
  if (missing.size) throw new Error(`Missing fixtures: ${[...missing].join(', ')}`);
  return { passed: ['initial session failure/retry', 'equipment save failure/retry', 'session failure preserves draft', 'background refresh retry retains data', 'checklist rename/collapse', '390px reflow and named detail Escape', 'settings and populated requests/booking', 'camera-unavailable manual printed serial', 'QR print under production CSP'], missing: [...missing] };
}
