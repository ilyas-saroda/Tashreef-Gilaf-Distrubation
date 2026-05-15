export type DistributionStatus = 'Given' | 'Not Allowed' | 'Pending';

export interface RumalEntry {
  id?: string | number;
  AccNo: string | number;
  SN: string | number;
  Full_Name: string;
  HOF_ID: string | number;
  Status: DistributionStatus;
  Received_By?: string;
  Update_Date?: string;
  Update_Day?: string;
  Update_Time?: string;
}

export interface Analytics {
  total: number;
  distributed: number;
  remaining: number;
}
