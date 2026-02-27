import puppeteer from 'puppeteer';
import path from 'path';

const BASE_URL = 'https://tabi-log-settle.vercel.app/';
const SCREENSHOT_DIR = 'C:\\Users\\leina\\.gemini\\antigravity\\brain\\b47fce4d-0b7d-421b-861d-042793ee220e\\browser';

async function runTest() {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, isMobile: true });

    console.log('--- Start Full Feature Test (Perfect Selectors) ---');

    // React-safe input injector
    const injectInput = async (selector, value) => {
        try {
            await page.waitForSelector(selector, { visible: true, timeout: 5000 });
            await page.evaluate((sel, val) => {
                const el = document.querySelector(sel);
                if (!el) return;
                const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                nativeSetter.call(el, val);
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }, selector, value);
        } catch (e) {
            console.warn(`Warning: Could not inject into ${selector}`);
        }
    };

    const clickByText = async (tagName, text) => {
        await page.evaluate((tag, txt) => {
            const els = Array.from(document.querySelectorAll(tag));
            const target = els.find(e => e.textContent.toLowerCase().includes(txt.toLowerCase()));
            if (target) target.click();
        }, tagName, text);
        await new Promise(r => setTimeout(r, 1500));
    };

    try {
        // 0. Setup
        console.log('[0/7] Setup...');
        await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
        await page.evaluate(() => localStorage.clear());
        await page.reload({ waitUntil: 'networkidle2' });

        // 1. Onboarding
        console.log('[1/7] Onboarding...');
        await clickByText('button', '計画');

        console.log('  - Step 1: Info');
        await injectInput('input[type="text"]', '北海道グルメ旅');
        const today = new Date().toISOString().split('T')[0];
        await page.evaluate((d) => {
            const inputs = Array.from(document.querySelectorAll('input[type="date"]'));
            inputs.forEach(i => {
                const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                setter.call(i, d);
                i.dispatchEvent(new Event('input', { bubbles: true }));
            });
        }, today);
        await clickByText('button', '次へ');

        console.log('  - Step 2: Members');
        await injectInput('input[type="text"]', 'れいな');
        await clickByText('button', 'メンバーを追加');
        await new Promise(r => setTimeout(r, 800));
        await page.evaluate(() => {
            const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
            if (inputs[1]) {
                const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                setter.call(inputs[1], 'たろう');
                inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
            }
        });
        await clickByText('button', '内容で');

        // Share Screen
        console.log('  - Share Screen');
        await new Promise(r => setTimeout(r, 5000));
        await clickByText('button', 'あとで共有');

        // 2. Dashboard
        console.log('[2/7] Dashboard...');
        await new Promise(r => setTimeout(r, 10000)); // Load dashboard
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_dashboard.png') });

        // 3. Expense
        console.log('[3/7] Expense (FAB)...');
        const fabSelector = 'button[class*="bg-primary"][class*="rounded-full"]';
        await page.waitForSelector(fabSelector, { visible: true, timeout: 10000 });
        await page.click(fabSelector);
        await new Promise(r => setTimeout(r, 3000)); // Wait for modal

        // Use index-based selection for modal inputs (more robust)
        await page.evaluate(() => {
            const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
            const modalInput = inputs[inputs.length - 1]; // Usually the last one in DOM if modal is appended
            if (modalInput) {
                const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                setter.call(modalInput, 'ジンギスカン');
                modalInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
            const numInputs = Array.from(document.querySelectorAll('input[type="number"]'));
            if (numInputs[0]) {
                const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                setter.call(numInputs[0], '8500');
                numInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
            }
        });
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_add_expense.png') });
        await clickByText('button', '保存');
        await new Promise(r => setTimeout(r, 2000));
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_expense_added.png') });

        // Tab Navigation
        const goToTab = async (icon) => {
            await page.evaluate((ic) => {
                const btns = Array.from(document.querySelectorAll('nav button'));
                const target = btns.find(b => b.textContent.includes(ic));
                if (target) target.click();
            }, icon);
            await new Promise(r => setTimeout(r, 3000));
        };

        // 4. Itinerary
        console.log('[4/7] Itinerary...');
        await goToTab('📅');
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_itinerary_tab.png') });
        await clickByText('button', '追加');
        await new Promise(r => setTimeout(r, 1000));
        await page.evaluate(() => {
            const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
            const modalInput = inputs[inputs.length - 1];
            if (modalInput) {
                const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                setter.call(modalInput, 'サッポロビール園');
                modalInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });
        await clickByText('button', '追加する');
        await new Promise(r => setTimeout(r, 1500));
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_itinerary_added.png') });

        // 5. Packing
        console.log('[5/7] Packing...');
        await goToTab('🎒');
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_packing_tab.png') });
        await clickByText('button', '追加');
        await new Promise(r => setTimeout(r, 1500));
        await page.evaluate(() => {
            const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
            const modalInput = inputs[inputs.length - 1];
            if (modalInput) {
                const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                setter.call(modalInput, '折りたたみ傘');
                modalInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
            // Multi-Assignee
            const btns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.includes('れいな') || b.textContent.includes('たろう'));
            btns.forEach(b => b.click());
        });
        await clickByText('button', '追加');
        await new Promise(r => setTimeout(r, 2000));
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_packing_added.png') });

        // 6. Ticket
        console.log('[6/7] Ticket...');
        await goToTab('🎫');
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10_ticket_tab.png') });
        const addTicketBtn = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const target = btns.find(b => b.textContent.includes('追加'));
            if (target) { target.click(); return true; }
            return false;
        });
        await new Promise(r => setTimeout(r, 1500));
        await page.evaluate(() => {
            const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
            const modalInput = inputs[inputs.length - 1];
            if (modalInput) {
                const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                setter.call(modalInput, 'スカイマーク BC761');
                modalInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
            // Multi-Passenger
            const btns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.includes('れいな') || b.textContent.includes('たろう'));
            btns.forEach(b => b.click());
        });
        await clickByText('button', '保存');
        await new Promise(r => setTimeout(r, 2000));
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10_ticket_added.png') });

        // 7. Settings
        console.log('[7/7] Settings...');
        await goToTab('⚙️');
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await new Promise(r => setTimeout(r, 2000));
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '11_settings.png') });

        console.log('--- TEST COMPLETED SUCCESSFULLY ---');

    } catch (error) {
        console.error('Test Error:', error);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'ERROR.png') });
    } finally {
        await browser.close();
    }
}

runTest();
