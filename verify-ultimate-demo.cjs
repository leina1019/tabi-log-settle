const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844 });

    const targetUrl = 'https://tabi-log-settle.vercel.app/';

    try {
        console.log('--- Ultimate Demo Data Verification ---');
        console.log(`Navigating to ${targetUrl}...`);
        await page.goto(targetUrl, { waitUntil: 'networkidle2' });

        // Welcome
        const startBtn = await page.$('button');
        if (startBtn) {
            await startBtn.click();
            await new Promise(r => setTimeout(r, 2000));
        }

        // Settings
        await page.click('button:has(svg)');
        await new Promise(r => setTimeout(r, 2000));

        console.log('Triggering Ultimate Demo Data injection...');
        const demoBtn = await page.waitForSelector('::-p-text(究極のデモデータを読み込む)');
        if (demoBtn) {
            page.on('dialog', async dialog => {
                console.log(`Dialog: ${dialog.message()}`);
                await dialog.accept();
            });

            await demoBtn.click();
            console.log('Button clicked, waiting for processing...');
            await new Promise(r => setTimeout(r, 6000));
        } else {
            console.error('Demo Button NOT found!');
            await page.screenshot({ path: 'debug_settings.png' });
        }

        // Check result
        const title = await page.evaluate(() => document.querySelector('h1')?.innerText || '');
        console.log(`Page Title: ${title}`);

        const hasParis = title.includes('パリ');
        console.log(`Has Paris in Title: ${hasParis}`);

        await page.screenshot({ path: 'verify_ultimate_demo.png' });
        console.log('Saved verification screenshot: verify_ultimate_demo.png');

        if (hasParis) {
            console.log('SUCCESS: Ultimate Demo Data injected successfully!');
        } else {
            console.log('FAILURE: Title does not match.');
        }

    } catch (e) {
        console.error('Error during verification:', e);
    } finally {
        await browser.close();
        console.log('--- Verification FINISHED ---');
    }
})();
