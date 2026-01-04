import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProductImageUploadProps {
  currentImageUrl?: string | null;
  onImageChange: (url: string | null) => void;
  productId?: string;
}

export const ProductImageUpload = ({ currentImageUrl, onImageChange, productId }: ProductImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const uploadImage = async (file: File) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Tafadhali chagua picha tu');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Picha ni kubwa sana. Ukubwa wa juu ni 5MB');
      return;
    }

    setUploading(true);

    try {
      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${productId || 'new'}-${Date.now()}.${fileExt}`;
      const filePath = `products/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      setPreviewUrl(publicUrl);
      onImageChange(publicUrl);
      toast.success('Picha imepakiwa!');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error('Imeshindwa kupakia picha');
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Show preview immediately
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      uploadImage(file);
    }
  };

  const removeImage = async () => {
    if (previewUrl && previewUrl.includes('product-images')) {
      try {
        // Extract file path from URL
        const urlParts = previewUrl.split('/product-images/');
        if (urlParts[1]) {
          await supabase.storage
            .from('product-images')
            .remove([urlParts[1]]);
        }
      } catch (error) {
        console.error('Error removing image:', error);
      }
    }
    
    setPreviewUrl(null);
    onImageChange(null);
    
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  return (
    <div className="space-y-3">
      <Label>Picha ya Bidhaa</Label>
      
      {/* Preview */}
      {previewUrl ? (
        <div className="relative w-full aspect-square max-w-[200px] rounded-lg overflow-hidden border border-border">
          <img 
            src={previewUrl} 
            alt="Product preview" 
            className="w-full h-full object-cover"
          />
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2 h-8 w-8 p-0"
            onClick={removeImage}
            disabled={uploading}
          >
            <X className="h-4 w-4" />
          </Button>
          {uploading && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
        </div>
      ) : (
        <div className="flex gap-2">
          {/* Camera button */}
          <Button
            type="button"
            variant="outline"
            className="flex-1 h-20 flex-col gap-1"
            onClick={() => cameraInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Camera className="h-5 w-5" />
                <span className="text-xs">Piga Picha</span>
              </>
            )}
          </Button>
          
          {/* Gallery button */}
          <Button
            type="button"
            variant="outline"
            className="flex-1 h-20 flex-col gap-1"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <ImageIcon className="h-5 w-5" />
                <span className="text-xs">Chagua Picha</span>
              </>
            )}
          </Button>
        </div>
      )}

      {/* Hidden file inputs */}
      <Input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      <Input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />

      <p className="text-xs text-muted-foreground">
        Picha itaonekana kwenye Sokoni. Ukubwa wa juu: 5MB
      </p>
    </div>
  );
};

export default ProductImageUpload;
