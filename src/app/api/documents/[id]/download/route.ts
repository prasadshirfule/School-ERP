import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { unauthorized, forbidden } from "@/lib/utils";
import { generateSignedFileUrl, getSecureDownloadUrl } from "@/lib/storage";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return unauthorized();
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Document ID is required" }, { status: 400 });
    }

    const isSuperAdmin = session.user.role === "SUPER_ADMIN";
    const where: Prisma.DocumentWhereInput = { id };
    if (!isSuperAdmin) {
      if (!session.user.schoolId) {
        return forbidden();
      }
      where.schoolId = session.user.schoolId;
    }

    const doc = await prisma.document.findFirst({
      where,
    });

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Generate signed download URL valid for 30 minutes (1800s)
    const downloadUrl = await getSecureDownloadUrl(doc.fileKey, 1800);

    const { searchParams } = new URL(request.url);
    if (searchParams.get("redirect") === "true") {
      return NextResponse.redirect(new URL(downloadUrl, request.url));
    }

    return NextResponse.json({
      success: true,
      document: {
        id: doc.id,
        title: doc.title,
        fileName: doc.fileName,
        category: doc.category,
        downloadUrl,
      },
    });
  } catch (error: unknown) {
    console.error("[DOCUMENT_ID_DOWNLOAD] Error:", error);
    return NextResponse.json({ error: "Failed to generate document download link" }, { status: 500 });
  }
}
