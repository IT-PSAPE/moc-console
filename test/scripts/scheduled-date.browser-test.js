// Production template UI with local transport only; never hosted data.
async (page) => {
    if (!page.url().startsWith('http://127.0.0.1:5195/')) throw new Error('Use the isolated fixture on port 5195');
    page.on('dialog', dialog => dialog.accept());
    let saved;
    const templates = [];
    await page.route('**/fixture-api', async route => {
        const body = route.request().postDataJSON();
        if (body?.op === 'template.save') {
            saved = body.data;
            templates.push({ id: saved.creationId, name: saved.name, message_type: saved.messageType, fields: saved.fields, body: saved.body, audience: saved.audience, require_arrival: saved.requireArrival });
        }
        await route.fulfill({ json: { templates, schedules: [], occurrences: [], groups: [], members: [], memberTypes: [{ id: 'members', name: 'Members', is_default: true }] } });
    });
    await page.goto('http://127.0.0.1:5195/scheduled-messages/templates/new');
    await page.getByRole('textbox', { name: 'Template name', exact: true }).fill('Dated message');
    await page.getByRole('textbox', { name: 'Default Title', exact: true }).fill('Sunday service');
    const date = page.locator('input[aria-label="Default Date"]');
    await date.waitFor({ timeout: 3000 });
    if (await date.getAttribute('type') !== 'date') throw new Error('Calendar field must exclude time');
    await date.fill('2026-10-04');
    await page.getByRole('button', { name: 'Preview', exact: true }).click();
    const preview = page.getByRole('region', { name: 'Message preview', exact: true });
    if (!(await preview.textContent()).includes('431004')) throw new Error('Date was not converted for announcement preview');
    await page.getByRole('combobox', { name: 'Message type', exact: true }).click();
    await page.getByRole('option', { name: 'Pre-attendance', exact: true }).click();
    if (await date.inputValue() !== '2026-10-04' || !(await preview.textContent()).includes('431004')) throw new Error('Changing message type lost the Gregorian date');
    await page.getByRole('button', { name: 'Editor', exact: true }).click();
    const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
    if (!await editor.locator('code[data-variable]').filter({ hasText: /^date$/ }).count()) throw new Error('Date placeholder missing from editor');
    async function cursorAtEndOfVariable() {
        await editor.locator('code[data-variable]').first().evaluate(element => {
            element.closest('[contenteditable]').focus();
            const range = document.createRange();
            range.selectNodeContents(element);
            range.collapse(false);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            document.dispatchEvent(new Event('selectionchange'));
        });
    }
    await cursorAtEndOfVariable();
    await page.keyboard.press('Space');
    await page.keyboard.insertText('outside');
    if (await editor.locator('code[data-variable]').first().textContent() !== 'title') throw new Error('Space edited the variable name');
    await cursorAtEndOfVariable();
    await page.keyboard.press('Enter');
    await page.keyboard.insertText('new line');
    if (await editor.locator('code[data-variable]').first().textContent() !== 'title') throw new Error('Enter edited the variable name');
    await page.getByRole('button', { name: 'Source', exact: true }).click();
    const source = await page.getByRole('textbox', { name: 'Message template source', exact: true }).inputValue();
    if (!source.includes('{{title}}') || !source.includes('{{date}}') || !source.includes('outside') || !source.includes('new line')) throw new Error('Boundary typing broke the template');
    await page.getByRole('button', { name: 'Save template', exact: true }).click();
    await page.waitForURL('**/scheduled-messages');
    if (saved.fields.date !== '2026-10-04' || !saved.body.includes('{{date}}')) throw new Error('Save must retain Gregorian date and token identity');
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    if (await date.inputValue() !== '2026-10-04') throw new Error('Saved calendar date did not reload');
    await page.getByRole('button', { name: 'Preview', exact: true }).click();
    if (!(await preview.textContent()).includes('431004')) throw new Error('Reloaded date preview did not convert');
    await page.setViewportSize({ width: 375, height: 812 });
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error('Date preview overflows mobile');
    await page.screenshot({ path: 'output/playwright/scheduled-date-mobile.png', fullPage: true });
    return 'Date-only selection, compact converted date in both message types, raw date persistence, Space/Enter boundary typing, and mobile preview passed';
}
