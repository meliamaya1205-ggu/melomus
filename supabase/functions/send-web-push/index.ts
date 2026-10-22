// Setup type definitions for built-in Supabase Edge Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

interface PushPayload {
  familyId: string;
  category?: string;
  title: string;
  body: string;
  url?: string;
  targetUserId?: string;
  targetRole?: 'mama' | 'papa' | 'all';
  excludeUserId?: string;
  isDiscrete?: boolean;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Enforces discrete mode text for sensitive notifications on lock screens
 */
function getDiscreteText(category?: string, originalTitle?: string, originalBody?: string) {
  switch (category) {
    case 'cuquiTime':
      return {
        title: 'MELOMUS 💕',
        body: 'Tienes un momento especial reservado.',
      };
    case 'couple':
      return {
        title: 'MELOMUS 💕',
        body: 'Tienes un momento de conexión programado.',
      };
    case 'medications':
      return {
        title: 'MELOMUS 🏥',
        body: 'Tienes una indicación médica programada.',
      };
    case 'appointments':
      return {
        title: 'MELOMUS 🏥',
        body: 'Tienes una cita médica programada.',
      };
    case 'finance':
      return {
        title: 'MELOMUS 💰',
        body: 'Tienes un recordatorio financiero programado.',
      };
    default:
      return {
        title: originalTitle || 'MELOMUS 🏡',
        body: originalBody || 'Tienes un recordatorio pendiente.',
      };
  }
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@melomus.app";

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({
          error: "VAPID keys not configured in Edge Function secrets. Please set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Configure web-push details with server-side secrets
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const payload: PushPayload = await req.json();

    if (!payload.familyId || !payload.title) {
      return new Response(
        JSON.stringify({ error: "familyId and title are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize admin client to query subscriptions with bypass of user RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Query candidate push subscriptions for this family
    let query = supabaseAdmin
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth")
      .eq("family_id", payload.familyId);

    if (payload.excludeUserId) {
      query = query.neq("user_id", payload.excludeUserId);
    }

    if (payload.targetUserId) {
      query = query.eq("user_id", payload.targetUserId);
    }

    const { data: subscriptions, error: subError } = await query;

    if (subError) {
      return new Response(
        JSON.stringify({ error: subError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, delivered: 0, message: "No active subscriptions found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. If targetRole is specified ('mama' or 'papa'), filter subscriptions by profile relationship
    let filteredSubs = subscriptions;
    if (payload.targetRole && payload.targetRole !== 'all') {
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, relationship")
        .eq("family_id", payload.familyId);

      if (profiles) {
        const matchingUserIds = new Set(
          profiles
            .filter((p) => p.relationship === payload.targetRole)
            .map((p) => p.id)
        );
        filteredSubs = subscriptions.filter((s) => matchingUserIds.has(s.user_id));
      }
    }

    // 3. Prepare Notification Content (respecting privacy and discrete mode)
    const isSensitive = payload.isDiscrete || ['couple', 'cuquiTime', 'medications', 'appointments', 'finance'].includes(payload.category || '');
    
    let finalTitle = payload.title;
    let finalBody = payload.body;

    if (isSensitive) {
      const discrete = getDiscreteText(payload.category, payload.title, payload.body);
      finalTitle = discrete.title;
      finalBody = discrete.body;
    }

    const notificationPayload = JSON.stringify({
      title: finalTitle,
      body: finalBody,
      url: payload.url || "/",
      category: payload.category,
      isDiscrete: isSensitive,
      timestamp: Date.now(),
    });

    // 4. Dispatch Push Notifications in parallel
    const sendPromises = filteredSubs.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webpush.sendNotification(pushSubscription, notificationPayload);
        return { success: true, subscriptionId: sub.id };
      } catch (err: any) {
        // HTTP 404 or 410 means the subscription is expired or unsubscribed
        if (err.statusCode === 404 || err.statusCode === 410) {
          // Clean up dead subscription
          await supabaseAdmin.from("push_subscriptions").delete().eq("id", sub.id);
          return { success: false, subscriptionId: sub.id, expired: true };
        }
        return { success: false, subscriptionId: sub.id, error: err.message };
      }
    });

    const results = await Promise.all(sendPromises);
    const deliveredCount = results.filter((r) => r.success).length;
    const expiredCount = results.filter((r) => !r.success && (r as any).expired).length;

    return new Response(
      JSON.stringify({
        success: true,
        delivered: deliveredCount,
        expiredCleaned: expiredCount,
        totalCandidates: filteredSubs.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal Server Error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
