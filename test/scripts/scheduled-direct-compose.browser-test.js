// playwright-cli --session scheduled-direct-compose run-code --filename test/scripts/scheduled-direct-compose.browser-test.js
// Isolated fixture: the API and Telegram are never contacted.
async (page) => {
    if (!page.url().startsWith('http://127.0.0.1:5195/')) throw new Error('Use the isolated Console fixture on port 5195');
    // Under 768px the compose panel becomes a bottom sheet that opens peeked
    // at 55% height; its footer (Review schedule) starts below the fold, so
    // drag the sheet fully open before reaching it.
    async function expandMobileSheet() {
        const sheet = page.getByRole('dialog');
        const box = await sheet.boundingBox();
        if (!box) return;
        await page.mouse.move(box.x + box.width / 2, box.y + 10);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2, box.y - 400, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(200);
    }
    const members = [
        { id: 'craig', name: 'Craig Hero with a Long Member Name', memberTypeId: 'members' },
        { id: 'sarah', name: 'Sarah Volunteer with a Long Member Name', memberTypeId: 'volunteers' },
        { id: 'john', name: 'John Worker', memberTypeId: 'workers' },
    ];
    const template = { id: '10000000-0000-4000-8000-000000000002', name: 'Existing attendance', message_type: 'pre_attendance', body: '<b>{{title}}</b>\n{{instructions}}', fields: { title: 'Sunday service', instructions: 'Please arrive.' }, audience: ['members'], require_arrival: true, attendance_groups: [] };
    let templates = [];
    let scheduleCreate;
    await page.route('**/fixture-api', async route => {
        const body = route.request().postDataJSON();
        if (body?.op === 'schedule.create') scheduleCreate = body.data;
        await route.fulfill({ json: {
            templates, schedules: [], occurrences: [], members,
            memberTypes: [{ id: 'members', name: 'Members', is_default: true }, { id: 'volunteers', name: 'Volunteers', is_default: false }, { id: 'workers', name: 'Workers', is_default: false }],
            groups: [{ chat_id: '-100123', title: 'Service group', telegram_group_topics: [] }],
        } });
    });
    // With no templates, "New message" skips the picker and opens compose directly.
    await page.goto('http://127.0.0.1:5195/scheduled-messages');
    await page.getByRole('button', { name: 'New message', exact: true }).click();
    await page.waitForURL('**/scheduled-messages/new');
    if (await page.getByRole('dialog').count()) throw new Error('Template picker opened with no templates available');
    if (await page.getByText('Load a template', { exact: false }).count()) throw new Error('Compose still shows the inline template loader');
    await page.getByRole('combobox', { name: 'Message type', exact: true }).click();
    await page.getByRole('option', { name: 'Pre-attendance', exact: true }).click();
    await page.getByRole('textbox', { name: 'Message Title', exact: true }).fill('Sunday service');
    await page.getByRole('textbox', { name: 'Search attendees', exact: true }).fill('');
    // Attendee order is the selection order; there is no separate selected list.
    await page.getByRole('checkbox', { name: 'Sarah Volunteer with a Long Member Name', exact: true }).check();
    await page.getByRole('checkbox', { name: 'Craig Hero with a Long Member Name', exact: true }).check();
    if (await page.getByText('Selected attendees', { exact: false }).count()) throw new Error('Compose still renders the duplicate selected-attendees list');
    await page.getByText('Attendees · 2 selected', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Preview', exact: true }).click();
    const orderedPreview = page.getByRole('region', { name: 'Message preview', exact: true });
    const previewText = await orderedPreview.textContent();
    if (previewText.indexOf('Sarah Volunteer with a Long Member Name') > previewText.indexOf('Craig Hero with a Long Member Name')) throw new Error(`Preview does not follow selection order: ${previewText}`);
    await page.setViewportSize({ width: 1415, height: 954 });
    await page.screenshot({ path: 'output/playwright/scheduled-direct-compose-desktop.png', fullPage: true });
    await page.setViewportSize({ width: 375, height: 812 });
    if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) throw new Error('Attendee rows overflow mobile viewport');
    await page.screenshot({ path: 'output/playwright/scheduled-direct-compose-mobile.png', fullPage: true });
    // Unselecting drops the attendee; the remaining order is kept.
    await page.getByRole('checkbox', { name: 'Sarah Volunteer with a Long Member Name', exact: true }).uncheck();
    await page.getByText('Attendees · 1 selected', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Preview', exact: true }).click();
    await page.getByRole('textbox', { name: 'Message Title', exact: true }).fill('Sunday service');
    await page.getByRole('combobox', { name: 'Telegram group', exact: true }).click();
    await page.getByRole('option', { name: 'Service group', exact: true }).click();
    if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) throw new Error('Direct compose overflows mobile viewport');
    await expandMobileSheet();
    await page.getByRole('button', { name: 'Review schedule', exact: true }).click();
    await page.getByRole('button', { name: 'Schedule message', exact: true }).last().click();
    await page.waitForURL('**/scheduled-messages');
    if (!scheduleCreate) throw new Error('No direct schedule.create request was sent');
    if ('templateId' in scheduleCreate) throw new Error('Direct schedule payload included templateId');
    if (JSON.stringify(scheduleCreate.attendeeIds) !== JSON.stringify(['craig'])) throw new Error(`Unexpected explicit attendee order: ${JSON.stringify(scheduleCreate.attendeeIds)}`);
    if (scheduleCreate.messageType !== 'pre_attendance' || scheduleCreate.fields.title !== 'Sunday service') throw new Error('Direct message fields were not submitted');

    templates = [template];
    // With templates available, "New message" opens the picker; choosing one lands in compose with it loaded.
    await page.goto('http://127.0.0.1:5195/scheduled-messages');
    await page.getByRole('button', { name: 'New message', exact: true }).click();
    const picker = page.getByRole('dialog');
    await picker.waitFor();
    await picker.getByRole('link', { name: 'Start from scratch', exact: true }).waitFor();
    await picker.getByRole('link', { name: `Use template ${template.name}`, exact: true }).click();
    await page.waitForURL(`**/scheduled-messages/new?template=${template.id}`);
    await page.getByText(`Based on “${template.name}”`, { exact: false }).waitFor();
    await page.getByRole('textbox', { name: 'Message Title', exact: true }).fill('Edited preset');
    await page.getByRole('button', { name: 'Source', exact: true }).click();
    await page.getByRole('textbox', { name: 'Message template source', exact: true }).fill('<b>{{title}}</b>\n{{instructions}}\nCustom text');
    await page.getByRole('textbox', { name: 'Search attendees', exact: true }).fill('Sarah');
    await page.getByRole('checkbox', { name: 'Sarah Volunteer with a Long Member Name', exact: true }).check();
    await page.getByRole('combobox', { name: 'Telegram group', exact: true }).click();
    await page.getByRole('option', { name: 'Service group', exact: true }).click();
    await expandMobileSheet();
    await page.getByRole('button', { name: 'Review schedule', exact: true }).click();
    await page.getByRole('button', { name: 'Schedule message', exact: true }).last().click();
    await page.waitForURL('**/scheduled-messages');
    if (!scheduleCreate?.body.includes('Custom text') || scheduleCreate.fields.title !== 'Edited preset') throw new Error('Edited preset content was not sent directly');
    if ('templateId' in scheduleCreate) throw new Error('Edited preset payload included templateId');
    return { result: 'Picker-less direct compose, selection-order attendees without a duplicate list, exact payload, template picker modal, edited preset content, and mobile overflow check passed' };
}
