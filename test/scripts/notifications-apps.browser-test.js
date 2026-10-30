// Build the three frontends, then preview Console on 5195, Request on 5196, and Broadcast on 5197.
// playwright-cli -s=moc-notifications run-code --filename test/scripts/notifications-apps.browser-test.js
// Every API request is intercepted locally; no authentication or records are changed.
async (page) => {
    let recovered = false;
    let attempts = 0;
    const region = page.getByRole('region', { name: 'Notifications' });
    const cards = region.locator('[role="dialog"], [role="alertdialog"]');

    function assert(condition, message) {
        if (!condition) throw new Error(message);
    }

    await page.route('**/api/**', async route => {
        const url = new URL(route.request().url());
        if (url.pathname === '/api/auth/get-session') return route.fulfill({ json: null });
        attempts += 1;
        if (recovered) {
            const operation = route.request().postDataJSON()?.operation;
            return route.fulfill({ json: operation === 'listRequestCategories' ? [{ value: 'photography', label: 'Photography', description: null }] : null });
        }
        return route.fulfill({ status: 503, json: { error: { code: 'unavailable', message: 'Simulated service unavailable' } } });
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://127.0.0.1:5195/login');
    await page.getByRole('button', { name: 'Continue with Google' }).click();
    await cards.filter({ hasText: 'Simulated service unavailable' }).waitFor();
    assert(await page.locator('main [role="alert"]').count() === 0, 'Console sign-in failure stayed inline');
    await page.screenshot({ path: 'output/playwright/notifications/console-login-error.png', scale: 'css' });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://127.0.0.1:5196/request');
    const requestFailure = cards.filter({ hasText: 'Request categories unavailable' });
    await requestFailure.waitFor({ timeout: 20000 });
    assert(await page.locator('main [role="alert"]').count() === 0, 'Request loading failure stayed inline');
    const beforeRetry = attempts;
    recovered = true;
    await page.keyboard.press('F6');
    await requestFailure.getByRole('button', { name: 'Retry', exact: true }).click();
    await requestFailure.waitFor({ state: 'detached' });
    assert(attempts > beforeRetry, 'Request notification retry did not call the API');
    assert(await page.getByRole('textbox', { name: 'Title', exact: true }).isVisible(), 'Request form was lost after recovery');

    recovered = false;
    await page.goto('http://127.0.0.1:5197/notification-test');
    const broadcastFailure = cards.filter({ hasText: 'Could not load broadcast' });
    await broadcastFailure.waitFor({ timeout: 20000 });
    await page.getByRole('heading', { name: 'Broadcast unavailable', exact: true }).waitFor();
    await broadcastFailure.locator('button[aria-label="Dismiss"]').click();
    await broadcastFailure.waitFor({ state: 'detached' });
    recovered = true;
    await page.getByRole('button', { name: 'Try again', exact: true }).click();
    await page.getByRole('heading', { name: 'Broadcast not found', exact: true }).waitFor();
    assert(await cards.count() === 0, 'Broadcast recovery left a stale notification');

    await page.unroute('**/api/**');
    return 'Passed: real Console sign-in failure toast, mobile Request category failure and retry recovery, Broadcast notification dismissal and inline retry recovery.';
}
