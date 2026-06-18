import { google } from "googleapis";

const BARCODE_SHEET_NAME = "barcode-sheet";

function getAuth() {
  return new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

async function getSheetRows() {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  const result = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.SHEET_ID,
    range: `${BARCODE_SHEET_NAME}!A:B`,
  });

  return result.data.values || [];
}

export async function getProductsMissingBarcode() {
  const rows = await getSheetRows();

  return rows
    .slice(1)
    .map((row, index) => ({
      rowNumber: index + 2,
      name: row[0] || "",
      barcode: row[1] || "",
    }))
    .filter(p => p.name && !p.barcode);
}

export async function saveBarcode(rowNumber, barcode) {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.SHEET_ID,
    range: `${BARCODE_SHEET_NAME}!B${rowNumber}`,
    valueInputOption: "RAW",
    requestBody: {
      values: [[barcode]],
    },
  });

  return { success: true };
}