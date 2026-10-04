// Production screens and hooks with isolated transport; no real deletions.
async (page) => {
    if (!page.url().startsWith('http://127.0.0.1:5195/')) throw new Error('Use the isolated fixture on port 5195');
    const onceSchedule = '40000000-0000-4000-8000-000000000001';
    const recurringSchedule = '40000000-0000-4000-8000-000000000002';
    const onceId = '30000000-0000-4000-8000-000000000001';
    const recurringId = '30000000-0000-4000-8000-000000000002';
    const nextId = '30000000-0000-4000-8000-000000000003';
    const sendingId = '30000000-0000-4000-8000-000000000004';
    const base = { workspace_id: 'fixture', occurrence_on: '2026-10-04', send_on: '2026-10-04T08:00:00Z', expires_at: '2099-10-07T07:00:00Z', body: '{{title}}', message_type: 'pre_attendance', require_arrival: true, revision: 7, synced_revision: 7, last_sync_error: null };
    let occurrences = [
        { ...base, id: onceId, schedule_id: onceSchedule, fields: { title: 'One-off reminder' }, state: 'scheduled', telegram_message_id: null },
        { ...base, id: recurringId, schedule_id: recurringSchedule, fields: { title: 'Recurring service' }, state: 'sent', telegram_message_id: 77441 },
        { ...base, id: nextId, schedule_id: recurringSchedule, fields: { title: 'Next service' }, state: 'scheduled', telegram_message_id: null },
        { ...base, id: sendingId, schedule_id: onceSchedule, fields: { title: 'Sending reminder' }, state: 'sending', telegram_message_id: null },
    ];
    let rejectNext = false;
    const requests = [];
    await page.route('**/fixture-api', async route => {
        const body = route.request().postDataJSON();
        if (body?.op) {
            requests.push(body);
            if (rejectNext) {
                rejectNext = false;
                return route.fulfill({ status: 400, json: { error: 'Deletion failed; retry' } });
            }
            occurrences = occurrences.filter(row => body.data.scope === 'series' ? row.schedule_id !== recurringSchedule : row.id !== body.data.id);
        }
        await route.fulfill({ json: { templates: [], schedules: [{ id: onceSchedule, frequency: 'once' }, { id: recurringSchedule, frequency: 'daily' }], occurrences, members: [], memberTypes: [], groups: [] } });
    });
    await page.goto('http://127.0.0.1:5195/scheduled-messages');
    const deleteButton = id => page.locator(`button[value="${id}"]`).filter({ hasText: /^Delete$/ });
    await deleteButton(onceId).waitFor();
    if (!await deleteButton(sendingId).isDisabled()) throw new Error('In-flight delete is enabled');
    await deleteButton(onceId).click();
    const confirmation = page.getByRole('alertdialog');
    await confirmation.waitFor();
    if (!(await confirmation.textContent()).includes('One-off reminder')) throw new Error('Confirmation does not name the occurrence');
    await confirmation.getByRole('button', { name: 'Cancel', exact: true }).click();
    if (requests.length) throw new Error('Cancel submitted a mutation');
    await deleteButton(onceId).click();
    rejectNext = true;
    await confirmation.getByRole('button', { name: 'Delete message', exact: true }).click();
    await confirmation.getByRole('alert').waitFor();
    if (occurrences.length !== 4) throw new Error('Rejected deletion removed a message');
    await confirmation.getByRole('button', { name: 'Delete message', exact: true }).evaluate(button => { button.click(); button.click(); });
    await confirmation.waitFor({ state: 'hidden' });
    if (requests.length !== 2 || requests[1].op !== 'occurrence.delete' || requests[1].data.id !== onceId || requests[1].data.revision !== 7 || requests[1].data.scope !== 'occurrence') throw new Error('One-off deletion submitted an incorrect or duplicate operation');
    await deleteButton(onceId).waitFor({ state: 'hidden' });
    await page.setViewportSize({ width: 375, height: 812 });
    if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) throw new Error('Delete actions overflow mobile');
    await deleteButton(recurringId).click();
    const scope = page.getByRole('combobox', { name: 'Delete scope', exact: true });
    await scope.click();
    await page.getByRole('option', { name: 'Entire series', exact: true }).click();
    await page.getByRole('button', { name: 'Review deletion', exact: true }).click();
    await scope.waitFor({ state: 'hidden' });
    if (await page.getByRole('dialog').count()) throw new Error('Scope picker still covers the final confirmation');
    await page.waitForFunction(() => {
        const dialog = document.querySelector('[role="alertdialog"]');
        return dialog && getComputedStyle(dialog).opacity === '1';
    });
    if (!(await confirmation.textContent()).includes('entire recurring schedule')) throw new Error('Series confirmation lacks deletion scope');
    await page.screenshot({ path: 'output/playwright/scheduled-delete-confirm-mobile.png', fullPage: true });
    await confirmation.getByRole('button', { name: 'Delete message', exact: true }).click();
    await confirmation.waitFor({ state: 'hidden' });
    if (requests.length !== 3 || requests[2].data.scope !== 'series' || occurrences.length !== 1) throw new Error('Series deletion did not remove the scoped messages');
    await page.screenshot({ path: 'output/playwright/scheduled-delete-mobile.png', fullPage: true });
    return { result: 'One-off confirmation, cancellation, failure/retry, double activation guard, busy disabled action, recurring scope and mobile layout passed' };
}
