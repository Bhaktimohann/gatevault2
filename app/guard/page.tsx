"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Html5QrcodeScanner, Html5QrcodeScanType } from "html5-qrcode";

export default function GuardPage() {
  const router = useRouter();
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [manualInput, setManualInput] = useState("");
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    // Only initialize scanner on client side
    if (typeof window !== "undefined") {
      scannerRef.current = new Html5QrcodeScanner(
        "qr-reader",
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
        },
        false
      );

      scannerRef.current.render(onScanSuccess, onScanFailure);
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, []);

  const onScanSuccess = (decodedText: string) => {
    // Prevent multiple rapid scans
    if (loading) return;
    setScanResult(decodedText);
    processScan(decodedText);
  };

  const onScanFailure = (error: any) => {
    // Usually ignoring regular scan failures as they happen continuously when no QR is in view
  };

  const processScan = async (qrData: string) => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrData }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ text: data.message, type: "success" });
      } else {
        setMessage({ text: data.message || "Failed to scan", type: "error" });
      }
    } catch (error) {
      setMessage({ text: "Network error occurred", type: "error" });
    } finally {
      setLoading(false);
      // Automatically clear message after 5 seconds to be ready for next scan
      setTimeout(() => {
        setMessage(null);
        setScanResult(null);
      }, 5000);
    }
  };

  const handleManualScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput) {
      processScan(manualInput);
      setManualInput("");
    }
  };

  return (
    <div className="mobile-shell-outer dashboard-shell-outer">
      <div className="mobile-shell dashboard-shell overflow-y-auto">
        
        {/* BACKGROUND */}
        <div className="absolute top-0 left-0 w-full h-[250px] bg-gradient-to-b from-blue-600 to-blue-400 rounded-b-[40px] z-0" />

        <div className="relative z-10 p-6 text-white pt-12">
          <h1 className="text-2xl font-bold text-center">Guard Scanner</h1>
          <p className="text-sm text-center text-blue-100 mt-1">Scan student passes</p>

          {/* MAIN CARD */}
          <div className="glass-card bg-white mt-8 rounded-3xl p-5 text-gray-800 shadow-xl">
            
            {message && (
              <div className={`p-4 rounded-xl mb-6 text-center font-bold ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {message.text}
              </div>
            )}

            {/* QR SCANNER CONTAINER */}
            <div id="qr-reader" className="w-full rounded-2xl overflow-hidden shadow-inner mb-6"></div>

            {loading && (
              <div className="text-center text-blue-500 font-medium my-4 animate-pulse">
                Processing scan...
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-2 font-medium">MANUAL ENTRY (FALLBACK)</p>
              <form onSubmit={handleManualScan} className="flex gap-2">
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="e.g. gatepass-12345"
                  className="flex-1 p-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <button 
                  type="submit"
                  disabled={loading || !manualInput}
                  className="bg-blue-600 text-white px-4 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  Go
                </button>
              </form>
            </div>
            
          </div>
        </div>

      </div>
    </div>
  );
}
