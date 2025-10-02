import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = "https://wturfdjywbpzassyuwun.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0dXJmZGp5d2JwemFzc3l1d3VuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwODk0MTYsImV4cCI6MjA3NDY2NTQxNn0.cAKbRbNUGcH-gbUSfMXzf6BIDNKsRhuWrenUd2ojguk";

/**
 * Helper to call Supabase Edge Functions with GET
 */
export async function fnGet<T = any>(path: string): Promise<T> {
  const url = `${SUPABASE_URL}/functions/v1${path}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Edge Function error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Helper to call Supabase Edge Functions with POST
 */
export async function fnPost<T = any>(path: string, body?: any): Promise<T> {
  const url = `${SUPABASE_URL}/functions/v1${path}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`Edge Function error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}
