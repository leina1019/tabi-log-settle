/**
 * TabiLog - Google Apps Script (GAS) WebApp
 * tripIdごとに独立したGoogleスプレッドシートを自動作成・管理します。
 *
 * 【セットアップ手順】
 * 1. このコードをGASエディタに貼り付ける
 * 2. 「デプロイ」→「新しいデプロイ」→ 種類:ウェブアプリ
 * 3. 実行ユーザー: 自分、アクセス: 全員(匿名含む) に設定してデプロイ
 * 4. 発行されたURLをgoogleSheetService.tsのGAS_WEBAPP_URLに設定する
 *
 * 【設計】
 * - マスタースプレッドシート（MASTER_SPREADSHEET_ID）の "MASTER" シートで
 *   tripId → spreadsheetId の対応を管理
 * - 新しいtripIdが来たら新規スプレッドシートを自動作成してマスターに記録
 * - 各グループのデータは完全に独立したファイルに保存される
 */

// =============================================================
// ★ 設定値 - マスター管理用スプレッドシートのID
// =============================================================
var MASTER_SPREADSHEET_ID = '1nLjmh3UX9PmoX88B5oU5qNRvpgT5p6g01rqQs7yEPaE';
// =============================================================

// ヘッダー列定義（スプレッドシートの列順）
var HEADERS = [
    'id', 'date', 'title', 'category', 'paidBy',
    'amount', 'currency', 'exchangeRate', 'amountJPY',
    'splitWith', 'sourceUrl', 'createdAt', 'updatedAt'
];

// マスターシートの列
var MASTER_HEADERS = ['tripId', 'spreadsheetId', 'createdAt'];

/**
 * マスタースプレッドシートの "MASTER" シートを取得または作成する
 * スタンドアロンGASなのでopenById()で指定のシートを開く
 */
function getMasterSheet() {
    var ss = SpreadsheetApp.openById(MASTER_SPREADSHEET_ID);
    var master = ss.getSheetByName('MASTER');
    if (!master) {
        master = ss.insertSheet('MASTER');
        master.getRange(1, 1, 1, MASTER_HEADERS.length).setValues([MASTER_HEADERS]);
        master.setFrozenRows(1);
    }
    return master;
}

/**
 * tripIdに対応するspreadsheetIdをマスターシートから検索する
 */
function findSpreadsheetId(tripId) {
    var master = getMasterSheet();
    var data = master.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(tripId)) {
            return String(data[i][1]);
        }
    }
    return null;
}

/**
 * tripId用の新規スプレッドシートを作成し、マスターに登録する
 */
function createNewSpreadsheetForTrip(tripId) {
    var newSs = SpreadsheetApp.create('TabiLog - ' + tripId);
    var spreadsheetId = newSs.getId();

    // データ用シートのヘッダーをセット
    var dataSheet = newSs.getActiveSheet();
    dataSheet.setName('data');
    dataSheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    dataSheet.setFrozenRows(1);

    // マスターシートに記録
    var master = getMasterSheet();
    master.appendRow([tripId, spreadsheetId, new Date().toISOString()]);

    Logger.log('Created new spreadsheet for tripId: ' + tripId + ' -> ' + spreadsheetId);
    return spreadsheetId;
}

/**
 * tripIdに対応するスプレッドシートのデータシートを取得する（なければ新規作成）
 */
function getDataSheet(tripId) {
    var spreadsheetId = findSpreadsheetId(tripId);

    if (!spreadsheetId) {
        spreadsheetId = createNewSpreadsheetForTrip(tripId);
    }

    var ss = SpreadsheetApp.openById(spreadsheetId);
    var sheet = ss.getSheetByName('data');

    if (!sheet) {
        sheet = ss.insertSheet('data');
        sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
        sheet.setFrozenRows(1);
    }

    return sheet;
}

/**
 * GETリクエスト処理 - データを取得して返す
 */
function doGet(e) {
    var tripId = e.parameter.tripId;

    if (!tripId) {
        return ContentService
            .createTextOutput(JSON.stringify({ error: 'tripId is required' }))
            .setMimeType(ContentService.MimeType.JSON);
    }

    try {
        var sheet = getDataSheet(tripId);
        var data = sheet.getDataRange().getValues();

        if (data.length <= 1) {
            return ContentService
                .createTextOutput(JSON.stringify([]))
                .setMimeType(ContentService.MimeType.JSON);
        }

        var headers = data[0];
        var rows = data.slice(1).map(function (row) {
            var obj = {};
            headers.forEach(function (h, i) {
                obj[h] = row[i];
            });
            return obj;
        });

        return ContentService
            .createTextOutput(JSON.stringify(rows))
            .setMimeType(ContentService.MimeType.JSON);

    } catch (err) {
        Logger.log('doGet error: ' + err.toString());
        return ContentService
            .createTextOutput(JSON.stringify({ error: err.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

/**
 * POSTリクエスト処理 - データを保存・削除・リセット
 */
function doPost(e) {
    try {
        var payload = JSON.parse(e.postData.contents);
        var tripId = payload.tripId;

        if (!tripId) {
            return ContentService
                .createTextOutput(JSON.stringify({ status: 'error', message: 'tripId is required' }))
                .setMimeType(ContentService.MimeType.JSON);
        }

        var action = payload.action;
        var sheet = getDataSheet(tripId);

        if (action === 'RESET') {
            // シート内のデータをクリア（ヘッダーは残す）
            var lastRow = sheet.getLastRow();
            if (lastRow > 1) {
                sheet.deleteRows(2, lastRow - 1);
            }
            return ContentService
                .createTextOutput(JSON.stringify({ status: 'ok', message: 'Reset for tripId: ' + tripId }))
                .setMimeType(ContentService.MimeType.JSON);

        } else if (action === 'BULK_SAVE') {
            // 一括保存：既存データをクリアしてから全件追加
            var lastRow2 = sheet.getLastRow();
            if (lastRow2 > 1) {
                sheet.deleteRows(2, lastRow2 - 1);
            }

            var items = payload.data;
            if (items && items.length > 0) {
                var rows = items.map(function (item) {
                    return HEADERS.map(function (h) {
                        var val = item[h];
                        return val !== undefined && val !== null ? val : '';
                    });
                });
                sheet.getRange(2, 1, rows.length, HEADERS.length).setValues(rows);
            }

            return ContentService
                .createTextOutput(JSON.stringify({ status: 'ok', count: items ? items.length : 0 }))
                .setMimeType(ContentService.MimeType.JSON);

        } else if (action === 'DELETE') {
            // 特定IDの行を削除
            var targetId = payload.id;
            var allData = sheet.getDataRange().getValues();
            for (var i = allData.length - 1; i >= 1; i--) {
                if (String(allData[i][0]) === String(targetId)) {
                    sheet.deleteRow(i + 1);
                    break;
                }
            }
            return ContentService
                .createTextOutput(JSON.stringify({ status: 'ok', message: 'Deleted: ' + targetId }))
                .setMimeType(ContentService.MimeType.JSON);

        } else {
            // 単一アイテムのUPSERT
            var item = payload;
            var existingData = sheet.getDataRange().getValues();
            var existingRowIndex = -1;

            for (var j = 1; j < existingData.length; j++) {
                if (String(existingData[j][0]) === String(item.id)) {
                    existingRowIndex = j + 1;
                    break;
                }
            }

            var rowData = HEADERS.map(function (h) {
                var val = item[h];
                return val !== undefined && val !== null ? val : '';
            });

            if (existingRowIndex > 0) {
                sheet.getRange(existingRowIndex, 1, 1, HEADERS.length).setValues([rowData]);
            } else {
                sheet.appendRow(rowData);
            }

            return ContentService
                .createTextOutput(JSON.stringify({ status: 'ok' }))
                .setMimeType(ContentService.MimeType.JSON);
        }

    } catch (err) {
        Logger.log('doPost error: ' + err.toString());
        return ContentService
            .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}
