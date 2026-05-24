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

  const [suggestions, setSuggestions] = React.useState([]);
  const [showDropdown, setShowDropdown] = React.useState(false);
  const searchContainerRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    
    const term = val.toLowerCase().trim();
    if (term.length < 1) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const accNoStartsWith = [];
    const accNoIncludes = [];
    const otherMatches = [];

    for (const item of data) {
      if (accNoStartsWith.length + accNoIncludes.length + otherMatches.length >= 7) break;

      const accStr = item.AccNo !== null && item.AccNo !== undefined ? String(item.AccNo).toLowerCase() : '';
      if (accStr.startsWith(term)) {
        accNoStartsWith.push(item);
        continue;
      }
      if (accStr.includes(term)) {
        accNoIncludes.push(item);
        continue;
      }

      const nameStr = item.Full_Name ? item.Full_Name.toLowerCase() : '';
      const hofStr = item.HOF_ID !== null && item.HOF_ID !== undefined ? String(item.HOF_ID).toLowerCase() : '';
      
      if (nameStr.includes(term) || hofStr.includes(term)) {
        otherMatches.push(item);
      }
    }

    const sortedSuggestions = [...accNoStartsWith, ...accNoIncludes, ...otherMatches].slice(0, 7);
    setSuggestions(sortedSuggestions);
    setShowDropdown(sortedSuggestions.length > 0);
  };

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
    const term = searchTerm.toLowerCase().trim();
    const getAccNoRank = (item) => {
      if (!term) return 2;

      const accNo = String(item.AccNo ?? '').toLowerCase();
      if (accNo === term) return 0;
      if (accNo.startsWith(term)) return 1;
      return 2;
    };
    
    return data
      .filter(item => {
        // High-speed short-circuit sequential checker
        const checkSearch = () => {
          if (!term) return true;
          
          // Step 1: Highest Priority: Account Number matches return true instantly.
          if (String(item.AccNo ?? '').toLowerCase().includes(term)) return true;
          
          // Step 2: Fallback checks executed sequentially
          if (String(item.Full_Name ?? '').toLowerCase().includes(term)) return true;
          if (String(item.HOF_ID ?? '').toLowerCase().includes(term)) return true;
          if (String(item.Status ?? '').toLowerCase().includes(term)) return true;
          if (String(item.Received_By ?? '').toLowerCase().includes(term)) return true;
          
          return false;
        };

        const matchesSearch = checkSearch();
        const matchesStatus = statusFilter === 'All' || item.Status === statusFilter;
        const matchesReceiver = receiverFilter === 'All' || 
          (item.Received_By && item.Received_By.toLowerCase() === receiverFilter.toLowerCase());
        const matchesDate = dateFilter === 'All' || item.Update_Date === dateFilter;
        const matchesDay = dayFilter === 'All' || item.Update_Day === dayFilter;

        return matchesSearch && matchesStatus && matchesReceiver && matchesDate && matchesDay;
      })
      .sort((a, b) => {
        const rankA = getAccNoRank(a);
        const rankB = getAccNoRank(b);

        if (rankA !== rankB) return rankA - rankB;
        return 0;
      });
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
            element.classList.add('bg-emerald-50');
            setTimeout(() => element.classList.remove('bg-emerald-50'), 2000);
          }
        }, 150);
      }
    };

    window.addEventListener('jump-to-hof', handleJump);
    return () => window.removeEventListener('jump-to-hof', handleJump);
  }, [filteredData]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Given': return 'bg-slate-100 text-slate-900 border-slate-200';
      case 'Not Allowed': return 'bg-slate-100 text-slate-900 border-slate-200';
      case 'Pending': return 'bg-slate-100 text-slate-900 border-slate-200';
      default: return 'bg-slate-100 text-slate-900 border-slate-200';
    }
  };

  return (
    <div className={cn("mnc-card-global", "bg-white border border-slate-200 rounded-xl shadow-sm")}>
      {/* Suggestions for Receiver Names */}
      <datalist id="receiver-list">
        {filterOptions.receivers.map(([name]) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      {/* Table Header / Toolbar */}
      <div className="p-4 sm:p-6 border-b border-slate-200 bg-white space-y-4">
        {/* Search and Filters Row */}
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="relative w-full lg:max-w-xs" ref={searchContainerRef}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by Acc No, Name, HOF ID..."
              className={cn("mnc-input-global", "w-full bg-slate-50 border border-slate-200 rounded-md py-2 pl-10 pr-4 text-sm text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white transition-all")}
              value={searchTerm}
              onChange={handleSearchChange}
              onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
            />
            {showDropdown && (
              <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                {suggestions.map((item, idx) => (
                  <div
                    key={`${item.HOF_ID}-${idx}`}
                    className="hover:bg-slate-50 cursor-pointer text-slate-900 py-2.5 px-3 text-sm border-b border-slate-100 last:border-0 flex items-start gap-2"
                    onClick={() => {
                      setSearchTerm(String(item.AccNo || item.HOF_ID));
                      setShowDropdown(false);
                    }}
                  >
                    <span className="font-mono font-bold text-slate-600 shrink-0 mt-0.5">[{item.AccNo}]</span> 
                    <span className="font-medium whitespace-normal break-words text-left">{item.Full_Name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex items-center flex-wrap gap-2 w-full lg:w-auto">
            <Filter className="w-4 h-4 text-slate-500 mr-1 hidden sm:block" />
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={cn("mnc-input-global", "bg-slate-50 border border-slate-200 rounded-md py-2 px-3 text-sm text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white transition-all flex-1 sm:flex-none min-w-[120px]")}
            >
              <option value="All">All Status ({data.length})</option>
              <option value="Pending">Pending ({filterOptions.statuses.Pending})</option>
              <option value="Given">Given ({filterOptions.statuses.Given})</option>
              <option value="Not Allowed">Not Allowed ({filterOptions.statuses['Not Allowed']})</option>
            </select>

            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className={cn("mnc-input-global", "bg-slate-50 border border-slate-200 rounded-md py-2 px-3 text-sm text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white transition-all flex-1 sm:flex-none min-w-[110px]")}
            >
              <option value="All">All Dates</option>
              {filterOptions.dates.map(([date, count]) => (
                <option key={date} value={date}>{date} ({count})</option>
              ))}
            </select>

            <select
              value={dayFilter}
              onChange={(e) => setDayFilter(e.target.value)}
              className={cn("mnc-input-global", "bg-slate-50 border border-slate-200 rounded-md py-2 px-3 text-sm text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white transition-all flex-1 sm:flex-none min-w-[100px]")}
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
                className={cn("mnc-input-global", "bg-slate-50 border border-slate-200 rounded-md py-2 px-3 text-sm text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white transition-all w-full sm:w-32")}
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
                className="text-slate-500 hover:text-slate-900 text-[10px] font-bold uppercase tracking-tighter hover:underline transition-all px-2"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Stats and Quick Info Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-slate-50 border border-slate-200 text-[10px] font-semibold text-slate-600">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              <span className="uppercase tracking-widest">Found: <span className="text-slate-900 ml-1">{filteredData.length}</span></span>
            </div>
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-emerald-50 border border-emerald-100 text-[10px] font-semibold text-emerald-700">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span className="uppercase tracking-widest">Given: <span className="text-emerald-800 ml-1">{filteredData.filter(i => i.Status === 'Given').length}</span></span>
            </div>
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-amber-50 border border-amber-100 text-[10px] font-semibold text-amber-700">
              <div className="w-3 h-3 rounded-full border border-amber-300 bg-amber-100"></div>
              <span className="uppercase tracking-widest">Pending: <span className="text-amber-800 ml-1">{filteredData.filter(i => i.Status === 'Pending').length}</span></span>
            </div>
          </div>

          {receiverFilter !== 'All' && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-900">
               <User className="w-3.5 h-3.5 shrink-0" />
               <span className="whitespace-normal break-words">Summary for: {receiverFilter}</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex flex-wrap items-center gap-3">
          <button 
            onClick={onImportNew}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 text-sm font-medium rounded-md transition-colors shadow-sm bg-white"
          >
            <FileSpreadsheet className="w-4 h-4 text-slate-500" />
            <span>New Import</span>
          </button>
          <button 
            onClick={() => onExport(filteredData)}
            className="flex items-center gap-2 px-4 py-2 mnc-btn-primary text-sm font-medium rounded-md transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
        </div>

      {/* Table Body */}
      <div className="overflow-x-auto scrolling-touch">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50">
            <tr>
              <th className={cn("mnc-table-th-global", "text-[11px] font-bold tracking-wider text-slate-900 uppercase py-3.5 px-4 border-b border-slate-200 whitespace-normal break-words")}>SN</th>
              <th className={cn("mnc-table-th-global", "text-[11px] font-bold tracking-wider text-slate-900 uppercase py-3.5 px-4 border-b border-slate-200 whitespace-normal break-words")}>Acc No</th>
              <th className={cn("mnc-table-th-global", "text-[11px] font-bold tracking-wider text-slate-900 uppercase py-3.5 px-4 border-b border-slate-200 whitespace-normal break-words")}>Full Name</th>
              <th className={cn("mnc-table-th-global", "text-[11px] font-bold tracking-wider text-slate-900 uppercase py-3.5 px-4 border-b border-slate-200 whitespace-normal break-words")}>HOF ID</th>
              <th className={cn("mnc-table-th-global", "text-[11px] font-bold tracking-wider text-slate-900 uppercase py-3.5 px-4 border-b border-slate-200 whitespace-normal break-words")}>Status</th>
              <th className={cn("mnc-table-th-global", "text-[11px] font-bold tracking-wider text-slate-900 uppercase py-3.5 px-4 border-b border-slate-200 whitespace-normal break-words")}>Last Updated</th>
              <th className={cn("mnc-table-th-global", "text-[11px] font-bold tracking-wider text-slate-900 uppercase py-3.5 px-4 border-b border-slate-200 whitespace-normal break-words")}>Action</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {paginatedData.length > 0 ? (
              paginatedData.map((item, idx) => (
                <tr 
                  key={`${item.HOF_ID}-${idx}`} 
                  id={`hof-row-${item.HOF_ID}`}
                  className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60 transition-colors duration-100 group"
                >
                  <td className="text-[15px] text-slate-900 font-semibold py-3 px-4 whitespace-normal break-words">{item.SN}</td>
                  <td className="text-[15px] text-slate-900 font-bold py-3 px-4 font-mono whitespace-normal break-words">{item.AccNo}</td>
                  <td className="text-[15px] text-slate-900 font-semibold py-3 px-4 whitespace-normal break-words">
                    <span className="font-bold text-slate-900 whitespace-normal break-words">
                      {item.Full_Name}
                    </span>
                  </td>
                  <td className="text-[15px] text-slate-900 font-bold py-3 px-4 font-mono whitespace-normal break-words">{item.HOF_ID}</td>
                  <td className="text-[15px] text-slate-900 font-semibold py-3 px-4 whitespace-normal break-words">
                    <div className="flex flex-col items-start">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 font-bold text-xs px-2.5 py-0.5 rounded-md border whitespace-normal break-words",
                        getStatusColor(item.Status)
                      )}>
                        {item.Status === 'Given' && <CheckCircle2 className="w-4 h-4" />}
                        {item.Status}
                      </span>
                      {item.Received_By && (
                        <div className="flex items-center gap-1 text-[13px] text-slate-900 font-bold mt-1 whitespace-normal break-words">
                          <User className="w-3.5 h-3.5" />
                          <span className="whitespace-normal break-words" title={item.Received_By}>to {item.Received_By}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="text-[15px] text-slate-900 font-semibold py-3 px-4 whitespace-normal break-words">
                    {item.Update_Date ? (
                      <div className="flex items-center justify-between gap-2 min-w-[110px]">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1 text-[13px] text-slate-900 whitespace-normal break-words">
                            <span className="font-bold whitespace-normal break-words">{item.Update_Date}</span>
                            <span className="text-slate-500">({item.Update_Day?.substring(0, 3)})</span>
                          </div>
                          <div className="text-[13px] text-slate-900 font-mono font-bold whitespace-normal break-words">
                            {item.Update_Time}
                          </div>
                        </div>
                        <button 
                          onClick={() => onClearUpdateInfo(item.HOF_ID)}
                          className="p-1.5 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-md transition-all opacity-0 group-hover:opacity-100"
                          title="Clear Update Info"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[13px] text-slate-500 italic">No updates</span>
                    )}
                  </td>
                  <td className="text-[15px] text-slate-900 font-semibold py-3 px-4 whitespace-normal break-words">
                    <div className="flex items-center gap-2">
                      <div className="relative group/select">
                        <select
                          value={item.Status}
                          onChange={(e) => onStatusChange(item.HOF_ID, e.target.value)}
                          className={cn("mnc-input-global", "bg-slate-50 border border-slate-200 focus:border-slate-400 focus:bg-white text-slate-900 rounded-md text-xs py-1 px-2.5 transition-all w-28 appearance-none cursor-pointer pl-2 pr-6")}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Given">Given</option>
                          <option value="Not Allowed">Not Allowed</option>
                        </select>
                        <ChevronLeft className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 -rotate-90 pointer-events-none group-focus-within/select:text-slate-600 transition-colors" />
                      </div>
                      
                      <div className="relative group/input">
                        <User className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 group-focus-within/input:text-slate-600 transition-colors" />
                        <input 
                          type="text"
                          placeholder="Receiver Name"
                          list="receiver-list"
                          value={item.Received_By || ''}
                          onChange={(e) => onReceivedByChange(item.HOF_ID, e.target.value)}
                          className={cn("mnc-input-global", "bg-slate-50 border border-slate-200 focus:border-slate-400 focus:bg-white text-slate-900 rounded-md text-xs py-1 pl-6 pr-2.5 transition-all w-28 sm:w-36")}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500 bg-slate-50/50 border-b border-slate-100">
                  <div className="flex flex-col items-center gap-2">
                    <Search className="w-6 h-6 text-slate-900" />
                    <p className="text-sm">No records found matching your criteria.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-white">
          <p className="text-xs text-slate-500">
            Showing <span className="font-medium text-slate-900">{(currentPage - 1) * rowsPerPage + 1}</span> to <span className="font-medium text-slate-900">{Math.min(currentPage * rowsPerPage, filteredData.length)}</span> of <span className="font-medium text-slate-900">{filteredData.length}</span> results
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 disabled:hover:bg-transparent transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1">
              {[...Array(totalPages)].map((_, i) => {
                // Show at most 5 page numbers for space efficiency
                if (totalPages > 5) {
                   if (i + 1 !== 1 && i + 1 !== totalPages && Math.abs(i + 1 - currentPage) > 1) {
                      if (i + 1 === 2 || i + 1 === totalPages - 1) return <span key={i} className="text-slate-500 text-xs px-1">...</span>;
                      return null;
                   }
                }
                return (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={cn(
                      "w-7 h-7 text-xs font-medium rounded-md transition-all",
                      currentPage === i + 1 
                        ? "bg-slate-900 text-white shadow-sm" 
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
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
              className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 disabled:hover:bg-transparent transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
