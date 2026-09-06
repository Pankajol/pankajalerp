"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FaCamera,
  FaQrcode,
  FaSearch,
  FaSpinner,
  FaArrowRight,
  FaTruck,
  FaBox,
  FaIndustry,
  FaCheckCircle,
} from "react-icons/fa";
import { toast } from "react-toastify";
import api from "@/lib/api";

// QR Scanner component
const QRScanner = ({ onScan }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setScanning(true);
          scanQR();
        }
      } catch (err) {
        setError("Camera access denied. Please allow camera access.");
        console.error(err);
      }
    };
    startCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, []);

  // Simulate QR scanning (you can integrate a real QR library like `html5-qrcode` or `zxing`)
  const scanQR = () => {
    // For demo: simulate scanning after 3 seconds
    // In production, use `html5-qrcode` library for actual QR detection
    setTimeout(() => {
      // Simulate a scan result
      onScan("TAKA-0001");
    }, 3000);
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-center">
        <FaCamera size={32} className="mx-auto mb-2" />
        <p>{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-4 py-1 bg-red-600 text-white rounded-lg text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <video
        ref={videoRef}
        className="w-full max-w-md mx-auto rounded-xl bg-black aspect-video object-cover"
        muted
      />
      <canvas ref={canvasRef} className="hidden" />
      {scanning && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-48 h-48 border-2 border-white rounded-lg animate-pulse shadow-lg shadow-blue-500/50" />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-4 py-1 rounded-full text-xs">
            Scanning...
          </div>
        </div>
      )}
    </div>
  );
};

export default function ScanQRPage() {
  const router = useRouter();
  const [manualInput, setManualInput] = useState("");
  const [scannedData, setScannedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  // Load scan history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("scanHistory");
      if (saved) setHistory(JSON.parse(saved));
    } catch (e) {}
  }, []);

  const handleScan = async (data) => {
    if (!data) return;
    setManualInput(data);
    await lookupTaka(data);
  };

  const lookupTaka = async (searchValue) => {
    if (!searchValue) return toast.warn("Please enter a Taka number or scan QR");
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();
      // Try as Taka number first, if not, treat as QR data
      if (searchValue.startsWith("TAKA-") || searchValue.startsWith("{")) {
        params.append("qr", searchValue);
      } else {
        params.append("taka", searchValue);
      }
      const res = await api.get(`/textiles/scan?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const taka = res.data.data;
      setScannedData(taka);

      // Add to history
      const newHistory = [
        { takaNumber: taka.takaNumber, timestamp: new Date().toISOString(), id: taka._id },
        ...history.filter(h => h.takaNumber !== taka.takaNumber),
      ].slice(0, 10);
      setHistory(newHistory);
      localStorage.setItem("scanHistory", JSON.stringify(newHistory));

      toast.success(`Found: ${taka.takaNumber}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Taka not found");
      setScannedData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    lookupTaka(manualInput);
  };

  const goToTaka = () => {
    if (scannedData) {
      router.push(`/admin/textiles/takas/${scannedData._id}/view`);
    }
  };

  const goToTraceability = () => {
    if (scannedData) {
      router.push(`/admin/textiles/traceability/${scannedData._id}`);
    }
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem("scanHistory");
  };

  return (
    <div className="p-6 bg-[#f2f5f9] min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <FaQrcode size={28} className="text-indigo-600" />
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Scan QR</h1>
          <p className="text-sm text-gray-500">Scan Taka QR codes to view details</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Scanner & Input */}
        <div className="lg:col-span-2 space-y-4">
          {/* QR Scanner */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
              <FaCamera size={16} /> Scan QR Code
            </h3>
            <QRScanner onScan={handleScan} />
            <p className="text-xs text-gray-400 text-center mt-2">
              Position the QR code in front of the camera
            </p>
          </div>

          {/* Manual Input */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-700 mb-4">Or Enter Manually</h3>
            <form onSubmit={handleSubmit} className="flex gap-3">
              <div className="relative flex-1">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="Enter Taka number (e.g., TAKA-0001)"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition shadow-md disabled:opacity-50"
              >
                {loading ? <FaSpinner className="animate-spin" size={18} /> : "Search"}
              </button>
            </form>
          </div>

          {/* Scan History */}
          {history.length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-700">Recent Scans</h3>
                <button
                  onClick={clearHistory}
                  className="text-xs text-red-500 hover:text-red-700 transition"
                >
                  Clear History
                </button>
              </div>
              <div className="space-y-2">
                {history.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => lookupTaka(item.takaNumber)}
                    className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-indigo-50 transition border border-gray-100"
                  >
                    <span className="font-mono font-bold text-indigo-600">{item.takaNumber}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(item.timestamp).toLocaleString()}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Result */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 sticky top-6">
            <h3 className="font-bold text-gray-700 mb-4">Result</h3>
            {loading ? (
              <div className="text-center py-8">
                <FaSpinner className="animate-spin text-indigo-600 text-3xl mx-auto" />
                <p className="text-gray-400 text-sm mt-2">Searching...</p>
              </div>
            ) : scannedData ? (
              <div className="space-y-3">
                <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                  <p className="text-xs text-gray-500">Taka Number</p>
                  <p className="font-mono font-bold text-indigo-600 text-lg">
                    {scannedData.takaNumber}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-xs text-gray-500">Fabric</p>
                    <p className="font-medium text-gray-800 text-sm">{scannedData.fabric?.itemName}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-xs text-gray-500">Quantity</p>
                    <p className="font-medium text-gray-800 text-sm">{scannedData.quantity} Mtr</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-xs text-gray-500">Shade</p>
                    <p className="font-medium text-gray-800 text-sm">{scannedData.shade?.name || "—"}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-xs text-gray-500">Status</p>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      scannedData.status === "available" ? "bg-green-100 text-green-700" :
                      scannedData.status === "job-work" ? "bg-yellow-100 text-yellow-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>
                      {scannedData.status}
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-xs text-gray-500">Warehouse</p>
                  <p className="font-medium text-gray-800 text-sm">{scannedData.warehouse?.name || "—"}</p>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={goToTaka}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition text-sm"
                  >
                    <FaBox size={14} /> View Taka
                  </button>
                  <button
                    onClick={goToTraceability}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition text-sm"
                  >
                    <FaArrowRight size={14} /> Trace
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <FaQrcode className="text-gray-300 text-4xl mx-auto" />
                <p className="text-gray-400 text-sm mt-2">
                  Scan a QR code or enter a Taka number
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}