// Run against an authenticated, isolated local Console fixture (no live data).
// playwright-cli --session template-editor run-code --filename test/scripts/template-editor-ui.browser-test.js
async (page) => {
  if (new URL(page.url()).hostname !== '127.0.0.1') throw new Error('Use an isolated local fixture');
  await page.setViewportSize({ width: 1440, height: 1000 });
  const editor = page.getByRole('textbox', { name: 'Rich text editor', exact: true });
  await editor.waitFor();
  if (await editor.locator('span[data-variable]').count()) throw new Error('Variables must render as code');
  const title = editor.locator('code[data-variable]').first();
  if ((await title.textContent()) !== 'title') throw new Error('Expected names-only native code');
  const style = await title.evaluate(element => {
    const style = getComputedStyle(element);
    const parent = getComputedStyle(element.parentElement);
    return { radius: style.borderRadius, border: style.borderTopWidth, background: style.backgroundColor, editable: element.getAttribute('contenteditable'), inheritsFont: style.fontFamily === parent.fontFamily && style.fontSize === parent.fontSize && style.fontWeight === parent.fontWeight && style.color === parent.color };
  });
  if (style.radius !== '6px' || style.border !== '1px' || style.editable !== null || !style.inheritsFont) throw new Error('Unexpected native code styling/editability');

  // Real mouse dragging must select part of the name, not an atomic node.
  const drag = await title.evaluate(element => {
    const range = document.createRange();
    range.setStart(element.firstChild, 0);
    range.setEnd(element.firstChild, 2);
    const rect = range.getBoundingClientRect();
    return { left: rect.left + 0.5, right: rect.right - 0.5, y: rect.top + rect.height / 2 };
  });
  await page.mouse.move(drag.left, drag.y);
  await page.mouse.down();
  await page.mouse.move(drag.right, drag.y, { steps: 12 });
  await page.mouse.up();
  const selected = await page.evaluate(() => getSelection().toString());
  if (selected !== 'ti') throw new Error(`Partial native selection failed: ${selected}`);
  if (await page.getByRole('button', { name: 'Bold', exact: true }).isDisabled()) throw new Error('Variable formatting must remain available');
  await page.keyboard.insertText('TI');
  if ((await title.textContent()) !== 'TItle') throw new Error('Typing did not replace selected characters');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  if ((await title.textContent()) !== 'title') throw new Error('Undo did not restore the variable');
  await page.keyboard.press('Meta+b');
  await page.getByRole('button', { name: 'Bold', exact: true }).click();
  const formatted = await title.evaluate(element => getComputedStyle(element).fontWeight);
  if (Number(formatted) < 600) throw new Error('Variable did not inherit bold formatting');


  await page.getByRole('button', { name: 'Source', exact: true }).click();
  const source = page.locator('textarea').first();
  if (!(await source.inputValue()).includes('<strong>{{title}}</strong>')) throw new Error('Source lost variable formatting');
  await page.getByRole('button', { name: 'Editor', exact: true }).click();
  await editor.click();
  await editor.press('ArrowDown');
  await editor.press('End');
  await page.getByRole('button', { name: 'title', exact: true }).click();
  await page.keyboard.insertText('after');
  if (!(await editor.textContent()).includes('title after')) throw new Error('Typing after insertion stayed inside code');
  await page.getByRole('button', { name: 'Source', exact: true }).click();
  if (!(await source.inputValue()).includes('{{title}} after')) throw new Error('Inserted variable did not serialize independently of following text');
  await page.getByRole('button', { name: 'Editor', exact: true }).click();

  // Exercise the real copy and paste handlers without the user's OS clipboard.
  await title.evaluate(element => {
    const range = document.createRange();
    range.selectNode(element.closest('strong') ?? element);
    const selection = getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    element.closest('[contenteditable]').focus();
    document.dispatchEvent(new Event('selectionchange'));
  });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
  const copied = await editor.evaluate(element => {
    const data = new DataTransfer();
    element.dispatchEvent(new ClipboardEvent('copy', { clipboardData: data, bubbles: true, cancelable: true }));
    return { html: data.getData('text/html'), text: data.getData('text/plain') };
  });
  if (!copied.html.includes('data-variable')) throw new Error('Copy omitted variable identity');
  await editor.evaluate(element => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let node;
    let after;
    while ((node = walker.nextNode())) if (node.textContent.includes('after')) after = node;
    const range = document.createRange();
    range.setStart(after, after.textContent.length);
    range.collapse(true);
    const selection = getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    element.focus();
    document.dispatchEvent(new Event('selectionchange'));
  });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
  const countBeforePaste = await editor.locator('code[data-variable]').count();
  await editor.evaluate((element, copied) => {
    const data = new DataTransfer();
    data.setData('text/html', copied.html);
    data.setData('text/plain', copied.text);
    element.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
  }, copied);
  if (await editor.locator('code[data-variable]').count() !== countBeforePaste + 1) throw new Error('Pasting a variable lost its identity');
  await page.getByRole('button', { name: 'Source', exact: true }).click();
  if (!(await source.inputValue()).includes('<strong>{{title}}</strong>')) throw new Error('Pasting lost variable formatting');
  await page.getByRole('button', { name: 'Editor', exact: true }).click();

  await page.screenshot({ path: 'output/playwright/variable-code-light.png', fullPage: true });
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  const dark = await title.evaluate(element => getComputedStyle(element).backgroundColor);
  if (dark === 'rgba(231, 231, 243, 0.07)' || dark === 'rgba(0, 0, 0, 0)') throw new Error(`Missing pink variable background: ${dark}`);
  await page.screenshot({ path: 'output/playwright/variable-code-dark.png', fullPage: true });
  await page.evaluate(() => document.documentElement.removeAttribute('data-theme'));
  return { selection: selected, style, dark, result: 'Native selection, typing, undo, insertion, source round-trip, light and dark styling passed.' };
}
