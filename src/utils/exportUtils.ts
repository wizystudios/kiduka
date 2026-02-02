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

// Export multiple sheets to Excel
export const exportMultipleToExcel = (
  sheets: { data: any[]; name: string; columns: ExportColumn[] }[], 
  filename: string
) => {
  try {
    const workbook = XLSX.utils.book_new();
    
    sheets.forEach(sheet => {
      const exportData = sheet.data.map((row) => {
        const transformedRow: any = {};
        sheet.columns.forEach((col) => {
          const value = row[col.key];
          transformedRow[col.header] = col.formatter ? col.formatter(value) : value;
        });
        return transformedRow;
      });
      
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
    });
    
    XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
    return true;
  } catch (error) {
    console.error('Export error:', error);
    return false;
  }
};

// Generate PDF using browser print
export const exportToPDF = (title: string, contentHtml: string) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return false;

  const styles = `
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; }
      table { width: 100%; border-collapse: collapse; margin-top: 20px; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
      th { background-color: #f4f4f4; font-weight: bold; }
      .header { text-align: center; margin-bottom: 20px; }
      .stats { display: flex; gap: 20px; margin-bottom: 20px; flex-wrap: wrap; }
      .stat-card { border: 1px solid #ddd; padding: 10px; border-radius: 4px; min-width: 120px; }
      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    </style>
  `;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      ${styles}
    </head>
    <body>
      <div class="header">
        <h1>Kiduka POS - ${title}</h1>
        <p>Tarehe: ${new Date().toLocaleDateString('sw-TZ')}</p>
      </div>
      ${contentHtml}
    </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();

  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 500);
  
  return true;
};

// Create printable table HTML
export const createPrintableTable = (
  data: any[], 
  columns: ExportColumn[],
  title: string
) => {
  const rows = data.map(item => {
    return `<tr>${columns.map(col => {
      let value = item[col.key];
      if (col.formatter) {
        value = col.formatter(value);
      }
      return `<td>${value ?? '-'}</td>`;
    }).join('')}</tr>`;
  }).join('');

  return `
    <h2>${title}</h2>
    <table>
      <thead>
        <tr>${columns.map(col => `<th>${col.header}</th>`).join('')}</tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
};
