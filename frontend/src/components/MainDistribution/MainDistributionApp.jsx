import React from "react";
import { AnalyticsHeader } from "./AnalyticsHeader";
import { ExcelUpload } from "./ExcelUpload";
import { DistributionTable } from "./DistributionTable";
import { ResetModal } from "../Modals/ResetModal";
import { DataIntegrityReport } from "./DataIntegrityReport";
import { RecentUpdates } from "./RecentUpdates";
import { Navbar } from "../Layout/Navbar";
import { TitleHeader } from "../Layout/TitleHeader";
import BulkDistribution from "./BulkDistribution";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";
import { cn } from "../../lib/utils";
import { motion } from "motion/react";

export function MainDistributionApp({ currentView, onViewToggle }) {
  const [data, setData] = React.useState([]);
  const accountMap = React.useMemo(() => {
    const map = new Map();
    if (Array.isArray(data)) {
      data.forEach(item => {
        if (item && item.AccNo) {
          map.set(String(item.AccNo).trim(), item);
        }
      });
    }
    return map;
  }, [data]);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [showResetModal, setShowResetModal] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [supabaseStatus, setSupabaseStatus] = React.useState("disconnected");
  const [errorMessage, setErrorMessage] = React.useState(null);
  const [activeTab, setActiveTab] = React.useState("register");
  const [dashboardStatusFilter, setDashboardStatusFilter] = React.useState("All");
  const [appTitle, setAppTitle] = React.useState(
    () => localStorage.getItem("app_distribution_title") || "Tashrif Gilaf Distribution",
  );
  const [lastRefreshed, setLastRefreshed] = React.useState(new Date());
  const [dismissedRecentIds, setDismissedRecentIds] = React.useState(new Set());
  const [dbKeys, setDbKeys] = React.useState([]);
  const [importStats, setImportStats] = React.useState(null);

  const saveToLocalExcelFile = async (fullData) => {
    try {
      await fetch("http://localhost:5000/api/main/save-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: fullData }),
      });
    } catch (e) {
      console.warn("Local Backup Server is not running. Excel file not updated directly.");
    }
  };

  const updateSingleItemLocalExcel = async (hofId, updates) => {
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
      await fetch(`${API_BASE}/api/main/update-item`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hofId, updates }),
      });
    } catch (e) {
      console.warn("Local Backup Server is offline. Single row excel bypass triggered.");
    }
  };

  const normalizeData = (items) => {
    return items.map((item) => {
      const rawStatus = item.Status ?? item.status ?? "Pending";
      let normalizedStatus = "Pending";
      let extractedReceiver = "";

      const s = String(rawStatus).trim().toLowerCase();
      if (s.includes("given")) {
        normalizedStatus = "Given";
        const match = String(rawStatus).match(/(?:given|distribution)\s*(?::|-|to)?\s*(.+)/i);
        if (match && match[1]) {
          extractedReceiver = match[1].trim();
        }
      } else if (s.includes("not allow")) {
        normalizedStatus = "Not Allowed";
      } else if (s === "pending") {
        normalizedStatus = "Pending";
      }

      return {
        id: item.id,
        SN: item.SN ?? item.sn ?? item.S_N ?? item.index ?? "",
        AccNo: item.AccNo ?? item.ACCNO ?? item.accno ?? item.acc_no ?? item.Account_No ?? item.AccountNo ?? "",
        Full_Name: item.Full_Name ?? item.full_name ?? item.name ?? item.FULL_NAME ?? "",
        HOF_ID: item.HOF_ID ?? item.hof_id ?? item.HOF_id ?? "",
        Status: normalizedStatus,
        Received_By: (
          item.Received_By || item.received_by || item.ReceivedBy || item.receivedby || item.receiver || item.given_to || item.Given_To || extractedReceiver || ""
        ).trim(),
        Update_Date: item.Update_Date ?? item.update_date ?? undefined,
        Update_Day: item.Update_Day ?? item.update_day ?? undefined,
        Update_Time: item.Update_Time ?? item.update_time ?? undefined,
      };
    });
  };

  const scrollToHofId = (hofId) => {
    setActiveTab("register");
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent("jump-to-hof", {
          detail: { hofId },
        }),
      );
    }, 100);
  };

  const handleAnalyticsCardClick = (statusType) => {
    setDashboardStatusFilter(statusType);
    setActiveTab("register");
  };

  const prepareUpdatesWithSchema = (updates, currentEntry) => {
    const mapped = {};
    const status = updates.Status ?? currentEntry?.Status ?? "Pending";
    const receiver = (updates.Received_By ?? currentEntry?.Received_By ?? "").trim();
    const statusString = status === "Given" && receiver ? `Given to ${receiver}` : status;

    const getBestKey = (standardKey, alternates) => {
      if (dbKeys.includes(standardKey)) return standardKey;
      for (const alt of alternates) {
        if (dbKeys.includes(alt)) return alt;
      }
      const found = dbKeys.find((k) => k.toLowerCase() === standardKey.toLowerCase());
      return found || standardKey;
    };

    if (updates.Status !== undefined || updates.Received_By !== undefined) {
      mapped[getBestKey("Status", ["status"])] = statusString;
      mapped[getBestKey("Given_To", ["given_to", "Received_By", "received_by"])] = receiver;
    }

    if (updates.Update_Date !== undefined) {
      mapped[getBestKey("Update_Date", ["update_date"])] = updates.Update_Date;
    }
    if (updates.Update_Day !== undefined) {
      mapped[getBestKey("Update_Day", ["update_day"])] = updates.Update_Day;
    }
    if (updates.Update_Time !== undefined) {
      mapped[getBestKey("Update_Time", ["update_time"])] = updates.Update_Time;
    }

    return mapped;
  };

  React.useEffect(() => {
    const initData = async () => {
      const getLocalData = () => {
        const savedData = localStorage.getItem("rumal_distribution_data");
        if (savedData) {
          try {
            return JSON.parse(savedData);
          } catch (e) {
            console.error("Failed to parse saved data", e);
          }
        }
        return [];
      };

      if (!isSupabaseConfigured) {
        setSupabaseStatus("disconnected");
        const localData = getLocalData();
        setData(localData);
        saveToLocalExcelFile(localData);
        setIsLoaded(true);
        return;
      }

      console.log("Fetching initial data from members table...");
      const { data: supabaseData, error } = await supabase.from("members").select("*");

      if (error) {
        console.error("Supabase Initialization Error:", error);
        setSupabaseStatus("error");
        setErrorMessage(error.message === "PGRST116" ? 'Table "members" not found.' : error.message);
        const local = getLocalData();
        setData(local);
        saveToLocalExcelFile(local);
      } else if (supabaseData && supabaseData.length > 0) {
        setSupabaseStatus("connected");
        setErrorMessage(null);
        const first = supabaseData[0];
        setDbKeys(Object.keys(first));

        const normalized = normalizeData(supabaseData);
        setData(normalized);
        localStorage.setItem("rumal_distribution_data", JSON.stringify(normalized));
        saveToLocalExcelFile(normalized);
      } else {
        setSupabaseStatus("connected");
        setErrorMessage(null);
        const local = getLocalData();
        setData(local);
        saveToLocalExcelFile(local);
      }
      setIsLoaded(true);
    };

    initData();
  }, []);

  const syncToCloud = async (entries) => {
    if (!isSupabaseConfigured || entries.length === 0) return;

    setIsSyncing(true);
    try {
      const validEntries = entries.filter((e) => e.HOF_ID !== null && e.HOF_ID !== undefined && String(e.HOF_ID).trim() !== "");
      const uniqueEntriesMap = new Map();
      validEntries.forEach((entry) => uniqueEntriesMap.set(entry.HOF_ID, entry));
      const uniqueEntries = Array.from(uniqueEntriesMap.values());

      if (uniqueEntries.length === 0) return;

      const entriesToPush = uniqueEntries.map((e) => {
        const statusString = e.Status === "Given" && e.Received_By ? `Given to ${e.Received_By}` : e.Status;
        const payload = {
          Status: statusString,
          Given_To: e.Received_By,
          Full_Name: e.Full_Name,
          HOF_ID: e.HOF_ID,
          AccNo: e.AccNo,
          SN: e.SN,
        };
        payload.id = e.id || String(e.HOF_ID);
        if (e.Update_Date) payload.Update_Date = e.Update_Date;
        if (e.Update_Day) payload.Update_Day = e.Update_Day;
        if (e.Update_Time) payload.Update_Time = e.Update_Time;
        return payload;
      });

      const { error } = await supabase.from("members").upsert(entriesToPush, { onConflict: "id" });
      if (error) throw error;
      setSupabaseStatus("connected");
      setErrorMessage(null);
    } catch (error) {
      console.error("Sync Error Details:", error);
      setSupabaseStatus("error");
      setErrorMessage(error.message || "Sync failed");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpload = async (newData) => {
    const emptyEntries = newData.filter((e) => e.HOF_ID === null || e.HOF_ID === undefined || String(e.HOF_ID).trim() === "");
    const validEntries = newData.filter((e) => e.HOF_ID !== null && e.HOF_ID !== undefined && String(e.HOF_ID).trim() !== "");

    const duplicateEntries = [];
    const seenIds = new Set();
    const duplicatesAdded = new Set();

    validEntries.forEach((e) => {
      if (seenIds.has(e.HOF_ID)) {
        if (!duplicatesAdded.has(e.HOF_ID)) {
          duplicateEntries.push({ id: e.HOF_ID, name: e.Full_Name || "Unknown" });
          duplicatesAdded.add(e.HOF_ID);
        }
      }
      seenIds.add(e.HOF_ID);
    });

    const uniqueEntriesMap = new Map();
    validEntries.forEach((entry) => uniqueEntriesMap.set(entry.HOF_ID, entry));
    const uniqueEntries = Array.from(uniqueEntriesMap.values());

    setImportStats({
      total: newData.length,
      unique: uniqueEntries.length,
      duplicates: duplicateEntries.length,
      skipped: emptyEntries.length,
      duplicateEntries,
      skippedEntries: emptyEntries.map((e) => ({ name: e.Full_Name || "Unnamed", sn: e.SN || "N/A" })),
    });

    setData(uniqueEntries);
    localStorage.setItem("rumal_distribution_data", JSON.stringify(uniqueEntries));

    await saveToLocalExcelFile(uniqueEntries);
    await syncToCloud(uniqueEntries);
  };

  const updateItemRemote = async (hofId, updates) => {
    await updateSingleItemLocalExcel(hofId, updates);

    if (isSupabaseConfigured && supabaseStatus === "connected") {
      const currentEntry = data.find((item) => String(item.HOF_ID) === String(hofId));
      try {
        const mappedUpdates = prepareUpdatesWithSchema(updates, currentEntry);
        const recordId = currentEntry?.id;
        let updateError;

        if (recordId) {
          const { error } = await supabase.from("members").update(mappedUpdates).eq("id", recordId);
          updateError = error;
        } else {
          const { error: err1 } = await supabase.from("members").update(mappedUpdates).eq("HOF_ID", String(hofId));
          updateError = err1;
        }
        if (updateError) console.error("Remote update failed:", updateError);
      } catch (err) {
        console.error("Remote update fatal error:", err);
      }
    }
  };

  const getTimestampFields = () => {
    const now = new Date();
    return {
      Update_Date: now.toLocaleDateString("en-GB"),
      Update_Day: now.toLocaleDateString("en-GB", { weekday: "long" }),
      Update_Time: now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    };
  };

  const handleStatusChange = async (hofId, newStatus) => {
    const timestamps = getTimestampFields();
    setData((prev) => {
      const updated = prev.map((item) =>
        String(item.HOF_ID) === String(hofId) ? { ...item, Status: newStatus, ...timestamps } : item
      );
      localStorage.setItem("rumal_distribution_data", JSON.stringify(updated));
      return updated;
    });
    await updateItemRemote(hofId, { Status: newStatus, ...timestamps });
  };

  const handleReceivedByChange = async (hofId, newName) => {
    let updatedStatus;
    const timestamps = getTimestampFields();

    setData((prev) => {
      const updated = prev.map((item) => {
        if (String(item.HOF_ID) === String(hofId)) {
          const shouldUpdateStatus = newName.trim() !== "" && item.Status === "Pending";
          const newStatus = shouldUpdateStatus ? "Given" : item.Status;
          updatedStatus = newStatus;
          return { ...item, Received_By: newName, Status: newStatus, ...timestamps };
        }
        return item;
      });
      localStorage.setItem("rumal_distribution_data", JSON.stringify(updated));
      return updated;
    });
    await updateItemRemote(hofId, {
      Received_By: newName,
      ...(updatedStatus ? { Status: updatedStatus } : {}),
      ...timestamps,
    });
  };

  const handleReset = async () => {
    setData([]);
    localStorage.removeItem("rumal_distribution_data");
    await saveToLocalExcelFile([]);
    setShowResetModal(false);
  };

  const handleBatchSyncState = (successfulUpdates, receiverName) => {
    if (successfulUpdates.length === 0) return;

    const submittedReceiverName = String(receiverName ?? "").trim();
    const timestamps = getTimestampFields();
    const updateIdsSet = new Set(successfulUpdates.map((u) => String(u.HOF_ID)));
    const updateAccNoSet = new Set(successfulUpdates.map((u) => String(u.AccNo).trim()));

    setData((prev) => {
      const newData = prev.map((item) => {
        if (updateIdsSet.has(String(item.HOF_ID)) || updateAccNoSet.has(String(item.AccNo).trim())) {
          return { ...item, Status: "Given", Received_By: submittedReceiverName, ...timestamps };
        }
        return item;
      });
      localStorage.setItem("rumal_distribution_data", JSON.stringify(newData));
      return newData;
    });

    successfulUpdates.forEach((item) => {
      updateItemRemote(item.HOF_ID, {
        Status: "Given",
        Received_By: submittedReceiverName,
        ...timestamps,
      }).catch((err) => console.error("Bulk sync error for", item.HOF_ID, err));
    });
  };

  const analytics = React.useMemo(() => ({
    total: data.length,
    distributed: data.filter((item) => item.Status === "Given").length,
    pending: data.filter((item) => item.Status === "Pending").length,
    remaining: data.filter((item) => item.Status === "Pending" || item.Status === "Not Allowed").length,
  }), [data]);

  const handleRefresh = async () => {
    if (!isSupabaseConfigured) return;
    setIsSyncing(true);
    try {
      const { data: supabaseData, error } = await supabase.from("members").select("*");
      if (error) throw error;
      if (supabaseData) {
        const normalized = normalizeData(supabaseData);
        setData(normalized);
        localStorage.setItem("rumal_distribution_data", JSON.stringify(normalized));
        saveToLocalExcelFile(normalized);
        setLastRefreshed(new Date());
      }
    } catch (e) {
      alert("Failed to refresh: " + e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExport = (dataToExport) => {
    const XLSX = require("xlsx");
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DistributionStatus");
    XLSX.writeFile(wb, `Distribution_Update_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const recentUpdates = React.useMemo(() => {
    return [...data]
      .filter((item) => item.Update_Date && !dismissedRecentIds.has(item.HOF_ID))
      .sort((a, b) => `${b.Update_Date} ${b.Update_Time}`.localeCompare(`${a.Update_Date} ${a.Update_Time}`))
      .slice(0, 5);
  }, [data, dismissedRecentIds]);

  return (
    <>
      <ResetModal isOpen={showResetModal} onClose={() => setShowResetModal(false)} onConfirm={handleReset} />
      
      <Navbar
        isSyncing={isSyncing}
        supabaseStatus={supabaseStatus}
        errorMessage={errorMessage}
        onRefresh={handleRefresh}
        onResetClick={() => setShowResetModal(true)}
        showResetButton={data.length > 0}
        currentView={currentView}
        onViewToggle={onViewToggle}
      />

      {data.length > 0 && (
        <div className="w-full bg-white border-b border-slate-200 p-4 flex justify-center gap-4 shadow-sm relative z-10">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={cn("px-6 py-2 rounded-md transition-all font-bold tracking-wide flex items-center gap-2", activeTab === "dashboard" ? "mnc-btn-primary shadow-lg" : "bg-white text-slate-500 hover:bg-white border border-slate-200")}
          >
            📊 Live Dashboard Overview
          </button>
          <button
            onClick={() => setActiveTab("register")}
            className={cn("px-6 py-2 rounded-md transition-all font-bold tracking-wide flex items-center gap-2", activeTab === "register" ? "mnc-btn-primary shadow-lg" : "bg-white text-slate-500 hover:bg-white border border-slate-200")}
          >
            📁 Live Distribution Register
          </button>
          <button
            onClick={() => setActiveTab("bulk")}
            className={cn("px-6 py-2 rounded-md transition-all font-bold tracking-wide flex items-center gap-2", activeTab === "bulk" ? "mnc-btn-primary shadow-lg" : "bg-white text-slate-500 hover:bg-white border border-slate-200")}
          >
            📦 Bulk Distribution Entry
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-8 relative transition-all">
        <motion.div key="main-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {data.length === 0 || activeTab === "dashboard" ? (
            <TitleHeader appTitle={appTitle} onChangeTitle={(t) => { setAppTitle(t); localStorage.setItem("app_distribution_title", t); }} />
          ) : null}

          {data.length === 0 ? (
            <div className="max-w-2xl mx-auto py-12">
              <ExcelUpload onUpload={handleUpload} />
            </div>
          ) : (
            <>
              {activeTab === "dashboard" && (
                <>
                  <AnalyticsHeader analytics={analytics} onCardClick={handleAnalyticsCardClick} />
                  <RecentUpdates
                    recentUpdates={recentUpdates}
                    lastRefreshed={lastRefreshed}
                    onClearAllRecent={() => setDismissedRecentIds(new Set(data.map((i) => i.HOF_ID)))}
                    onDismissRecent={(id) => setDismissedRecentIds((prev) => new Set([...prev, id]))}
                    onCardClick={scrollToHofId}
                  />
                </>
              )}

              <DataIntegrityReport importStats={importStats} onClose={() => setImportStats(null)} />

              {activeTab === "bulk" && (
                <BulkDistribution
                  data={data}
                  accountMap={accountMap}
                  onBulkUpdateSuccess={(updatedRecords, receiverName) => {
                    handleBatchSyncState(updatedRecords, receiverName);
                  }}
                />
              )}

              {activeTab === "register" && (
                <div className="flex flex-col gap-6 w-full">
                  <DistributionTable
                    data={data}
                    statusFilterPreset={dashboardStatusFilter}
                    onStatusChange={handleStatusChange}
                    onReceivedByChange={handleReceivedByChange}
                    onClearUpdateInfo={async (id) => {
                      const updated = data.map((item) =>
                        String(item.HOF_ID) === String(id)
                          ? { ...item, Update_Date: undefined, Update_Day: undefined, Update_Time: undefined }
                          : item
                      );
                      setData(updated);
                      localStorage.setItem("rumal_distribution_data", JSON.stringify(updated));
                      await updateItemRemote(id, { Update_Date: null, Update_Day: null, Update_Time: null });
                    }}
                    onExport={handleExport}
                    onImportNew={() => setShowResetModal(true)}
                  />
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>
    </>
  );
}