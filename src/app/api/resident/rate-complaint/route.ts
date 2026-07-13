import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = await request.json();
    const { complaintId, rating, comment } = body;

    if (!complaintId || !rating) {
      return NextResponse.json({ error: "MISSING REQUIRED FIELDS" }, { status: 400 });
    }
    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "RATING MUST BE 1-5" }, { status: 400 });
    }

    const { data: complaint, error: fetchErr } = await supabase
      .from("complaints")
      .select("id, resident_id, status, rating")
      .eq("id", complaintId)
      .single();

    if (fetchErr || !complaint) {
      return NextResponse.json({ error: "COMPLAINT NOT FOUND" }, { status: 404 });
    }
    if (complaint.resident_id !== user.id) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
    if (complaint.status.toLowerCase() !== "resolved") {
      return NextResponse.json({ error: "ONLY RESOLVED COMPLAINTS CAN BE RATED" }, { status: 400 });
    }
    if (complaint.rating !== null) {
      return NextResponse.json({ error: "COMPLAINT ALREADY RATED" }, { status: 400 });
    }

    const { error: updateErr } = await supabase
      .from("complaints")
      .update({ rating, rating_comment: comment?.trim() || null })
      .eq("id", complaintId);

    if (updateErr) throw new Error(updateErr.message);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "INTERNAL SERVER ERROR";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
