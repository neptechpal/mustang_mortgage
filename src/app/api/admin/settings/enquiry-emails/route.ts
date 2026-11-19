import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { getEnquiryEmailRecipients, setEnquiryEmailRecipients } from "@/modules/web/admin/settings";

export async function GET() {
  try {
    await requireAdmin();
    const recipients = await getEnquiryEmailRecipients();
    return NextResponse.json({ recipients });
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const { recipients } = await request.json();

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json({ error: "Invalid recipients" }, { status: 400 });
    }

    await setEnquiryEmailRecipients(recipients);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Email settings error:", error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
