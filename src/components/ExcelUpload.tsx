import React from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, X } from 'lucide-react';
import { RumalEntry, DistributionStatus } from '../types';
import { cn } from '../lib/utils';

interface ExcelUploadProps {
  onUpload: (data: RumalEntry[]) => void;
}

export const ExcelUpload: React.FC<ExcelUploadProps> = ({ onUpload }) => {
  const [isDragging, setIsDragging] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const bstr = e.target?.result;
      const workbook = XLSX.read(bstr, { type: 'binary' });
      const wsname = workbook.SheetNames[0];
      const ws = workbook.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws) as any[];

      const mappedData: RumalEntry[] = data.map((item) => {
        // Find keys case-insensitively
        const findVal = (keys: string[]) => {
          const foundKey = Object.keys(item).find(k => 
            keys.some(search => k.toLowerCase() === search.toLowerCase())
          );
          return foundKey ? item[foundKey] : '';
        };

        let rawStatus = findVal(['Status', 'Action', 'Remarks', 'Remark']);
        let normalizedStatus: DistributionStatus = 'Pending';
        let extractedReceiver = '';

        if (rawStatus) {
          const s = String(rawStatus).trim().toLowerCase();
          if (s.includes('given')) {
            normalizedStatus = 'Given';
            // Try to extract name after "given to" or "given "
            const match = String(rawStatus).match(/given\s+(?:to\s+)?(.+)/i);
            if (match && match[1]) {
              extractedReceiver = match[1].trim();
            }
          } else if (s.includes('not allow')) {
            normalizedStatus = 'Not Allowed';
          }
        }

        const explicitReceiver = findVal(['Received_By', 'Received By', 'Receiver']);

        return {
          AccNo: findVal(['AccNo', 'Acc No', 'AccountNo', 'Account']),
          SN: findVal(['SN', 'S.N.', 'Serial']),
          Full_Name: findVal(['Full_Name', 'Full Name', 'Name']),
          HOF_ID: findVal(['HOF_ID', 'HOF ID', 'HOF']),
          Status: normalizedStatus,
          Received_By: explicitReceiver || extractedReceiver,
        };
      });

      onUpload(mappedData);
    };
    reader.readAsBinaryString(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.type.includes('spreadsheet') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      processFile(file);
    }
  };

  return (
    <div
      className={cn(
        "relative rounded-xl border-2 border-dashed transition-all duration-200 p-12 flex flex-col items-center justify-center cursor-pointer group",
        isDragging 
          ? "border-emerald-500 bg-emerald-500/10" 
          : "border-slate-700 hover:border-emerald-500/50 hover:bg-slate-800/50"
      )}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".xlsx, .xls"
        onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
      />
      
      <div className="p-4 rounded-full bg-slate-800 mb-4 group-hover:scale-110 transition-transform">
        <Upload className="w-8 h-8 text-emerald-500" />
      </div>
      
      <h3 className="text-xl font-medium text-slate-100 mb-2">Upload Excel Data</h3>
      <p className="text-sm text-slate-400 text-center max-w-xs">
        Drag and drop your .xlsx file here or click to browse.
        Support for AccNo, SN, Name, and HOF_ID.
      </p>
      
      <div className="mt-8 flex items-center gap-4 text-xs font-mono text-slate-500">
        <div className="flex items-center gap-1">
          <FileSpreadsheet className="w-3 h-3" />
          <span>.XLSX</span>
        </div>
        <div className="w-1 h-1 rounded-full bg-slate-700" />
        <span>MNC Standards Compliant</span>
      </div>
    </div>
  );
};
