// First build the browser-check entry as documented at the top of that file.
// playwright-cli --session template-editor open about:blank
// playwright-cli --session template-editor run-code --filename test/scripts/template-editor.browser-test.js
async (page) => {
  await page.goto('about:blank');
  await page.setContent('<!doctype html><html><body></body></html>');
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addScriptTag({ path: 'output/playwright/template-editor-html.browser-check.js' });
  if (errors.length) throw new Error(errors.join('\n'));
  const count = await page.locator('#editor-checks').textContent();
  if (!Number(count)) throw new Error('Editor checks did not finish');
  return `${count} native editor and template round-trip assertions passed.`;
}
