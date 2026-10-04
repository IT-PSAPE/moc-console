// Isolated production UI fixture: no hosted database or Telegram calls.
// playwright-cli --session scheduled-groups run-code --filename test/scripts/scheduled-groups.browser-test.js
async (page) => {
  if (!page.url().startsWith('http://127.0.0.1:5195/')) throw new Error('Use the isolated Console fixture on port 5195');
  const id = '10000000-0000-4000-8000-000000000002';
  const groups = [
    { id: '20000000-0000-4000-8000-000000000001', label: 'North' },
    { id: '20000000-0000-4000-8000-000000000002', label: 'South' },
  ];
  const attendance = { id, name: 'Service attendance', message_type: 'pre_attendance', body: '<b>{{title}}</b>\n{{instructions}}', fields: { title: 'Sunday service', instructions: 'Please arrive by 07:30.' }, audience: ['members'], require_arrival: true, attendance_groups: groups };
  const announcement = { ...attendance, id: '10000000-0000-4000-8000-000000000003', name: 'Announcement', message_type: 'announcement', audience: [], require_arrival: false, attendance_groups: [] };
  const members = [{ id: 'craig', name: 'Craig Hero', memberTypeId: 'members' }, { id: 'sarah', name: 'Sarah Volunteer', memberTypeId: 'volunteers' }];
  let templates = [attendance, announcement];
  const occurrence = { id: '30000000-0000-4000-8000-000000000001', workspace_id: 'fixture', schedule_id: '40000000-0000-4000-8000-000000000001', occurrence_on: '2026-10-04', send_on: '2026-10-04T07:00:00Z', expires_at: '2026-10-07T07:00:00Z', fields: attendance.fields, body: attendance.body, message_type: 'pre_attendance', require_arrival: true, attendance_groups: groups, state: 'scheduled', revision: 1, synced_revision: 0, telegram_message_id: null, last_sync_error: null };
  let occurrences = [occurrence];
  const requests = [];
  await page.route('**/fixture-api', async route => {
    const body = route.request().postDataJSON();
    if (body?.op) requests.push(body);
    if (body?.op === 'template.save') templates = templates.map(template => template.id === body.data.id ? { ...template, name: body.data.name, message_type: body.data.messageType, body: body.data.body, fields: body.data.fields, audience: body.data.audience, require_arrival: body.data.requireArrival, attendance_groups: body.data.attendanceGroups ?? [] } : template);
    if (body?.op === 'occurrence.edit') {
      const edit = body.data;
      occurrences = occurrences.map(row => row.id === edit.id ? { ...row, attendance_groups: JSON.parse(edit.value), revision: row.revision + 1 } : row);
    }
  await route.fulfill({ json: { templates, schedules: [{ id: occurrence.schedule_id, template_id: id, frequency: 'weekly' }], occurrences, members, memberTypes: [{ id: 'members', name: 'Members', is_default: true }, { id: 'volunteers', name: 'Volunteers', is_default: false }], groups: [] } });
  });

  await page.goto(`http://127.0.0.1:5195/scheduled-messages/templates/${id}`);
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  const preview = page.getByRole('region', { name: 'Message preview', exact: true });
  await preview.getByText('North', { exact: false }).waitFor();
  await preview.getByText('South', { exact: false }).waitFor();
  await preview.getByText('Awaiting response:', { exact: true }).waitFor();
  const initialPreview = await preview.textContent();
  if (!initialPreview.includes('Craig Hero') || initialPreview.indexOf('Craig Hero') < initialPreview.indexOf('Awaiting response')) throw new Error('Preview did not keep the pending attendee under Awaiting response');
  await page.screenshot({ path: 'output/playwright/scheduled-groups-preview-desktop.png', fullPage: true });

  await page.getByRole('button', { name: 'Editor', exact: true }).click();
  const groupFields = page.getByRole('group', { name: 'Attendance groups', exact: true });
  await page.screenshot({ path: 'output/playwright/scheduled-groups-controls-desktop.png', fullPage: true });
  const keyboardAdd = groupFields.getByRole('button', { name: 'Add group', exact: true });
  await keyboardAdd.focus();
  await page.keyboard.press('Space');
  await groupFields.getByRole('textbox', { name: 'Group 3' }).waitFor();
  await groupFields.getByRole('button', { name: 'Remove group 3' }).click();
  await groupFields.getByRole('textbox', { name: 'Group 1' }).fill('East');
  await groupFields.getByRole('button', { name: 'Add group' }).click();
  const third = groupFields.getByRole('textbox', { name: 'Group 3' });
  await third.fill('West');
  await groupFields.getByRole('button', { name: 'Remove group 2' }).click();
  await page.getByRole('button', { name: 'Save template', exact: true }).click();
  await page.waitForURL('**/scheduled-messages');
  const saved = templates[0].attendance_groups;
  if (saved.length !== 2 || saved[0].id !== groups[0].id || saved[1].id === groups[1].id || saved[0].label !== 'East' || saved[1].label !== 'West') throw new Error(`Template groups did not preserve stable IDs through add/remove: ${JSON.stringify(saved)}`);
  await page.getByRole('button', { name: 'Edit', exact: true }).first().click();
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  const reloadedPreview = page.getByRole('region', { name: 'Message preview', exact: true });
  await reloadedPreview.getByText('East', { exact: false }).waitFor();
  await reloadedPreview.getByText('West', { exact: false }).waitFor();

  await page.getByRole('button', { name: 'Editor', exact: true }).click();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.waitForURL('**/scheduled-messages');
  await page.getByRole('button', { name: 'Use template', exact: true }).first().click();
  await page.getByRole('button', { name: 'Preview message', exact: true }).click();
  const schedulePreview = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
  await schedulePreview.getByText('East', { exact: false }).waitFor();
  await schedulePreview.getByText('West', { exact: false }).waitFor();
  await page.goto(`http://127.0.0.1:5195/scheduled-messages/templates/${id}`);

  await page.setViewportSize({ width: 375, height: 812 });
  if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) throw new Error('Attendance group controls overflow mobile viewport');
  await page.screenshot({ path: 'output/playwright/scheduled-groups-controls-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await page.getByRole('region', { name: 'Message preview', exact: true }).getByText('Awaiting response:', { exact: true }).waitFor();
  await page.screenshot({ path: 'output/playwright/scheduled-groups-preview-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Editor', exact: true }).click();
  await page.getByRole('combobox', { name: 'Message type', exact: true }).click();
  await page.getByRole('option', { name: 'Announcement', exact: true }).click();
  await page.getByRole('button', { name: 'Save template', exact: true }).click();
  await page.waitForURL('**/scheduled-messages');
  if (!requests.at(-1)?.data || requests.at(-1).data.attendanceGroups.length !== 0) throw new Error('Switching to announcement did not save empty groups');

  await page.goto(`http://127.0.0.1:5195/scheduled-messages/templates/${announcement.id}`);
  await page.getByRole('button', { name: 'Save template', exact: true }).click();
  await page.waitForURL('**/scheduled-messages');
  if (templates.find(template => template.id === announcement.id)?.attendance_groups?.length) throw new Error('Existing ungrouped announcement management changed group settings');

  await page.goto('http://127.0.0.1:5195/scheduled-messages');
  await page.getByRole('button', { name: 'Manage', exact: true }).first().click();
  await page.getByRole('combobox', { name: 'Field', exact: true }).click();
  await page.getByRole('option', { name: 'Attendance groups', exact: true }).click();
  const occurrenceGroups = page.getByRole('group', { name: 'Attendance groups', exact: true });
  await occurrenceGroups.getByRole('textbox', { name: 'Group 1' }).fill('Changed North');
  await page.getByRole('combobox', { name: 'Apply to', exact: true }).click();
  await page.getByRole('option', { name: 'This and future occurrences', exact: true }).click();
  await page.getByRole('button', { name: 'Review change', exact: true }).click();
  const confirmation = page.getByRole('alertdialog').last();
  await confirmation.getByText('Changed North', { exact: false }).waitFor();
  await confirmation.getByText('this and future occurrences', { exact: false }).waitFor();
  if ((await confirmation.textContent()).includes('{')) throw new Error('Occurrence confirmation exposed group JSON');
  await confirmation.getByRole('button', { name: 'Apply change', exact: true }).click();
  if (requests.at(-1)?.data?.field !== 'attendanceGroups' || requests.at(-1).data.scope !== 'future' || !requests.at(-1).data.value.includes('Changed North')) throw new Error('Occurrence group edit did not use the scoped attendanceGroups field');
  return { result: 'Template groups preview, stable IDs through rename/add/remove and reload, announcement clearing, mobile layout, and human-readable occurrence confirmation checked.' };
}
