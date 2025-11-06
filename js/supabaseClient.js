import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://wngzhtuybcuhqmojoycq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InduZ3podHV5YmN1aHFtb2pveWNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0MTc3NTIsImV4cCI6MjA3Nzk5Mzc1Mn0.NC0bCrPO-AjNSMfU1t8GWAXkDrBz2gvhx4zm8LeGVgM';
const ATTACHMENTS_BUCKET = 'intranet-attachments';

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

  if (options.in) {
    Object.entries(options.in).forEach(([column, values]) => {
      query.in(column, values);
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

export async function fetchEngagementDashboard() {
  return supabase.from('engagement_dashboard').select('*').single();
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

export async function uploadAttachment(file, folder, onUpload) {
  if (!file || !file.name) {
    return { data: null, error: null };
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9_.-]+/g, '-').toLowerCase();
  const pathKey = `${folder}/${crypto.randomUUID()}-${safeName}`;

  if (typeof onUpload === 'function') {
    onUpload({ status: 'uploading', path: pathKey });
  }

  const { data, error } = await supabase.storage.from(ATTACHMENTS_BUCKET).upload(pathKey, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (error) {
    if (typeof onUpload === 'function') {
      onUpload({ status: 'error', error });
    }
    return { data: null, error };
  }

  const { data: urlData } = supabase.storage.from(ATTACHMENTS_BUCKET).getPublicUrl(data.path);

  if (typeof onUpload === 'function') {
    onUpload({ status: 'success', path: data.path, url: urlData.publicUrl });
  }

  return { data: { path: data.path, url: urlData.publicUrl }, error: null };
}

export async function fetchAttachments(targetType, ids = []) {
  if (!ids.length) {
    return { data: [], error: null };
  }

  return supabase
    .from('attachments')
    .select('*')
    .eq('target_type', targetType)
    .in('target_id', ids)
    .order('created_at', { ascending: false });
}
