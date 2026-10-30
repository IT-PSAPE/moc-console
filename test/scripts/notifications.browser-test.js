// node test/scripts/serve-feedback-fixture.ts
// playwright-cli -s=moc-notifications open http://127.0.0.1:5199/output/playwright/notifications/ --browser chrome
// playwright-cli -s=moc-notifications run-code --filename test/scripts/notifications.browser-test.js
async (page) => {
    const region = page.getByRole('region', { name: 'Notifications' });
    const cards = region.locator('[role="dialog"], [role="alertdialog"]');
    const initial = cards.filter({ hasText: 'Initial load failed' });

    function assert(condition, message) {
        if (!condition) throw new Error(message);
    }

    async function reset(width = 1440, height = 900) {
        await page.setViewportSize({ width, height });
        await page.reload();
        await initial.waitFor();
        await page.waitForFunction(() => document.querySelector('[aria-label="Notifications"]')?.children.length >= 2);
        await settle();
    }

    async function dismiss(card) {
        await card.locator('button[aria-label="Dismiss"]').click();
        await card.waitFor({ state: 'detached' });
    }

    async function settle() {
        await page.waitForFunction(() => !document.querySelector('[aria-label="Notifications"] [data-starting-style], [aria-label="Notifications"] [data-ending-style]'));
    }

    await reset();
    assert(await cards.count() === 2, 'StrictMode duplicated the initial notifications');
    await page.getByRole('button', { name: 'Rerender source', exact: true }).click();
    assert(await cards.count() === 2, 'A source rerender duplicated notifications');

    await page.keyboard.press('F6');
    assert(await region.evaluate(element => element === document.activeElement), 'F6 did not focus notifications');
    await initial.getByRole('button', { name: 'Retry', exact: true }).click();
    const retrying = initial.locator('button').filter({ hasText: 'Retrying…' });
    await retrying.waitFor();
    assert(await retrying.isDisabled(), 'Retry remains enabled while running');
    assert(await cards.count() === 2, 'Retry state duplicated its notification');
    await page.getByRole('button', { name: 'Finish retry', exact: true }).click();
    await page.keyboard.press('F6');
    await initial.getByRole('button', { name: 'Retry', exact: true }).waitFor();
    await dismiss(initial);
    await page.getByRole('button', { name: 'Rerender source', exact: true }).click();
    assert(await initial.count() === 0, 'A dismissed notification reappeared on rerender');
    await page.getByRole('button', { name: 'Change notification message', exact: true }).click();
    assert(await initial.count() === 0, 'A dismissed notification reappeared after its message changed');
    await page.getByRole('button', { name: 'Toggle source', exact: true }).click();
    await page.getByRole('button', { name: 'Toggle source', exact: true }).click();
    await initial.waitFor();
    await page.getByRole('button', { name: 'Toggle source', exact: true }).click();
    await initial.waitFor({ state: 'detached' });

    await reset();
    await page.getByRole('button', { name: 'Show success', exact: true }).click();
    const success = cards.filter({ hasText: 'Saved successfully' });
    await success.waitFor();
    await success.hover();
    await page.waitForTimeout(700);
    assert(await success.isVisible(), 'Hover did not pause a transient notification');
    await page.mouse.move(0, 0);
    await success.waitFor({ state: 'detached' });
    await page.getByRole('button', { name: 'Show action error', exact: true }).click();
    await page.waitForTimeout(4200);
    assert(await cards.filter({ hasText: 'Action failed' }).count() === 1, 'An error auto-dismissed before it could be handled');

    await reset();
    const desktop = await cards.first().boundingBox();
    assert(desktop && Math.abs(1440 - desktop.x - desktop.width - 24) < 2, 'Desktop placement is not bottom right');
    assert(desktop && Math.abs(900 - desktop.y - desktop.height - 24) < 2, 'Desktop bottom inset is incorrect');
    await page.getByRole('button', { name: 'Show six errors', exact: true }).click();
    assert(await cards.count() === 8, 'More than three errors were discarded');
    assert(await cards.evaluateAll(elements => elements.every(element => !element.inert)), 'Overflow notifications cannot be interacted with');
    await dismiss(cards.filter({ hasText: 'Independent error 4' }));
    assert(await cards.count() === 7, 'Dismissing one notification removed other errors');
    await settle();
    await page.screenshot({ path: 'output/playwright/notifications/desktop-stack.png', scale: 'css' });

    await reset(390, 844);
    const mobile = await cards.first().boundingBox();
    assert(mobile && Math.abs(mobile.x + mobile.width / 2 - 195) < 2, 'Mobile notifications are not centered');
    assert(mobile && Math.abs(844 - mobile.y - mobile.height - 16) < 2, 'Mobile notifications are not at the bottom');
    await page.getByRole('button', { name: 'Show six errors', exact: true }).click();
    await dismiss(cards.filter({ hasText: 'Independent error 1' }));
    assert(await cards.count() === 7, 'An old notification was lost from the mobile stack');
    await region.evaluate(element => { element.scrollTop = 0; });
    await settle();
    await page.screenshot({ path: 'output/playwright/notifications/mobile-stack.png', scale: 'css' });
    await page.getByRole('button', { name: 'Show long error', exact: true }).click();
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Long notifications overflow the mobile viewport');

    await reset();
    await page.getByRole('button', { name: 'Open dialog', exact: true }).click();
    const dialog = page.getByRole('alertdialog', { name: 'Confirm operation' });
    await dialog.getByRole('button', { name: 'Confirm', exact: true }).click();
    const failure = cards.filter({ hasText: "Couldn't complete action" });
    await failure.waitFor();
    assert(await region.evaluate(element => getComputedStyle(element).zIndex) === '10000', 'Notification layer is below dialogs');
    await page.keyboard.press('F6');
    await failure.getByRole('button', { name: 'Dismiss', exact: true }).click();
    await failure.waitFor({ state: 'detached' });
    await page.keyboard.press('F6');
    await initial.getByRole('button', { name: 'Retry', exact: true }).click();
    await page.getByText('Render 0 · Retries 1', { exact: true }).waitFor({ state: 'attached' });
    assert(await dialog.isVisible(), 'Interacting with a notification dismissed the modal');
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await dialog.waitFor({ state: 'detached' });

    await reset();
    await page.getByRole('button', { name: 'Enter fullscreen', exact: true }).click();
    await page.waitForFunction(() => document.fullscreenElement?.contains(document.querySelector('[aria-label="Notifications"]')));
    await dismiss(initial);
    assert(await page.evaluate(() => document.fullscreenElement !== null), 'Notification dismissal exited fullscreen');
    await page.evaluate(() => document.exitFullscreen());
    await page.waitForFunction(() => document.querySelector('#overlay-root')?.contains(document.querySelector('[aria-label="Notifications"]')));

    return 'Passed: StrictMode, updates, retry loading, dismissal, source cleanup/reactivation, success timeout, persistent errors, independent stacks, desktop/mobile placement, overflow, long text, F6, modal interactions, and fullscreen.';
}
