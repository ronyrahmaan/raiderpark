// Supabase Edge Function: send-notification
// Send push notifications to users
// Input: user_id, notification_type, message
// Integrates with expo-notifications

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers for cross-origin requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Notification types
type NotificationType =
  | "lot_alert" // Lot status change
  | "enforcement_alert" // Enforcement spotted nearby
  | "timer_reminder" // Parking timer about to expire
  | "event_reminder" // Upcoming event affecting parking
  | "best_time" // Best time to arrive notification
  | "system"; // System notifications

// Request body interface
interface NotificationRequest {
  user_id?: string; // Single user
  user_ids?: string[]; // Multiple users
  notification_type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>; // Additional data payload
  lot_id?: string; // Related lot
  priority?: "default" | "high"; // Notification priority
  ttl?: number; // Time to live in seconds
}

// Expo push notification message format
interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
  priority?: "default" | "high";
  ttl?: number;
  channelId?: string;
  badge?: number;
}

// Expo push response
interface ExpoPushTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
}

// Check if user should receive this notification type
async function shouldSendNotification(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  notificationType: NotificationType
): Promise<{ shouldSend: boolean; expoPushToken?: string }> {
  // Get user preferences and push token
  const { data: user, error } = await supabase
    .from("users")
    .select("notification_preferences")
    .eq("id", userId)
    .single();

  if (error || !user) {
    return { shouldSend: false };
  }

  const prefs = user.notification_preferences || {};

  // Check if push is enabled
  if (!prefs.push_enabled) {
    return { shouldSend: false };
  }

  // Check quiet hours
  if (prefs.quiet_hours_start && prefs.quiet_hours_end) {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;

    if (
      currentTime >= prefs.quiet_hours_start ||
      currentTime < prefs.quiet_hours_end
    ) {
      // In quiet hours, only allow high-priority notifications
      if (notificationType !== "timer_reminder") {
        return { shouldSend: false };
      }
    }
  }

  // Check notification type preferences
  const typePreferences: Record<NotificationType, string> = {
    lot_alert: "lot_alerts",
    enforcement_alert: "enforcement_alerts",
    timer_reminder: "push_enabled", // Always enabled if push is on
    event_reminder: "event_reminders",
    best_time: "lot_alerts",
    system: "push_enabled", // Always enabled if push is on
  };

  const prefKey = typePreferences[notificationType];
  if (prefs[prefKey] === false) {
    return { shouldSend: false };
  }

  // Get push token from a separate table or user metadata
  // For now, we'll check if there's a push_token in notification_preferences
  const expoPushToken = prefs.expo_push_token;

  return {
    shouldSend: !!expoPushToken,
    expoPushToken,
  };
}

// Send notification via Expo Push API
async function sendExpoNotification(
  messages: ExpoPushMessage[]
): Promise<{ success: boolean; tickets: ExpoPushTicket[]; error?: string }> {
  if (messages.length === 0) {
    return { success: true, tickets: [] };
  }

  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        tickets: [],
        error: `Expo API error: ${response.status} - ${errorText}`,
      };
    }

    const result = await response.json();
    return {
      success: true,
      tickets: result.data || [],
    };
  } catch (err) {
    return {
      success: false,
      tickets: [],
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// Get channel ID based on notification type
function getChannelId(type: NotificationType): string {
  const channels: Record<NotificationType, string> = {
    lot_alert: "lot-alerts",
    enforcement_alert: "enforcement-alerts",
    timer_reminder: "timer-reminders",
    event_reminder: "event-reminders",
    best_time: "recommendations",
    system: "system",
  };
  return channels[type] || "default";
}

// Log notification for analytics/debugging
async function logNotification(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  notificationType: NotificationType,
  status: "sent" | "failed" | "skipped",
  ticketId?: string,
  error?: string
): Promise<void> {
  // You could create a notifications_log table to track sent notifications
  // For now, we just log to console
  console.log(
    JSON.stringify({
      event: "notification",
      user_id: userId,
      type: notificationType,
      status,
      ticket_id: ticketId,
      error,
      timestamp: new Date().toISOString(),
    })
  );
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Only accept POST requests
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    const body: NotificationRequest = await req.json();
    const {
      user_id,
      user_ids,
      notification_type,
      title,
      message,
      data = {},
      lot_id,
      priority = "default",
      ttl = 86400, // 24 hours default
    } = body;

    // Validate required fields
    if (!notification_type || !title || !message) {
      return new Response(
        JSON.stringify({
          error: "notification_type, title, and message are required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!user_id && (!user_ids || user_ids.length === 0)) {
      return new Response(
        JSON.stringify({ error: "user_id or user_ids is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate notification type
    const validTypes: NotificationType[] = [
      "lot_alert",
      "enforcement_alert",
      "timer_reminder",
      "event_reminder",
      "best_time",
      "system",
    ];
    if (!validTypes.includes(notification_type)) {
      return new Response(
        JSON.stringify({
          error: `Invalid notification_type. Must be one of: ${validTypes.join(", ")}`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Collect all user IDs to process
    const allUserIds = user_id ? [user_id] : user_ids || [];

    // Prepare notification messages
    const messages: ExpoPushMessage[] = [];
    const skippedUsers: string[] = [];
    const processedUsers: string[] = [];

    // Check each user and build messages
    for (const uid of allUserIds) {
      const { shouldSend, expoPushToken } = await shouldSendNotification(
        supabase,
        uid,
        notification_type
      );

      if (!shouldSend || !expoPushToken) {
        skippedUsers.push(uid);
        await logNotification(supabase, uid, notification_type, "skipped");
        continue;
      }

      // Validate Expo push token format
      if (!expoPushToken.startsWith("ExponentPushToken[")) {
        skippedUsers.push(uid);
        await logNotification(
          supabase,
          uid,
          notification_type,
          "skipped",
          undefined,
          "Invalid push token format"
        );
        continue;
      }

      // Build notification message
      const pushMessage: ExpoPushMessage = {
        to: expoPushToken,
        title,
        body: message,
        data: {
          ...data,
          notification_type,
          lot_id,
          timestamp: new Date().toISOString(),
        },
        sound: "default",
        priority,
        ttl,
        channelId: getChannelId(notification_type),
      };

      messages.push(pushMessage);
      processedUsers.push(uid);
    }

    // Send notifications in batches (Expo allows up to 100 per request)
    const batchSize = 100;
    const allTickets: ExpoPushTicket[] = [];
    const errors: string[] = [];

    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      const result = await sendExpoNotification(batch);

      if (result.success) {
        allTickets.push(...result.tickets);
      } else {
        errors.push(result.error || "Unknown error");
      }
    }

    // Log results for each processed user
    for (let i = 0; i < processedUsers.length; i++) {
      const ticket = allTickets[i];
      if (ticket) {
        if (ticket.status === "ok") {
          await logNotification(
            supabase,
            processedUsers[i],
            notification_type,
            "sent",
            ticket.id
          );
        } else {
          await logNotification(
            supabase,
            processedUsers[i],
            notification_type,
            "failed",
            undefined,
            ticket.message || ticket.details?.error
          );
        }
      }
    }

    // Build response
    const successCount = allTickets.filter((t) => t.status === "ok").length;
    const failCount = allTickets.filter((t) => t.status === "error").length;

    const response = {
      success: true,
      summary: {
        total_users: allUserIds.length,
        sent: successCount,
        failed: failCount,
        skipped: skippedUsers.length,
      },
      tickets: allTickets.map((t) => ({
        status: t.status,
        id: t.id,
        error: t.status === "error" ? t.message || t.details?.error : undefined,
      })),
      errors: errors.length > 0 ? errors : undefined,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in send-notification:", error);

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
