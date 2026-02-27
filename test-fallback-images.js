import puppeteer from 'puppeteer';
import path from 'path';

const BASE_URL = 'https://tabi-log-settle.vercel.app/';
const SCREENSHOT_DIR = 'C:\\Users\\leina\\.gemini\\antigravity\\brain\\b47fce4d-0b7d-421b-861d-042793ee220e\\browser';

async function testFallbackImages() {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, isMobile: true });

    console.log('--- Fallback Image Test v3 (Vercel) ---');

    const clickByText = async (text) => {
        await page.evaluate((txt) => {
            const btn = Array.from(document.querySelectorAll('button, a')).find(e => e.textContent.includes(txt));
            if (btn) btn.click();
        }, text);
        await new Promise(r => setTimeout(r, 1500));
    };

    const injectInput = async (selector, value) => {
        await page.evaluate((sel, val) => {
            const el = document.querySelector(sel);
            if (!el) return;
            const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            nativeSetter.call(el, val);
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        }, selector, value);
    };

    try {
        // 0. Setup - Onboarding
        console.log('[Setup] Onboarding...');
        await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
        await page.evaluate(() => localStorage.clear());
        await page.reload({ waitUntil: 'networkidle2' });

        await clickByText('計画');
        await injectInput('input[type="text"]', '画像テスト旅行');
        const today = new Date().toISOString().split('T')[0];
        await page.evaluate((d) => {
            const inputs = Array.from(document.querySelectorAll('input[type="date"]'));
            inputs.forEach(i => {
                const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                setter.call(i, d);
                i.dispatchEvent(new Event('input', { bubbles: true }));
            });
        }, today);
        await clickByText('次へ');
        await injectInput('input[type="text"]', 'テスター');
        await clickByText('内容で');
        await new Promise(r => setTimeout(r, 5000));
        await clickByText('あとで共有');
        await new Promise(r => setTimeout(r, 8000));
        console.log('[Setup] Dashboard loaded');

        // Navigate to PLAN tab
        console.log('[Test] Going to PLAN tab...');
        await clickByText('PLAN');
        await new Promise(r => setTimeout(r, 3000));

        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'img_test_01_plan_tab.png') });

        // Add items with different categories
        const testItems = [
            { title: 'サッポロビール園', type: '食事' },
            { title: '小樽運河散策', type: '観光' },
            { title: '新千歳空港→札幌', type: '移動' },
        ];

        for (let i = 0; i < testItems.length; i++) {
            const item = testItems[i];
            console.log(`  Adding: ${item.title} (${item.type})`);

            // Open modal
            await clickByText('予定を追加');
            await new Promise(r => setTimeout(r, 1500));

            // Fill title (using placeholder target)
            await page.evaluate((title) => {
                const titleInput = Array.from(document.querySelectorAll('input')).find(i => i.placeholder.includes('浅草寺'));
                if (titleInput) {
                    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                    setter.call(titleInput, title);
                    titleInput.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }, item.title);

            // Select type
            await page.evaluate((typeName) => {
                const typeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes(typeName));
                if (typeBtn) typeBtn.click();
            }, item.type);

            await new Promise(r => setTimeout(r, 500));

            // Screenshot the form once
            if (i === 0) {
                await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'img_test_02_add_form.png') });
            }

            // Scroll modal down for safety
            await page.evaluate(() => {
                const modal = document.querySelector('[class*="overflow-y-auto"]');
                if (modal) modal.scrollTop = 1000;
            });
            await new Promise(r => setTimeout(r, 500));

            // Save
            await clickByText('保存する');
            await new Promise(r => setTimeout(r, 3000));
        }

        // Screenshot result
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'img_test_03_plan_with_images.png'), fullPage: true });

        // Scroll down to see items
        await page.evaluate(() => window.scrollTo(0, 500));
        await new Promise(r => setTimeout(r, 1000));
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'img_test_04_plan_scroll.png') });

        // Check image loading status
        const imageResults = await page.evaluate(() => {
            const imgs = Array.from(document.querySelectorAll('img'));
            return imgs.map(img => ({
                src: img.src,
                alt: img.alt,
                loaded: img.complete && img.naturalWidth > 0,
                width: img.naturalWidth,
                height: img.naturalHeight
            }));
        });

        console.log('\n--- Image Load Results ---');
        imageResults.forEach(img => {
            const status = img.loaded ? '✅' : '❌';
            const shortSrc = img.src.length > 60 ? img.src.substring(0, 60) + '...' : img.src;
            console.log(`  ${status} ${img.width}x${img.height} | ${img.alt || '-'} | ${shortSrc}`);
        });

        const categoryImages = imageResults.filter(img => img.src.includes('/images/categories/'));
        console.log(`\nCategory images found: ${categoryImages.length}`);
        categoryImages.forEach(img => {
            console.log(`  ${img.loaded ? '✅' : '❌'} ${img.src}`);
        });

        console.log('\n--- Test COMPLETED ---');

    } catch (error) {
        console.error('Test Error:', error);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'img_test_ERROR.png') });
    } finally {
        await browser.close();
    }
}

testFallbackImages();
