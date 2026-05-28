import React from "react";
import {
  Check,
  Search,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  X,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { cn } from "../../lib/utils";

// Status badge component with crisp responsive typography
function StatusBadge({ status, receivedBy }) {
  const base =
    "inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] sm:text-[11px] font-bold uppercase tracking-wider border transition-all duration-200 shrink-0 max-w-full whitespace-normal break-words";

  if (status === "Given") {
    return (
      <span
        className={cn(
          base,
          "bg-slate-100 text-slate-700 border-slate-200/80 shadow-sm",
        )}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
        <span>Given · {receivedBy}</span>
      </span>
    );
  }

  if (status === "Pending") {
    return (
      <span
        className={cn(
          base,
          "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm",
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

  if (status === "Not Allowed" || status === "Restricted") {
    return (
      <span
        className={cn(
          base,
          "bg-red-50 text-red-700 border-red-200 border-l-4 border-l-red-500 rounded-l-none pl-1.5 shadow-sm",
        )}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
        Restricted
      </span>
    );
  }

  if (status === "Bypassed") {
    return (
      <span
        className={cn(
          base,
          "bg-cyan-50 text-cyan-700 border-cyan-200 shadow-sm",
        )}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0" />
        Bypassed
      </span>
    );
  }

  return (
    <span className={cn(base, "bg-slate-50 text-slate-600 border-slate-200")}>
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
        "flex items-start gap-3 p-4 rounded-xl border text-sm font-semibold mb-6 leading-relaxed shadow-sm transition-all duration-200",
        cls,
      )}
    >
      <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", iconCls)} />
      <span className="whitespace-normal break-words flex-1">
        {feedback.message}
      </span>
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

  // Performance Virtual Scroll Parameters
  const [scrollTop, setScrollTop] = React.useState(0);
  const ROW_HEIGHT = 56; // Dynamic wrapper compensation safety spacing
  const VISIBLE_WINDOW_HEIGHT = 420;

  const scrollContainerRef = React.useRef(null);

  // Parse Account Numbers correctly
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

  // Pure live lookup mapping logic
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
          isException:
            item.Status === "Not Allowed" || item.Status === "Restricted",
        };
      }
      return { id, found: false, isException: true, status: "Not Found" };
    });
  }, [parsedAccountIds, accountMap, localOverrides]);

  // Combined filters applied dynamically
  const displayedAccountLookups = React.useMemo(() => {
    let filteredList = allLiveAccountLookups;

    if (activeStatusFilter) {
      filteredList = filteredList.filter((item) => {
        if (activeStatusFilter === "NotFound")
          return !item.found && item.status !== "Bypassed";
        if (activeStatusFilter === "Restricted")
          return (
            item.found &&
            (item.status === "Not Allowed" || item.status === "Restricted")
          );
        if (activeStatusFilter === "Pending")
          return item.found && item.status === "Pending";
        if (activeStatusFilter === "Given")
          return item.found && item.status === "Given";
        return true;
      });
    }

    const cleanQuery = tableSearchQuery.trim().toLowerCase();
    if (cleanQuery) {
      filteredList = filteredList.filter((item) => {
        const matchAccNo = item.accNo
          ? String(item.accNo).toLowerCase().includes(cleanQuery)
          : item.id.toLowerCase().includes(cleanQuery);
        const matchName = item.fullName
          ? item.fullName.toLowerCase().includes(cleanQuery)
          : false;
        return matchAccNo || matchName;
      });
    }

    return filteredList;
  }, [allLiveAccountLookups, activeStatusFilter, tableSearchQuery]);

  // Safe Math Calculation for Virtual Slicing
  const { startIndex, endIndex, totalHeight, offsetY } = React.useMemo(() => {
    const totalItems = displayedAccountLookups.length;
    const computedTotalHeight = totalItems * ROW_HEIGHT;

    let start = Math.floor(scrollTop / ROW_HEIGHT) - 2;
    let end = Math.ceil((scrollTop + VISIBLE_WINDOW_HEIGHT) / ROW_HEIGHT) + 2;

    start = Math.max(0, start);
    end = Math.min(totalItems, end);

    return {
      startIndex: start,
      endIndex: end,
      totalHeight: computedTotalHeight,
      offsetY: start * ROW_HEIGHT,
    };
  }, [displayedAccountLookups.length, scrollTop]);

  const visibleAccountLookups = React.useMemo(() => {
    return displayedAccountLookups.slice(startIndex, endIndex);
  }, [displayedAccountLookups, startIndex, endIndex]);

  // Calculation parameters for filter metrics counters
  const verificationStats = React.useMemo(() => {
    const total = allLiveAccountLookups.length;
    const pending = allLiveAccountLookups.filter(
      (l) => l.found && l.status === "Pending",
    ).length;
    const given = allLiveAccountLookups.filter(
      (l) => l.found && l.status === "Given",
    ).length;
    const notFound = allLiveAccountLookups.filter(
      (l) => !l.found && l.status !== "Bypassed",
    ).length;
    const restricted = allLiveAccountLookups.filter(
      (l) =>
        l.found && (l.status === "Not Allowed" || l.status === "Restricted"),
    ).length;
    return { total, pending, given, notFound, restricted };
  }, [allLiveAccountLookups]);

  const handleContainerScroll = (e) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  const toggleFilter = (filterType) => {
    setActiveStatusFilter((prev) => (prev === filterType ? null : filterType));
    setScrollTop(0);
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
      .filter(
        (item) =>
          item.isException &&
          item.status !== "Bypassed" &&
          item.status !== "Pending",
      )
      .map((item) => item.id);
    setSelectedExceptions(new Set(targetIds));
  };

  const handleBulkAction = (actionType) => {
    const updatedOverrides = new Map(localOverrides);

    selectedExceptions.forEach((id) => {
      const originalItem = allLiveAccountLookups.find((item) => item.id === id);
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
          isException: false,
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
      setBulkFeedback({
        type: "error",
        message: "No valid Account IDs found.",
      });
      return;
    }

    const successfulUpdates = [];
    parsedAccountIds.forEach((id) => {
      let item = localOverrides.has(id)
        ? localOverrides.get(id)
        : accountMap.get(id);
      if (localOverrides.has(id)) {
        item = {
          AccNo: item.accNo || id,
          Full_Name: item.fullName,
          Status: item.status === "Bypassed" ? "Pending" : item.status,
          Received_By: item.receivedBy,
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

  const visibleExceptions = displayedAccountLookups.filter(
    (item) =>
      item.isException &&
      item.status !== "Bypassed" &&
      item.status !== "Pending",
  );
  const isAllVisibleExceptionsSelected =
    visibleExceptions.length > 0 &&
    visibleExceptions.every((item) => selectedExceptions.has(item.id));

  return (
    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl shadow-md w-full overflow-hidden transition-all duration-300">
      {/* Header Panel */}
      <div className="px-6 py-5 border-b border-slate-200/60 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-slate-900 font-extrabold text-xl tracking-tight">
              Bulk Distribution Entry
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Process multiple system record updates safely with dynamic
              verification
            </p>
          </div>
          {parsedAccountIds.length > 0 && (
            <div className="self-start sm:self-center shrink-0">
              <span className="bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
                {parsedAccountIds.length} Unique Accounts
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <FeedbackBanner feedback={bulkFeedback} />

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          {/* LEFT Action Form Panel */}
          <div className="lg:col-span-2 flex flex-col gap-5 w-full bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">
                Account Numbers
              </label>
              <textarea
                value={bulkAccNoInput}
                onChange={(e) => {
                  setBulkAccNoInput(e.target.value);
                  setScrollTop(0);
                }}
                className="w-full bg-slate-50/50 border border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl p-4 text-sm font-mono font-bold focus:bg-white focus:border-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-100 transition-all min-h-[160px] resize-y leading-relaxed"
                placeholder={"1024, 1025\n1026 1027\n1028"}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">
                Receiver Name
              </label>
              <input
                type="text"
                value={bulkReceiverName}
                onChange={(e) => setBulkReceiverName(e.target.value)}
                className="w-full bg-slate-50/50 border border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl p-4 text-sm font-bold focus:bg-white focus:border-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-100 transition-all"
                placeholder="Full name of collecting person"
              />
            </div>

            <button
              onClick={handleBulkDistribution}
              className="w-full bg-slate-900 hover:bg-black text-white font-bold text-sm py-3.5 px-4 rounded-xl shadow-sm hover:shadow transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.99] mt-1"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              Process Bulk Safe Update
            </button>

            {/* Quick Metrics filter interface */}
            {parsedAccountIds.length > 0 && (
              <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 mt-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Filter reference list by state:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    {
                      id: "Pending",
                      label: "Ready",
                      value: verificationStats.pending,
                      color:
                        "text-emerald-700 bg-emerald-50 border-emerald-100 hover:bg-emerald-100/40",
                      activeCls:
                        "ring-2 ring-emerald-500 bg-emerald-50 font-bold border-transparent",
                    },
                    {
                      id: "Given",
                      label: "Given",
                      value: verificationStats.given,
                      color:
                        "text-slate-600 bg-slate-100 border-slate-200 hover:bg-slate-200/40",
                      activeCls:
                        "ring-2 ring-slate-600 bg-slate-100 font-bold border-transparent",
                    },
                    {
                      id: "Restricted",
                      label: "Restricted",
                      value: verificationStats.restricted,
                      color:
                        "text-red-700 bg-red-50 border-red-100 hover:bg-red-100/40",
                      activeCls:
                        "ring-2 ring-red-500 bg-red-50 font-bold border-transparent",
                    },
                    {
                      id: "NotFound",
                      label: "Not Found",
                      value: verificationStats.notFound,
                      color:
                        "text-amber-700 bg-amber-50 border-amber-100 hover:bg-amber-100/40",
                      activeCls:
                        "ring-2 ring-amber-500 bg-amber-50 font-bold border-transparent",
                    },
                  ].map(({ id, label, value, color, activeCls }) => {
                    const isSelected = activeStatusFilter === id;
                    return (
                      <button
                        type="button"
                        key={id}
                        onClick={() => toggleFilter(id)}
                        className={cn(
                          "rounded-xl border px-3 py-2.5 text-center transition-all duration-200 select-none",
                          color,
                          isSelected && activeCls,
                          activeStatusFilter &&
                            !isSelected &&
                            "opacity-45 scale-[0.96]",
                        )}
                      >
                        <div className="text-lg font-black leading-none">
                          {value}
                        </div>
                        <div className="text-[10px] font-bold uppercase tracking-wider mt-1 opacity-90 flex items-center justify-center gap-1">
                          {id === "Pending" && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                          )}
                          {label} {isSelected && "✓"}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT Verification Real-Time Reference Monitor */}
          <div className="lg:col-span-3 flex flex-col w-full h-full min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 px-1">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-bold text-slate-800">
                  Verification Reference Monitor
                </h3>
              </div>

              {allLiveAccountLookups.length > 0 && (
                <div className="relative w-full sm:w-60 shrink-0">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={tableSearchQuery}
                    onChange={(e) => {
                      setTableSearchQuery(e.target.value);
                      setScrollTop(0);
                    }}
                    placeholder="Search query name or account..."
                    className="w-full bg-white border border-slate-200 text-slate-900 text-xs rounded-xl pl-9 pr-8 py-2.5 font-semibold shadow-sm focus:border-slate-400 focus:outline-none transition-all"
                  />
                  {tableSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setTableSearchQuery("")}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white flex-1 shadow-sm relative flex flex-col">
              {/* Sliding Operations Control Bar */}
              {selectedExceptions.size > 0 && (
                <div className="bg-slate-950 text-white px-4 py-3 flex items-center justify-between gap-3 animate-in slide-in-from-top duration-200 absolute top-0 left-0 right-0 z-20 shadow-lg">
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <span className="bg-white/15 text-white border border-white/10 px-2 py-0.5 rounded font-black text-[11px]">
                      {selectedExceptions.size} Selected
                    </span>
                    <span className="hidden sm:inline opacity-90">
                      Exception Controls Ready
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleBulkAction("BYPASS")}
                      className="bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-black py-1.5 px-3 rounded-lg transition-all flex items-center gap-1 active:scale-95"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Bypass List
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkAction("FIX_PENDING")}
                      className="bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-black py-1.5 px-3 rounded-lg transition-all flex items-center gap-1 active:scale-95"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      Force Ready
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedExceptions(new Set())}
                      className="text-slate-400 hover:text-white p-1 ml-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {allLiveAccountLookups.length > 0 && (
                <div className="bg-slate-50 border-b border-slate-100 px-4 py-2 flex justify-between items-center text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>
                    Grid view: <b>{displayedAccountLookups.length}</b> rows
                    matching
                  </span>
                </div>
              )}

              {displayedAccountLookups.length > 0 ? (
                <div className="flex flex-col flex-1 w-full min-w-0">
                  {/* Robust Non-collapsible Table Header row Layout via Flexbox Layouts */}
                  <div className="flex items-center bg-slate-50/70 border-b border-slate-200 px-4 py-3 text-left font-bold text-[10px] uppercase tracking-widest text-slate-400 select-none">
                    <div className="w-10 flex items-center justify-start shrink-0">
                      <input
                        type="checkbox"
                        checked={isAllVisibleExceptionsSelected}
                        disabled={visibleExceptions.length === 0}
                        onChange={(e) =>
                          handleSelectAllVisibleExceptions(e.target.checked)
                        }
                        className="w-4 h-4 text-slate-900 border-slate-300 rounded cursor-pointer accent-slate-900"
                      />
                    </div>
                    <div className="w-24 sm:w-28 shrink-0 pl-1">Acc No</div>
                    <div className="flex-1 min-w-0 px-2">Account Holder</div>
                    <div className="w-28 sm:w-36 shrink-0 text-right sm:text-left pl-2">
                      Status Map
                    </div>
                  </div>

                  {/* Clean Dynamic Virtualized Scrolling List */}
                  <div
                    ref={scrollContainerRef}
                    onScroll={handleContainerScroll}
                    className="overflow-y-auto relative flex-1"
                    style={{
                      height: `${VISIBLE_WINDOW_HEIGHT}px`,
                      maxH: `${VISIBLE_WINDOW_HEIGHT}px`,
                    }}
                  >
                    <div
                      style={{
                        height: `${totalHeight}px`,
                        width: "100%",
                        position: "relative",
                      }}
                    >
                      <div
                        style={{
                          transform: `translateY(${offsetY}px)`,
                          position: "absolute",
                          left: 0,
                          right: 0,
                          top: 0,
                        }}
                        className="divide-y divide-slate-100"
                      >
                        {visibleAccountLookups.map((lookup) => {
                          const isExceptionRow =
                            lookup.isException &&
                            lookup.status !== "Bypassed" &&
                            lookup.status !== "Pending";
                          const isRowChecked = selectedExceptions.has(
                            lookup.id,
                          );

                          return (
                            <div
                              key={lookup.id}
                              style={{ minHeight: `${ROW_HEIGHT}px` }}
                              className={cn(
                                "flex items-center px-4 py-2 transition-colors duration-150 text-left text-xs sm:text-sm font-semibold text-slate-900 leading-normal",
                                isRowChecked
                                  ? "bg-slate-100/70"
                                  : lookup.found
                                    ? lookup.status === "Pending"
                                      ? "hover:bg-emerald-50/30"
                                      : lookup.status === "Not Allowed" ||
                                          lookup.status === "Restricted"
                                        ? "hover:bg-red-50/30"
                                        : "hover:bg-slate-50"
                                    : "bg-red-50/20 hover:bg-red-50/40",
                              )}
                            >
                              {/* Layout width mappings align exactly with the layout headers row */}
                              <div className="w-10 flex items-center justify-start shrink-0">
                                <input
                                  type="checkbox"
                                  disabled={!isExceptionRow}
                                  checked={isRowChecked}
                                  onChange={() => handleSelectRow(lookup.id)}
                                  className="w-4 h-4 text-slate-900 border-slate-300 rounded disabled:opacity-30 cursor-pointer accent-slate-900"
                                />
                              </div>

                              <div className="w-24 sm:w-28 font-mono font-bold tracking-tight text-slate-900 shrink-0 pl-1 whitespace-normal break-all">
                                {lookup.found ? lookup.accNo : lookup.id}
                              </div>

                              <div className="flex-1 min-w-0 font-medium text-slate-700 px-2 whitespace-normal break-words">
                                {lookup.found ? (
                                  lookup.fullName
                                ) : (
                                  <span className="text-red-500 font-bold text-[11px]">
                                    Not in system
                                  </span>
                                )}
                              </div>

                              <div className="w-28 sm:w-36 flex items-center justify-end sm:justify-start shrink-0 pl-2 min-w-0">
                                <StatusBadge
                                  status={lookup.status}
                                  receivedBy={lookup.receivedBy}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 px-6 text-center flex-1 min-h-[300px]">
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 mb-3">
                    <Search className="w-5 h-5 text-slate-400" />
                  </div>
                  <p className="text-sm font-bold text-slate-800">
                    No matching records found
                  </p>
                  <p className="text-xs text-slate-400 max-w-[220px] mt-1 font-medium">
                    Try checking numbers or update your status criteria filter
                    boxes
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
