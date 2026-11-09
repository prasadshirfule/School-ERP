import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { unauthorized, forbidden } from "@/lib/utils";
import { createTenantBackup, restoreTenantBackup } from "@/lib/backup";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.schoolId) {
      return unauthorized();
    }

    // Only School Admin, Principal, or Super Admin may export backups
    if (!["ADMIN", "PRINCIPAL", "SUPER_ADMIN"].includes(session.user.role)) {
      return forbidden();
    }

    const { schoolId } = session.user;
    const backupBundle = await createTenantBackup(schoolId);

    const filename = `school-backup-${schoolId}-${Date.now()}.bak`;

    return new NextResponse(JSON.stringify(backupBundle, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, private",
      },
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Failed to generate tenant backup";
    console.error("[TENANT_BACKUP_EXPORT] Error:", error);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.schoolId) {
      return unauthorized();
    }

    // Only Admin or Super Admin may restore backups
    if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      return forbidden();
    }

    const { schoolId } = session.user;
    const bundle = await request.json().catch(() => null);

    if (!bundle || !bundle.iv || !bundle.authTag || !bundle.data || !bundle.metadata) {
      return NextResponse.json(
        { error: "Invalid backup bundle format. Must contain iv, authTag, data and metadata." },
        { status: 400 }
      );
    }

    const result = await restoreTenantBackup(schoolId, bundle, {
      userId: session.user.id,
      userEmail: session.user.email || undefined,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully restored tenant backup. ${result.recordsRestored} core records reconciled.`,
      result,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Failed to restore tenant backup";
    console.error("[TENANT_BACKUP_RESTORE] Error:", error);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
