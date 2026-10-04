// Isolated production UI fixture: no hosted database or Telegram calls.
async (page) => {
    if (!page.url().startsWith('http://127.0.0.1:5195/')) throw new Error('Use the isolated template fixture on port 5195');
    const members = [
        { id: 'craig', name: 'Craig Hero', memberTypeId: 'members' },
        { id: 'sarah', name: 'Sarah <Volunteer>', memberTypeId: 'volunteers' },
        { id: 'john', name: 'John Worker', memberTypeId: 'workers' },
    ];
    const attendance = { id: '10000000-0000-4000-8000-000000000002', name: 'Service attendance', message_type: 'pre_attendance', body: '<b>{{title}}</b>\n{{instructions}}', fields: { title: 'Sunday service', instructions: 'Please arrive by 07:30.' }, audience: ['members'], require_arrival: true };
    let templates = [attendance];
    await page.route('**/fixture-api', async route => {
        const body = route.request().postDataJSON();
        if (body?.op === 'template.save') {
            const data = body.data;
            templates = [{ ...attendance, name: data.name, audience: data.audience, fields: data.fields, body: data.body, require_arrival: data.requireArrival }];
        }
        await route.fulfill({ json: {
            templates, schedules: [], occurrences: [], members,
            memberTypes: [
                { id: 'members', name: 'Members', is_default: true },
                { id: 'volunteers', name: 'Volunteers', is_default: false },
                { id: 'workers', name: 'Workers', is_default: false },
                { id: 'empty', name: 'New team', is_default: false },
            ], groups: [],
        } });
    });
    await page.goto(`http://127.0.0.1:5195/scheduled-messages/templates/${attendance.id}`);
    await page.getByRole('button', { name: 'Preview', exact: true }).waitFor({ timeout: 3000 });
    await page.getByRole('button', { name: 'Preview', exact: true }).click();
    const preview = page.getByRole('region', { name: 'Message preview', exact: true });
    await preview.waitFor({ timeout: 3000 });
    async function assertRoster(names) {
        const text = await preview.textContent();
        for (const member of members) {
            if (text.includes(member.name) !== names.includes(member.name)) throw new Error(`Incorrect audience preview: ${text}`);
        }
    }
    await assertRoster(['Craig Hero']);
    const initialText = await preview.textContent();
    if (!initialText.includes('🔁 Craig Hero') || initialText.includes('Awaiting response')) throw new Error('Initial attendance row did not use the compact format');
    if (await page.getByText('Response examples', { exact: true }).count()) throw new Error('Response examples must be removed');
    await page.getByRole('button', { name: 'Source', exact: true }).click();
    if (await preview.count()) throw new Error('Source view retained the separate preview');
    if (await page.getByRole('button', { name: 'Bold', exact: true }).count()) throw new Error('Source view retained formatting controls');
    await page.getByRole('textbox', { name: 'Message template source', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Editor', exact: true }).click();
    const toolbar = page.getByRole('group', { name: 'Text formatting', exact: true });
    if (!await toolbar.getByRole('button', { name: 'Preview', exact: true }).count()) throw new Error('View controls are outside the editor toolbar');
    await toolbar.getByRole('button', { name: 'Bold', exact: true }).waitFor();
    await toolbar.getByRole('button', { name: 'Preview', exact: true }).click();
    if (await preview.locator('.ProseMirror[contenteditable="true"]').count()) throw new Error('Generated roster must remain read-only');
    await page.getByRole('checkbox', { name: 'Volunteers', exact: true }).check();
    await assertRoster(['Craig Hero', 'Sarah <Volunteer>']);
    await page.getByRole('checkbox', { name: 'Members' }).uncheck();
    await assertRoster(['Sarah <Volunteer>']);
    await page.getByRole('textbox', { name: 'Default Instructions', exact: true }).fill('Bring your equipment.');
    if (!(await preview.textContent()).includes('Bring your equipment.')) throw new Error('Preview ignored updated message fields');
    await assertRoster(['Sarah <Volunteer>']);
    await page.getByRole('checkbox', { name: 'Volunteers', exact: true }).uncheck();
    await page.getByRole('checkbox', { name: 'New team', exact: true }).check();
    await preview.getByText('No attendees match the selected member types.', { exact: true }).waitFor();
    await page.getByRole('checkbox', { name: 'Volunteers', exact: true }).check();
    await page.setViewportSize({ width: 375, height: 812 });
    if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) throw new Error('Attendee preview overflows mobile viewport');
    await page.screenshot({ path: 'output/playwright/scheduled-attendees-mobile.png', fullPage: true });
    await page.getByRole('button', { name: 'Save template', exact: true }).click();
    await page.waitForURL('**/scheduled-messages');
    if (templates[0].body.includes('Sarah') || templates[0].fields.instructions !== 'Bring your equipment.') throw new Error('Generated attendees contaminated reusable template');
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await page.getByRole('button', { name: 'Preview', exact: true }).click();
    await assertRoster(['Sarah <Volunteer>']);
    await page.getByRole('combobox', { name: 'Message type', exact: true }).click();
    await page.getByRole('option', { name: 'Announcement', exact: true }).click();
    if ((await preview.textContent()).includes('Sarah') || await page.getByText('Response examples', { exact: true }).count()) throw new Error('Announcement retained attendance content');
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.getByRole('button', { name: 'Discard', exact: true }).click();
    await page.waitForURL('**/scheduled-messages');
    await page.goto(`http://127.0.0.1:5195/scheduled-messages/new?template=${attendance.id}`);
    await page.getByRole('button', { name: 'Preview message', exact: true }).click();
    const scheduledPreview = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
    const scheduledText = await scheduledPreview.textContent();
    if (!scheduledText.includes('🔁 Sarah <Volunteer>') || scheduledText.includes('Craig Hero') || scheduledText.includes('John Worker')) throw new Error('Scheduling preview differs from the selected audience');
    await page.goto('http://127.0.0.1:5195/scheduled-messages/templates/new');
    await page.getByRole('combobox', { name: 'Message type', exact: true }).click();
    await page.getByRole('option', { name: 'Pre-attendance', exact: true }).click();
    await page.getByRole('button', { name: 'Preview', exact: true }).click();
    await assertRoster(['Craig Hero']);
    await page.getByRole('button', { name: 'Source', exact: true }).click();
    if (await preview.count()) throw new Error('Preview remained outside the tabbed editor');
    const source = page.getByRole('textbox', { name: 'Message template source', exact: true });
    await source.fill('<table><tr><td>{{title}}</td><td>{{instructions}}</td></tr></table>');
    await page.getByRole('textbox', { name: 'Default Title', exact: true }).fill('Table preview');
    await page.getByRole('textbox', { name: 'Default Instructions', exact: true }).fill('Actual instructions');
    await page.getByRole('button', { name: 'Editor', exact: true }).click();
    const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
    await editor.locator('table').waitFor();
    await editor.locator('code[data-variable]').first().evaluate(element => {
        const range = document.createRange();
        range.selectNodeContents(element);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        element.closest('[contenteditable]').focus();
        document.dispatchEvent(new Event('selectionchange'));
    });
    await page.getByRole('button', { name: 'Bold', exact: true }).click();
    await page.getByRole('button', { name: 'Preview', exact: true }).click();
    await assertRoster(['Craig Hero']);
    await preview.locator('table').waitFor();
    if (!(await preview.textContent()).includes('Table preview') || !(await preview.textContent()).includes('Actual instructions')) throw new Error('Preview did not resolve table variables from form fields');
    await page.getByRole('button', { name: 'Source', exact: true }).click();
    if (!(await source.inputValue()).includes('<table>') || !(await source.inputValue()).includes('{{instructions}}')) throw new Error('Switching preview lost table source or variable identity');
    if (!/<(?:b|strong)>\s*{{title}}\s*<\/(?:b|strong)>/.test(await source.inputValue())) throw new Error('Persistent toolbar formatting stopped applying to the active editor');
    await page.getByRole('button', { name: 'Preview', exact: true }).focus();
    await page.keyboard.press('Space');
    await preview.waitFor();
    await page.setViewportSize({ width: 1415, height: 954 });
    await page.screenshot({ path: 'output/playwright/scheduled-template-preview-desktop.png', fullPage: true });
    await page.getByRole('button', { name: 'Editor', exact: true }).click();
    await page.screenshot({ path: 'output/playwright/scheduled-template-editor-desktop.png', fullPage: true });
    await page.setViewportSize({ width: 375, height: 812 });
    if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) throw new Error('Combined toolbar overflows mobile viewport');
    await page.screenshot({ path: 'output/playwright/scheduled-template-editor-mobile.png', fullPage: true });
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.getByRole('button', { name: 'Discard', exact: true }).click();
    await page.waitForURL('**/scheduled-messages');
    return { result: 'Compact attendee rows, removed response examples, persistent Editor/Source/Preview toolbar, live fields, roster filtering, table/formatting preservation, keyboard switching, and mobile layout passed' };
}
