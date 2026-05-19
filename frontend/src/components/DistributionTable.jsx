import React from 'react';
import { Search, ChevronLeft, ChevronRight, Download, Filter, User, CheckCircle2, FileSpreadsheet, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import * as XLSX from 'xlsx';

export const DistributionTable = ({ 
  data, 
  onStatusChange,
  onReceivedByChange,
  onClearUpdateInfo,
  onExport,
  onImportNew
}) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('All');
  const [receiverFilter, setReceiverFilter] = React.useState('All');
  const [dateFilter, setDateFilter] = React.useState('All');
  const [dayFilter, setDayFilter] = React.useState('All');
  const [currentPage, setCurrentPage] = React.useState(1);
  const rowsPerPage = 15;

  // Get unique values for filters with counts
  const filterOptions = React.useMemo(() => {
    const receivers = new Map();
    const dates = new Map();
    const days = new Map();
    const statuses = {
      Pending: 0,
      Given: 0,
      'Not Allowed': 0
    };
    
    data.forEach(item => {
      // Count statuses
      if (item.Status in statuses) {
        statuses[item.Status]++;
      }

      if (item.Received_By) {
        receivers.set(item.Received_By, (receivers.get(item.Received_By) || 0) + 1);
      }
      if (item.Update_Date) {
        dates.set(item.Update_Date, (dates.get(item.Update_Date) || 0) + 1);
      }
      if (item.Update_Day) {
        days.set(item.Update_Day, (days.get(item.Update_Day) || 0) + 1);
      }
    });

    return {
      statuses,
      receivers: Array.from(receivers.entries()).sort((a, b) => b[1] - a[1]), // Sort by count
      dates: Array.from(dates.entries()).sort((a, b) => {
        const [da, ma, ya] = a[0].split('/').map(Number);
        const [db, mb, yb] = b[0].split('/').map(Number);
        return new Date(yb, mb-1, db).getTime() - new Date(ya, ma-1, da).getTime();
      }),
      days: Array.from(days.entries()).sort((a, b) => b[1] - a[1])
    };
  }, [data]);

  // Filter logic (runs efficiently)
  const filteredData = React.useMemo(() => {
    const term = searchTerm.toLowerCase();
    
    const results = data.filter(item => {
      const matchesSearch = !term || 
        item.Full_Name?.toLowerCase().includes(term) || 
        item.HOF_ID?.toString().toLowerCase().includes(term) ||
        item.AccNo?.toString().toLowerCase().includes(term) ||
        item.SN?.toString().toLowerCase().includes(term) ||
        item.Status?.toLowerCase().includes(term) ||
        (item.Update_Date && item.Update_Date.toLowerCase().includes(term)) ||
        (item.Update_Day && item.Update_Day.toLowerCase().includes(term)) ||
        (item.Update_Time && item.Update_Time.toLowerCase().includes(term)) ||
        (item.Received_By && item.Received_By.toLowerCase().includes(term));

      const matchesStatus = statusFilter === 'All' || item.Status === statusFilter;
      const matchesReceiver = receiverFilter === 'All' || 
        (item.Received_By && item.Received_By.toLowerCase() === receiverFilter.toLowerCase());
      const matchesDate = dateFilter === 'All' || item.Update_Date === dateFilter;
      const matchesDay = dayFilter === 'All' || item.Update_Day === dayFilter;

      return matchesSearch && matchesStatus && matchesReceiver && matchesDate && matchesDay;
    });

    // If there's a search term, prioritize results where Acc No or HOF ID matches
    if (term) {
      return [...results].sort((a, b) => {
        const aAcc = a.AccNo?.toString().toLowerCase() || '';
        const bAcc = b.AccNo?.toString().toLowerCase() || '';
        const aHof = a.HOF_ID?.toString().toLowerCase() || '';
        const bHof = b.HOF_ID?.toString().toLowerCase() || '';

        const aHasAccMatch = aAcc.includes(term);
        const bHasAccMatch = bAcc.includes(term);
        const aHasHofMatch = aHof.includes(term);
        const bHasHofMatch = bHof.includes(term);

        // Priority 1: Exact matches for AccNo or HOF_ID
        const aExactMatch = aAcc === term || aHof === term;
        const bExactMatch = bAcc === term || bHof === term;
        if (aExactMatch && !bExactMatch) return -1;
        if (!aExactMatch && bExactMatch) return 1;

        // Priority 2: Starts with term for AccNo or HOF_ID
        const aStarts = aAcc.startsWith(term) || aHof.startsWith(term);
        const bStarts = bAcc.startsWith(term) || bHof.startsWith(term);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;

        // Priority 3: Contains term in AccNo or HOF_ID
        const aContains = aHasAccMatch || aHasHofMatch;
        const bContains = bHasAccMatch || bHasHofMatch;
        if (aContains && !bContains) return -1;
        if (!aContains && bContains) return 1;

        return 0; // Maintain order otherwise
      });
    }

    return results;
  }, [data, searchTerm, statusFilter, receiverFilter, dateFilter, dayFilter]);

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const paginatedData = React.useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredData.slice(start, start + rowsPerPage);
  }, [filteredData, currentPage]);

  // Reset to page 1 when searching or filtering
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, receiverFilter, dateFilter, dayFilter]);

  // Expose a way for parent to trigger scroll/page change
  React.useEffect(() => {
    const handleJump = (event) => {
      const { hofId } = event.detail;
      const targetIndex = filteredData.findIndex(item => String(item.HOF_ID) === String(hofId));
      if (targetIndex !== -1) {
        const targetPage = Math.floor(targetIndex / rowsPerPage) + 1;
        setCurrentPage(targetPage);
        
        // Wait for page to render then scroll
        setTimeout(() => {
          const element = document.getElementById(`hof-row-${hofId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('bg-emerald-500/20');
            setTimeout(() => element.classList.remove('bg-emerald-500/20'), 2000);
          }
        }, 150);
      }
    };

    window.addEventListener('jump-to-hof', handleJump);
    return () => window.removeEventListener('jump-to-hof', handleJump);
  }, [filteredData]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Given': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Not Allowed': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'Pending': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Suggestions for Receiver Names */}
      <datalist id="receiver-list">
        {filterOptions.receivers.map(([name]) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      {/* Table Header / Toolbar */}
      <div className="p-4 sm:p-6 border-b border-slate-800 bg-slate-900/50 space-y-4">
        {/* Search and Filters Row */}
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="relative w-full lg:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by HOF ID, Acc No, Name..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all shadow-inner"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center flex-wrap gap-2 w-full lg:w-auto">
            <Filter className="w-4 h-4 text-slate-500 mr-1 hidden sm:block" />
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-300 focus:outline-none focus:border-emerald-500/50 flex-1 sm:flex-none min-w-[120px]"
            >
              <option value="All">All Status ({data.length})</option>
              <option value="Pending">Pending ({filterOptions.statuses.Pending})</option>
              <option value="Given">Given ({filterOptions.statuses.Given})</option>
              <option value="Not Allowed">Not Allowed ({filterOptions.statuses['Not Allowed']})</option>
            </select>

            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-300 focus:outline-none focus:border-emerald-500/50 flex-1 sm:flex-none min-w-[110px]"
            >
              <option value="All">All Dates</option>
              {filterOptions.dates.map(([date, count]) => (
                <option key={date} value={date}>{date} ({count})</option>
              ))}
            </select>

            <select
              value={dayFilter}
              onChange={(e) => setDayFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-300 focus:outline-none focus:border-emerald-500/50 flex-1 sm:flex-none min-w-[100px]"
            >
              <option value="All">All Days</option>
              {filterOptions.days.map(([day, count]) => (
                <option key={day} value={day}>{day} ({count})</option>
              ))}
            </select>

            <div className="relative flex-1 sm:flex-none">
              <input
                type="text"
                list="receiver-list"
                placeholder="By Receiver..."
                value={receiverFilter === 'All' ? '' : receiverFilter}
                onChange={(e) => setReceiverFilter(e.target.value || 'All')}
                className="bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-300 focus:outline-none focus:border-emerald-500/50 w-full sm:w-32 transition-all"
              />
            </div>

            {(searchTerm || statusFilter !== 'All' || receiverFilter !== 'All' || dateFilter !== 'All' || dayFilter !== 'All') && (
              <button 
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('All');
                  setReceiverFilter('All');
                  setDateFilter('All');
                  setDayFilter('All');
                }}
                className="text-emerald-500 hover:text-emerald-400 text-[10px] font-black uppercase tracking-tighter hover:underline transition-all px-2"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Stats and Quick Info Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-slate-950/50 border border-slate-800/50 text-[10px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
              <span className="text-slate-400 uppercase tracking-widest">Found: <span className="text-white ml-1">{filteredData.length}</span></span>
            </div>
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-emerald-500/5 border border-emerald-500/10 text-[10px] font-bold">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              <span className="text-slate-400 uppercase tracking-widest">Given: <span className="text-emerald-500 ml-1">{filteredData.filter(i => i.Status === 'Given').length}</span></span>
            </div>
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-amber-500/5 border border-amber-500/10 text-[10px] font-bold">
              <div className="w-3 h-3 rounded-full border border-amber-500/30"></div>
              <span className="text-slate-400 uppercase tracking-widest">Pending: <span className="text-amber-500 ml-1">{filteredData.filter(i => i.Status === 'Pending').length}</span></span>
            </div>
          </div>

          {receiverFilter !== 'All' && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-bold text-emerald-400 max-w-full">
               <User className="w-3.5 h-3.5 shrink-0" />
               <span className="truncate">Summary for: {receiverFilter}</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/20 flex flex-wrap items-center gap-3">
          <button 
            onClick={onImportNew}
            className="flex items-center gap-2 px-4 py-2 border border-slate-700 hover:bg-slate-800 text-slate-300 text-sm font-medium rounded-lg transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>New Import</span>
          </button>
          <button 
            onClick={() => onExport(filteredData)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-emerald-900/20"
          >
            <Download className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
        </div>

      {/* Table Body */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950/50 text-slate-400 text-sm font-bold uppercase tracking-widest">
              <th className="px-6 py-5">SN</th>
              <th className="px-6 py-5">Acc No</th>
              <th className="px-6 py-5">Full Name</th>
              <th className="px-6 py-5">HOF ID</th>
              <th className="px-6 py-5">Status</th>
              <th className="px-6 py-5">Last Updated</th>
              <th className="px-6 py-5">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {paginatedData.length > 0 ? (
              paginatedData.map((item, idx) => (
                <tr 
                  key={`${item.HOF_ID}-${idx}`} 
                  id={`hof-row-${item.HOF_ID}`}
                  className="group hover:bg-slate-800/30 transition-colors"
                >
                  <td className="px-6 py-5 text-base text-slate-400">{item.SN}</td>
                  <td className="px-6 py-5 text-base font-mono text-slate-500 tracking-wide">{item.AccNo}</td>
                  <td className="px-6 py-5">
                    <span className="text-base font-bold text-slate-200 group-hover:text-emerald-400 transition-colors tracking-wide">
                      {item.Full_Name}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-base font-mono text-slate-400 text-emerald-500/70 tracking-wide">{item.HOF_ID}</td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 text-xs font-bold py-1 px-3 rounded-md border w-fit shadow-inner transition-colors",
                        getStatusColor(item.Status)
                      )}>
                        {item.Status === 'Given' && <CheckCircle2 className="w-4 h-4" />}
                        {item.Status}
                      </span>
                      {item.Received_By && (
                        <div className="flex items-center gap-1.5 text-sm text-emerald-400 font-bold ml-1 mt-1 drop-shadow-sm">
                          <User className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[180px]" title={item.Received_By}>to {item.Received_By}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    {item.Update_Date ? (
                      <div className="flex items-center justify-between gap-2 min-w-[120px]">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                            <span>{item.Update_Date}</span>
                            <span className="text-slate-500 font-normal">({item.Update_Day?.substring(0, 3)})</span>
                          </div>
                          <div className="text-xs text-slate-500 font-mono">
                            {item.Update_Time}
                          </div>
                        </div>
                        <button 
                          onClick={() => onClearUpdateInfo(item.HOF_ID)}
                          className="p-1.5 hover:bg-rose-500/10 text-slate-600 hover:text-rose-500 rounded-md transition-all opacity-0 group-hover:opacity-100"
                          title="Clear Update Info"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-600 italic">No updates yet</span>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <div className="relative group/select">
                        <select
                          value={item.Status}
                          onChange={(e) => onStatusChange(item.HOF_ID, e.target.value)}
                          className="bg-slate-950 border border-slate-800 rounded-lg py-1.5 pl-3 pr-8 text-xs text-slate-300 focus:outline-none focus:border-emerald-500/50 appearance-none cursor-pointer hover:bg-slate-900 transition-all w-32"
                        >
                          <option value="Pending">Pending</option>
                          <option value="Given">Given</option>
                          <option value="Not Allowed">Not Allowed</option>
                        </select>
                        <ChevronLeft className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-600 -rotate-90 pointer-events-none group-hover/select:text-emerald-500 transition-colors" />
                      </div>
                      
                      <div className="relative group/input">
                        <User className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-600 group-focus-within/input:text-emerald-500 transition-colors" />
                        <input 
                          type="text"
                          placeholder="Receiver Name"
                          list="receiver-list"
                          value={item.Received_By || ''}
                          onChange={(e) => onReceivedByChange(item.HOF_ID, e.target.value)}
                          className="bg-slate-950 border border-slate-800 rounded-lg pl-7 pr-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500/50 w-32 sm:w-40 transition-all"
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center gap-2">
                    <Search className="w-8 h-8 opacity-20" />
                    <p>No records found matching your search.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/20">
          <p className="text-sm text-slate-500 font-mono">
            Showing <span className="text-slate-300">{(currentPage - 1) * rowsPerPage + 1}</span> to <span className="text-slate-300">{Math.min(currentPage * rowsPerPage, filteredData.length)}</span> of <span className="text-slate-300">{filteredData.length}</span>
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-slate-800 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1">
              {[...Array(totalPages)].map((_, i) => {
                // Show at most 5 page numbers for space efficiency
                if (totalPages > 5) {
                   if (i + 1 !== 1 && i + 1 !== totalPages && Math.abs(i + 1 - currentPage) > 1) {
                      if (i + 1 === 2 || i + 1 === totalPages - 1) return <span key={i} className="text-slate-700">...</span>;
                      return null;
                   }
                }
                return (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={cn(
                      "w-8 h-8 text-xs font-bold rounded-lg transition-all",
                      currentPage === i + 1 
                        ? "bg-emerald-600 text-white" 
                        : "text-slate-500 hover:bg-slate-800 hover:text-slate-300"
                    )}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-slate-800 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
