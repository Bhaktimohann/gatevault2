"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { useSession } from "next-auth/react";
import { PageSkeleton } from "@/components/LoadingSkeleton";

const DUPLICATE_SCAN_COOLDOWN_MS = 15000;
const SCANNER_ELEMENT_ID = "qr-reader";
const SCAN_FPS = 30;

type CameraDevice = {
  id: string;
  label: string;
};

export default function GuardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [manualInput, setManualInput] = useState("");
  const [scannerError, setScannerError] = useState("");
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileScannerRef = useRef<Html5Qrcode | null>(null);
  const processingRef = useRef(false);
  const lastScanRef = useRef<{ value: string; scannedAt: number } | null>(null);
  const selectedCameraIdRef = useRef("");
  const role = (session?.user as { role?: string } | undefined)?.role;
  const canScan = role === "security" || role === "admin";

  const processScan = useCallback(async (qrData: string) => {
    processingRef.current = true;
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
    } catch {
      setMessage({ text: "Network error occurred", type: "error" });
    } finally {
      setLoading(false);
      // Automatically clear message after 5 seconds to be ready for next scan.
      setTimeout(() => {
        setMessage(null);
        processingRef.current = false;
      }, 5000);
    }
  }, []);

  const submitDecodedScan = useCallback((decodedText: string) => {
    const now = Date.now();
    const lastScan = lastScanRef.current;

    if (
      processingRef.current ||
      (lastScan?.value === decodedText && now - lastScan.scannedAt < DUPLICATE_SCAN_COOLDOWN_MS)
    ) {
      return;
    }

    processingRef.current = true;
    lastScanRef.current = { value: decodedText, scannedAt: now };
    processScan(decodedText);
  }, [processScan]);

  const onScanSuccess = useCallback((decodedText: string) => {
    submitDecodedScan(decodedText);
  }, [submitDecodedScan]);

  const onScanFailure = useCallback(() => {
    // Regular scan failures happen continuously when no QR is in view.
  }, []);

  const stopScanner = useCallback(async () => {
    if (!scannerRef.current) {
      return;
    }

    try {
      if (scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }
      await scannerRef.current.clear();
    } catch (error) {
      console.error("Scanner stop failed:", error);
    } finally {
      scannerRef.current = null;
    }
  }, []);

  const getPreferredCameraId = useCallback((availableCameras: CameraDevice[]) => {
    const activeCameraId = selectedCameraIdRef.current;

    if (activeCameraId && availableCameras.some((camera) => camera.id === activeCameraId)) {
      return activeCameraId;
    }

    const backCamera = availableCameras.find((camera) => /back|rear|environment/i.test(camera.label));
    return backCamera?.id || availableCameras[0]?.id || "";
  }, []);

  const getScanBoxSize = useCallback((viewfinderWidth: number, viewfinderHeight: number) => {
    const shortestSide = Math.min(viewfinderWidth, viewfinderHeight);
    const size = Math.floor(Math.min(Math.max(shortestSide * 0.78, 260), 420));

    return { width: size, height: size };
  }, []);

  const startScanner = useCallback(async () => {
    if (typeof window === "undefined" || status !== "authenticated" || !canScan) {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setScannerError("Camera access is not available in this browser. Use Scan QR from image or manual entry.");
      return;
    }

    await stopScanner();

    try {
      const availableCameras = await Html5Qrcode.getCameras();
      setCameras(availableCameras);

      const cameraId = getPreferredCameraId(availableCameras);
      if (!cameraId) {
        setScannerError("No camera was found. Use Scan QR from image or manual entry.");
        return;
      }

      selectedCameraIdRef.current = cameraId;
      setSelectedCameraId(cameraId);
      const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID, {
        verbose: false,
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        useBarCodeDetectorIfSupported: true,
      });
      scannerRef.current = scanner;

      await scanner.start(
        cameraId,
        {
          fps: SCAN_FPS,
          qrbox: getScanBoxSize,
          aspectRatio: 1.333334,
          disableFlip: true,
          videoConstraints: {
            deviceId: { exact: cameraId },
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        onScanSuccess,
        onScanFailure
      );
      setScannerError("");
    } catch (error) {
      console.error("Scanner initialization failed:", error);
      scannerRef.current = null;
      setScannerError("Could not start the camera. Close other apps using the camera, allow camera permission, then tap Retry camera.");
    }
  }, [canScan, getPreferredCameraId, getScanBoxSize, onScanFailure, onScanSuccess, status, stopScanner]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status !== "authenticated" || !canScan) {
      return;
    }

    startScanner();

    return () => {
      stopScanner();
    };
  }, [status, canScan, router, startScanner, stopScanner]);

  const handleManualScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput) {
      submitDecodedScan(manualInput);
      setManualInput("");
    }
  };

  const handleImageScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";

    if (!file || processingRef.current) {
      return;
    }

    try {
      if (!fileScannerRef.current) {
        fileScannerRef.current = new Html5Qrcode("qr-file-reader");
      }

      const decodedText = await fileScannerRef.current.scanFile(file, false);
      submitDecodedScan(decodedText);
    } catch {
      setMessage({ text: "Could not read a valid QR from this image", type: "error" });
    }
  };

  if (status === "loading") {
    return <PageSkeleton />;
  }

  if (!canScan) {
    return (
      <div className="min-h-screen bg-gray-100 px-4 py-6 text-gray-800">
        <main className="mx-auto max-w-3xl rounded-lg bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold">Security access required</h1>
          <p className="mt-2 text-sm text-gray-500">Please log in with a security account to use the scanner.</p>
          <button
            type="button"
            onClick={() => router.push("/security")}
            className="mt-5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white"
          >
            Security Dashboard
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="mobile-shell-outer dashboard-shell-outer">
      <div className="mobile-shell dashboard-shell overflow-y-auto">
        
        {/* BACKGROUND */}
        <div className="absolute top-0 left-0 w-full h-[250px] bg-gradient-to-b from-blue-600 to-blue-400 rounded-b-[40px] z-0" />

        <div className="relative z-10 p-6 text-white pt-12">
          <h1 className="text-2xl font-bold text-center">Guard Scanner</h1>
          <p className="text-sm text-center text-blue-100 mt-1">Scan student passes</p>
          <button
            type="button"
            onClick={() => router.push("/security")}
            className="mt-4 w-full rounded-xl bg-white/15 py-2 text-sm font-medium text-white backdrop-blur hover:bg-white/25"
          >
            Back to Security Dashboard
          </button>

          {/* MAIN CARD */}
          <div className="glass-card bg-white mt-8 rounded-3xl p-5 text-gray-800 shadow-xl">
            
            {message && (
              <div className={`p-4 rounded-xl mb-6 text-center font-bold ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {message.text}
              </div>
            )}

            {/* QR SCANNER CONTAINER */}
            <div id={SCANNER_ELEMENT_ID} className="w-full rounded-2xl overflow-hidden shadow-inner mb-6"></div>
            <div id="qr-file-reader" className="hidden"></div>

            {scannerError && (
              <div className="mb-6 rounded-xl bg-amber-50 p-4 text-center text-sm font-semibold text-amber-700">
                {scannerError}
              </div>
            )}

            <div className="mb-4 grid gap-2">
              {cameras.length > 1 && (
                <select
                  value={selectedCameraId}
                  onChange={(event) => {
                    selectedCameraIdRef.current = event.target.value;
                    setSelectedCameraId(event.target.value);
                    startScanner();
                  }}
                  className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-700"
                >
                  {cameras.map((camera, index) => (
                    <option key={camera.id} value={camera.id}>
                      {camera.label || `Camera ${index + 1}`}
                    </option>
                  ))}
                </select>
              )}
              <button
                type="button"
                onClick={startScanner}
                className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Retry camera
              </button>
            </div>

            {loading && (
              <div className="text-center text-blue-500 font-medium my-4 animate-pulse">
                Processing scan...
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-100">
              <label className="mb-4 block w-full cursor-pointer rounded-xl border border-dashed border-blue-200 bg-blue-50 px-4 py-3 text-center text-sm font-medium text-blue-700 hover:bg-blue-100">
                Scan QR from image
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageScan}
                  disabled={loading}
                  className="hidden"
                />
              </label>

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
