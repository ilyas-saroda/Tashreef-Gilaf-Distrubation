import React from 'react';
import { LayoutDashboard } from 'lucide-react';

export function Footer() {
  return (
    <footer className="mt-20 border-t border-slate-900 py-12">
      <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4 grayscale opacity-50">
          <LayoutDashboard className="w-5 h-5 text-slate-500" />
          <div className="h-4 w-[1px] bg-white" />
          <span className="text-xs font-bold tracking-widest text-slate-500 uppercase">Secure Data Tunnel v2</span>
        </div>
        <p className="text-xs text-slate-600 font-medium">
          &copy; 2026 MNC Global Logistics. All Rights Reserved. Optimized for Low-Power Systems.
        </p>
      </div>
    </footer>
  );
}
