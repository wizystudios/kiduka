import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export type ExportType = 'image' | 'pdf';

export interface CapturedShareAsset {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
}

export const captureElementAsImage = async (element: HTMLElement): Promise<CapturedShareAsset> => {
  const rect = element.getBoundingClientRect();
  const width = Math.ceil(rect.width || element.scrollWidth);
  const height = Math.ceil(rect.height || element.scrollHeight);

  const canvas = await html2canvas(element, {
    backgroundColor: '#ffffff',
    scale: Math.min(3, Math.max(2, window.devicePixelRatio || 2)),
    useCORS: true,
    allowTaint: true,
    logging: false,
    width,
    height,
    windowWidth: width,
    windowHeight: height,
    scrollX: 0,
    scrollY: 0,
  });

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png', 1));
  if (!blob) throw new Error('Imeshindikana kutengeneza picha');

  return {
    blob,
    dataUrl: canvas.toDataURL('image/png'),
    width: canvas.width,
    height: canvas.height,
  };
};

export const createPdfFromImage = (capture: CapturedShareAsset, filename: string): File => {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const maxWidth = pageWidth - margin * 2;
  const maxHeight = pageHeight - margin * 2;
  const imageRatio = capture.height / capture.width;
  let imgWidth = maxWidth;
  let imgHeight = imgWidth * imageRatio;

  if (imgHeight > maxHeight) {
    imgHeight = maxHeight;
    imgWidth = imgHeight / imageRatio;
  }

  pdf.addImage(capture.dataUrl, 'PNG', (pageWidth - imgWidth) / 2, margin, imgWidth, imgHeight);
  return new File([pdf.output('blob')], filename, { type: 'application/pdf' });
};

export const shareOrDownloadFile = async (file: File, title: string) => {
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
    share?: (data: ShareData) => Promise<void>;
  };

  if (nav.share && (!nav.canShare || nav.canShare({ files: [file] }))) {
    await nav.share({ files: [file], title });
    return 'shared';
  }

  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return 'downloaded';
};