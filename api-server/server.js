import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import {
  getProductsMissingBarcode,
  saveBarcode,
} from "../shared/barcodeSheet.js";

dotenv.config({ path: ".env.local" });

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.get("/api/products-missing-barcode", async (req, res) => {
  try {
    const products = await getProductsMissingBarcode();
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to load products" });
  }
});

app.post("/api/save-barcode", async (req, res) => {
  try {
    const { rowNumber, barcode } = req.body;
    const result = await saveBarcode(rowNumber, barcode);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to save barcode" });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Barcode API running at http://0.0.0.0:${PORT}`);
});