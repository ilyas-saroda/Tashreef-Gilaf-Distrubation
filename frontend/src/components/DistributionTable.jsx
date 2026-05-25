import React from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  User,
  CheckCircle2,
  FileSpreadsheet,
  Trash2,
  X,
  Clock,
  AlertCircle,
  ArrowUpDown,
} from "lucide-react";
import { cn } from "../lib/utils";

const ROWS_PER_PAGE = 15;
const STATUS_COUNTS = { Pending: 0, Given: 0, "Not Allowed": 0 };

const selectClass =
  "bg-white border border-slate-200 text-slate-700 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-slate-400 focus:text-slate-900 transition-all cursor-pointer appearance-none pr-7 shadow-sm";

const getAccNoRank = (item, term) => {
  const accNo = String(item.AccNo ?? "").toLowerCase();
  if (accNo === term) return 0;
  if (accNo.startsWith(term)) return 1;
  return 2;
};

const getNumericValue = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const compareNumericValues = (aValue, bValue, direction) => {
  const aNumber = getNumericValue(aValue);
  const bNumber = getNumericValue(bValue);
  if (aNumber === null && bNumber === null) return 0;
  if (aNumber === null) return 1;
  if (bNumber === null) return -1;
  return direction === "asc" ? aNumber - bNumber : bNumber - aNumber;
};

const getUpdateTimestamp = (item) => {
  if (!item.Update_Date) return null;

  const [day, month, year] = String(item.Update_Date).split("/").map(Number);
  if (!day || !month || !year) return null;

  const [hour = 0, minute = 0, second = 0] = String(item.Update_Time ?? "")
    .split(":")
    .map(Number);
  const timestamp = new Date(
    year,
    month - 1,
    day,
    Number.isFinite(hour) ? hour : 0,
    Number.isFinite(minute) ? minute : 0,
    Number.isFinite(second) ? second : 0,
  ).getTime();

  return Number.isFinite(timestamp) ? timestamp : null;
};

const compareNullableTimestamps = (a, b, direction) => {
  const aTime = getUpdateTimestamp(a);
  const bTime = getUpdateTimestamp(b);
  if (aTime === null && bTime === null) return 0;
  if (aTime === null) return 1;
  if (bTime === null) return -1;
  return direction === "asc" ? aTime - bTime : bTime - aTime;
};

const compareBySortField = (a, b, field, direction) => {
  const multiplier = direction === "asc" ? 1 : -1;

  switch (field) {
    case "AccNo":
      return compareNumericValues(a.AccNo, b.AccNo, direction);
    case "HOF_ID":
      return compareNumericValues(a.HOF_ID, b.HOF_ID, direction);
    case "Full_Name":
      return (
        String(a.Full_Name ?? "").localeCompare(String(b.Full_Name ?? "")) *
        multiplier
      );
    case "Status":
      return (
        String(a.Status ?? "").localeCompare(String(b.Status ?? "")) *
        multiplier
      );
    case "LastUpdated":
      return compareNullableTimestamps(a, b, direction);
    case "SN":
    default:
      return compareNumericValues(a.SN, b.SN, direction);
  }
};

const getSortOptionValue = (field, direction) => {
  if (field === "SN" && direction === "asc") return "default";
  if (field === "SN" && direction === "desc") return "sn-desc";
  if (field === "AccNo" && direction === "asc") return "acc-asc";
  if (field === "AccNo" && direction === "desc") return "acc-desc";
  if (field === "LastUpdated" && direction === "desc") return "updated-newest";
  if (field === "LastUpdated" && direction === "asc") return "updated-oldest";
  return `${field}:${direction}`;
};

const getSortOptionState = (value) => {
  switch (value) {
    case "sn-desc":
      return { field: "SN", direction: "desc" };
    case "acc-asc":
      return { field: "AccNo", direction: "asc" };
    case "acc-desc":
      return { field: "AccNo", direction: "desc" };
    case "updated-newest":
      return { field: "LastUpdated", direction: "desc" };
    case "updated-oldest":
      return { field: "LastUpdated", direction: "asc" };
    case "default":
    default:
      return { field: "SN", direction: "asc" };
  }
};

const sortableHeaders = [
  { label: "SN", field: "SN" },
  { label: "Acc No", field: "AccNo" },
  { label: "Full Name", field: "Full_Name" },
  { label: "HOF ID", field: "HOF_ID" },
  { label: "Status", field: "Status" },
  { label: "Last Updated", field: "LastUpdated" },
];

const matchesSearchTerm = (item, term) => {
  if (!term) return true;
  if (
    String(item.AccNo ?? "")
      .toLowerCase()
      .includes(term)
  )
    return true;
  if (
    String(item.Full_Name ?? "")
      .toLowerCase()
      .includes(term)
  )
    return true;
  if (
    String(item.HOF_ID ?? "")
      .toLowerCase()
      .includes(term)
  )
    return true;
  if (
    String(item.Status ?? "")
      .toLowerCase()
      .includes(term)
  )
    return true;
  return String(item.Received_By ?? "")
    .toLowerCase()
    .includes(term);
};

const getSuggestions = (data, term) => {
  if (!term) return [];

  const accNoStartsWith = [];
  const accNoIncludes = [];
  const otherMatches = [];

  for (const item of data) {
    const total =
      accNoStartsWith.length + accNoIncludes.length + otherMatches.length;
    if (total >= 7) break;

    const accStr = String(item.AccNo ?? "").toLowerCase();
    if (accStr.startsWith(term)) {
      accNoStartsWith.push(item);
      continue;
    }
    if (accStr.includes(term)) {
      accNoIncludes.push(item);
      continue;
    }

    const nameStr = String(item.Full_Name ?? "").toLowerCase();
    const hofStr = String(item.HOF_ID ?? "").toLowerCase();
    if (nameStr.includes(term) || hofStr.includes(term)) {
      otherMatches.push(item);
    }
  }

  return [...accNoStartsWith, ...accNoIncludes, ...otherMatches].slice(0, 7);
};

export const DistributionTable = ({
  data,
  onStatusChange,
  onReceivedByChange,
  onClearUpdateInfo,
  onExport,
  onImportNew,
  statusFilterPreset = "All",
}) => {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState(statusFilterPreset);
  const [receiverFilter, setReceiverFilter] = React.useState("All");
  const [dateFilter, setDateFilter] = React.useState("All");
  const [dayFilter, setDayFilter] = React.useState("All");
  const [sortField, setSortField] = React.useState("SN");
  const [sortDirection, setSortDirection] = React.useState("asc");
  const [currentPage, setCurrentPage] = React.useState(1);

  const [showDropdown, setShowDropdown] = React.useState(false);
  const searchContainerRef = React.useRef(null);
  const normalizedSearchTerm = searchTerm.toLowerCase().trim();
  const suggestions = React.useMemo(
    () => getSuggestions(data, normalizedSearchTerm),
    [data, normalizedSearchTerm],
  );

  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target)
      ) {
        setShowDropdown(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setShowDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setShowDropdown(value.trim().length > 0);
  };

  const handleHeaderClick = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
      return;
    }

    setSortField(field);
    setSortDirection("asc");
  };

  const handleSortOptionChange = (value) => {
    const nextSort = getSortOptionState(value);
    setSortField(nextSort.field);
    setSortDirection(nextSort.direction);
  };

  React.useEffect(() => {
    setStatusFilter(statusFilterPreset);
  }, [statusFilterPreset]);

  const filterOptions = React.useMemo(() => {
    const receivers = new Map();
    const dates = new Map();
    const days = new Map();
    const statuses = { ...STATUS_COUNTS };
    data.forEach((item) => {
      if (item.Status in statuses) statuses[item.Status]++;
      if (item.Received_By)
        receivers.set(
          item.Received_By,
          (receivers.get(item.Received_By) || 0) + 1,
        );
      if (item.Update_Date)
        dates.set(item.Update_Date, (dates.get(item.Update_Date) || 0) + 1);
      if (item.Update_Day)
        days.set(item.Update_Day, (days.get(item.Update_Day) || 0) + 1);
    });
    return {
      statuses,
      receivers: Array.from(receivers.entries()).sort((a, b) => b[1] - a[1]),
      dates: Array.from(dates.entries()).sort((a, b) => {
        const [da, ma, ya] = a[0].split("/").map(Number);
        const [db, mb, yb] = b[0].split("/").map(Number);
        return (
          new Date(yb, mb - 1, db).getTime() -
          new Date(ya, ma - 1, da).getTime()
        );
      }),
      days: Array.from(days.entries()).sort((a, b) => b[1] - a[1]),
    };
  }, [data]);

  const filteredData = React.useMemo(() => {
    const term = normalizedSearchTerm;
    const receiverTerm = receiverFilter.toLowerCase();
    const result = [];

    for (const item of data) {
      if (statusFilter !== "All" && item.Status !== statusFilter) continue;
      if (dateFilter !== "All" && item.Update_Date !== dateFilter) continue;
      if (dayFilter !== "All" && item.Update_Day !== dayFilter) continue;
      if (
        receiverFilter !== "All" &&
        String(item.Received_By ?? "").toLowerCase() !== receiverTerm
      ) {
        continue;
      }
      if (!matchesSearchTerm(item, term)) continue;

      result.push(item);
    }

    return result.sort((a, b) => {
      if (term) {
        const rankA = getAccNoRank(a, term);
        const rankB = getAccNoRank(b, term);
        if (rankA !== rankB) return rankA - rankB;
      }

      return compareBySortField(a, b, sortField, sortDirection);
    });
  }, [
    data,
    normalizedSearchTerm,
    statusFilter,
    receiverFilter,
    dateFilter,
    dayFilter,
    sortField,
    sortDirection,
  ]);

  const totalPages = Math.ceil(filteredData.length / ROWS_PER_PAGE);
  const paginatedData = React.useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    return filteredData.slice(start, start + ROWS_PER_PAGE);
  }, [filteredData, currentPage]);

  const filteredStats = React.useMemo(() => {
    const stats = {
      total: filteredData.length,
      given: 0,
      pending: 0,
      blocked: 0,
    };
    for (const item of filteredData) {
      if (item.Status === "Given") stats.given += 1;
      else if (item.Status === "Pending") stats.pending += 1;
      else if (item.Status === "Not Allowed") stats.blocked += 1;
    }
    return stats;
  }, [filteredData]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    statusFilter,
    receiverFilter,
    dateFilter,
    dayFilter,
    sortField,
    sortDirection,
  ]);

  React.useEffect(() => {
    const handleJump = (event) => {
      const { hofId } = event.detail;
      const targetIndex = filteredData.findIndex(
        (item) => String(item.HOF_ID) === String(hofId),
      );
      if (targetIndex !== -1) {
        const targetPage = Math.floor(targetIndex / ROWS_PER_PAGE) + 1;
        setCurrentPage(targetPage);
        setTimeout(() => {
          const element = document.getElementById(`hof-row-${hofId}`);
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
            element.classList.add("row-highlight");
            setTimeout(() => element.classList.remove("row-highlight"), 2000);
          }
        }, 150);
      }
    };
    window.addEventListener("jump-to-hof", handleJump);
    return () => window.removeEventListener("jump-to-hof", handleJump);
  }, [filteredData]);

  const hasActiveFilters =
    searchTerm ||
    statusFilter !== "All" ||
    receiverFilter !== "All" ||
    dateFilter !== "All" ||
    dayFilter !== "All" ||
    sortField !== "SN" ||
    sortDirection !== "asc";

  const getStatusBadge = (status) => {
    switch (status) {
      case "Given":
        return (
          <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-md font-bold text-xs tracking-wide whitespace-nowrap">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Given
          </span>
        );
      case "Not Allowed":
        return (
          <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-md font-bold text-xs tracking-wide whitespace-nowrap">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            Not Allowed
          </span>
        );
      case "Pending":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-md font-bold text-xs tracking-wide whitespace-nowrap">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Pending
          </span>
        );
    }
  };

  return (
    <>
      <style>{`
        .dt-root { font-family: 'DM Mono', 'Fira Code', 'Cascadia Code', ui-monospace, monospace; }
        .dt-root * { box-sizing: border-box; }
        .row-highlight { background: rgba(16,185,129,0.06) !important; }
        .dt-table tr.dt-row { transition: background 80ms ease; }
        .dt-table tr.dt-row:hover { background: rgba(0,0,0,0.015); }
        .dt-table tr.dt-row:hover .dt-trash-btn { opacity: 1; }
        .dt-trash-btn { opacity: 0; transition: opacity 120ms ease; }
        .dt-select-wrap { position: relative; display: inline-flex; align-items: center; }
        .dt-select-wrap::after { content: ''; position: absolute; right: 10px; top: 50%; transform: translateY(-50%) rotate(45deg); width: 5px; height: 5px; border-right: 1.5px solid #64748b; border-bottom: 1.5px solid #64748b; pointer-events: none; }
        .dt-stat-pill { display: inline-flex; align-items: center; gap: 6px; padding: 5px 11px; border-radius: 8px; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
        .suggestion-item:hover { background: rgba(0,0,0,0.03); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        .dt-dropdown { animation: fadeIn 120ms ease; }

        /* ── Filter section improvements ── */
        .dt-filter-control { height: 34px; }
        .dt-filter-divider { width: 1px; height: 20px; background: #e2e8f0; flex-shrink: 0; }
        .dt-filter-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #94a3b8;
          white-space: nowrap;
          line-height: 1;
        }
        .dt-filter-group {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .dt-filter-group select,
        .dt-filter-group input {
          height: 34px;
        }
        .dt-search-input {
          height: 38px;
          font-size: 13px;
        }
      `}</style>

      <div className="dt-root w-full rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-xl shadow-slate-100">
        {/* ══════════════════════════════════════════
            TOOLBAR — REDESIGNED FILTER SECTION
        ══════════════════════════════════════════ */}
        <div className="px-5 pt-4 pb-3.5 border-b border-slate-200 bg-slate-50/50">
          {/* ── Row 1: Search bar (full width) ── */}
          <div className="flex items-center gap-3 mb-3">
            <div className="relative flex-1 max-w-sm" ref={searchContainerRef}>
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by Acc No · Full Name · HOF ID"
                className="dt-search-input w-full bg-white border border-slate-200 rounded-lg py-2 pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:text-slate-900 transition-all font-sans tracking-wide shadow-sm"
                value={searchTerm}
                onChange={handleSearchChange}
                onFocus={() => {
                  if (suggestions.length > 0) setShowDropdown(true);
                }}
              />
              {showDropdown && suggestions.length > 0 && (
                <div className="dt-dropdown absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-y-auto">
                  {suggestions.map((item, idx) => (
                    <div
                      key={`${item.HOF_ID}-${idx}`}
                      className="suggestion-item cursor-pointer py-2.5 px-4 text-sm border-b border-slate-100 last:border-0 flex items-center gap-3"
                      onClick={() => {
                        setSearchTerm(String(item.AccNo || item.HOF_ID));
                        setShowDropdown(false);
                      }}
                    >
                      <span className="font-mono text-xs font-bold text-slate-600 shrink-0 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                        {item.AccNo}
                      </span>
                      <span className="font-semibold text-slate-700 whitespace-normal break-words text-left">
                        {item.Full_Name}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons — right-aligned in the search row */}
            <div className="flex items-center gap-2 ml-auto shrink-0">
              <button
                onClick={onImportNew}
                className="flex items-center gap-2 px-4 py-2 bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-sm font-semibold rounded-lg transition-all shadow-sm h-[38px]"
              >
                <FileSpreadsheet className="w-4 h-4 text-slate-500" />
                New Import
              </button>
              <button
                onClick={() => onExport(filteredData)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg transition-all shadow-md shadow-emerald-100 h-[38px]"
              >
                <Download className="w-4 h-4" />
                Export Excel
              </button>
            </div>
          </div>

          {/* ── Row 2: Filter strip ── */}
          <div className="flex items-end gap-2 flex-wrap">
            {/* Filter icon label */}
            <div className="flex items-center gap-1.5 pb-0.5 shrink-0 self-end mb-[7px]">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="dt-filter-label">Filters</span>
            </div>

            <div className="dt-filter-divider self-end mb-[7px]" />

            {/* Status */}
            <div className="dt-filter-group">
              <span className="dt-filter-label pl-0.5">Status</span>
              <div className="dt-select-wrap">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={cn(selectClass, "min-w-[148px]")}
                >
                  <option value="All">All ({data.length})</option>
                  <option value="Pending">
                    Pending ({filterOptions.statuses.Pending})
                  </option>
                  <option value="Given">
                    Given ({filterOptions.statuses.Given})
                  </option>
                  <option value="Not Allowed">
                    Not Allowed ({filterOptions.statuses["Not Allowed"]})
                  </option>
                </select>
              </div>
            </div>

            {/* Date */}
            <div className="dt-filter-group">
              <span className="dt-filter-label pl-0.5">Date</span>
              <div className="dt-select-wrap">
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className={cn(selectClass, "min-w-[120px]")}
                >
                  <option value="All">All Dates</option>
                  {filterOptions.dates.map(([date, count]) => (
                    <option key={date} value={date}>
                      {date} ({count})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Day */}
            <div className="dt-filter-group">
              <span className="dt-filter-label pl-0.5">Day</span>
              <div className="dt-select-wrap">
                <select
                  value={dayFilter}
                  onChange={(e) => setDayFilter(e.target.value)}
                  className={cn(selectClass, "min-w-[110px]")}
                >
                  <option value="All">All Days</option>
                  {filterOptions.days.map(([day, count]) => (
                    <option key={day} value={day}>
                      {day} ({count})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Receiver */}
            <div className="dt-filter-group">
              <span className="dt-filter-label pl-0.5">Receiver</span>
              <datalist id="receiver-list-dt">
                {filterOptions.receivers.map(([name]) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  list="receiver-list-dt"
                  placeholder="Any receiver"
                  value={receiverFilter === "All" ? "" : receiverFilter}
                  onChange={(e) => setReceiverFilter(e.target.value || "All")}
                  className="bg-white border border-slate-200 rounded-lg py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:text-slate-900 transition-all w-36 font-sans tracking-wide shadow-sm"
                />
              </div>
            </div>

            <div className="dt-filter-divider self-end mb-[7px]" />

            {/* Sort */}
            <div className="dt-filter-group">
              <span className="dt-filter-label pl-0.5">Sort by</span>
              <div className="relative flex items-center">
                <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none z-10" />
                <select
                  value={getSortOptionValue(sortField, sortDirection)}
                  onChange={(e) => handleSortOptionChange(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg py-2 pl-9 pr-8 text-sm text-slate-200 focus:outline-none focus:border-slate-600 transition-all min-w-[185px] appearance-none cursor-pointer"
                  style={{ backgroundImage: "none" }}
                >
                  <option value="default">SN — Low to High</option>
                  <option value="sn-desc">SN — High to Low</option>
                  <option value="acc-asc">Acc No — Low to High</option>
                  <option value="acc-desc">Acc No — High to Low</option>
                  <option value="updated-newest">Updated — Newest First</option>
                  <option value="updated-oldest">Updated — Oldest First</option>
                </select>
                {/* Custom chevron for the dark select */}
                <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                    <path
                      d="M1 1l4 4 4-4"
                      stroke="#94a3b8"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </div>
            </div>

            {/* Reset — only when filters are active */}
            {hasActiveFilters && (
              <div className="dt-filter-group justify-end">
                {/* Invisible label to keep vertical alignment */}
                <span className="dt-filter-label opacity-0 select-none">
                  Reset
                </span>
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("All");
                    setReceiverFilter("All");
                    setDateFilter("All");
                    setDayFilter("All");
                    setSortField("SN");
                    setSortDirection("asc");
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 hover:bg-slate-200 rounded-lg text-xs font-bold tracking-widest uppercase transition-all shadow-sm cursor-pointer whitespace-nowrap h-[34px]"
                >
                  <X className="w-3.5 h-3.5" />
                  Reset
                </button>
              </div>
            )}
          </div>

          {/* ── Row 3: Stats pills ── */}
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-200/80">
            <span className="dt-stat-pill bg-slate-100 text-slate-600 border border-slate-200">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block"></span>
              Found{" "}
              <span className="text-slate-900 ml-1">{filteredStats.total}</span>
            </span>
            <span className="dt-stat-pill bg-emerald-50 text-emerald-700 border border-emerald-100">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Given{" "}
              <span className="text-emerald-800 ml-1">
                {filteredStats.given}
              </span>
            </span>
            <span className="dt-stat-pill bg-amber-50 text-amber-700 border border-amber-100">
              <Clock className="w-3 h-3 text-amber-600" />
              Pending{" "}
              <span className="text-amber-800 ml-1">
                {filteredStats.pending}
              </span>
            </span>
            <span className="dt-stat-pill bg-rose-50 text-rose-700 border border-rose-100">
              <AlertCircle className="w-3 h-3 text-rose-600" />
              Blocked{" "}
              <span className="text-rose-800 ml-1">
                {filteredStats.blocked}
              </span>
            </span>
            {receiverFilter !== "All" && (
              <span className="dt-stat-pill bg-violet-50 text-violet-700 border border-violet-100">
                <User className="w-3 h-3 text-violet-600" />
                {receiverFilter}
              </span>
            )}
          </div>
        </div>
        {/* ══ END TOOLBAR ══ */}

        {/* ── Table ── */}
        <div className="w-full overflow-x-auto">
          <table className="dt-table w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {sortableHeaders.map((header) => (
                  <th
                    key={header.field}
                    onClick={() => handleHeaderClick(header.field)}
                    className="py-3.5 px-4 text-[11px] font-bold tracking-[0.12em] uppercase text-slate-500 whitespace-nowrap cursor-pointer select-none hover:bg-slate-800/80 transition-colors"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {header.label}
                      {sortField === header.field && (
                        <span className="text-slate-900">
                          {sortDirection === "asc" ? "▲" : "▼"}
                        </span>
                      )}
                    </span>
                  </th>
                ))}
                <th className="py-3.5 px-4 text-[11px] font-bold tracking-[0.12em] uppercase text-slate-500 whitespace-nowrap">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.length > 0 ? (
                paginatedData.map((item, idx) => (
                  <tr
                    key={`${item.HOF_ID}-${idx}`}
                    id={`hof-row-${item.HOF_ID}`}
                    className="dt-row border-b border-slate-100 last:border-0 group bg-white"
                  >
                    {/* SN */}
                    <td className="py-3.5 px-4 text-[13px] font-mono text-slate-400 whitespace-nowrap">
                      {item.SN}
                    </td>

                    {/* Acc No */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-mono text-[14px] font-bold text-slate-800 tracking-wide bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
                        {item.AccNo}
                      </span>
                    </td>

                    {/* Full Name */}
                    <td className="py-3.5 px-4 text-[14px] font-semibold text-slate-800 whitespace-normal break-words">
                      {item.Full_Name}
                    </td>

                    {/* HOF ID */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-mono text-[13px] text-slate-500 tracking-wider">
                        {item.HOF_ID}
                      </span>
                    </td>

                    {/* Status + Receiver */}
                    <td className="py-3.5 px-4 whitespace-normal break-words min-w-[140px]">
                      <div className="flex flex-col gap-1.5">
                        {getStatusBadge(item.Status)}
                        {item.Received_By && (
                          <div className="flex items-center gap-1.5">
                            <User className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="font-semibold text-[12px] text-slate-600 tracking-wide bg-slate-50 px-2 py-0.5 rounded border border-slate-200 whitespace-normal break-words">
                              {item.Received_By}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Last Updated */}
                    <td className="py-3.5 px-4 whitespace-normal break-words min-w-[150px]">
                      {item.Update_Date ? (
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5 text-[13px]">
                              <span className="font-bold text-slate-700 whitespace-nowrap">
                                {item.Update_Date}
                              </span>
                              <span className="text-slate-400 text-[11px]">
                                ({item.Update_Day?.substring(0, 3)})
                              </span>
                            </div>
                            <span className="font-mono text-[12px] text-slate-400">
                              {item.Update_Time}
                            </span>
                          </div>
                          <button
                            onClick={() => onClearUpdateInfo(item.HOF_ID)}
                            className="dt-trash-btn p-1.5 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all"
                            title="Clear Update Info"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[12px] text-slate-300 italic font-mono">
                          —
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="dt-select-wrap">
                          <select
                            value={item.Status}
                            onChange={(e) =>
                              onStatusChange(item.HOF_ID, e.target.value)
                            }
                            className="bg-white border border-slate-200 text-slate-700 hover:border-slate-300 rounded-md text-xs py-1.5 pl-2.5 pr-7 focus:outline-none focus:border-slate-400 transition-all w-[110px] appearance-none cursor-pointer shadow-sm"
                          >
                            <option value="Pending">Pending</option>
                            <option value="Given">Given</option>
                            <option value="Not Allowed">Not Allowed</option>
                          </select>
                        </div>

                        <div className="relative">
                          <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                          <input
                            type="text"
                            placeholder="Receiver"
                            list="receiver-list-dt"
                            value={item.Received_By || ""}
                            onChange={(e) =>
                              onReceivedByChange(item.HOF_ID, e.target.value)
                            }
                            className="bg-white border border-slate-200 text-slate-700 hover:border-slate-300 focus:border-slate-400 focus:text-slate-900 rounded-md text-xs py-1.5 pl-7 pr-2.5 focus:outline-none transition-all w-[120px] sm:w-[140px] placeholder:text-slate-400 font-sans shadow-sm"
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center">
                        <Search className="w-5 h-5 text-slate-400" />
                      </div>
                      <p className="text-sm text-slate-400 font-medium">
                        No records match your current filters.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
            <p className="text-[11px] text-slate-500 font-mono">
              <span className="text-slate-700">
                {(currentPage - 1) * ROWS_PER_PAGE + 1}
              </span>
              {" – "}
              <span className="text-slate-700">
                {Math.min(currentPage * ROWS_PER_PAGE, filteredData.length)}
              </span>
              {" of "}
              <span className="text-slate-700">{filteredData.length}</span>
              {" records"}
            </p>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:border-slate-200 disabled:hover:text-slate-400 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {[...Array(totalPages)].map((_, i) => {
                if (totalPages > 5) {
                  if (
                    i + 1 !== 1 &&
                    i + 1 !== totalPages &&
                    Math.abs(i + 1 - currentPage) > 1
                  ) {
                    if (i + 1 === 2 || i + 1 === totalPages - 1)
                      return (
                        <span key={i} className="text-slate-400 text-xs px-1">
                          ···
                        </span>
                      );
                    return null;
                  }
                }
                return (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={cn(
                      "w-7 h-7 text-xs font-bold rounded-md transition-all font-mono",
                      currentPage === i + 1
                        ? "bg-slate-800 text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-200",
                    )}
                  >
                    {i + 1}
                  </button>
                );
              })}

              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:border-slate-200 disabled:hover:text-slate-400 transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
