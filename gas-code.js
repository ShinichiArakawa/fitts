// ============================================================
// Google Apps Script — スプレッドシートに貼り付けるコード
// ============================================================
// 手順:
// 1. Google スプレッドシートを新規作成
// 2. 1行目にヘッダーを入力:
//    A1: 学籍番号  B1: サイズ(px)  C1: クリック回数  D1: ミス回数  E1: 所要時間
// 3. 拡張機能 → Apps Script を開く
// 4. 以下のコードを貼り付けて保存
// 5. デプロイ → 新しいデプロイ → ウェブアプリ
//    - 実行ユーザー: 自分
//    - アクセス: 全員
// 6. デプロイURLを config.js の GAS_URL に貼り付ける
// 7. スプレッドシートの共有URLを config.js の SHEET_URL に貼り付ける
// ============================================================

function doPost(e) {
  var sheet = SpreadsheetApp.openById('スプレッドシートIDをここに入れる').getActiveSheet();
  var data = JSON.parse(e.postData.contents);

  sheet.appendRow([
    data.studentId,
    data.size,
    data.clicks,
    data.miss,
    data.time,
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}
