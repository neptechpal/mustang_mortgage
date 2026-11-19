import { NextResponse } from "next/server";
import { verifyOtp } from "@/modules/site/otp";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { linkToken, otp } = await request.json();

    if (!linkToken || !otp) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const verified = await verifyOtp(linkToken, otp);

    if (!verified) {
      return NextResponse.json({ success: false, error: "Invalid or expired code" }, { status: 401 });
    }

    // Create or update session for the verified email
    const otpToken = await prisma.otpToken.findUnique({ where: { linkToken } });
    if (!otpToken) {
      return NextResponse.json({ success: false, error: "Session expired" }, { status: 401 });
    }

    // Store the verified session in a cookie or create a temporary session
    const response = NextResponse.json({ success: true });
    response.cookies.set("portal_access_token", linkToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60, // 24 hours
    });

    return response;
  } catch (error) {
    console.error("OTP verification error:", error);
    return NextResponse.json({ success: false, error: "An error occurred" }, { status: 500 });
  }
}
