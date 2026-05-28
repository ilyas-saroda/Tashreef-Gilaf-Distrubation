import React from "react";
import {
  Check,
  Search,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  ChevronRight,
  X,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { cn } from "../../lib/utils";

// Status badge component with MNC Micro-Designs
function StatusBadge({ status, receivedBy }) {
  const base =
    "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-bold uppercase tracking-wide border transition-all duration-200";

  if (status === "Given") {
    return (
      <span
        className={cn(base, "bg-slate-100 text-slate-700 border-slate-200/80 shadow-sm shadow-slate-100/50")}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
        Given · {receivedBy}
      </span>
    );
  }
  
  if (status === "Pending") {
    return (
      <span
        className={cn(
          base,
          "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm shadow-emerald-50/50",
        )}
      >
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
        </span>
        Pending
      </span>
    );
  }
  
  if (status === "Not Allowed") {
    return (
      <span className={cn(base, "bg-red-50 text-red-700 border-red-200 border-l-4 border-l-red-500 rounded-l-none pl-1.5 font-extrabold tracking-wider shadow-sm")}>
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
        Restricted
      </span>
    );
  }
  
  if (status === "Bypassed") {
    return (
      <span className={cn(base, "bg-cyan-50 text-cyan-700 border-cyan-200 shadow-sm")}>
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0" />
        Bypassed
      </span>
    );
  }
  
  return (
    <span className={cn(base, "bg-slate-100 text-slate-600 border-slate-200")}>
      {status}
    </span>
  );
}

// Feedback banner
function FeedbackBanner({ feedback }) {
  if (!feedback) return null;

  const config = {
    success: {
      icon: CheckCircle2,
      cls: "bg-emerald-50 text-emerald-800 border-emerald-200",
      iconCls: "text-emerald-500",
    },
    warning: {
      icon: AlertTriangle,
      cls: "bg-amber-50 text-amber-800 border-amber-200",
      iconCls: "text-amber-500",
    },
    error: {
      icon: XCircle,
      cls: "bg-red-50 text-red-800 border-red-200",
      iconCls: "text-red-500",
    },
  };

  const { icon: Icon, cls, iconCls } = config[feedback.type] || config.error;

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 rounded-lg border text-sm font-semibold mb-6 leading-relaxed",
        cls,
      )}
    >
      <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", iconCls)} />
      <span className="whitespace-normal break-words">{feedback.message}</span>
    </div>
  );
}

export default function BulkDistribution({
  accountMap = new Map(),
  onBulkUpdateSuccess,
}) {
  const [bulkAccNoInput, setBulkAccNoInput] = React.useState("");
  const [bulkReceiverName, setBulkReceiverName] = React.useState("");
  const [bulkFeedback, setBulkFeedback] = React.useState(null);
  
  // Filters & Search states
  const [activeStatusFilter, setActiveStatusFilter] = React.useState(null);
  const [tableSearchQuery, setTableSearchQuery] = React.useState("");
  const [selectedExceptions, setSelectedExceptions] = React.useState(new Set());
  const [localOverrides, setLocalOverrides] = React.useState(new Map());

  // MNC PERFORMANCE UPGRADE: Custom Virtual Scroll States & Parameters
  const [scrollTop, setScrollTop] = React.useState(0);
  const ROW_HEIGHT = 49; // Average calculated height for each table row in pixels
  const VISIBLE_WINDOW_HEIGHT = 420; // Height of the scroll container (`max-h-[420px]`)

  // Reference for the scrollable container
  const scrollContainerRef = React.useRef(null);

  const parsedAccountIds = React.useMemo(() => {
    if (!bulkAccNoInput || !bulkAccNoInput.trim()) return [];
    return Array.from(
      new Set(
        bulkAccNoInput
          .split(/[\s,\n]+/)
          .map((s) => s.replace(/[^0-9]/g, "").trim())
          .filter(Boolean),
      ),
    );
  }, [bulkAccNoInput]);

  // Base raw lookup list (unfiltered)
  const allLiveAccountLookups = React.useMemo(() => {
    return parsedAccountIds.map((id) => {
      if (localOverrides.has(id)) {
        return localOverrides.get(id);
      }

      const item = accountMap.get(id);
      if (item) {
        return {
          id,
          found: true,
          accNo: item.AccNo,
          fullName: item.Full_Name,
          status: item.Status,
          receivedBy: item.Received_By || "Unknown",
          isException: item.Status === "Not Allowed",
        };
      }
      return { id, found: false, isException: true };
    });
  }, [parsedAccountIds, accountMap, localOverrides]);

  // Multi-tier filter combo
  const displayedAccountLookups = React.useMemo(() => {
    let filteredList = allLiveAccountLookups;

    if (activeStatusFilter) {
      filteredList = filteredList.filter((item) => {
        if (activeStatusFilter === "NotFound") return !item.found && item.status !== "Bypassed";
        if (activeStatusFilter === "Restricted") return item.found && item.status === "Not Allowed";
        if (activeStatusFilter === "Pending") return item.found && item.status === "Pending";
        if (activeStatusFilter === "Given") return item.found && item.status === "Given";
        return true;
      });
    }

    const cleanQuery = tableSearchQuery.trim().toLowerCase();
    if (cleanQuery) {
      filteredList = filteredList.filter((item) => {
        const matchAccNo = item.accNo ? String(item.accNo).toLowerCase().includes(cleanQuery) : item.id.toLowerCase().includes(cleanQuery);
        const matchName = item.fullName ? item.fullName.toLowerCase().includes(cleanQuery) : false;
        return matchAccNo || matchName;
      });
    }

    return filteredList;
  }, [allLiveAccountLookups, activeStatusFilter, tableSearchQuery]);

  // MNC VIRTUAL WINDOW COMPUTATION (Calculates index slices to render on screen slice view)
  const { startIndex, endIndex, totalHeight, offsetY } = React.useMemo(() => {
    const totalItems = displayedAccountLookups.length;
    const computedTotalHeight = totalItems * ROW_HEIGHT;
    
    // Find current indices based on standard tracking layout formulas
    let start = Math.floor(scrollTop / ROW_HEIGHT) - 2; // Buffer nodes included to eliminate white flickering
    let end = Math.ceil((scrollTop + VISIBLE_WINDOW_HEIGHT) / ROW_HEIGHT) + 2;

    start = Math.max(0, start);
    end = Math.min(totalItems, end);

    const calculatedOffsetY = start * ROW_HEIGHT;

    return {
      startIndex: start,
      endIndex: end,
      totalHeight: computedTotalHeight,
      offsetY: calculatedOffsetY
    };
  }, [displayedAccountLookups.length, scrollTop]);

  // Visible subset slice generation
  const visibleAccountLookups = React.useMemo(() => {
    return displayedAccountLookups.slice(startIndex, endIndex);
  }, [displayedAccountLookups, startIndex, endIndex]);

  // Summary stats
  const verificationStats = React.useMemo(() => {
    const total = allLiveAccountLookups.length;
    const pending = allLiveAccountLookups.filter(
      (l) => l.found && l.status === "Pending",
    ).length;
    const given = allLiveAccountLookups.filter(
      (l) => l.found && l.status === "Given",
    ).length;
    const notFound = allLiveAccountLookups.filter((l) => !l.found && l.status !== "Bypassed").length;
    const restricted = allLiveAccountLookups.filter(
      (l) => l.found && l.status === "Not Allowed",
    ).length;
    return { total, pending, given, notFound, restricted };
  }, [allLiveAccountLookups]);

  // Monitor scroll handler to set virtual dynamic context tracking window positions
  const handleContainerScroll = (e) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  // Auto scroll logic triggered safely on text input lifecycle extensions
  React.useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [displayedAccountLookups.length]);

  const toggleFilter = (filterType) => {
    setActiveStatusFilter((prev) => (prev === filterType ? null : filterType));
    setScrollTop(0); // Reset scroll index to prevent dynamic boundary crashes
    if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
  };

  const handleSelectRow = (id) => {
    setSelectedExceptions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllVisibleExceptions = (isChecked) => {
    if (!isChecked) {
      setSelectedExceptions(new Set());
      return;
    }
    const targetIds = displayedAccountLookups
      .filter(item => item.isException && item.status !== "Bypassed" && item.status !== "Pending")
      .map(item => item.id);
    setSelectedExceptions(new Set(targetIds));
  };

  const handleBulkAction = (actionType) => {
    const updatedOverrides = new Map(localOverrides);

    selectedExceptions.forEach((id) => {
      const originalItem = allLiveAccountLookups.find(item => item.id === id);
      if (!originalItem) return;

      if (actionType === "BYPASS") {
        updatedOverrides.set(id, {
          ...originalItem,
          status: "Bypassed",
          fullName: originalItem.fullName || "Forced Bypass Account",
          found: true,
        });
      } else if (actionType === "FIX_PENDING") {
        updatedOverrides.set(id, {
          ...originalItem,
          status: "Pending",
          fullName: originalItem.fullName || "Fixed Temp Account",
          found: true,
          isException: false
        });
      }
    });

    setLocalOverrides(updatedOverrides);
    setSelectedExceptions(new Set());
    
    setBulkFeedback({
      type: "success",
      message: `${selectedExceptions.size} exception records updated locally.`,
    });
  };

  const handleBulkDistribution = () => {
    setBulkFeedback(null);
    const receiverName = bulkReceiverName.trim();

    if (!receiverName) {
      setBulkFeedback({ type: "error", message: "Receiver name is required." });
      return;
    }
    if (parsedAccountIds.length === 0) {
      setBulkFeedback({ type: "error", message: "No valid Account IDs found." });
      return;
    }

    const successfulUpdates = [];
    parsedAccountIds.forEach((id) => {
      let item = localOverrides.has(id) ? localOverrides.get(id) : accountMap.get(id);
      if (localOverrides.has(id)) {
        item = {
          AccNo: item.accNo || id,
          Full_Name: item.fullName,
          Status: item.status === "Bypassed" ? "Pending" : item.status,
          Received_By: item.receivedBy
        };
      }
      if (item && (item.Status === "Pending" || item.Status === "Bypassed")) {
        successfulUpdates.push(item);
      }
    });

    if (successfulUpdates.length > 0) {
      onBulkUpdateSuccess(successfulUpdates, receiverName);
    }

    setBulkFeedback({
      type: successfulUpdates.length > 0 ? "success" : "error",
      message: `${successfulUpdates.length} records processed successfully.`,
    });

    setBulkAccNoInput("");
    setBulkReceiverName("");
    setActiveStatusFilter(null);
    setTableSearchQuery("");
    setLocalOverrides(new Map());
    setScrollTop(0);
  };

  const visibleExceptions = displayedAccountLookups.filter(item => item.isException && item.status !== "Bypassed" && item.status !== "Pending");
  const isAllVisibleExceptionsSelected = visibleExceptions.length > 0 && visibleExceptions.every(item => selectedExceptions.has(item.id));

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm w-full mt-4 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-100 bg-slate-50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-slate-900 font-bold text-lg tracking-tight">
              Bulk Distribution Entry
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Process multiple account updates simultaneously
            </p>
          </div>
          {parsedAccountIds.length > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="bg-slate-900 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                {parsedAccountIds.length} accounts
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="p-6">
        <FeedbackBanner feedback={bulkFeedback} />

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          {/* LEFT Form Panel */}
          <div className="lg:col-span-2 flex flex-col gap-5 w-full">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">
                Account Numbers
              </label>
              <textarea
                value={bulkAccNoInput}
                onChange={(e) => setBulkAccNoInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-lg p-3.5 text-sm font-mono font-semibold focus:bg-white focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100 transition-all min-h-[200px] resize-y leading-relaxed"
                placeholder={"1024, 1025\n1026 1027\n1028"}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest">
                Receiver Name
              </label>
              <input
                type="text"
                value={bulkReceiverName}
                onChange={(e) => setBulkReceiverName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-lg p-3.5 text-sm font-semibold focus:bg-white focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-100 transition-all"
                placeholder="Full name of collecting person"
              />
            </div>

            <button
              onClick={handleBulkDistribution}
              className="w-full bg-slate-900 hover:bg-black text-white font-bold text-sm py-3 px-4 rounded-lg shadow-sm transition-all duration-150 flex items-center justify-center gap-2 active:scale-[0.98] mt-1"
            >
              <Check className="w-4 h-4" />
              Process Bulk Safe Update
            </button>

            {/* Stats Filter Layout Grid */}
            {parsedAccountIds.length > 0 && (
              <div className="flex flex-col gap-1.5 mt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                  Click stats box to filter list:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "Pending", label: "Ready", value: verificationStats.pending, color: "text-emerald-700 bg-emerald-50 border-emerald-100 hover:bg-emerald-100/50", activeCls: "ring-2 ring-emerald-500 bg-emerald-100/80 font-bold border-transparent" },
                    { id: "Given", label: "Given", value: verificationStats.given, color: "text-slate-600 bg-slate-100 border-slate-200 hover:bg-slate-200/50", activeCls: "ring-2 ring-slate-600 bg-slate-200 font-bold border-transparent" },
                    { id: "Restricted", label: "Restricted", value: verificationStats.restricted, color: "text-red-700 bg-red-50 border-red-100 hover:bg-red-100/50", activeCls: "ring-2 ring-red-500 bg-red-100/80 font-bold border-transparent" },
                    { id: "NotFound", label: "Not Found", value: verificationStats.notFound, color: "text-amber-700 bg-amber-50 border-amber-100 hover:bg-amber-100/50", activeCls: "ring-2 ring-amber-500 bg-amber-100 font-bold border-transparent" },
                  ].map(({ id, label, value, color, activeCls }) => {
                    const isSelected = activeStatusFilter === id;
                    return (
                      <button
                        type="button"
                        key={id}
                        onClick={() => toggleFilter(id)}
                        className={cn(
                          "rounded-lg border px-3 py-2 text-center transition-all duration-150 cursor-pointer outline-none select-none",
                          color,
                          isSelected && activeCls,
                          id === "Restricted" && "border-l-4 border-l-red-400",
                          activeStatusFilter && !isSelected && "opacity-40 scale-[0.97]"
                        )}
                      >
                        <div className="text-lg font-black leading-none">{value}</div>
                        <div className="text-[10px] font-bold uppercase tracking-wider mt-0.5 opacity-80 flex items-center justify-center gap-1">
                          {id === "Pending" && <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse inline-block" />}
                          {label} {isSelected && "✓"}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT Verification Panel with Custom Virtualized Scroll Grid */}
          <div className="lg:col-span-3 flex flex-col w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-bold text-slate-900">Verification Reference</h3>
              </div>
              
              {allLiveAccountLookups.length > 0 && (
                <div className="relative w-full sm:w-56 shrink-0">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                    <Search className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={tableSearchQuery}
                    onChange={(e) => { setTableSearchQuery(e.target.value); setScrollTop(0); }}
                    placeholder="Search name or acc..."
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-md pl-8 pr-7 py-1.5 font-medium focus:bg-white focus:border-slate-400 focus:outline-none transition-all"
                  />
                  {tableSearchQuery && (
                    <button type="button" onClick={() => setTableSearchQuery("")} className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white flex-1 shadow-sm relative">
              {/* Sliding Action Panel */}
              {selectedExceptions.size > 0 && (
                <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between gap-3 animate-in slide-in-from-top duration-200 absolute top-0 left-0 right-0 z-10 shadow-md">
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <span className="bg-white/20 px-2 py-0.5 rounded text-[11px] font-bold">{selectedExceptions.size} Selected</span>
                    <span>Exception Actions Available</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button type="button" onClick={() => handleBulkAction("BYPASS")} className="bg-cyan-600 hover:bg-cyan-700 text-white text-[11px] font-bold py-1 px-2.5 rounded transition-all flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" />Bypass List</button>
                    <button type="button" onClick={() => handleBulkAction("FIX_PENDING")} className="bg-slate-700 hover:bg-slate-600 text-white text-[11px] font-bold py-1 px-2.5 rounded transition-all flex items-center gap-1"><Wrench className="w-3.5 h-3.5" />Force Ready</button>
                    <button type="button" onClick={() => setSelectedExceptions(new Set())} className="text-slate-400 p-1"><X className="w-4 h-4" /></button>
                  </div>
                </div>
              )}

              {allLiveAccountLookups.length > 0 && (
                <div className="bg-slate-50 border-b border-slate-100 px-4 py-2 flex justify-between items-center text-[11px] font-medium text-slate-500">
                  <span>Showing <b>{displayedAccountLookups.length}</b> rows</span>
                </div>
              )}

              {displayedAccountLookups.length > 0 ? (
                <>
                  {/* Fixed Table Grid Headers */}
                  <div className="grid grid-cols-12 gap-2 bg-slate-50 border-b border-slate-200 px-4 py-3 text-left items-center">
                    <div className="col-span-1 flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={isAllVisibleExceptionsSelected}
                        disabled={visibleExceptions.length === 0}
                        onChange={(e) => handleSelectAllVisibleExceptions(e.target.checked)}
                        className="w-3.5 h-3.5 text-slate-900 border-slate-300 rounded cursor-pointer"
                      />
                    </div>
                    <div className="col-span-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Acc No</div>
                    <div className="col-span-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Account Holder</div>
                    <div className="col-span-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</div>
                  </div>

                  {/* FIXED: Dynamic Virtualized Scrolling List Window */}
                  <div 
                    ref={scrollContainerRef}
                    onScroll={handleContainerScroll}
                    className="max-h-[420px] overflow-y-auto custom-scrollbar relative"
                  >
                    {/* Ghost box container to reserve fake virtual height scroll range */}
                    <div style={{ height: `${totalHeight}px`, width: '100%', position: 'relative' }}>
                      
                      {/* Inner dynamic content slide pane offset transform box */}
                      <div style={{ transform: `translateY(${offsetY}px)`, position: 'absolute', left: 0, right: 0, top: 0 }} className="divide-y divide-slate-100">
                        {visibleAccountLookups.map((lookup) => {
                          const isExceptionRow = lookup.isException && lookup.status !== "Bypassed" && lookup.status !== "Pending";
                          const isRowChecked = selectedExceptions.has(lookup.id);

                          return (
                            <div
                              key={lookup.id}
                              style={{ height: `${ROW_HEIGHT}px` }}
                              className={cn(
                                "grid grid-cols-12 gap-2 px-4 items-center transition-colors text-left",
                                isRowChecked ? "bg-slate-50" : (
                                  lookup.found
                                    ? lookup.status === "Pending" ? "hover:bg-emerald-50/50" : lookup.status === "Not Allowed" ? "hover:bg-red-50/40" : "hover:bg-slate-50"
                                    : "bg-red-50/30 hover:bg-red-50/60"
                                )
                              )}
                            >
                              <div className="col-span-1 flex items-center justify-center">
                                <input
                                  type="checkbox"
                                  disabled={!isExceptionRow}
                                  checked={isRowChecked}
                                  onChange={() => handleSelectRow(lookup.id)}
                                  className="w-3.5 h-3.5 text-slate-900 border-slate-300 rounded"
                                />
                              </div>

                              <div className="col-span-3 font-mono text-xs sm:text-sm font-bold text-slate-900 break-all pr-1">
                                {lookup.found ? lookup.accNo : lookup.id}
                              </div>

                              <div className="col-span-4 text-xs sm:text-sm font-semibold text-slate-800 whitespace-normal break-words pr-2 truncate">
                                {lookup.found ? lookup.fullName : <span className="text-red-600 font-bold text-[11px] sm:text-xs">Not in system</span>}
                              </div>

                              <div className="col-span-4 flex items-center min-w-0 overflow-hidden">
                                <StatusBadge status={lookup.status} receivedBy={lookup.receivedBy} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center min-h-[280px]">
                  <Search className="w-5 h-5 text-slate-400 mb-2" />
                  <p className="text-sm font-bold text-slate-700">No matching records found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}