import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { sendStatusUpdateEmail } from "@/lib/email";

interface SingleQuerySuccess {
  status: string;
  resident_id: string;
  category: string;
  profiles: { full_name: string } | { full_name: string }[] | null;
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    
    // 1. Authenticate user and verify role
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    // 2. Parse request body
    const body = await request.json();
    const { complaintId, newStatus, newPriority, note } = body;

    if (!complaintId || !newStatus || !newPriority) {
      return NextResponse.json({ error: "MISSING REQUIRED FIELDS" }, { status: 400 });
    }

    const { data: complaint, error: fetchErr } = await (supabase
      .from("complaints")
      .select("status, resident_id, category, profiles:resident_id(full_name)")
      .eq("id", complaintId)
      .single() as unknown as Promise<{ data: SingleQuerySuccess | null; error: Error | null }>);

    if (fetchErr || !complaint) {
      return NextResponse.json({ error: "COMPLAINT NOT FOUND" }, { status: 404 });
    }

    const originalStatus = complaint.status.toLowerCase();
    
    // Map newStatus to exact DB check constraint values: "Open", "In Progress", "Resolved"
    let dbStatus = "Open";
    const nextStatusLower = newStatus.toLowerCase();
    if (nextStatusLower === "progress" || nextStatusLower === "in progress" || nextStatusLower === "in_progress") {
      dbStatus = "In Progress";
    } else if (nextStatusLower === "resolved") {
      dbStatus = "Resolved";
    }
    
    const statusChanged = originalStatus !== dbStatus.toLowerCase();

    // Resolved tickets are locked
    if (originalStatus === "resolved") {
      return NextResponse.json({ error: "RESOLVED TICKET IS READ-ONLY" }, { status: 400 });
    }

    // 4. Insert log history if status changed OR if a note is provided
    if (statusChanged || (note && note.trim() !== "")) {
      const { error: historyErr } = await supabase
        .from("complaint_status_history")
        .insert({
          complaint_id: complaintId,
          status: dbStatus,
          note: note.trim() || null,
          actor_id: user.id,
        });

      if (historyErr) {
        throw new Error(`History insert failed: ${historyErr.message}`);
      }
    }

    // 5. Update complaints status, priority and updated_at
    const { error: updateErr } = await supabase
      .from("complaints")
      .update({
        status: dbStatus,
        priority: newPriority,
        updated_at: new Date().toISOString(),
      })
      .eq("id", complaintId);

    if (updateErr) {
      throw new Error(`Complaint update failed: ${updateErr.message}`);
    }

    // 6. Fetch resident's email via admin client
    let residentEmail = "";
    try {
      const adminClient = createAdminClient();
      const { data: authUser, error: adminErr } = await adminClient.auth.admin.getUserById(
        complaint.resident_id
      );
      if (!adminErr && authUser?.user) {
        residentEmail = authUser.user.email || "";
      }
    } catch (adminClientErr) {
      console.error("Failed to run admin client to fetch user email:", adminClientErr);
    }

    // 7. Send Email via Resend if email is found
    if (residentEmail && statusChanged) {
      // Safely fetch resident full name
      const residentName = (Array.isArray(complaint.profiles)
        ? complaint.profiles[0]?.full_name
        : complaint.profiles?.full_name) || "Resident";

      await sendStatusUpdateEmail(
        residentEmail,
        residentName,
        complaintId,
        complaint.category,
        dbStatus,
        note ? note.trim() : null
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("API Update status error:", error);
    const msg = error instanceof Error ? error.message : "INTERNAL SERVER ERROR";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
