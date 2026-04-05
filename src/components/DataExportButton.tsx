import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { exportToExcel, exportToCSV, ExportColumn } from '@/utils/exportUtils';
import { toast } from 'sonner';

interface DataExportButtonProps {
  data: any[];
  columns: ExportColumn[];
  filename: string;
  size?: 'sm' | 'default' | 'icon';
  variant?: 'default' | 'outline' | 'ghost';
  label?: string;
}

export const DataExportButton = ({ data, columns, filename, size = 'sm', variant = 'outline', label }: DataExportButtonProps) => {
  const handleExport = (format: 'excel' | 'csv') => {
    if (!data.length) { toast.error('Hakuna data ya kusafirisha'); return; }
    const success = format === 'excel'
      ? exportToExcel(data, columns, filename)
      : exportToCSV(data, columns, filename);
    if (success) toast.success(`Imehifadhiwa kama ${format === 'excel' ? 'Excel' : 'CSV'}`);
    else toast.error('Imeshindwa kusafirisha');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className="rounded-full gap-1.5">
          <Download className="h-3.5 w-3.5" />
          {label || 'Hamisha'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport('excel')}>
          <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('csv')}>
          <FileText className="h-4 w-4 mr-2" /> CSV (.csv)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
