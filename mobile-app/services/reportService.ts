import { supabase } from './supabase';

export const getDailyReport = async (date: string) => {
  try {
    const { data, error } = await supabase.rpc('get_daily_report', { p_date: date });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[reportService] Error fetching daily report:', error);
    return null;
  }
};

export const getMonthlyReport = async (year: number, month: number) => {
  try {
    const { data, error } = await supabase.rpc('get_monthly_report', { p_year: year, p_month: month });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[reportService] Error fetching monthly report:', error);
    return null;
  }
};
