import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "re_mock_key");

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

export async function sendStatusUpdateEmail(
  toEmail: string,
  residentName: string,
  complaintId: string,
  category: string,
  newStatus: string,
  note: string | null
) {
  const subject = `Complaint Status Updated - ${category.toUpperCase()}`;
  const html = `
    <div style="font-family: 'IBM Plex Sans', sans-serif; color: #1B1F24; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #D8D6CE; background-color: #FFFFFF;">
      <h2 style="font-family: 'Space Grotesk', sans-serif; font-size: 18px; border-bottom: 2px solid #1B1F24; padding-bottom: 10px; margin-top: 0;">SOCIETY-FIX STATUS REGISTER UPDATE</h2>
      <p>Hello <strong>${residentName}</strong>,</p>
      <p>The status of your registered complaint has been updated by the superintendent office.</p>
      
      <div style="margin: 20px 0; border: 1px solid #D8D6CE; background-color: #EDEEEA;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #D8D6CE; font-weight: bold; width: 120px;">ENTRY REF:</td>
            <td style="padding: 10px; border-bottom: 1px solid #D8D6CE; font-family: monospace;">${complaintId}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #D8D6CE; font-weight: bold;">DEPARTMENT:</td>
            <td style="padding: 10px; border-bottom: 1px solid #D8D6CE;">${category.toUpperCase()}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #D8D6CE; font-weight: bold;">STATUS:</td>
            <td style="padding: 10px; border-bottom: 1px solid #D8D6CE; font-weight: bold; color: ${
              newStatus === "resolved" ? "#3F7A5E" : newStatus === "progress" ? "#3A5A8C" : "#B4483A"
            };">${newStatus.replace(/_/g, " ").toUpperCase()}</td>
          </tr>
          ${note ? `
          <tr>
            <td style="padding: 10px; font-weight: bold; vertical-align: top;">OFFICIAL NOTE:</td>
            <td style="padding: 10px; font-style: italic;">"${note}"</td>
          </tr>
          ` : ""}
        </table>
      </div>
      
      <p style="font-size: 12px; opacity: 0.8;">You can track the full chronological history trace inside your portal dashboard.</p>
      <p style="font-size: 12px; margin-top: 30px; border-top: 1px solid #D8D6CE; padding-top: 15px; opacity: 0.6;">
        © 2026 Society-Fix Management Office. All rights reserved.
      </p>
    </div>
  `;

  try {
    const response = await resend.emails.send({
      from: FROM_EMAIL,
      to: toEmail,
      subject,
      html,
    });
    console.log("Status email response:", response);
  } catch (error) {
    console.error("Failed to send status email:", error);
  }
}

export async function sendImportantNoticeEmail(
  toEmails: string[],
  noticeTitle: string,
  noticeBody: string,
  author: string
) {
  if (toEmails.length === 0) return;
  const subject = `CRITICAL BULLETIN: ${noticeTitle.toUpperCase()}`;
  const html = `
    <div style="font-family: 'IBM Plex Sans', sans-serif; color: #1B1F24; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #D8D6CE; background-color: #FFFFFF;">
      <h2 style="font-family: 'Space Grotesk', sans-serif; font-size: 18px; color: #B4483A; border-bottom: 2px solid #B4483A; padding-bottom: 10px; margin-top: 0;">★ CRITICAL BULLETIN BOARD PUSH</h2>
      <p>Hello Resident,</p>
      <p>An official urgent circular has been posted on the community board by <strong>${author}</strong>:</p>
      
      <div style="margin: 20px 0; border: 1px solid #D8D6CE; border-left: 4px solid #C98A2B; padding: 15px; background-color: #FFFDF0;">
        <h3 style="margin-top: 0; font-family: 'Space Grotesk', sans-serif; font-size: 14px; text-transform: uppercase;">${noticeTitle}</h3>
        <p style="white-space: pre-wrap; font-size: 12px; line-height: 1.5;">${noticeBody}</p>
      </div>
      
      <p style="font-size: 12px; opacity: 0.8;">Please log in to the portal to view the active bulletin corkboard.</p>
      <p style="font-size: 12px; margin-top: 30px; border-top: 1px solid #D8D6CE; padding-top: 15px; opacity: 0.6;">
        © 2026 Society-Fix Management Office. All rights reserved.
      </p>
    </div>
  `;

  try {
    for (const email of toEmails) {
      const response = await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject,
        html,
      });
      console.log(`Notice email to ${email} response:`, response);
    }
  } catch (error) {
    console.error("Failed to send notice email:", error);
  }
}
