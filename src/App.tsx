import React from 'react';
import { AnalyticsHeader } from './components/AnalyticsHeader';
import { ExcelUpload } from './components/ExcelUpload';
import { DistributionTable } from './components/DistributionTable';
import { RumalEntry, Analytics, DistributionStatus } from './types';
import { LayoutDashboard, FileSpreadsheet, RefreshCcw, Cloud, CloudOff, Loader2, Edit3, Check, X, User, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { cn } from './lib/utils';

export default function App() {
  const [data, setData] = React.useState<RumalEntry[]>([]);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [showResetModal, setShowResetModal] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [supabaseStatus, setSupabaseStatus] = React.useState<'disconnected' | 'connected' | 'error'>('disconnected');
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [appTitle, setAppTitle] = React.useState(() => localStorage.getItem('app_distribution_title') || 'Shehrullah Rumal Distrubation');
  const [isEditingTitle, setIsEditingTitle] = React.useState(false);
  const [tempTitle, setTempTitle] = React.useState(appTitle);
  const [lastRefreshed, setLastRefreshed] = React.useState<Date>(new Date());
  const [dismissedRecentIds, setDismissedRecentIds] = React.useState<Set<string | number>>(new Set());
  const [dbKeys, setDbKeys] = React.useState<string[]>([]);
  const [importStats, setImportStats] = React.useState<{ 
    total: number; 
    unique: number; 
    duplicates: number;
    skipped: number;
    duplicateEntries: { id: string | number; name: string }[];
    skippedEntries: { name: string; sn: string | number }[];
  } | null>(null);

  // Helper to normalize Supabase data to App types (handles case sensitivity)
  const normalizeData = (items: any[]): RumalEntry[] => {
    return items.map(item => {
      const rawStatus = item.Status ?? item.status ?? 'Pending';
      let normalizedStatus: DistributionStatus = 'Pending';
      let extractedReceiver = '';

      const s = String(rawStatus).trim().toLowerCase();
      if (s.includes('given')) {
        normalizedStatus = 'Given';
        // Try to extract name after "given to" or "given "
        // Regular expression handles various formats: "Given to Name", "Given: Name", "Given - Name", etc.
        const match = String(rawStatus).match(/(?:given|distribution)\s*(?::|-|to)?\s*(.+)/i);
        if (match && match[1]) {
          extractedReceiver = match[1].trim();
        }
      } else if (s.includes('not allow')) {
        normalizedStatus = 'Not Allowed';
      } else if (s === 'pending') {
        normalizedStatus = 'Pending';
      }

      return {
        id: item.id,
        SN: item.SN ?? item.sn ?? item.S_N ?? item.index ?? '',
        AccNo: item.AccNo ?? item.ACCNO ?? item.accno ?? item.acc_no ?? item.Account_No ?? item.AccountNo ?? '',
        Full_Name: item.Full_Name ?? item.full_name ?? item.name ?? item.FULL_NAME ?? '',
        HOF_ID: item.HOF_ID ?? item.hof_id ?? item.HOF_id ?? '',
        Status: normalizedStatus,
        Received_By: (item.Received_By || item.received_by || item.ReceivedBy || item.receivedby || item.receiver || item.given_to || item.Given_To || extractedReceiver || '').trim(),
        Update_Date: item.Update_Date ?? item.update_date ?? undefined,
        Update_Day: item.Update_Day ?? item.update_day ?? undefined,
        Update_Time: item.Update_Time ?? item.update_time ?? undefined,
      };
    });
  };

  const scrollToHofId = (hofId: string | number) => {
    // Dispatch a custom event that the table component can listen to
    window.dispatchEvent(new CustomEvent('jump-to-hof', { 
      detail: { hofId } 
    }));
  };

  // Helper to map App updates to Supabase columns using detected schema
  const prepareUpdatesWithSchema = (updates: Partial<RumalEntry>, currentEntry?: RumalEntry) => {
    const mapped: any = {};
    
    // Process Status and Received_By (Given_To in user schema)
    const status = updates.Status ?? currentEntry?.Status ?? 'Pending';
    const receiver = (updates.Received_By ?? currentEntry?.Received_By ?? '').trim();
    const statusString = (status === 'Given' && receiver) ? `Given to ${receiver}` : status;

    // Use user's exact schema keys if detected, else best guess
    const getBestKey = (standardKey: string, alternates: string[]) => {
      if (dbKeys.includes(standardKey)) return standardKey;
      for (const alt of alternates) {
        if (dbKeys.includes(alt)) return alt;
      }
      // Case insensitive fallback
      const found = dbKeys.find(k => k.toLowerCase() === standardKey.toLowerCase());
      return found || standardKey;
    };

    if (updates.Status !== undefined || updates.Received_By !== undefined) {
      mapped[getBestKey('Status', ['status'])] = statusString;
      mapped[getBestKey('Given_To', ['given_to', 'Received_By', 'received_by'])] = receiver;
    }

    if (updates.Update_Date !== undefined) {
      const key = getBestKey('Update_Date', ['update_date']);
      mapped[key] = updates.Update_Date;
    }
    if (updates.Update_Day !== undefined) {
      const key = getBestKey('Update_Day', ['update_day']);
      mapped[key] = updates.Update_Day;
    }
    if (updates.Update_Time !== undefined) {
      const key = getBestKey('Update_Time', ['update_time']);
      mapped[key] = updates.Update_Time;
    }
    
    return mapped;
  };

  // Helper to map App updates to Supabase columns
  const prepareUpdates = (updates: Partial<RumalEntry>, currentEntry?: RumalEntry, caseType: 'Pascal' | 'lower' | 'upper' = 'Pascal') => {
    const mapped: any = {};
    
    // Process Status and Received_By
    const status = updates.Status ?? currentEntry?.Status ?? 'Pending';
    const receiver = (updates.Received_By ?? currentEntry?.Received_By ?? '').trim();
    const statusString = (status === 'Given' && receiver) ? `Given to ${receiver}` : status;

    const setKey = (key: string, value: any) => {
      if (caseType === 'lower') mapped[key.toLowerCase()] = value;
      else if (caseType === 'upper') mapped[key.toUpperCase()] = value;
      else mapped[key] = value;
    };

    if (updates.Status !== undefined || updates.Received_By !== undefined) {
      setKey('Status', statusString);
      if (updates.Received_By !== undefined) {
        setKey('Received_By', receiver);
      }
    }

    if (updates.Update_Date !== undefined) setKey('Update_Date', updates.Update_Date);
    if (updates.Update_Day !== undefined) setKey('Update_Day', updates.Update_Day);
    if (updates.Update_Time !== undefined) setKey('Update_Time', updates.Update_Time);
    
    return mapped;
  };

  // Load from Supabase or localStorage on mount
  React.useEffect(() => {
    const initData = async () => {
      const getLocalData = () => {
        const savedData = localStorage.getItem('rumal_distribution_data');
        if (savedData) {
          try {
            return JSON.parse(savedData) as RumalEntry[];
          } catch (e) {
            console.error('Failed to parse saved data', e);
          }
        }
        return [];
      };

      if (!isSupabaseConfigured) {
        setSupabaseStatus('disconnected');
        setData(getLocalData());
        setIsLoaded(true);
        return;
      }

      // 1. Try Supabase
      console.log('Fetching initial data from members table...');
      const { data: supabaseData, error } = await supabase
        .from('members')
        .select('*');

      if (error) {
        console.error('Supabase Initialization Error:', error);
        setSupabaseStatus('error');
        const detail = error.message === 'PGRST116' ? 'Table "members" not found.' : error.message;
        setErrorMessage(detail);
        setData(getLocalData());
        
        // Show a more helpful message for common Supabase issues
        if (error.message.includes('FetchError') || error.message.includes('Failed to fetch')) {
          console.warn('Network issue or Supabase URL is incorrect.');
        } else if (error.code === '42P01') {
          console.error('Table "members" does not exist in your database.');
        }
      } else if (supabaseData && supabaseData.length > 0) {
        setSupabaseStatus('connected');
        setErrorMessage(null);
        // Detect keys from first record
        const first = supabaseData[0];
        setDbKeys(Object.keys(first));
        console.log('Detected DB columns:', Object.keys(first));
        
        const normalized = normalizeData(supabaseData);
        console.log('Successfully loaded and normalized data:', normalized.length, 'records');
        setData(normalized);
        localStorage.setItem('rumal_distribution_data', JSON.stringify(normalized));
      } else {
        // Connected but cloud is empty - use local
        console.log('Supabase connected but "members" table is empty or data is missing.');
        setSupabaseStatus('connected');
        setErrorMessage(null);
        const local = getLocalData();
        setData(local);
      }
      setIsLoaded(true);
    };

    initData();
  }, []);

  const syncToCloud = async (entries: RumalEntry[]) => {
    if (!isSupabaseConfigured || entries.length === 0) return;
    
    setIsSyncing(true);
    try {
      // Filter out entries without a valid HOF_ID and deduplicate
      const validEntries = entries.filter(e => e.HOF_ID !== null && e.HOF_ID !== undefined && String(e.HOF_ID).trim() !== '');
      
      const uniqueEntriesMap = new Map<string | number, RumalEntry>();
      validEntries.forEach(entry => uniqueEntriesMap.set(entry.HOF_ID, entry));
      const uniqueEntries = Array.from(uniqueEntriesMap.values());

      if (uniqueEntries.length === 0) {
        console.warn('No valid entries to sync (missing HOF_ID)');
        return;
      }

      // Prepare entries for Cloud Sync
      const entriesToPush = uniqueEntries.map(e => {
        const statusString = (e.Status === 'Given' && e.Received_By) ? `Given to ${e.Received_By}` : e.Status;
        
        // Exact mapping to user's schema columns
        const payload: any = {
           "Status": statusString,
           "Given_To": e.Received_By,
           "Full_Name": e.Full_Name,
           "HOF_ID": e.HOF_ID,
           "AccNo": e.AccNo,
           "SN": e.SN
        };

        // Add id if we have one or generate from HOF_ID (since it's text PK)
        payload.id = e.id || String(e.HOF_ID);

        // Include timestamp fields if they exist
        if (e.Update_Date) payload.Update_Date = e.Update_Date;
        if (e.Update_Day) payload.Update_Day = e.Update_Day;
        if (e.Update_Time) payload.Update_Time = e.Update_Time;
        
        return payload;
      });

      const { error } = await supabase
        .from('members')
        .upsert(entriesToPush, { onConflict: 'id' });
      
      if (error) {
        // Retry with lowercase mapping if first attempt fails
        if (error.message.includes('column') || error.message.includes('not found')) {
            const lowercaseEntries = uniqueEntries.map(e => {
             const statusString = (e.Status === 'Given' && e.Received_By) ? `Given to ${e.Received_By}` : e.Status;
             return {
                sn: e.SN,
                accno: e.AccNo,
                full_name: e.Full_Name,
                hof_id: e.HOF_ID,
                status: statusString,
                given_to: e.Received_By,
                id: e.id || String(e.HOF_ID)
             };
           });
           
           const { error: retryError } = await supabase
             .from('members')
             .upsert(lowercaseEntries, { onConflict: 'id' });
           
           if (retryError) throw retryError;
        } else {
          throw error;
        }
      }
      setSupabaseStatus('connected');
      setErrorMessage(null);
    } catch (error: any) {
      console.error('Sync Error Details:', error);
      setSupabaseStatus('error');
      setErrorMessage(error.message || 'Sync failed');
      
      let message = 'Sync failed.';
      if (error?.message?.includes('404')) {
        message += ' Table "members" not found. Please create it in Supabase.';
      } else if (error?.message?.includes('violates unique constraint')) {
        message += ' HOF_ID conflict. Ensure HOF_ID is unique.';
      } else {
        message += ` ${error?.message || ''}. Check console for details.`;
      }
      
      alert(message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpload = async (newData: RumalEntry[]) => {
    // Collect specific issues
    const emptyEntries = newData.filter(e => e.HOF_ID === null || e.HOF_ID === undefined || String(e.HOF_ID).trim() === '');
    const validEntries = newData.filter(e => e.HOF_ID !== null && e.HOF_ID !== undefined && String(e.HOF_ID).trim() !== '');
    
    // Find duplicates and their names
    const duplicateEntries: { id: string | number; name: string }[] = [];
    const seenIds = new Set<string | number>();
    const duplicatesAdded = new Set<string | number>();

    validEntries.forEach(e => {
      if (seenIds.has(e.HOF_ID)) {
        if (!duplicatesAdded.has(e.HOF_ID)) {
          duplicateEntries.push({ id: e.HOF_ID, name: e.Full_Name || 'Unknown' });
          duplicatesAdded.add(e.HOF_ID);
        }
      }
      seenIds.add(e.HOF_ID);
    });

    const uniqueEntriesMap = new Map<string | number, RumalEntry>();
    validEntries.forEach(entry => uniqueEntriesMap.set(entry.HOF_ID, entry));
    const uniqueEntries = Array.from(uniqueEntriesMap.values());

    setImportStats({
      total: newData.length,
      unique: uniqueEntries.length,
      duplicates: duplicateEntries.length,
      skipped: emptyEntries.length,
      duplicateEntries,
      skippedEntries: emptyEntries.map(e => ({ name: e.Full_Name || 'Unnamed', sn: e.SN || 'N/A' }))
    });

    setData(uniqueEntries);
    localStorage.setItem('rumal_distribution_data', JSON.stringify(uniqueEntries));
    await syncToCloud(uniqueEntries);
  };

  const updateItemRemote = async (hofId: string | number, updates: Partial<RumalEntry>) => {
    if (isSupabaseConfigured && supabaseStatus === 'connected') {
      const currentEntry = data.find(item => String(item.HOF_ID) === String(hofId));
      
      try {
        const mappedUpdates = prepareUpdatesWithSchema(updates, currentEntry);
        const recordId = currentEntry?.id;
        
        let updateError;
        
        // Strategy: Use 'id' if we have it (it's the primary key)
        if (recordId) {
          const { error } = await supabase
            .from('members')
            .update(mappedUpdates)
            .eq('id', recordId);
          updateError = error;
        } else {
          // Fallback to HOF_ID (Pascal)
          const { error: err1 } = await supabase
            .from('members')
            .update(mappedUpdates)
            .eq('HOF_ID', String(hofId));
          updateError = err1;

          // If no rows affected or error, try hof_id (lower)
          if (updateError) {
             const { error: err2 } = await supabase
              .from('members')
              .update(mappedUpdates)
              .eq('hof_id', String(hofId));
             updateError = err2;
          }
        }

        if (updateError) {
          console.error('Remote update failed:', updateError);
        } else {
          console.log('Remote update successful for:', hofId);
        }
      } catch (err: any) {
        console.error('Remote update fatal error:', err);
      }
    }
  };

  const getTimestampFields = () => {
    const now = new Date();
    return {
      Update_Date: now.toLocaleDateString('en-GB'),
      Update_Day: now.toLocaleDateString('en-GB', { weekday: 'long' }),
      Update_Time: now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
  };

  const handleStatusChange = async (hofId: string | number, newStatus: DistributionStatus) => {
    const timestamps = getTimestampFields();
    setData(prev => prev.map(item => 
      String(item.HOF_ID) === String(hofId) ? { ...item, Status: newStatus, ...timestamps } : item
    ));
    
    // Remove from dismissed list so it shows up as a fresh update
    setDismissedRecentIds(prev => {
      const next = new Set(prev);
      next.delete(hofId);
      return next;
    });

    await updateItemRemote(hofId, { Status: newStatus, ...timestamps });
  };

  const handleReceivedByChange = async (hofId: string | number, newName: string) => {
    let updatedStatus: DistributionStatus | undefined;
    const timestamps = getTimestampFields();

    setData(prev => prev.map(item => {
      if (String(item.HOF_ID) === String(hofId)) {
        const shouldUpdateStatus = newName.trim() !== '' && item.Status === 'Pending';
        const newStatus = shouldUpdateStatus ? 'Given' as DistributionStatus : item.Status;
        updatedStatus = newStatus;
        return { 
          ...item, 
          Received_By: newName,
          Status: newStatus,
          ...timestamps
        };
      }
      return item;
    }));

    // Remove from dismissed list so it shows up as a fresh update
    setDismissedRecentIds(prev => {
      const next = new Set(prev);
      next.delete(hofId);
      return next;
    });

    await updateItemRemote(hofId, { 
      Received_By: newName, 
      ...(updatedStatus ? { Status: updatedStatus } : {}),
      ...timestamps
    });
  };

  const handleExport = (dataToExport: RumalEntry[]) => {
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DistributionStatus");
    
    const suffix = dataToExport.length < data.length ? '_Filtered' : '';
    XLSX.writeFile(wb, `Distribution_Update${suffix}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleReset = async () => {
    setData([]);
    localStorage.removeItem('rumal_distribution_data');
    
    if (isSupabaseConfigured && supabaseStatus === 'connected') {
      const { error } = await supabase
        .from('members')
        .delete()
        .neq('HOF_ID', '0'); // Delete everything
      if (error) console.error('Error clearing Supabase:', error);
    }
    
    setShowResetModal(false);
  };

  const analytics: Analytics = React.useMemo(() => ({
    total: data.length,
    distributed: data.filter(item => item.Status === 'Given').length,
    remaining: data.filter(item => item.Status === 'Pending' || item.Status === 'Not Allowed').length,
  }), [data]);

  const handleSaveTitle = () => {
    const trimmed = tempTitle.trim();
    if (trimmed) {
      setAppTitle(trimmed);
      localStorage.setItem('app_distribution_title', trimmed);
    } else {
      setTempTitle(appTitle);
    }
    setIsEditingTitle(false);
  };

  const handleCancelTitle = () => {
    setTempTitle(appTitle);
    setIsEditingTitle(false);
  };

  const handleRefresh = async () => {
    if (!isSupabaseConfigured) return;
    setIsSyncing(true);
    try {
      const { data: supabaseData, error } = await supabase
        .from('members')
        .select('*');
      
      if (error) throw error;
      if (supabaseData) {
        const normalized = normalizeData(supabaseData);
        setData(normalized);
        localStorage.setItem('rumal_distribution_data', JSON.stringify(normalized));
        setLastRefreshed(new Date());
      }
    } catch (e: any) {
      console.error('Refresh failed', e);
      alert('Failed to refresh: ' + e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearItemUpdateInfo = async (hofId: string | number) => {
    const updated = data.map(item => 
      String(item.HOF_ID) === String(hofId) 
        ? { ...item, Update_Date: undefined, Update_Day: undefined, Update_Time: undefined } 
        : item
    );
    setData(updated);
    localStorage.setItem('rumal_distribution_data', JSON.stringify(updated));
    await updateItemRemote(hofId, { 
      Update_Date: null as any, 
      Update_Day: null as any, 
      Update_Time: null as any 
    });
  };

  const handleDismissRecent = (hofId: string | number) => {
    setDismissedRecentIds(prev => {
      const next = new Set(prev);
      next.add(hofId);
      return next;
    });
  };

  const handleDismissAllRecent = () => {
    const currentIds = recentUpdates.map(item => item.HOF_ID);
    setDismissedRecentIds(prev => {
      const next = new Set(prev);
      currentIds.forEach(id => next.add(id));
      return next;
    });
  };

  const recentUpdates = React.useMemo(() => {
    return [...data]
      .filter(item => item.Update_Date && !dismissedRecentIds.has(item.HOF_ID))
      .sort((a, b) => {
        const timeA = `${a.Update_Date} ${a.Update_Time}`;
        const timeB = `${b.Update_Date} ${b.Update_Time}`;
        return timeB.localeCompare(timeA);
      })
      .slice(0, 5);
  }, [data, dismissedRecentIds]);

  return (
    <div className="min-h-screen bg-slate-950 font-sans selection:bg-emerald-500/30 selection:text-emerald-200 text-slate-200">
      {/* Custom Confirmation Modal */}
      <AnimatePresence>
        {showResetModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setShowResetModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl"
            >
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <RefreshCcw className="w-6 h-6 text-rose-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Reset Distribution?</h3>
                <p className="text-slate-400 text-sm">
                  This will clear all current data from both Local and Cloud storage. This action cannot be undone.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <button 
                  onClick={handleReset}
                  className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition-colors"
                >
                  Confirm Reset
                </button>
                <button 
                  onClick={() => setShowResetModal(false)}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-emerald-600/5 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-blue-600/5 blur-[120px] rounded-full" />
      </div>

      <nav className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-900/40">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Rumal<span className="text-emerald-500">Track</span>
            </h1>
            <div className="hidden sm:flex items-center gap-2 px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
              <button 
                onClick={handleRefresh}
                disabled={isSyncing}
                className="flex items-center gap-1.5 hover:bg-slate-700 px-1 rounded transition-colors group"
              >
                {isSyncing ? <Loader2 className="w-3 h-3 text-emerald-500 animate-spin" /> : <RefreshCcw className="w-3 h-3 text-emerald-500 group-hover:rotate-180 transition-transform duration-500" />}
                <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-500">Refresh</span>
              </button>
              <div className="w-[1px] h-3 bg-slate-700 mx-1" />
              {supabaseStatus === 'connected' ? (
                <div className="flex items-center gap-1.5">
                  <Cloud className="w-3 h-3 text-emerald-500" />
                  <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-500">Sync Active</span>
                </div>
              ) : !isSupabaseConfigured ? (
                <div className="flex items-center gap-1.5 opacity-60" title="Set Supabase keys in Settings to enable Cloud Sync">
                  <CloudOff className="w-3 h-3 text-slate-400" />
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Local Only</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5" title={errorMessage || 'Connection failed'}>
                  <CloudOff className="w-3 h-3 text-rose-400" />
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-rose-400">
                      Sync Error
                    </span>
                    <button 
                      onClick={handleRefresh}
                      className="p-1 hover:bg-rose-400/10 rounded text-rose-400 transition-colors"
                      title="Retry Connection"
                    >
                      <RefreshCcw className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {data.length > 0 && (
              <button 
                onClick={() => setShowResetModal(true)}
                className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-all"
                title="Clear Data"
              >
                <RefreshCcw className="w-4 h-4" />
              </button>
            )}
            <div className="h-4 w-[1px] bg-slate-800" />
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-400">Organization Unit</p>
              <p className="text-sm font-bold text-white leading-none">MNC Distribution Dept.</p>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8 relative">
        <header className="mb-12 group">
          <div className="flex items-center gap-4 mb-2 min-h-[48px]">
            {isEditingTitle ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 w-full max-w-2xl"
              >
                <input
                  type="text"
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveTitle();
                    if (e.key === 'Escape') handleCancelTitle();
                  }}
                  autoFocus
                  className="bg-slate-900 border-2 border-emerald-500/50 rounded-xl px-4 py-2 text-3xl font-extrabold text-white w-full outline-none focus:border-emerald-500 transition-all shadow-lg shadow-emerald-950/20"
                />
                <button 
                  onClick={handleSaveTitle}
                  className="p-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg transition-all"
                >
                  <Check className="w-5 h-5" />
                </button>
                <button 
                  onClick={handleCancelTitle}
                  className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </motion.div>
            ) : (
              <>
                <motion.h2 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-4xl font-extrabold text-white tracking-tight cursor-pointer hover:text-emerald-400 transition-colors"
                  onClick={() => setIsEditingTitle(true)}
                >
                  {appTitle}
                </motion.h2>
                <button 
                  onClick={() => setIsEditingTitle(true)}
                  className="p-2 opacity-0 group-hover:opacity-100 bg-slate-800/50 hover:bg-slate-800 text-slate-400 rounded-lg transition-all"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
          <motion.p 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="text-slate-400 max-w-2xl"
          >
            Management and tracking of material distribution across regional centers. 
            Real-time synchronization and analytical oversight.
          </motion.p>
        </header>

        <AnimatePresence mode="wait">
          {data.length === 0 ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="max-w-2xl mx-auto py-12"
            >
              <ExcelUpload onUpload={handleUpload} />
            </motion.div>
          ) : (
            <motion.div
              key="data"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <AnalyticsHeader analytics={analytics} />

              {recentUpdates.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-8 p-6 rounded-3xl bg-slate-900 border border-slate-800"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <div className="w-1 h-4 bg-emerald-500 rounded-full" />
                      Recently Updated
                    </h3>
                    <div className="flex items-center gap-4">
                      <div className="text-[10px] text-slate-500 font-mono">
                        Last refreshed: {lastRefreshed.toLocaleTimeString()}
                      </div>
                      <button 
                        onClick={handleDismissAllRecent}
                        className="flex items-center gap-1.5 px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-full text-[10px] uppercase font-bold tracking-widest transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                        Clear All
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {recentUpdates.map((item) => (
                      <div 
                        key={item.HOF_ID} 
                        onClick={() => scrollToHofId(item.HOF_ID)}
                        className="p-3 rounded-xl bg-slate-950 border border-slate-800 group hover:border-emerald-500/50 transition-all cursor-pointer active:scale-95"
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-[10px] font-mono text-emerald-500 font-bold">{item.HOF_ID}</span>
                          <div className="flex items-center gap-1">
                            <span className={cn(
                              "text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase",
                              item.Status === 'Given' ? "border-emerald-500/20 text-emerald-500" : "border-amber-500/20 text-amber-500"
                            )}>
                              {item.Status}
                            </span>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDismissRecent(item.HOF_ID);
                              }}
                              className="p-1 opacity-0 group-hover:opacity-100 hover:bg-rose-500/10 text-slate-500 hover:text-rose-500 rounded transition-all"
                              title="Dismiss"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>
                        <p className="text-sm font-bold text-slate-200 truncate group-hover:text-emerald-400 transition-colors">{item.Full_Name}</p>
                        <div className="flex items-center justify-between mt-2 text-[8px] text-slate-500 font-medium">
                          <span>{item.Update_Day?.substring(0,3)} • {item.Update_Time}</span>
                          {item.Received_By && <span className="text-emerald-500/60 flex items-center gap-1"><User className="w-2 h-2" /> {item.Received_By}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
              
              {importStats && (importStats.duplicates > 0 || importStats.skipped > 0) && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-8 p-6 rounded-3xl bg-amber-500/5 border border-amber-500/10 backdrop-blur-xl"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shadow-lg shadow-amber-950/20">
                        <RefreshCcw className="w-6 h-6 text-amber-500" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-amber-200 leading-tight">Data Integrity Report</h3>
                        <p className="text-amber-500/60 text-sm font-medium">Automatic system cleanup during import session</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setImportStats(null)}
                      className="p-2.5 hover:bg-amber-500/10 rounded-2xl transition-all text-amber-500 hover:scale-105 active:scale-95"
                    >
                      <RefreshCcw className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {importStats.duplicates > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.2em] text-amber-500/80">
                            <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                            <span>Duplicates Merged ({importStats.duplicates})</span>
                          </div>
                          <span className="text-[10px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full font-bold border border-amber-500/20">HOF_ID Conflict</span>
                        </div>
                        <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-4 custom-scrollbar">
                           {importStats.duplicateEntries.map(entry => (
                             <div key={entry.id} className="flex items-center gap-3 px-4 py-3 bg-slate-900/50 rounded-2xl border border-slate-800 group hover:border-amber-500/30 transition-all duration-300">
                               <div className="flex flex-col">
                                 <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">HOF ID</span>
                                 <span className="text-sm font-mono text-amber-500 font-bold">{entry.id}</span>
                               </div>
                               <div className="h-6 w-px bg-slate-800" />
                               <div className="flex flex-col overflow-hidden">
                                 <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Full Name</span>
                                 <span className="text-sm text-slate-200 font-medium truncate">{entry.name}</span>
                               </div>
                             </div>
                           ))}
                        </div>
                      </div>
                    )}

                    {importStats.skipped > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.2em] text-rose-500/80">
                            <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
                            <span>Skipped Records ({importStats.skipped})</span>
                          </div>
                          <span className="text-[10px] bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded-full font-bold border border-rose-500/20">Empty HOF_ID</span>
                        </div>
                        <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-4 custom-scrollbar">
                           {importStats.skippedEntries.map((entry, idx) => (
                             <div key={idx} className="flex items-center gap-3 px-4 py-3 bg-slate-900/50 rounded-2xl border border-slate-800 group hover:border-rose-500/30 transition-all duration-300">
                               <div className="flex flex-col">
                                 <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">SN</span>
                                 <span className="text-sm font-mono text-rose-500 font-bold">{entry.sn}</span>
                               </div>
                               <div className="h-6 w-px bg-slate-800" />
                               <div className="flex flex-col overflow-hidden">
                                 <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Full Name</span>
                                 <span className="text-sm text-slate-200 font-medium truncate">{entry.name}</span>
                               </div>
                             </div>
                           ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              <DistributionTable 
                data={data} 
                onStatusChange={handleStatusChange} 
                onReceivedByChange={handleReceivedByChange}
                onClearUpdateInfo={handleClearItemUpdateInfo}
                onExport={handleExport}
                onImportNew={() => setShowResetModal(true)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="mt-20 border-t border-slate-900 py-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4 grayscale opacity-50">
            <LayoutDashboard className="w-5 h-5 text-slate-400" />
            <div className="h-4 w-[1px] bg-slate-800" />
            <span className="text-xs font-bold tracking-widest text-slate-500 uppercase">Secure Data Tunnel v2</span>
          </div>
          <p className="text-xs text-slate-600 font-medium">
            &copy; 2026 MNC Global Logistics. All Rights Reserved. Optimized for Low-Power Systems.
          </p>
        </div>
      </footer>
    </div>
  );
}
