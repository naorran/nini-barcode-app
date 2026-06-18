import { useEffect, useState } from "react";
import axios from "axios";
import { Html5Qrcode } from "html5-qrcode";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? `http://${window.location.hostname}:3001` : "");

export default function App() {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showMissing, setShowMissing] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scannerRunning, setScannerRunning] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  async function startScanner() {
    if (!selectedProduct) {
      setMessage("קודם בחר מוצר");
      return;
    }

    try {
      setMessage("פותח מצלמה...");
      setScannerRunning(true);

      const scanner = new Html5Qrcode("barcode-reader");

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 300, height: 160 },
        },
        async (decodedText) => {
          await scanner.stop();
          setScannerRunning(false);

          setBarcode(decodedText);
          setMessage(`נמצא ברקוד: ${decodedText}. שומר...`);

          await saveBarcode(decodedText);
        }
      );
    } catch (err) {
      console.error(err);
      setScannerRunning(false);
      setMessage(
        "ERROR - לא הצלחתי לפתוח מצלמה  : " +
        JSON.stringify(err, Object.getOwnPropertyNames(err))
      );
    }
  }
  async function loadProducts() {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/api/products-missing-barcode`);
      setProducts(res.data);
    } catch (err) {
      console.error(err);
      setMessage("שגיאה בטעינת מוצרים");
    } finally {
      setLoading(false);
    }
  }

  async function handleImageSelected(e) {
    setMessage("handleImageSelected");
    const file = e.target.files?.[0];

    if (!file) {
      setMessage("לא נבחרה תמונה");
      return;
    }

    if (!selectedProduct) {
      setMessage("קודם בחר מוצר");
      return;
    }

    try {
      setMessage("נבחרה תמונה, מנסה לזהות ברקוד...");

      const scanner = new Html5Qrcode("barcode-reader");
      const result = await scanner.scanFile(file, true);

      setBarcode(result);
      setMessage(`נמצא ברקוד: ${result}. שומר...`);

      await saveBarcode(result);
    } catch (err) {
      console.error("Barcode scan error:", err);
      setMessage("לא הצלחתי לזהות ברקוד בתמונה. נסה צילום קרוב וברור יותר.");
      setMessage(
        "ERROR: " +
        JSON.stringify(err, Object.getOwnPropertyNames(err))
      );
    }

    e.target.value = "";
  }

  async function saveBarcode(scannedBarcode) {
    if (!selectedProduct) return;

    try {
      setSaving(true);

      await axios.post(`${API_BASE}/api/save-barcode`, {
        rowNumber: selectedProduct.rowNumber,
        barcode: scannedBarcode,
      });

      setMessage(`נשמר בהצלחה: ${scannedBarcode}`);

      setProducts(prev =>
        prev.filter(p => p.rowNumber !== selectedProduct.rowNumber)
      );

      setSelectedProduct(null);
      setBarcode("");
    } catch (err) {
      console.error(err);
      setMessage("שגיאה בשמירת הברקוד");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 20, direction: "rtl", fontFamily: "Arial" }}>
      <h1>סריקת ברקודים</h1>

      <button onClick={() => setShowMissing(!showMissing)} style={buttonStyle}>
        {showMissing ? "הסתר מוצרים בלי ברקוד" : "הצג מוצרים בלי ברקוד"}
      </button>

      {showMissing && (
        <div style={{ marginTop: 16, border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
          <h3>מוצרים בלי ברקוד: {products.length}</h3>

          {loading ? (
            <p>טוען...</p>
          ) : (
            products.map(product => (
              <button
                key={product.rowNumber}
                onClick={() => {
                  setSelectedProduct(product);
                  setShowMissing(false);
                  setMessage("");
                }}
                style={{
                  ...buttonStyle,
                  background: selectedProduct?.rowNumber === product.rowNumber ? "#111827" : "#f3f4f6",
                  color: selectedProduct?.rowNumber === product.rowNumber ? "white" : "#111827",
                  marginBottom: 8
                }}
              >
                {product.name}
              </button>
            ))
          )}
        </div>
      )}

      <div style={{ marginTop: 24, padding: 18, border: "1px solid #ddd", borderRadius: 12 }}>
        <h2>מוצר נבחר</h2>

        {selectedProduct ? (
          <h3>{selectedProduct.name}</h3>
        ) : (
          <p>בחר מוצר מהרשימה לפני צילום הברקוד</p>
        )}

        <button
          onClick={startScanner}
          disabled={scannerRunning}
          style={buttonStyle}
        >
          {scannerRunning ? "סורק..." : "פתח מצלמה לסריקה"}
        </button>

        <div id="barcode-reader" style={{ marginTop: 16 }} />

        {barcode && <p>ברקוד: {barcode}</p>}
        {saving && <p>שומר...</p>}
        {message && <p style={{ fontWeight: "bold" }}>{message}</p>}
      </div>
    </div>
  );
}

const buttonStyle = {
  width: "100%",
  display: "block",
  padding: "14px",
  borderRadius: "10px",
  border: "1px solid #ddd",
  background: "#f3f4f6",
  fontSize: "16px",
  fontWeight: "bold",
  cursor: "pointer",
  textAlign: "center",
};