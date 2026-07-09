import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { sendImportantNoticeEmail } from "@/lib/email";

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
      .select("full_name, role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    // 2. Parse request body
    const body = await request.json();
    const { title, bodyText, isImportant } = body;

    if (!title || !bodyText) {
      return NextResponse.json({ error: "MISSING REQUIRED FIELDS" }, { status: 400 });
    }

    // 3. Insert notice row into database
    const authorName = profile.full_name || "SUPERINTENDENT";
    const { error: insertErr } = await supabase
      .from("notices")
      .insert({
        title: title.trim().toUpperCase(),
        body: bodyText.trim(),
        is_important: isImportant,
        author: authorName,
        created_by: user.id,
      });

    if (insertErr) {
      throw new Error(`Notice insert failed: ${insertErr.message}`);
    }

    // 4. Send emails to all residents if isImportant is checked
    if (isImportant) {
      try {
        // Fetch all resident user profiles
        const { data: residents, error: residentErr } = await supabase
          .from("profiles")
          .select("id")
          .eq("role", "resident");

        if (!residentErr && residents && residents.length > 0) {
          const residentIds = new Set(residents.map((r) => r.id));

          // Fetch all auth users via the admin client
          const adminClient = createAdminClient();
          const { data: listData, error: adminErr } = await adminClient.auth.admin.listUsers();
          
          if (!adminErr && listData?.users) {
            const residentEmails = listData.users
              .filter((u) => residentIds.has(u.id) && u.email)
              .map((u) => u.email!);

            if (residentEmails.length > 0) {
              await sendImportantNoticeEmail(
                residentEmails,
                title.trim().toUpperCase(),
                bodyText.trim(),
                authorName
              );
            }
          }
        }
      } catch (emailErr) {
        console.error("Failed to fetch resident emails or send notifications:", emailErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("API Create notice error:", error);
    const msg = error instanceof Error ? error.message : "INTERNAL SERVER ERROR";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
