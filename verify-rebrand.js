import puppeteer from 'puppeteer';
import path from 'path';

const BASE_URL = 'https://tabi-log-settle.vercel.app/';
const SCREENSHOT_DIR = 'C:\\Users\\leina\\.gemini\\antigravity\\brain\\b47fce4d-0b7d-421b-861d-042793ee220e\\browser';

async function verifyRebrand() {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, isMobile: true });

    console.log('--- Rebrand Verification (Vercel) ---');

    try {
        console.log('[Test] Loading home page...');
        await page.goto(BASE_URL, { waitUntil: 'networkidle2' });

        // Check title
        const title = await page.title();
        console.log(`Title: ${title}`);

        // Screenshot initial view (Welcome or Dashboard)
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'img_verify_01_initial.png') });

        // Check for "たびログ" text
        const bodyText = await page.evaluate(() => document.body.innerText);
        const hasBrandName = bodyText.includes('たびログ');
        console.log(`Has 'たびログ' in text: ${hasBrandName}`);

        // Check for logo image
        const logoSrcs = await page.evaluate(() => {
            const imgs = Array.from(document.querySelectorAll('img'));
            return imgs.map(i => i.src);
        });
        const hasLogo = logoSrcs.some(src => src.includes('logo.png'));
        console.log(`Has logo.png: ${hasLogo}`);

        // If it's Welcome screen, try to proceed to see Header
        if (bodyText.includes('ようこそ')) {
            console.log('[Test] On Welcome screen, proceeding...');
            await page.evaluate(() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const nextBtn = btns.find(b => b.textContent.includes('計画') || b.textContent.includes('次へ') || b.textContent.includes('スタート'));
                if (nextBtn) nextBtn.click();
            });
            await new Promise(r => setTimeout(r, 2000));
            await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'img_verify_02_step2.png') });
        }

        console.log('\n--- Verification COMPLETED ---');

    } catch (error) {
        console.error('Verification Error:', error);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'img_verify_ERROR.png') });
    } finally {
        await browser.close();
    }
}

verifyRebrand();
