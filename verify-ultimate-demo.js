
const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844 });

    // ローカルでのテストを想定（Vercelデプロイ前はローカルで確認）
    // もし本番で試す場合はURLを差し替える必要があるが、まずはローカル実行を試みる
    // ここではVercelのURLをターゲットにする（プッシュ済みのため）
    const targetUrl = 'https://tabi-log-settle.vercel.app/';

    try {
        console.log('--- Ultimate Demo Data Verification ---');
        console.log(`Navigating to ${targetUrl}...`);
        await page.goto(targetUrl, { waitUntil: 'networkidle2' });

        // Welcome画面なら「旅を開始」をクリック
        const startBtn = await page.$('button'); // 最初のボタンが通常「始める」
        if (startBtn) {
            await startBtn.click();
            await new Promise(r => setTimeout(r, 2000));
        }

        // SettingsViewへ移動 (Homeのどこかにあるはずだが、通常はAppIcon(settings)をクリック)
        // ここでは簡単に、App.tsxのnavからではなく、Dashboard等にある設定アイコンを探す
        // または `setView('settings')` を強引に呼ぶのは難しいため、ボタンを探す
        // ダッシュボードの右上の設定ボタンを想定
        const settingsBtn = await page.$('button[title="設定"], button:has(svg)');
        // 実際にはもっと確実なセレクタが必要。
        // App.tsxのヘッダーにあるかもしれない
        // 設定画面への確実なアクセス: HomeViewの右上の歯車ボタンをクリック
        await page.click('button:has(svg)'); // 仮のセレクタ
        await new Promise(r => setTimeout(r, 1000));

        console.log('Triggering Ultimate Demo Data injection...');
        // 「究極のデモデータを読み込む」ボタンをクリック
        // テキストで検索
        const [demoBtn] = await page.$x("//button[contains(., '究極のデモデータを読み込む')]");
        if (demoBtn) {
            // alert/confirm を自動承認する
            page.on('dialog', async dialog => {
                console.log(`Dialog: ${dialog.message()}`);
                await dialog.accept();
            });

            await demoBtn.click();
            await new Promise(r => setTimeout(r, 3000)); // データ読み込み待ち
        } else {
            console.error('Demo Button NOT found!');
            // スクリーンショットを撮ってデバッグ
            await page.screenshot({ path: 'debug_settings.png' });
        }

        // Home画面に戻っているはず
        const title = await page.evaluate(() => document.querySelector('h1')?.innerText || '');
        console.log(`Page Title: ${title}`);

        const hasParis = title.includes('パリ');
        console.log(`Has Paris in Title: ${hasParis}`);

        // スクリーンショット
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
