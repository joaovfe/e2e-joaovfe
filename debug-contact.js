const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    locale: 'pt-BR',
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  // Visit homepage and click contact us link, like the test does.
  await page.goto('https://automationexercise.com/');
  await page.locator('div.shop-menu ul.nav li a[href="/contact_us"]').click();
  await page.waitForLoadState('domcontentloaded');

  console.log('URL after menu click:', page.url());
  console.log('Get In Touch heading visible:', await page.locator('div.contact-form h2.title').isVisible());

  page.on('dialog', async (d) => {
    console.log('DIALOG:', d.message());
    await d.accept();
  });

  await page.locator('input[data-qa="name"]').fill('John Tester');
  await page.locator('input[data-qa="email"]').fill('john@test.com');
  await page.locator('input[data-qa="subject"]').fill('Test subject');
  await page.locator('textarea[data-qa="message"]').fill('Test message');

  // Inspect form action and method first
  const action = await page.locator('form#contact-us-form').getAttribute('action');
  const method = await page.locator('form#contact-us-form').getAttribute('method');
  const enctype = await page.locator('form#contact-us-form').getAttribute('enctype');
  console.log('form action:', action, 'method:', method, 'enctype:', enctype);

  // Click submit and wait for navigation
  await Promise.all([
    page.waitForLoadState('domcontentloaded').catch(() => {}),
    page.locator('input[data-qa="submit-button"]').click()
  ]);
  await page.waitForTimeout(5000);

  console.log('URL after submit:', page.url());

  // Get all elements that look like the success banner
  const successEls = await page.locator('div.status.alert.alert-success').all();
  for (let i = 0; i < successEls.length; i++) {
    const txt = (await successEls[i].textContent() || '').trim();
    const visible = await successEls[i].isVisible();
    console.log(`success[${i}]: visible=${visible} text="${txt}"`);
  }

  // Try alternate locator with classes any order
  const altAll = await page.locator('.alert-success').all();
  console.log('total .alert-success:', altAll.length);
  for (let i = 0; i < altAll.length; i++) {
    console.log(`alert-success[${i}]: visible=${await altAll[i].isVisible()} text="${(await altAll[i].textContent() || '').trim()}"`);
  }

  // Search for "Success!" in any text
  const successText = await page.getByText('Success! Your details have been submitted successfully.').count();
  console.log('Success text node count:', successText);

  await page.screenshot({ path: 'debug-contact-after-submit.png', fullPage: true });

  await browser.close();
})();
