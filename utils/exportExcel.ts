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
}) {
  const { profiles, expenses, itinerary, tickets, packingList, tripSettings } = params;

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
  const summarySheet = workbook.addWorksheet('概要');
  summarySheet.columns = [
    { header: '項目', key: 'item', width: 25 },
    { header: '値', key: 'value', width: 35 },
    { header: '備考', key: 'note', width: 40 }
  ];
  
  summarySheet.addRow({ item: '旅行名', value: tripSettings.tripName });
  summarySheet.addRow({ item: '期間', value: `${tripSettings.tripStartDate} 〜 ${tripSettings.tripEndDate}` });
  summarySheet.addRow({ item: '予算', value: `${tripSettings.budget.toLocaleString()}円` });
  summarySheet.addRow({ item: '合計支出', value: `${Math.round(totalJPY).toLocaleString()}円` });
  summarySheet.addRow({});
  
  summarySheet.addRow({ item: '精算方式', value: tripSettings.settlementMethod === 'individual' ? '個別精算（相殺あり）' : 'スマート精算（推奨ルート）' });
  summarySheet.addRow({ item: '【精算指示】', value: '送金する人', note: '受け取る人' }).font = { bold: true };
  if (settlements.length === 0) {
    summarySheet.addRow({ item: '精算完了', value: '全員の収支は均等です' });
  } else {
    settlements.forEach(s => {
      summarySheet.addRow({
        item: `${Math.round(s.amount).toLocaleString()}円`,
        value: getDisplayName(s.from),
        note: `→ ${getDisplayName(s.to)}`
      });
    });
  }
  summarySheet.addRow({});

  summarySheet.addRow({ item: '【個人別収支】', value: '名前', note: '収支(＋が受取/－が支払)' }).font = { bold: true };
  profiles.forEach(p => {
    summarySheet.addRow({
      item: p.displayName,
      value: `${Math.round(balances[p.id] || 0).toLocaleString()}円`,
      note: balances[p.id] >= 0 ? "受取待ち" : "支払いが必要"
    });
  });

  // 2. 支出精算シート
  const expenseSheet = workbook.addWorksheet('支出精算');
  expenseSheet.columns = [
    { header: '日付', key: 'date', width: 15 },
    { header: '内容', key: 'title', width: 30 },
    { header: 'カテゴリ', key: 'category', width: 15 },
    { header: '支払者', key: 'paidBy', width: 15 },
    { header: '金額', key: 'amount', width: 15 },
    { header: '通貨', key: 'currency', width: 10 },
    { header: 'レート', key: 'rate', width: 10 },
    { header: '日本円相当', key: 'jpy', width: 15 },
    { header: '精算対象', key: 'splitWith', width: 40 },
  ];
  expenses.forEach(e => {
    expenseSheet.addRow({
      date: e.date,
      title: e.title,
      category: e.category,
      paidBy: getDisplayName(e.paidBy),
      amount: e.amount.toLocaleString(),
      currency: e.currency,
      rate: e.exchangeRate,
      jpy: `${Math.round(convertToJPY(e.amount, e.currency, e.exchangeRate)).toLocaleString()}円`,
      splitWith: e.splitWith.map(id => getDisplayName(id)).join(", ")
    });
  });

  // 3. スケジュールシート
  const itinerarySheet = workbook.addWorksheet('スケジュール');
  itinerarySheet.columns = [
    { header: '日付', key: 'date', width: 15 },
    { header: '時刻', key: 'time', width: 10 },
    { header: '内容', key: 'title', width: 30 },
    { header: '場所', key: 'location', width: 30 },
    { header: 'メモ', key: 'memo', width: 40 },
    { header: '参加者', key: 'participants', width: 25 },
  ];
  itinerary.forEach(item => {
    itinerarySheet.addRow({
      date: item.date,
      time: item.time,
      title: item.title,
      location: item.location || "",
      memo: item.memo || "",
      participants: item.participantIds && item.participantIds.length > 0 ? item.participantIds.map(id => getDisplayName(id)).join(", ") : "全員"
    });
  });

  // 4. チケットシート
  const ticketSheet = workbook.addWorksheet('チケット');
  ticketSheet.columns = [
    { header: '種類', key: 'type', width: 15 },
    { header: 'タイトル', key: 'title', width: 30 },
    { header: '提供元/会社', key: 'provider', width: 25 },
    { header: '日付', key: 'date', width: 15 },
    { header: '時刻', key: 'time', width: 10 },
    { header: '予約番号', key: 'ref', width: 20 },
    { header: 'メモ', key: 'notes', width: 30 },
    { header: '利用者', key: 'passengers', width: 25 },
  ];
  tickets.forEach(item => {
    ticketSheet.addRow({
      type: item.type,
      title: item.title,
      provider: item.provider || "",
      date: item.date,
      time: item.time || "",
      ref: item.referenceNumber || "",
      notes: item.notes || "",
      passengers: item.passengerIds && item.passengerIds.length > 0 ? item.passengerIds.map(id => getDisplayName(id)).join(", ") : "全員"
    });
  });

  // 5. 持ち物シート
  const packingSheet = workbook.addWorksheet('持ち物');
  packingSheet.columns = [
    { header: 'カテゴリ', key: 'category', width: 15 },
    { header: 'アイテム', key: 'title', width: 30 },
    { header: '準備完了', key: 'packed', width: 10 },
    { header: '担当', key: 'assignees', width: 25 },
    { header: '完了者', key: 'packedBy', width: 25 },
  ];
  packingList.forEach(item => {
    packingSheet.addRow({
      category: item.category,
      title: item.title,
      packed: item.isPacked ? "○" : "×",
      assignees: item.assignees && item.assignees.length > 0 ? item.assignees.map(id => getDisplayName(id)).join(", ") : "全員",
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
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  // ネイティブ実装でのダウンロード処理
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `TabiLog_${tripSettings.tripName || 'Export'}_${new Date().toISOString().split('T')[0]}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
