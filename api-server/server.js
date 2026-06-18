import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { google } from "googleapis";

dotenv.config({ path: ".env.local" });

const app = express();
const PORT = 3001;
const BARCODE_SHEET_NAME = "barcode-sheet";

app.use(cors());
app.use(express.json());

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
    range: `${BARCODE_SHEET_NAME}!A:C`,
  });

  return result.data.values || [];
}

app.get("/api/products-missing-barcode", async (req, res) => {
  try {
    const rows = await getSheetRows();

    const products = rows
      .slice(1)
      .map((row, index) => ({
        rowNumber: index + 2,
        name: row[0] || "",
        barcode: row[1] || "",
      }))
      .filter(p => p.name && !p.barcode);

    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to load products" });
  }
});

app.post("/api/check-barcode", async (req, res) => {
  try {
    const { barcode } = req.body;
    const rows = await getSheetRows();

    const products = rows.slice(1).map((row, index) => ({
      rowNumber: index + 2,
      name: row[0] || "",
      barcode: row[1] || "",
      extraBarcode: row[2] || "",
    }));

    const found = products.find(p =>
      String(p.barcode).trim() === String(barcode).trim() ||
      String(p.extraBarcode).trim() === String(barcode).trim()
    );

    res.json({ found: found || null });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to check barcode" });
  }
});

app.post("/api/save-barcode", async (req, res) => {
  try {
    const { rowNumber, barcode } = req.body;
    console.log("SAVE REQUEST", rowNumber, barcode);
    const rows = await getSheetRows();
    const row = rows[rowNumber - 1];

    if (!row) {
      return res.status(404).json({ error: "Product row not found" });
    }

    const currentBarcode = row[1] || "";
    const currentExtraBarcode = row[2] || "";

    let columnToUpdate;

    if (!currentBarcode) {
      columnToUpdate = "B";
    } else if (!currentExtraBarcode) {
      columnToUpdate = "C";
    } else {
      return res.status(400).json({
        error: "Product already has two barcodes"
      });
    }

    const auth = getAuth();
    const sheets = google.sheets({ version: "v4", auth });

    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.SHEET_ID,
      range: `${BARCODE_SHEET_NAME}!${columnToUpdate}${rowNumber}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [[barcode]],
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to save barcode" });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Barcode API running at http://0.0.0.0:${PORT}`);
});