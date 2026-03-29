import * as ExcelJS from 'exceljs';
import { Expense, ItineraryItem, Ticket, UserProfile, PackingItem } from '../types';
import { convertToJPY } from './currency';
import { calculateBalances, calculateSettlements, calculateIndividualSettlements } from './settlementUtils';

export async function exportToExcel(params: {
  tripId: string;
  profiles: UserProfile[];
  expenses: Expense[];
  itinerary: ItineraryItem[];
  tickets: Ticket[];
  packingList: PackingItem[];
  tripSettings: {
    tripName: string;
    tripStartDate: string;
    tripEndDate: string;
    coverImage: string;
    budget: number;
    settlementMethod?: 'smart' | 'individual';
  };
  t: (key: string) => string;
}) {
  const { profiles, expenses, itinerary, tickets, packingList, tripSettings, t } = params;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'たびログ';
  workbook.created = new Date();

  // Helper functions
  const getDisplayName = (id: string) => profiles.find(p => p.id === id)?.displayName || id;
  const balances = calculateBalances(expenses, profiles);
  const settlements = tripSettings.settlementMethod === 'individual' 
    ? calculateIndividualSettlements(expenses, profiles)
    : calculateSettlements(balances);
  const totalJPY = expenses.reduce((sum, e) => sum + convertToJPY(e.amount, e.currency, e.exchangeRate), 0);

  // 1. 概要シート
  const summarySheet = workbook.addWorksheet(t('export.summary') || '概要');
  summarySheet.columns = [
    { header: t('export.item') || '項目', key: 'item', width: 25 },
    { header: t('export.value') || '値', key: 'value', width: 35 },
    { header: t('export.note') || '備考', key: 'note', width: 40 }
  ];
  
  summarySheet.addRow({ item: t('export.tripName') || '旅行名', value: tripSettings.tripName });
  summarySheet.addRow({ item: t('export.period') || '期間', value: `${tripSettings.tripStartDate} 〜 ${tripSettings.tripEndDate}` });
  const yen = t('common.yen') || '円';
  summarySheet.addRow({ item: t('export.budget') || '予算', value: `${tripSettings.budget.toLocaleString()}${yen}` });
  summarySheet.addRow({ item: t('export.totalExpense') || '合計支出', value: `${Math.round(totalJPY).toLocaleString()}${yen}` });
  summarySheet.addRow({});
  
  const methodIndividual = t('export.settlementIndividual') || '個別精算（相殺あり）';
  const methodSmart = t('export.settlementSmart') || 'スマート精算（推奨ルート）';
  summarySheet.addRow({ item: t('export.settlementMethod') || '精算方式', value: tripSettings.settlementMethod === 'individual' ? methodIndividual : methodSmart });
  summarySheet.addRow({ item: t('export.settlementInst') || '【精算指示】', value: t('export.sender') || '送金する人', note: t('export.receiver') || '受け取る人' }).font = { bold: true };
  if (settlements.length === 0) {
    summarySheet.addRow({ item: t('export.settlementDone') || '精算完了', value: t('export.settlementEqual') || '全員の収支は均等です' });
  } else {
    settlements.forEach(s => {
      summarySheet.addRow({
        item: `${Math.round(s.amount).toLocaleString()}${yen}`,
        value: getDisplayName(s.from),
        note: `→ ${getDisplayName(s.to)}`
      });
    });
  }
  summarySheet.addRow({});

  summarySheet.addRow({ item: t('export.personalBalance') || '【個人別収支】', value: t('export.name') || '名前', note: t('export.balanceDesc') || '収支(＋が受取/－が支払)' }).font = { bold: true };
  profiles.forEach(p => {
    summarySheet.addRow({
      item: p.displayName,
      value: `${Math.round(balances[p.id] || 0).toLocaleString()}${yen}`,
      note: balances[p.id] >= 0 ? (t('export.waitingReceive') || "受取待ち") : (t('export.needPay') || "支払いが必要")
    });
  });

  // 2. 支出精算シート
  const expenseSheet = workbook.addWorksheet(t('export.expenseSheet') || '支出精算');
  expenseSheet.columns = [
    { header: t('export.colDate') || '日付', key: 'date', width: 15 },
    { header: t('export.colContent') || '内容', key: 'title', width: 30 },
    { header: t('export.colCategory') || 'カテゴリ', key: 'category', width: 15 },
    { header: t('export.colPaidBy') || '支払者', key: 'paidBy', width: 15 },
    { header: t('export.colAmount') || '金額', key: 'amount', width: 15 },
    { header: t('export.colCurrency') || '通貨', key: 'currency', width: 10 },
    { header: t('export.colRate') || 'レート', key: 'rate', width: 10 },
    { header: t('export.colJpy') || '日本円相当', key: 'jpy', width: 15 },
    { header: t('export.colSplitWith') || '精算対象', key: 'splitWith', width: 40 },
  ];
  expenses.forEach(e => {
    expenseSheet.addRow({
      date: e.date,
      title: e.title,
      category: t(`expenseForm.cat_${e.category?.toLowerCase()}`) || e.category,
      paidBy: getDisplayName(e.paidBy),
      amount: e.amount.toLocaleString(),
      currency: e.currency,
      rate: e.exchangeRate,
      jpy: `${Math.round(convertToJPY(e.amount, e.currency, e.exchangeRate)).toLocaleString()}${yen}`,
      splitWith: e.splitWith.map(id => getDisplayName(id)).join(", ")
    });
  });

  const allLabel = t('expenseList.all') || '全員';

  // 3. スケジュールシート
  const itinerarySheet = workbook.addWorksheet(t('export.itinerarySheet') || 'スケジュール');
  itinerarySheet.columns = [
    { header: t('export.colDate') || '日付', key: 'date', width: 15 },
    { header: t('export.colTime') || '時刻', key: 'time', width: 10 },
    { header: t('export.colContent') || '内容', key: 'title', width: 30 },
    { header: t('export.colLocation') || '場所', key: 'location', width: 30 },
    { header: t('export.colMemo') || 'メモ', key: 'memo', width: 40 },
    { header: t('export.colParticipants') || '参加者', key: 'participants', width: 25 },
  ];
  itinerary.forEach(item => {
    itinerarySheet.addRow({
      date: item.date,
      time: item.time,
      title: item.title,
      location: item.location || "",
      memo: item.memo || "",
      participants: item.participantIds && item.participantIds.length > 0 ? item.participantIds.map(id => getDisplayName(id)).join(", ") : allLabel
    });
  });

  // 4. チケットシート
  const ticketSheet = workbook.addWorksheet(t('export.ticketSheet') || 'チケット');
  ticketSheet.columns = [
    { header: t('export.colType') || '種類', key: 'type', width: 15 },
    { header: t('export.colTitle') || 'タイトル', key: 'title', width: 30 },
    { header: t('export.colProvider') || '提供元/会社', key: 'provider', width: 25 },
    { header: t('export.colDate') || '日付', key: 'date', width: 15 },
    { header: t('export.colTime') || '時刻', key: 'time', width: 10 },
    { header: t('export.colRef') || '予約番号', key: 'ref', width: 20 },
    { header: t('export.colNotes') || 'メモ', key: 'notes', width: 30 },
    { header: t('export.colUsers') || '利用者', key: 'passengers', width: 25 },
  ];
  tickets.forEach(item => {
    ticketSheet.addRow({
      type: t(`ticket.type_${item.type}`) || item.type,
      title: item.title,
      provider: item.provider || "",
      date: item.date,
      time: item.time || "",
      ref: item.referenceNumber || "",
      notes: item.notes || "",
      passengers: item.passengerIds && item.passengerIds.length > 0 ? item.passengerIds.map(id => getDisplayName(id)).join(", ") : allLabel
    });
  });

  // 5. 持ち物シート
  const packingSheet = workbook.addWorksheet(t('export.packingSheet') || '持ち物');
  packingSheet.columns = [
    { header: t('export.colCategory') || 'カテゴリ', key: 'category', width: 15 },
    { header: t('export.colItem') || 'アイテム', key: 'title', width: 30 },
    { header: t('export.colReady') || '準備完了', key: 'packed', width: 10 },
    { header: t('export.colAssignees') || '担当', key: 'assignees', width: 25 },
    { header: t('export.colDoneBy') || '完了者', key: 'packedBy', width: 25 },
  ];
  
  const mapCategory = (cat: string) => {
      const map: Record<string, string> = {
          '必需品': 'essentials',
          '衣類': 'clothing',
          '洗面用具': 'toiletries',
          '電子機器': 'electronics',
          '日用品': 'daily',
          '医薬品': 'medical',
          '食品': 'food',
          'その他': 'other'
      };
      const key = map[cat] || 'other';
      return t(`packing.cat_${key}`) || cat;
  };

  packingList.forEach(item => {
    packingSheet.addRow({
        category: mapCategory(item.category),
        title: item.title,
        packed: item.isPacked ? (t('export.markO') || "○") : (t('export.markX') || "×"),
        assignees: item.assignees && item.assignees.length > 0 ? item.assignees.map(id => getDisplayName(id)).join(", ") : allLabel,
        packedBy: item.packedBy && item.packedBy.length > 0 ? item.packedBy.map(id => getDisplayName(id)).join(", ") : ""
    });
  });


  // ヘッダーのスタイル（全シート）
  workbook.worksheets.forEach(sheet => {
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF00A1DE' } // ANAブルー的な色
    };
    
    // 罫線を引く
    sheet.eachRow((row, rowNumber) => {
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFDDDDDD' } },
          left: { style: 'thin', color: { argb: 'FFDDDDDD' } },
          bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } },
          right: { style: 'thin', color: { argb: 'FFDDDDDD' } }
        };
      });
    });
  });

  // ファイルの書き出し
  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = `TabiLog_${tripSettings.tripName || 'Export'}_${new Date().toISOString().split('T')[0]}.xlsx`;
  const fileType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  
  // スマホ(Web Share API)でのファイル共有/保存ルート
  const file = new File([buffer], fileName, { type: fileType });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: fileName,
      });
      return; // 共有成功時はここで終了
    } catch (err) {
      console.log('Share canceled or failed', err);
      // 失敗、キャンセル時は通常のダウンロード方式へフォールバック
    }
  }

  // ノートPC等 / ネイティブ実装でのダウンロード処理
  const blob = new Blob([buffer], { type: fileType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
