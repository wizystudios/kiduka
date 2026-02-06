import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, Upload, Store, UserPlus, ArrowRight, Image } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ImageSearchModalProps {
  open: boolean;
  onClose: () => void;
}

export const ImageSearchModal = ({ open, onClose }: ImageSearchModalProps) => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [mode, setMode] = useState<'select' | 'result'>('select');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setMode('result');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCameraCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      // For now, redirect to file input as camera API requires more setup
      stream.getTracks().forEach(track => track.stop());
      fileInputRef.current?.click();
    } catch (error) {
      // Fallback to file picker
      fileInputRef.current?.click();
    }
  };

  const handleReset = () => {
    setSelectedImage(null);
    setMode('select');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            Tafuta kwa Picha
          </DialogTitle>
        </DialogHeader>

        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileSelect}
        />

        {mode === 'select' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Pakia picha ya bidhaa ili kutafuta bidhaa zinazofanana sokoni
            </p>

            <div className="grid grid-cols-2 gap-3">
              <Card 
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={handleCameraCapture}
              >
                <CardContent className="p-4 text-center">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                    <Camera className="h-6 w-6 text-primary" />
                  </div>
                  <p className="font-medium text-sm">Piga Picha</p>
                  <p className="text-xs text-muted-foreground">Tumia kamera</p>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <CardContent className="p-4 text-center">
                  <div className="h-12 w-12 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-2">
                    <Upload className="h-6 w-6 text-secondary-foreground" />
                  </div>
                  <p className="font-medium text-sm">Pakia Picha</p>
                  <p className="text-xs text-muted-foreground">Chagua galari</p>
                </CardContent>
              </Card>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground text-center mb-3">
                Je, wewe ni muuzaji?
              </p>
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Store className="h-8 w-8 text-primary flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">Ingia kama Mfanyabiashara</p>
                      <p className="text-xs text-muted-foreground">
                        Uza bidhaa zako kwenye Sokoni
                      </p>
                    </div>
                    <Button 
                      size="sm"
                      onClick={() => {
                        handleClose();
                        navigate('/auth');
                      }}
                    >
                      Ingia
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="flex items-center justify-center gap-2 mt-3">
                <span className="text-xs text-muted-foreground">Huna akaunti?</span>
                <Button 
                  variant="link" 
                  size="sm" 
                  className="h-auto p-0 text-xs"
                  onClick={() => {
                    handleClose();
                    navigate('/auth?mode=signup');
                  }}
                >
                  Jisajili Sasa
                  <UserPlus className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {mode === 'result' && selectedImage && (
          <div className="space-y-4">
            <div className="aspect-square bg-muted rounded-2xl overflow-hidden">
              <img 
                src={selectedImage} 
                alt="Selected" 
                className="w-full h-full object-cover"
              />
            </div>

            <Card className="bg-muted/50">
              <CardContent className="p-4 text-center">
                <Image className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium">Utafutaji wa Picha</p>
                <p className="text-xs text-muted-foreground">
                  Huduma hii itapatikana hivi karibuni. Tumia maneno kutafuta bidhaa.
                </p>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleReset} className="flex-1">
                Jaribu Tena
              </Button>
              <Button onClick={handleClose} className="flex-1">
                Funga
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
