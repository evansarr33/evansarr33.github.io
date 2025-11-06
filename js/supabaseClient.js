import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/esm/supabase.js';

const SUPABASE_URL = 'https://wngzhtuybcuhqmojoycq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InduZ3podHV5YmN1aHFtb2pveWNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0MTc3NTIsImV4cCI6MjA3Nzk5Mzc1Mn0.NC0bCrPO-AjNSMfU1t8GWAXkDrBz2gvhx4zm8LeGVgM';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
  },
});

export async function fetchTable(table, options = {}) {
  const query = supabase.from(table).select(options.select || '*');

  if (options.order) {
    const { column, ascending = false } = options.order;
    query.order(column, { ascending });
  }

  if (options.limit) {
    query.limit(options.limit);
  }

  if (options.match) {
    query.match(options.match);
  }

  if (options.eq) {
    Object.entries(options.eq).forEach(([column, value]) => {
      query.eq(column, value);
    });
  }

  return await query;
}

export async function insertRow(table, payload) {
  return supabase.from(table).insert(payload).select().single();
}

export async function updateRow(table, id, payload) {
  return supabase.from(table).update(payload).eq('id', id).select().single();
}

export async function deleteRow(table, id) {
  return supabase.from(table).delete().eq('id', id);
}

export async function fetchDashboardMetrics() {
  return supabase.from('dashboard_metrics').select('*').single();
}

export function subscribeToTable(table, handler, options = {}) {
  const { event = '*', schema = 'public', filter } = options;
  const channel = supabase
    .channel(`public:${table}:${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event, schema, table, filter }, handler)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
