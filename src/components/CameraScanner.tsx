
import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, X } from 'lucide-react';

interface CameraScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export const CameraScanner = ({ onScan, onClose, isOpen }: CameraScannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    if (isOpen && !isScanning) {
      startScanning();
    } else if (!isOpen) {
      stopScanning();
    }

    return () => {
      stopScanning();
    };
  }, [isOpen]);

  const startScanning = async () => {
    try {
      setError(null);
      setIsScanning(true);
      
      readerRef.current = new BrowserMultiFormatReader();
      
      if (videoRef.current) {
        const result = await readerRef.current.decodeOnceFromVideoDevice(undefined, videoRef.current);
        if (result) {
          onScan(result.getText());
          stopScanning();
        }
      }
    } catch (err) {
      console.error('Error starting camera:', err);
      setError('Unable to access camera. Please ensure camera permissions are granted.');
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    if (readerRef.current) {
      readerRef.current.reset();
      readerRef.current = null;
    }
    setIsScanning(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold flex items-center">
              <Camera className="h-5 w-5 mr-2" />
              Scan Barcode
            </h3>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {error ? (
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={startScanning} variant="outline">
                Try Again
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <video
                ref={videoRef}
                className="w-full h-64 bg-gray-200 rounded-lg"
                autoPlay
                playsInline
              />
              <p className="text-sm text-gray-600 text-center">
                Position the barcode within the camera view
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
