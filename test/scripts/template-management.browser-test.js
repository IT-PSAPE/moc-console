// Run via playwright-cli in an isolated local fixture; no live data is touched.
async (page) => {
  if (!page.url().startsWith('http://127.0.0.1:5195/')) throw new Error('Use the isolated template fixture on port 5195');
  let templates = [];
  let saves = 0;
  let deletes = 0;
  let loseNextSaveResponse = false;
  let rejectNextDelete = false;
  let holdSave = false;
  let releaseSave;
  await page.setViewportSize({ width: 1280, height: 800 });
  const snapshot = () => ({ templates, schedules: [], occurrences: [], members: [], memberTypes: [{ id: '30000000-0000-4000-8000-000000000001', name: 'Members', is_default: true }], groups: [] });
  await page.route('**/fixture-api', async route => {
    const body = route.request().postDataJSON();
    if (body?.op === 'template.save') {
      saves++;
      const data = body.data;
      const id = data.id ?? data.creationId ?? `unsafely-generated-${saves}`;
      const template = { id, workspace_id: body.workspaceId, name: data.name, message_type: data.messageType, body: data.body, fields: data.fields, audience: data.audience, require_arrival: data.requireArrival };
      templates = [...templates.filter(row => row.id !== id), template];
      if (holdSave) await new Promise(resolve => { releaseSave = resolve; });
      // Saving to the server can succeed even if its response fails to reach the client.
      if (loseNextSaveResponse) {
        loseNextSaveResponse = false;
        return route.fulfill({ status: 503, json: { error: 'Response interrupted; retry saving' } });
      }
    }
    if (body?.op === 'template.delete') {
      deletes++;
      if (rejectNextDelete) {
        rejectNextDelete = false;
        return route.fulfill({ status: 400, json: { error: 'Deletion failed; retry' } });
      }
      templates = templates.filter(row => row.id !== body.data.id);
    }
    await route.fulfill({ json: snapshot() });
  });
  await page.goto('http://127.0.0.1:5195/scheduled-messages/templates/new');
  await page.getByRole('textbox', { name: 'Template name', exact: true }).fill('Morning reminder');
  await page.getByRole('textbox', { name: 'Default Title', exact: true }).fill('Morning');
  loseNextSaveResponse = true;
  await page.getByRole('button', { name: 'Save template', exact: true }).click();
  await page.getByText('Response interrupted; retry saving', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Save template', exact: true }).click();
  await page.waitForURL('**/scheduled-messages');
  if (templates.length !== 1) throw new Error(`Retry inserted ${templates.length} templates`);
  if (await page.getByText('Unsaved changes', { exact: true }).count()) throw new Error('Successful save showed discard prompt');
  await page.getByText('Morning reminder', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  const dialog = page.getByRole('alertdialog');
  await dialog.waitFor();
  if (!(await dialog.textContent()).includes('Morning reminder')) throw new Error('Deletion must identify the selected template');
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  if (deletes !== 0 || templates.length !== 1) throw new Error('Cancel changed saved templates');
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  rejectNextDelete = true;
  await dialog.getByRole('button', { name: 'Delete template', exact: true }).click();
  await dialog.getByRole('alert').waitFor();
  if (templates.length !== 1) throw new Error('Failed delete removed the template');
  await dialog.getByRole('button', { name: 'Delete template', exact: true }).click();
  await page.getByText('No templates yet', { exact: true }).waitFor();
  if (templates.length !== 0) throw new Error('Confirmed deletion left the template in the library');
  await page.getByRole('button', { name: 'Create a template', exact: true }).click();
  await page.getByRole('textbox', { name: 'Template name', exact: true }).fill('Unsaved draft');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByText('Unsaved changes', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Discard', exact: true }).click();
  await page.waitForURL('**/scheduled-messages');
  if (saves !== 2) throw new Error('Discard unexpectedly saved a template');
  await page.getByRole('button', { name: 'Create a template', exact: true }).click();
  await page.getByRole('textbox', { name: 'Template name', exact: true }).fill('Morning reminder');
  await page.getByRole('textbox', { name: 'Default Title', exact: true }).fill('Morning');
  holdSave = true;
  // Two activations before a re-render must still submit exactly once.
  await page.getByRole('button', { name: 'Save template', exact: true }).evaluate(button => { button.click(); button.click(); });
  await page.getByRole('button', { name: 'Saving…', exact: true }).waitFor();
  if (!await page.getByRole('textbox', { name: 'Default Title', exact: true }).isDisabled()) throw new Error('Draft remains editable while saving');
  if (saves !== 3) throw new Error('Rapid activation submitted more than once');
  holdSave = false;
  releaseSave();
  await page.waitForURL('**/scheduled-messages');
  if (templates.length !== 1) throw new Error('Rapid activation created duplicates');
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByRole('textbox', { name: 'Template name', exact: true }).fill('Updated reminder');
  await page.getByRole('button', { name: 'Save template', exact: true }).click();
  await page.waitForURL('**/scheduled-messages');
  if (templates.length !== 1 || templates[0].name !== 'Updated reminder') throw new Error('Editing must update the existing template');
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByRole('textbox', { name: 'Template name', exact: true }).fill('Final reminder');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByText('Unsaved changes', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await page.waitForURL('**/scheduled-messages');
  if (templates.length !== 1 || templates[0].name !== 'Final reminder') throw new Error('Save-and-leave must update the selected template');
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await dialog.waitFor();
  await page.screenshot({ path: 'output/playwright/template-delete-confirmation.png', fullPage: true, animations: 'disabled' });
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  await page.screenshot({ path: 'output/playwright/template-library-actions.png', fullPage: true, animations: 'disabled' });
  await page.setViewportSize({ width: 375, height: 812 });
  if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) throw new Error('Template actions overflow the mobile viewport');
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await dialog.waitFor();
  await page.screenshot({ path: 'output/playwright/template-delete-mobile.png', fullPage: true, animations: 'disabled' });
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.goto('http://127.0.0.1:5195/scheduled-messages/templates/new');
  await page.getByRole('combobox', { name: 'Message type', exact: true }).click();
  await page.getByRole('option', { name: 'Pre-attendance', exact: true }).click();
  await page.getByRole('textbox', { name: 'Template name', exact: true }).fill('Service attendance');
  await page.getByRole('textbox', { name: 'Default Title', exact: true }).fill('Sunday service');
  await page.getByRole('textbox', { name: 'Default Instructions', exact: true }).fill('Please arrive by 07:30.');
  await page.getByRole('checkbox', { name: 'Ask attendees for their arrival time', exact: true }).check();
  if (await page.getByRole('textbox', { name: /expected arrival/i }).count()) throw new Error('Retired arrival field remains in template form');
  const variables = await page.getByRole('textbox', { name: 'Rich text editor', exact: true }).locator('code').allTextContents();
  if (variables.join(',') !== 'title,date,instructions') throw new Error(`Unexpected template variables: ${variables}`);
  await page.screenshot({ path: 'output/playwright/pre-attendance-instructions-mobile.png', fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: 'Save template', exact: true }).click();
  await page.waitForURL('**/scheduled-messages');
  const attendance = templates.find(row => row.name === 'Service attendance');
  if (!attendance || 'expectedArrival' in attendance.fields || attendance.body.includes('expectedArrival') || attendance.fields.instructions !== 'Please arrive by 07:30.' || !attendance.require_arrival) throw new Error('Pre-attendance save did not preserve instructions and personal arrival setting');
  return { saves, deletes, result: 'Template creation, navigation, deletion, date placeholder, and pre-attendance instructions with personal arrival collection passed' };
}
