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
  workbook.creator = t('common.appName');
  workbook.created = new Date();

  // Helper functions
  const getDisplayName = (id: string) => profiles.find(p => p.id === id)?.displayName || id;
  const balances = calculateBalances(expenses, profiles);
  const settlements = tripSettings.settlementMethod === 'individual' 
    ? calculateIndividualSettlements(expenses, profiles)
    : calculateSettlements(balances);
  const totalJPY = expenses.reduce((sum, e) => sum + convertToJPY(e.amount, e.currency, e.exchangeRate), 0);

  // 1. 概要シート
  const summarySheet = workbook.addWorksheet(t('export.summary'));
  summarySheet.columns = [
    { header: t('export.item'), key: 'item', width: 25 },
    { header: t('export.value'), key: 'value', width: 35 },
    { header: t('export.note'), key: 'note', width: 40 }
  ];
  
  summarySheet.addRow({ item: t('export.tripName'), value: tripSettings.tripName });
  summarySheet.addRow({ item: t('export.period'), value: `${tripSettings.tripStartDate} 〜 ${tripSettings.tripEndDate}` });
  const yen = t('common.yen');
  summarySheet.addRow({ item: t('export.budget'), value: `${tripSettings.budget.toLocaleString()}${yen}` });
  summarySheet.addRow({ item: t('export.totalExpense'), value: `${Math.round(totalJPY).toLocaleString()}${yen}` });
  summarySheet.addRow({});
  
  const methodIndividual = t('export.settlementIndividual');
  const methodSmart = t('export.settlementSmart');
  summarySheet.addRow({ item: t('export.settlementMethod'), value: tripSettings.settlementMethod === 'individual' ? methodIndividual : methodSmart });
  summarySheet.addRow({ item: t('export.settlementInst'), value: t('export.sender'), note: t('export.receiver') }).font = { bold: true };
  if (settlements.length === 0) {
    summarySheet.addRow({ item: t('export.settlementDone'), value: t('export.settlementEqual') });
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

  summarySheet.addRow({ item: t('export.personalBalance'), value: t('export.name'), note: t('export.balanceDesc') }).font = { bold: true };
  profiles.forEach(p => {
    summarySheet.addRow({
      item: p.displayName,
      value: `${Math.round(balances[p.id] || 0).toLocaleString()}${yen}`,
      note: balances[p.id] >= 0 ? t('export.waitingReceive') : t('export.needPay')
    });
  });

  // 2. 支出精算シート
  const expenseSheet = workbook.addWorksheet(t('export.expenseSheet'));
  expenseSheet.columns = [
    { header: t('export.colDate'), key: 'date', width: 15 },
    { header: t('export.colContent'), key: 'title', width: 30 },
    { header: t('export.colCategory'), key: 'category', width: 15 },
    { header: t('export.colPaidBy'), key: 'paidBy', width: 15 },
    { header: t('export.colAmount'), key: 'amount', width: 15 },
    { header: t('export.colCurrency'), key: 'currency', width: 10 },
    { header: t('export.colRate'), key: 'rate', width: 10 },
    { header: t('export.colJpy'), key: 'jpy', width: 15 },
    { header: t('export.colSplitWith'), key: 'splitWith', width: 40 },
  ];
  expenses.forEach(e => {
    expenseSheet.addRow({
      date: e.date,
      title: e.title,
      category: t(`categories.${e.category?.toLowerCase()}`) || e.category,
      paidBy: getDisplayName(e.paidBy),
      amount: e.amount.toLocaleString(),
      currency: e.currency,
      rate: e.exchangeRate,
      jpy: `${Math.round(convertToJPY(e.amount, e.currency, e.exchangeRate)).toLocaleString()}${yen}`,
      splitWith: e.splitWith.map(id => getDisplayName(id)).join(", ")
    });
  });

  const allLabel = t('expenseList.all');

  // 3. スケジュールシート
  const itinerarySheet = workbook.addWorksheet(t('export.itinerarySheet'));
  itinerarySheet.columns = [
    { header: t('export.colDate'), key: 'date', width: 15 },
    { header: t('export.colTime'), key: 'time', width: 10 },
    { header: t('export.colContent'), key: 'title', width: 30 },
    { header: t('export.colLocation'), key: 'location', width: 30 },
    { header: t('export.colMemo'), key: 'memo', width: 40 },
    { header: t('export.colParticipants'), key: 'participants', width: 25 },
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
  const ticketSheet = workbook.addWorksheet(t('export.ticketSheet'));
  ticketSheet.columns = [
    { header: t('export.colType'), key: 'type', width: 15 },
    { header: t('export.colTitle'), key: 'title', width: 30 },
    { header: t('export.colProvider'), key: 'provider', width: 25 },
    { header: t('export.colDate'), key: 'date', width: 15 },
    { header: t('export.colTime'), key: 'time', width: 10 },
    { header: t('export.colRef'), key: 'ref', width: 20 },
    { header: t('export.colNotes'), key: 'notes', width: 30 },
    { header: t('export.colUsers'), key: 'passengers', width: 25 },
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
  const packingSheet = workbook.addWorksheet(t('export.packingSheet'));
  packingSheet.columns = [
    { header: t('export.colCategory'), key: 'category', width: 15 },
    { header: t('export.colItem'), key: 'title', width: 30 },
    { header: t('export.colReady'), key: 'packed', width: 10 },
    { header: t('export.colAssignees'), key: 'assignees', width: 25 },
    { header: t('export.colDoneBy'), key: 'packedBy', width: 25 },
  ];
  
  const mapCategory = (cat: string) => {
      // NOTE: カテゴリマッピング。保存値が日本語のため、キーに変換して翻訳。
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
      const catId = map[cat] || 'other';
      return t(`packing.cat_${catId}`) || cat;
  };

  packingList.forEach(item => {
    packingSheet.addRow({
        category: mapCategory(item.category),
        title: item.title,
        packed: item.isPacked ? t('export.markO') : t('export.markX'),
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
