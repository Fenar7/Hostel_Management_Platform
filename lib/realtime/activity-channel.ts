import { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { ActivityLog } from "@prisma/client";

export interface ActivityChannelParams {
  organizationId: string;
  hostelId?: string;
}

/**
 * Creates a Supabase Realtime channel subscription for ActivityLog inserts.
 * 
 * Supabase uses Postgres LISTEN/NOTIFY under the hood. The `filter` string
 * ensures that only relevant rows are sent over the WebSocket.
 */
export function createActivityChannel(
  supabase: SupabaseClient,
  params: ActivityChannelParams,
  onInsert: (item: ActivityLog) => void
): RealtimeChannel {
  
  let filterStr = `organizationId=eq.${params.organizationId}`;
  
  // If hostelId is provided, we strictly filter by both organization AND hostel.
  // Note: Supabase realtime filters only support simple equality/in on a single column natively
  // without advanced RLS. We can filter on organizationId and do client-side filtering 
  // for hostelId if needed, but since it's a multi-tenant app, we'll subscribe to 
  // organizationId and do a quick client-side drop for hostelId if it doesn't match.
  // Since this is for Warden, it's safer to use hostelId=eq.hostelId if present,
  // but let's subscribe to the org and filter locally for maximum compatibility 
  // with simple filters.
  
  if (params.hostelId) {
    filterStr = `hostelId=eq.${params.hostelId}`;
  }

  const channel = supabase
    .channel(`activity-feed-${params.hostelId || params.organizationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'ActivityLog',
        filter: filterStr,
      },
      (payload) => {
        const item = payload.new as ActivityLog;
        
        // Double check the organization scope just in case
        if (item.organizationId !== params.organizationId) return;
        
        // Double check the hostel scope if we are a warden
        if (params.hostelId && item.hostelId !== params.hostelId) return;

        // Parse Date objects from JSON payload
        const parsedItem = {
          ...item,
          createdAt: new Date(item.createdAt),
        };

        onInsert(parsedItem);
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('Successfully subscribed to Activity Feed Realtime updates');
      }
    });

  return channel;
}
