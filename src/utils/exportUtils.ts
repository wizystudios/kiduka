import * as XLSX from 'xlsx';

export interface ExportColumn {
  header: string;
  key: string;
  formatter?: (value: any) => string | number;
}

export const exportToExcel = (
  data: any[],
  columns: ExportColumn[],
  filename: string
) => {
  try {
    // Transform data based on columns
    const exportData = data.map((row) => {
      const transformedRow: any = {};
      columns.forEach((col) => {
        const value = row[col.key];
        transformedRow[col.header] = col.formatter ? col.formatter(value) : value;
      });
      return transformedRow;
    });

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Set column widths
    const colWidths = columns.map((col) => ({ wch: 20 }));
    ws['!cols'] = colWidths;

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');

    // Generate file
    XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    return true;
  } catch (error) {
    console.error('Export error:', error);
    return false;
  }
};

export const exportToCSV = (
  data: any[],
  columns: ExportColumn[],
  filename: string
) => {
  try {
    // Create CSV header
    const headers = columns.map((col) => col.header).join(',');

    // Create CSV rows
    const rows = data.map((row) => {
      return columns
        .map((col) => {
          const value = row[col.key];
          const formatted = col.formatter ? col.formatter(value) : value;
          // Escape commas and quotes
          const escaped = String(formatted).replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(',');
    });

    // Combine header and rows
    const csv = [headers, ...rows].join('\n');

    // Create blob and download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    return true;
  } catch (error) {
    console.error('Export error:', error);
    return false;
  }
};
