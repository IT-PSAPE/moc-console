import { useCallback, useEffect, useRef, useState } from "react";

type BarcodeDetectorResult = {
  rawValue?: string;
};

type BarcodeDetectorInstance = {
  detect: (source: ImageBitmapSource) => Promise<BarcodeDetectorResult[]>;
};

type BarcodeDetectorConstructor = {
  new(options: { formats: string[] }): BarcodeDetectorInstance;
  getSupportedFormats?: () => Promise<string[]>;
};

type WindowWithBarcodeDetector = Window & {
  BarcodeDetector?: BarcodeDetectorConstructor;
};

type UseQrScannerOptions = {
  onDetected: (rawValue: string) => void;
};

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

function getBarcodeDetector() {
  return (window as WindowWithBarcodeDetector).BarcodeDetector;
}

export function useQrScanner({ onDetected }: UseQrScannerOptions) {
  const [isOpen, setIsOpen] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const onDetectedRef = useRef(onDetected);
  const lastDetectedRef = useRef<{ rawValue: string; time: number } | null>(null);

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    if (!isOpen) {
      lastDetectedRef.current = null;
      return;
    }

    let active = true;
    let detector: BarcodeDetectorInstance | null = null;
    let intervalId: number | null = null;
    let stream: MediaStream | null = null;
    let isDetecting = false;
    let videoElement: HTMLVideoElement | null = null;

    async function detectFrame() {
      if (!active || !detector || !videoRef.current || isDetecting) {
        return;
      }

      if (videoRef.current.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        return;
      }

      isDetecting = true;

      try {
        const detectedCodes = await detector.detect(videoRef.current);
        const rawValue = detectedCodes.find((code) => typeof code.rawValue === "string" && code.rawValue.trim().length > 0)?.rawValue?.trim();

        if (!rawValue) {
          return;
        }

        const now = Date.now();
        const previous = lastDetectedRef.current;
        if (previous && previous.rawValue === rawValue && now - previous.time < 1500) {
          return;
        }

        lastDetectedRef.current = { rawValue, time: now };
        onDetectedRef.current(rawValue);
      } catch {
        // Ignore transient detector failures while the camera is warming up.
      } finally {
        isDetecting = false;
      }
    }

    async function startScanner() {
      setIsStarting(true);
      setError(null);

      const BarcodeDetector = getBarcodeDetector();
      if (!BarcodeDetector || !navigator.mediaDevices?.getUserMedia) {
        setIsSupported(false);
        setIsStarting(false);
        return;
      }

      if (BarcodeDetector.getSupportedFormats) {
        const supportedFormats = await BarcodeDetector.getSupportedFormats();
        if (!supportedFormats.includes("qr_code")) {
          setIsSupported(false);
          setIsStarting(false);
          return;
        }
      }

      try {
        detector = new BarcodeDetector({ formats: ["qr_code"] });
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
          },
        });
      } catch {
        setError("Camera access is unavailable on this device. Check camera permissions and try again.");
        setIsStarting(false);
        return;
      }

      if (!active) {
        stopStream(stream);
        return;
      }

      const video = videoRef.current;
      if (!video) {
        stopStream(stream);
        setError("The scanner preview could not be started. Please close this dialog and try again.");
        setIsStarting(false);
        return;
      }

      videoElement = video;
      video.srcObject = stream;
      await video.play().catch(() => undefined);

      if (!active) {
        stopStream(stream);
        return;
      }

      setIsSupported(true);
      setIsStarting(false);
      intervalId = window.setInterval(() => {
        void detectFrame();
      }, 400);
    }

    void startScanner();

    return () => {
      active = false;
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
      if (videoElement) {
        videoElement.pause();
        videoElement.srcObject = null;
      }
      stopStream(stream);
    };
  }, [isOpen]);

  const openScanner = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeScanner = useCallback(() => {
    setIsOpen(false);
    setIsStarting(false);
  }, []);

  return {
    state: {
      isOpen,
      isStarting,
      isSupported,
      error,
    },
    actions: {
      closeScanner,
      openScanner,
    },
    meta: {
      videoRef,
    },
  };
}
