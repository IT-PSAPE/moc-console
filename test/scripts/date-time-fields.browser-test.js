// Start npm run dev:request, then use an isolated Playwright CLI session:
// playwright-cli --session date-time open http://localhost:5176/request --browser webkit
// playwright-cli --session date-time run-code --filename test/scripts/date-time-fields.browser-test.js
async (page) => {
  await page.route('**/rest/v1/rpc/public_list_request_categories', (route) => route.fulfill({
    json: [{ key: 'photography', name: 'Photography', description: null }],
  }));
  const date = page.getByRole('textbox', { name: 'Due date date', exact: true });
  const time = page.getByRole('textbox', { name: 'Due date time', exact: true });

  async function expectValue(field, expected) {
    const actual = await field.inputValue();
    if (actual !== expected) throw new Error(`Expected ${expected}, received ${actual}`);
  }

  async function restart() {
    await page.goto(new URL('/request', page.url()).href);
    await page.evaluate(() => {
      localStorage.removeItem('moc-request-public-draft-request-v2');
      localStorage.removeItem('moc-request-public-draft-v1');
    });
    await page.reload();
    await date.waitFor();
    await page.getByRole('textbox', { name: 'Title', exact: true }).fill('Date regression check');
    await page.getByRole('textbox', { name: 'Requested by', exact: true }).fill('Test requester');
    await page.getByRole('button', { name: 'Next', exact: true }).waitFor();
  }

  async function expectNextStep() {
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.getByRole('textbox', { name: 'Who', exact: true }).waitFor({ timeout: 3000 });
  }

  // Native date/time editors can emit input before they commit a change event.
  await restart();
  await date.evaluate((input) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '2026-10-04');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await time.evaluate((input) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '14:30');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expectNextStep();

  // Editing one half must preserve the other half, including incomplete edits.
  await restart();
  await date.fill('2026-10-04');
  await time.fill('14:30');
  await date.fill('');
  await expectValue(time, '14:30');
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  if (!(await date.isVisible())) throw new Error('Incomplete date/time advanced the form');
  await date.fill('2026-10-05');
  await expectValue(time, '14:30');
  await expectNextStep();

  await restart();
  await time.fill('14:30');
  await date.fill('2026-10-04');
  await time.fill('');
  await expectValue(date, '2026-10-04');
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  if (!(await time.isVisible())) throw new Error('Incomplete date/time advanced the form');
  await time.fill('15:00');
  await expectNextStep();

  // Reloading a complete saved draft must still initialize both controls.
  await page.reload();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expectValue(date, '2026-10-04');
  await expectValue(time, '15:00');
  await date.fill('');
  await time.fill('');
  await date.fill('2026-10-06');
  await time.fill('09:00');
  await expectNextStep();
  console.log('Date/time input events, both entry orders, corrections, and step validation passed.');
}
