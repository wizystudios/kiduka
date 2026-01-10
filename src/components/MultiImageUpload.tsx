import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, Upload, X, Loader2, Image as ImageIcon, Plus, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProductImage {
  id?: string;
  image_url: string;
  display_order: number;
  is_primary: boolean;
}

interface MultiImageUploadProps {
  productId?: string;
  existingImages?: ProductImage[];
  onImagesChange: (images: ProductImage[]) => void;
  maxImages?: number;
}

export const MultiImageUpload = ({
  productId,
  existingImages = [],
  onImagesChange,
  maxImages = 5
}: MultiImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<ProductImage[]>(existingImages);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setImages(existingImages);
  }, [existingImages]);

  const uploadImage = async (file: File) => {
    if (!file) return null;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Tafadhali chagua picha tu');
      return null;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Picha ni kubwa sana. Ukubwa wa juu ni 5MB');
      return null;
    }

    try {
      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${productId || 'new'}-${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
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

      return publicUrl;
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error('Imeshindwa kupakia picha');
      return null;
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = maxImages - images.length;
    if (remainingSlots <= 0) {
      toast.error(`Unaweza kupakia picha ${maxImages} tu`);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    setUploading(true);

    try {
      const uploadedUrls: string[] = [];
      
      for (const file of filesToUpload) {
        const url = await uploadImage(file);
        if (url) {
          uploadedUrls.push(url);
        }
      }

      if (uploadedUrls.length > 0) {
        const newImages: ProductImage[] = uploadedUrls.map((url, index) => ({
          image_url: url,
          display_order: images.length + index,
          is_primary: images.length === 0 && index === 0
        }));

        const updatedImages = [...images, ...newImages];
        setImages(updatedImages);
        onImagesChange(updatedImages);
        toast.success(`Picha ${uploadedUrls.length} zimepakiwa!`);
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const removeImage = async (index: number) => {
    const imageToRemove = images[index];
    
    // Try to remove from storage
    if (imageToRemove.image_url && imageToRemove.image_url.includes('product-images')) {
      try {
        const urlParts = imageToRemove.image_url.split('/product-images/');
        if (urlParts[1]) {
          await supabase.storage
            .from('product-images')
            .remove([urlParts[1]]);
        }
      } catch (error) {
        console.error('Error removing image from storage:', error);
      }
    }

    const updatedImages = images.filter((_, i) => i !== index);
    
    // If we removed the primary image, make the first remaining image primary
    if (imageToRemove.is_primary && updatedImages.length > 0) {
      updatedImages[0].is_primary = true;
    }

    // Re-order display_order
    updatedImages.forEach((img, i) => {
      img.display_order = i;
    });

    setImages(updatedImages);
    onImagesChange(updatedImages);
  };

  const setPrimaryImage = (index: number) => {
    const updatedImages = images.map((img, i) => ({
      ...img,
      is_primary: i === index
    }));
    setImages(updatedImages);
    onImagesChange(updatedImages);
  };

  const canAddMore = images.length < maxImages;

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        Picha za Bidhaa
        <span className="text-xs text-muted-foreground">({images.length}/{maxImages})</span>
      </Label>

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((image, index) => (
            <div 
              key={index} 
              className={`relative aspect-square rounded-lg overflow-hidden border-2 ${
                image.is_primary ? 'border-primary' : 'border-border'
              }`}
            >
              <img 
                src={image.image_url} 
                alt={`Product ${index + 1}`} 
                className="w-full h-full object-cover"
              />
              
              {/* Primary badge */}
              {image.is_primary && (
                <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5">
                  <Star className="h-2.5 w-2.5 fill-current" />
                  Kuu
                </div>
              )}

              {/* Action buttons */}
              <div className="absolute top-1 right-1 flex gap-1">
                {!image.is_primary && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => setPrimaryImage(index)}
                    title="Fanya picha kuu"
                  >
                    <Star className="h-3 w-3" />
                  </Button>
                )}
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => removeImage(index)}
                  disabled={uploading}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}

          {/* Add more button in grid */}
          {canAddMore && (
            <button
              type="button"
              className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Plus className="h-5 w-5" />
                  <span className="text-[10px]">Ongeza</span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Initial upload buttons */}
      {images.length === 0 && (
        <div className="flex gap-2">
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
        multiple
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
        Ongeza picha hadi {maxImages}. Picha ya kwanza itakuwa kuu kwenye Sokoni. Ukubwa wa juu: 5MB kwa picha
      </p>
    </div>
  );
};

export default MultiImageUpload;
