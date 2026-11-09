import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { unauthorized } from "@/lib/utils";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return unauthorized();

    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Notification ID required" }, { status: 400 });

    await prisma.notification.updateMany({
      where: {
        id,
        userId: session.user.id,
        isRead: false,
      },
      data: { isRead: true, readAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("[NOTIFICATION_READ] Error:", error);
    return NextResponse.json({ error: "Failed to mark notification read" }, { status: 500 });
  }
}
