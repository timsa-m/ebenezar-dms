import { supabase } from './supabase';

export const getCollectionsList = async () => {
  try {
    const { data, error } = await supabase
      .from('loans')
      .select('*, clients(*)')
      .in('status', ['Overdue', 'Defaulted'])
      .order('days_past_due', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[collectionsService] Error fetching collections:', error);
    return [];
  }
};
