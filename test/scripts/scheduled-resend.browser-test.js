// Production Console fixture with local transport only; no live group posts.
async (page) => {
    if (!page.url().startsWith('http://127.0.0.1:5195/')) throw new Error('Use the isolated fixture on port 5195');
    const base = { workspace_id: 'fixture', schedule_id: '40000000-0000-4000-8000-000000000001', occurrence_on: '2026-10-04', send_on: '2026-10-04', expires_at: '2099-10-07T07:00:00Z', body: '{{title}}', message_type: 'pre_attendance', require_arrival: true, revision: 7, synced_revision: 6, last_sync_error: null };
    const sentId = '30000000-0000-4000-8000-000000000001';
    let occurrences = [
        { ...base, id: sentId, fields: { title: 'Updated service' }, state: 'sent', telegram_message_id: 77441 },
        { ...base, id: '30000000-0000-4000-8000-000000000002', fields: { title: 'Upcoming service' }, state: 'scheduled', telegram_message_id: null },
        { ...base, id: '30000000-0000-4000-8000-000000000003', fields: { title: 'Uncertain delivery' }, state: 'unknown', telegram_message_id: null },
    ];
    const requests = [];
    await page.route('**/fixture-api', async route => {
        const body = route.request().postDataJSON();
        if (body?.op) {
            requests.push(body);
            occurrences = occurrences.map(row => row.id === body.data.id ? { ...row, revision: 8, synced_revision: 8, telegram_message_id: 88552 } : row);
        }
        await route.fulfill({ json: { templates: [], schedules: [{ id: base.schedule_id, frequency: 'once' }], occurrences, members: [], memberTypes: [], groups: [] } });
    });
    await page.goto('http://127.0.0.1:5195/scheduled-messages');
    const resend = page.getByRole('button', { name: 'Resend', exact: true });
    await resend.waitFor();
    if (await resend.count() !== 1 || await page.getByRole('button', { name: 'Send now', exact: true }).count() !== 1) throw new Error('Send and resend do not follow occurrence state');
    await resend.click();
    const confirmation = page.getByRole('alertdialog');
    await confirmation.getByRole('button', { name: 'Cancel', exact: true }).click();
    if (requests.length) throw new Error('Cancel submitted a resend');
    await page.setViewportSize({ width: 375, height: 812 });
    if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) throw new Error('Resend actions overflow the mobile viewport');
    await resend.click();
    await confirmation.getByRole('button', { name: 'Resend', exact: true }).evaluate(button => { button.click(); button.click(); });
    await confirmation.waitFor({ state: 'hidden' });
    if (requests.length !== 1 || requests[0].op !== 'occurrence.resend' || requests[0].data.id !== sentId || requests[0].data.revision !== 7) throw new Error('Resend did not submit one revision-checked operation');
    await resend.waitFor();
    await page.screenshot({ path: 'output/playwright/scheduled-resend-mobile.png', fullPage: true });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.screenshot({ path: 'output/playwright/scheduled-resend-desktop.png', fullPage: true });
    return { result: 'Sent/unsent controls, cancellation, single confirmed resend, current revision and mobile layout passed' };
}
