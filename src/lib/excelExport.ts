/**
 * Utility for exporting clean UTF-8 CSV / Excel files compatible with Microsoft Excel, Google Sheets, LibreOffice.
 * Includes UTF-8 Byte Order Mark (\uFEFF) so French characters (é, è, à, ê, FCFA, etc.) open cleanly.
 */

export const exportToCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
  const escapeCell = (cell: string | number | undefined | null): string => {
    if (cell === null || cell === undefined) return '""';
    const cellStr = String(cell).replace(/"/g, '""');
    return `"${cellStr}"`;
  };

  const headerRow = headers.map(escapeCell).join(';');
  const dataRows = rows.map((row) => row.map(escapeCell).join(';'));
  
  // \uFEFF is the UTF-8 BOM required by Excel to render UTF-8 accents properly
  const csvContent = '\uFEFF' + [headerRow, ...dataRows].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename.replace(/[^a-z0-9_-]/gi, '_')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
