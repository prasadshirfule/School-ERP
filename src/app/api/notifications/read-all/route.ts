import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { unauthorized } from "@/lib/utils";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return unauthorized();

    await prisma.notification.updateMany({
      where: {
        userId: session.user.id,
        isRead: false,
      },
      data: { isRead: true, readAt: new Date() },
    });

    return NextResponse.json({ success: true, message: "All notifications marked as read" });
  } catch (error: unknown) {
    console.error("[NOTIFICATION_READ_ALL] Error:", error);
    return NextResponse.json({ error: "Failed to mark notifications read" }, { status: 500 });
  }
}
