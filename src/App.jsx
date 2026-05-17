import React from "react";
import { AnalyticsHeader } from "./components/AnalyticsHeader";
import { ExcelUpload } from "./components/ExcelUpload";
import { DistributionTable } from "./components/DistributionTable";
import { ResetModal } from "./components/ResetModal";
import { DataIntegrityReport } from "./components/DataIntegrityReport";
import { RecentUpdates } from "./components/RecentUpdates";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { TitleHeader } from "./components/TitleHeader";
import { DynamicExcelViewer } from "./components/DynamicExcelViewer"; // New Component
import {
  LayoutDashboard,
  FileSpreadsheet,
  RefreshCcw,
  Cloud,
  CloudOff,
  Loader2,
  Edit3,
  Check,
  X,
  User,
  Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import * as XLSX from "xlsx";
import { supabase, isSupabaseConfigured } from "./lib/supabase";
import { cn } from "./lib/utils";

export default function App() {
  const [data, setData] = React.useState([]);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [showResetModal, setShowResetModal] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [supabaseStatus, setSupabaseStatus] = React.useState("disconnected");
  const [errorMessage, setErrorMessage] = React.useState(null);
  const [view, setView] = React.useState("main"); // Fixed the ReferenceError!
  const [appTitle, setAppTitle] = React.useState(
    () =>
      localStorage.getItem("app_distribution_title") ||
      "Tashrif Gilaf Distribution",
  );
  const [lastRefreshed, setLastRefreshed] = React.useState(new Date());
  const [dismissedRecentIds, setDismissedRecentIds] = React.useState(new Set());
  const [dbKeys, setDbKeys] = React.useState([]);
  const [importStats, setImportStats] = React.useState(null);

  // Helper helper to push to local Excel companion server
  const saveToLocalExcelFile = async (fullData) => {
    try {
      await fetch("http://localhost:5000/api/save-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: fullData }),
      });
    } catch (e) {
      console.warn(
        "Local Backup Server is not running. Excel file not updated directly.",
      );
    }
  };

  const updateSingleItemLocalExcel = async (hofId, updates) => {
    try {
      await fetch("http://localhost:5000/api/update-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hofId, updates }),
      });
    } catch (e) {
      console.warn(
        "Local Backup Server is offline. Single row excel bypass triggered.",
      );
    }
  };

  // Helper to normalize Supabase data to App types (handles case sensitivity)
  const normalizeData = (items) => {
    return items.map((item) => {
      const rawStatus = item.Status ?? item.status ?? "Pending";
      let normalizedStatus = "Pending";
      let extractedReceiver = "";

      const s = String(rawStatus).trim().toLowerCase();
      if (s.includes("given")) {
        normalizedStatus = "Given";
        const match = String(rawStatus).match(
          /(?:given|distribution)\s*(?::|-|to)?\s*(.+)/i,
        );
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
        AccNo:
          item.AccNo ??
          item.ACCNO ??
          item.accno ??
          item.acc_no ??
          item.Account_No ??
          item.AccountNo ??
          "",
        Full_Name:
          item.Full_Name ?? item.full_name ?? item.name ?? item.FULL_NAME ?? "",
        HOF_ID: item.HOF_ID ?? item.hof_id ?? item.HOF_id ?? "",
        Status: normalizedStatus,
        Received_By: (
          item.Received_By ||
          item.received_by ||
          item.ReceivedBy ||
          item.receivedby ||
          item.receiver ||
          item.given_to ||
          item.Given_To ||
          extractedReceiver ||
          ""
        ).trim(),
        Update_Date: item.Update_Date ?? item.update_date ?? undefined,
        Update_Day: item.Update_Day ?? item.update_day ?? undefined,
        Update_Time: item.Update_Time ?? item.update_time ?? undefined,
      };
    });
  };

  const scrollToHofId = (hofId) => {
    window.dispatchEvent(
      new CustomEvent("jump-to-hof", {
        detail: { hofId },
      }),
    );
  };

  // Helper to map App updates to Supabase columns using detected schema
  const prepareUpdatesWithSchema = (updates, currentEntry) => {
    const mapped = {};
    const status = updates.Status ?? currentEntry?.Status ?? "Pending";
    const receiver = (
      updates.Received_By ??
      currentEntry?.Received_By ??
      ""
    ).trim();
    const statusString =
      status === "Given" && receiver ? `Given to ${receiver}` : status;

    const getBestKey = (standardKey, alternates) => {
      if (dbKeys.includes(standardKey)) return standardKey;
      for (const alt of alternates) {
        if (dbKeys.includes(alt)) return alt;
      }
      const found = dbKeys.find(
        (k) => k.toLowerCase() === standardKey.toLowerCase(),
      );
      return found || standardKey;
    };

    if (updates.Status !== undefined || updates.Received_By !== undefined) {
      mapped[getBestKey("Status", ["status"])] = statusString;
      mapped[
        getBestKey("Given_To", ["given_to", "Received_By", "received_by"])
      ] = receiver;
    }

    if (updates.Update_Date !== undefined) {
      const key = getBestKey("Update_Date", ["update_date"]);
      mapped[key] = updates.Update_Date;
    }
    if (updates.Update_Day !== undefined) {
      const key = getBestKey("Update_Day", ["update_day"]);
      mapped[key] = updates.Update_Day;
    }
    if (updates.Update_Time !== undefined) {
      const key = getBestKey("Update_Time", ["update_time"]);
      mapped[key] = updates.Update_Time;
    }

    return mapped;
  };

  // Load from Supabase or localStorage on mount
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
      const { data: supabaseData, error } = await supabase
        .from("members")
        .select("*");

      if (error) {
        console.error("Supabase Initialization Error:", error);
        setSupabaseStatus("error");
        const detail =
          error.message === "PGRST116"
            ? 'Table "members" not found.'
            : error.message;
        setErrorMessage(detail);
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
        localStorage.setItem(
          "rumal_distribution_data",
          JSON.stringify(normalized),
        );
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
      const validEntries = entries.filter(
        (e) =>
          e.HOF_ID !== null &&
          e.HOF_ID !== undefined &&
          String(e.HOF_ID).trim() !== "",
      );

      const uniqueEntriesMap = new Map();
      validEntries.forEach((entry) =>
        uniqueEntriesMap.set(entry.HOF_ID, entry),
      );
      const uniqueEntries = Array.from(uniqueEntriesMap.values());

      if (uniqueEntries.length === 0) return;

      const entriesToPush = uniqueEntries.map((e) => {
        const statusString =
          e.Status === "Given" && e.Received_By
            ? `Given to ${e.Received_By}`
            : e.Status;
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

      const { error } = await supabase
        .from("members")
        .upsert(entriesToPush, { onConflict: "id" });
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
    const emptyEntries = newData.filter(
      (e) =>
        e.HOF_ID === null ||
        e.HOF_ID === undefined ||
        String(e.HOF_ID).trim() === "",
    );
    const validEntries = newData.filter(
      (e) =>
        e.HOF_ID !== null &&
        e.HOF_ID !== undefined &&
        String(e.HOF_ID).trim() !== "",
    );

    const duplicateEntries = [];
    const seenIds = new Set();
    const duplicatesAdded = new Set();

    validEntries.forEach((e) => {
      if (seenIds.has(e.HOF_ID)) {
        if (!duplicatesAdded.has(e.HOF_ID)) {
          duplicateEntries.push({
            id: e.HOF_ID,
            name: e.Full_Name || "Unknown",
          });
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
      skippedEntries: emptyEntries.map((e) => ({
        name: e.Full_Name || "Unnamed",
        sn: e.SN || "N/A",
      })),
    });

    setData(uniqueEntries);
    localStorage.setItem(
      "rumal_distribution_data",
      JSON.stringify(uniqueEntries),
    );

    await saveToLocalExcelFile(uniqueEntries);
    await syncToCloud(uniqueEntries);
  };

  const updateItemRemote = async (hofId, updates) => {
    await updateSingleItemLocalExcel(hofId, updates);

    if (isSupabaseConfigured && supabaseStatus === "connected") {
      const currentEntry = data.find(
        (item) => String(item.HOF_ID) === String(hofId),
      );
      try {
        const mappedUpdates = prepareUpdatesWithSchema(updates, currentEntry);
        const recordId = currentEntry?.id;
        let updateError;

        if (recordId) {
          const { error } = await supabase
            .from("members")
            .update(mappedUpdates)
            .eq("id", recordId);
          updateError = error;
        } else {
          const { error: err1 } = await supabase
            .from("members")
            .update(mappedUpdates)
            .eq("HOF_ID", String(hofId));
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
      Update_Time: now.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    };
  };

  const handleStatusChange = async (hofId, newStatus) => {
    const timestamps = getTimestampFields();
    setData((prev) => {
      const updated = prev.map((item) =>
        String(item.HOF_ID) === String(hofId)
          ? { ...item, Status: newStatus, ...timestamps }
          : item,
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
          const shouldUpdateStatus =
            newName.trim() !== "" && item.Status === "Pending";
          const newStatus = shouldUpdateStatus ? "Given" : item.Status;
          updatedStatus = newStatus;
          return {
            ...item,
            Received_By: newName,
            Status: newStatus,
            ...timestamps,
          };
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

  const handleExport = (dataToExport) => {
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DistributionStatus");
    XLSX.writeFile(
      wb,
      `Distribution_Update_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
  };

  const handleReset = async () => {
    setData([]);
    localStorage.removeItem("rumal_distribution_data");
    await saveToLocalExcelFile([]);
    setShowResetModal(false);
  };

  const analytics = React.useMemo(
    () => ({
      total: data.length,
      distributed: data.filter((item) => item.Status === "Given").length,
      remaining: data.filter(
        (item) => item.Status === "Pending" || item.Status === "Not Allowed",
      ).length,
    }),
    [data],
  );

  const handleRefresh = async () => {
    if (!isSupabaseConfigured) return;
    setIsSyncing(true);
    try {
      const { data: supabaseData, error } = await supabase
        .from("members")
        .select("*");
      if (error) throw error;
      if (supabaseData) {
        const normalized = normalizeData(supabaseData);
        setData(normalized);
        localStorage.setItem(
          "rumal_distribution_data",
          JSON.stringify(normalized),
        );
        saveToLocalExcelFile(normalized);
        setLastRefreshed(new Date());
      }
    } catch (e) {
      alert("Failed to refresh: " + e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const recentUpdates = React.useMemo(() => {
    return [...data]
      .filter(
        (item) => item.Update_Date && !dismissedRecentIds.has(item.HOF_ID),
      )
      .sort((a, b) =>
        `${b.Update_Date} ${b.Update_Time}`.localeCompare(
          `${a.Update_Date} ${a.Update_Time}`,
        ),
      )
      .slice(0, 5);
  }, [data, dismissedRecentIds]);

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-200">
      <ResetModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={handleReset}
      />

      {/* Modern Compact View Toggle Bar at the very top */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex justify-between items-center text-xs">
        <span className="text-slate-400 font-medium">System View Mode:</span>
        <div className="flex gap-2">
          <button
            onClick={() => setView("main")}
            className={cn(
              "px-3 py-1 rounded transition-all font-semibold",
              view === "main"
                ? "bg-emerald-500 text-slate-950 shadow"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700",
            )}
          >
            Tashrif Main Distribution (Online/Offline Sync)
          </button>
          <button
            onClick={() => setView("dynamic")}
            className={cn(
              "px-3 py-1 rounded transition-all font-semibold",
              view === "dynamic"
                ? "bg-blue-500 text-white shadow"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700",
            )}
          >
            Dynamic Excel Sheet Viewer (100% Offline No-Schema)
          </button>
        </div>
      </div>

      <Navbar
        isSyncing={isSyncing}
        supabaseStatus={supabaseStatus}
        errorMessage={errorMessage}
        onRefresh={handleRefresh}
        onResetClick={() => setShowResetModal(true)}
        showResetButton={data.length > 0 && view === "main"}
      />

      <main className="max-w-7xl mx-auto px-4 py-8 relative">
        <AnimatePresence mode="wait">
          {view === "dynamic" ? (
            <motion.div
              key="dynamic-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {/* Dynamic Component Render safely */}
              <DynamicExcelViewer />
            </motion.div>
          ) : (
            <motion.div
              key="main-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <TitleHeader
                appTitle={appTitle}
                onChangeTitle={(t) => {
                  setAppTitle(t);
                  localStorage.setItem("app_distribution_title", t);
                }}
              />

              {data.length === 0 ? (
                <div className="max-w-2xl mx-auto py-12">
                  <ExcelUpload onUpload={handleUpload} />
                </div>
              ) : (
                <>
                  <AnalyticsHeader analytics={analytics} />
                  <RecentUpdates
                    recentUpdates={recentUpdates}
                    lastRefreshed={lastRefreshed}
                    onClearAllRecent={() =>
                      setDismissedRecentIds(new Set(data.map((i) => i.HOF_ID)))
                    }
                    onDismissRecent={(id) =>
                      setDismissedRecentIds((prev) => new Set([...prev, id]))
                    }
                    onCardClick={scrollToHofId}
                  />
                  <DataIntegrityReport
                    importStats={importStats}
                    onClose={() => setImportStats(null)}
                  />
                  <DistributionTable
                    data={data}
                    onStatusChange={handleStatusChange}
                    onReceivedByChange={handleReceivedByChange}
                    onClearUpdateInfo={async (id) => {
                      const updated = data.map((item) =>
                        String(item.HOF_ID) === String(id)
                          ? {
                              ...item,
                              Update_Date: undefined,
                              Update_Day: undefined,
                              Update_Time: undefined,
                            }
                          : item,
                      );
                      setData(updated);
                      localStorage.setItem(
                        "rumal_distribution_data",
                        JSON.stringify(updated),
                      );
                      await updateItemRemote(id, {
                        Update_Date: null,
                        Update_Day: null,
                        Update_Time: null,
                      });
                    }}
                    onExport={handleExport}
                    onImportNew={() => setShowResetModal(true)}
                  />
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  );
}
