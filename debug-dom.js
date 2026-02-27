import puppeteer from 'puppeteer';

const BASE_URL = 'https://tabi-log-settle.vercel.app/';

async function debugDom() {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, isMobile: true });

    console.log('--- DOM Debug (Onboarding Step) ---');

    try {
        await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
        await page.evaluate(() => localStorage.clear());
        await page.reload({ waitUntil: 'networkidle2' });

        console.log('Navigated to Welcome');
        await page.evaluate(() => {
            const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('始める'));
            if (btn) btn.click();
        });

        await new Promise(r => setTimeout(r, 4000));
        console.log('After clicking Start');

        const domInfo = await page.evaluate(() => {
            const inputs = Array.from(document.querySelectorAll('input')).map(i => ({
                tag: 'input',
                type: i.type,
                placeholder: i.placeholder,
                className: i.className,
                id: i.id
            }));
            const labels = Array.from(document.querySelectorAll('label')).map(l => l.textContent);
            const buttons = Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim());
            return { inputs, labels, buttons };
        });

        console.log('Inputs:', JSON.stringify(domInfo.inputs, null, 2));
        console.log('Labels:', domInfo.labels);
        console.log('Buttons:', domInfo.buttons);

    } catch (error) {
        console.error('Debug Error:', error);
    } finally {
        await browser.close();
    }
}

debugDom();
