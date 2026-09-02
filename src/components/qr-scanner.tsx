"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Camera, CameraOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Dictionary } from "@/lib/i18n";

// Codes repeat every scanned frame while the member's phone/card stays in
// view — ignore the same code again within this window instead of firing
// a check-in call per frame.
const RESCAN_COOLDOWN_MS = 4000;

export function QrScanner({ t, onScan, disabled }: { t: Dictionary; onScan: (code: string) => void; disabled?: boolean }) {
  const elementId = `qr-scanner-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const scannerRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const lastScanRef = useRef<{ text: string; at: number } | null>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [cameraId, setCameraId] = useState("");
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      const scanner = scannerRef.current;
      if (scanner) {
        scanner.stop().catch(() => {}).finally(() => scanner.clear());
      }
    };
  }, []);

  async function startWithCamera(targetId: string) {
    const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
    const scanner = new Html5Qrcode(elementId, {
      formatsToSupport: [
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.CODE_93,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODABAR,
        Html5QrcodeSupportedFormats.ITF,
      ],
      verbose: false,
    });
    scannerRef.current = scanner;
    await scanner.start(
      targetId,
      // Wider, shorter box than a plain square — QR codes still fit, and
      // 1D barcodes (which are wide rectangles) scan far more reliably.
      { fps: 10, qrbox: { width: 280, height: 160 } },
      (decodedText) => {
        const now = Date.now();
        const last = lastScanRef.current;
        if (last && last.text === decodedText && now - last.at < RESCAN_COOLDOWN_MS) return;
        lastScanRef.current = { text: decodedText, at: now };
        onScanRef.current(decodedText);
      },
      () => {}
    );
    setScanning(true);
  }

  async function stopScanner() {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (scanner) {
      try {
        await scanner.stop();
        scanner.clear();
      } catch {
        // already stopped
      }
    }
  }

  async function start() {
    setError("");
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      let devices = cameras;
      if (devices.length === 0) {
        const found = await Html5Qrcode.getCameras();
        devices = found.map((d) => ({ id: d.id, label: d.label || d.id }));
        setCameras(devices);
      }
      if (devices.length === 0) {
        setError(t.qrScanner.noCamera);
        return;
      }
      const targetId = cameraId || devices[0].id;
      setCameraId(targetId);
      await startWithCamera(targetId);
    } catch {
      setError(t.qrScanner.cameraError);
      setScanning(false);
    }
  }

  async function stop() {
    setScanning(false);
    await stopScanner();
  }

  async function switchCamera(nextId: string) {
    setCameraId(nextId);
    if (!scanning) return;
    setError("");
    try {
      await stopScanner();
      await startWithCamera(nextId);
    } catch {
      setError(t.qrScanner.cameraError);
      setScanning(false);
    }
  }

  return (
    <div className="space-y-3">
      {cameras.length > 1 && (
        <Select value={cameraId} onChange={(e) => switchCamera(e.target.value)} aria-label={t.qrScanner.selectCamera}>
          {cameras.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </Select>
      )}

      <div
        id={elementId}
        className={cn("rounded-lg overflow-hidden bg-black/90 aspect-square max-w-xs mx-auto [&_video]:w-full [&_video]:h-full [&_video]:object-cover", scanning ? "block" : "hidden")}
      />

      {scanning && <p className="text-xs text-center text-[var(--muted)]">{t.qrScanner.scanning}</p>}
      {error && <p className="text-xs text-center text-red-600">{error}</p>}

      <Button
        type="button"
        variant={scanning ? "outline" : "primary"}
        className="w-full"
        disabled={disabled}
        onClick={() => (scanning ? stop() : start())}
      >
        {scanning ? (
          <>
            <CameraOff className="w-4 h-4" /> {t.qrScanner.stopScan}
          </>
        ) : (
          <>
            <Camera className="w-4 h-4" /> {t.qrScanner.startScan}
          </>
        )}
      </Button>
    </div>
  );
}
