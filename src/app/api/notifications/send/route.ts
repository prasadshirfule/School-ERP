import { NextRequest, NextResponse } from "next/server";
import { getTenantDb, unauthorized } from "@/lib/utils";
import { notificationDispatcher } from "@/lib/notifications";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const sendNotificationSchema = z.object({
  channel: z.enum(["WHATSAPP", "SMS", "EMAIL"]),
  audience: z.enum(["ALL_PARENTS", "FEE_DEFAULTERS", "ABSENTEES_TODAY", "CLASS_SECTION", "STAFF"]),
  classId: z.string().optional(),
  sectionId: z.string().optional(),
  template: z.string().min(5, "Template must be at least 5 characters"),
});

export async function POST(req: NextRequest) {
  try {
    const ctx = await getTenantDb();
    if (!ctx) return unauthorized();

    if (
      ctx.session.user.role !== "ADMIN" &&
      ctx.session.user.role !== "PRINCIPAL"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = sendNotificationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { channel, audience, classId, sectionId, template } = parsed.data;

    // Fetch school info
    const school = await ctx.db.school.findUnique({
      where: { id: ctx.session.user.schoolId },
      select: { name: true },
    });

    const recipients: Array<{
      phone: string;
      email?: string;
      studentName?: string;
      parentName?: string;
      variables?: Record<string, string>;
    }> = [];

    if (audience === "FEE_DEFAULTERS") {
      // Find students with UNPAID or OVERDUE invoices
      const pendingInvoices = await ctx.db.feeInvoice.findMany({
        where: {
          status: { in: ["UNPAID", "PARTIALLY_PAID", "OVERDUE"] },
        },
        include: {
          student: {
            include: {
              parents: { include: { parent: true } },
            },
          },
          feeStructure: true,
          payments: true,
        },
      });

      for (const inv of pendingInvoices) {
        const student = inv.student;
        const parent = student.parents?.[0]?.parent;
        const phone = parent?.phone || student.emergencyContactPhone;

        let totalPaid = new Prisma.Decimal(0);
        for (const p of inv.payments) {
          totalPaid = totalPaid.add(p.amount);
        }
        const dueAmount = inv.amountDue.sub(totalPaid).toNumber();

        if (phone) {
          recipients.push({
            phone,
            studentName: student.fullName,
            parentName: parent?.fullName || "Parent",
            variables: {
              fee_name: inv.feeStructure.name,
              due_amount: `₹${dueAmount.toLocaleString("en-IN")}`,
              due_date: new Date(inv.dueDate).toLocaleDateString("en-IN"),
            },
          });
        }
      }
    } else if (audience === "ABSENTEES_TODAY") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const absentees = await ctx.db.attendance.findMany({
        where: {
          date: today,
          status: "ABSENT",
        },
        include: {
          student: {
            include: {
              parents: { include: { parent: true } },
            },
          },
        },
      });

      for (const record of absentees) {
        const student = record.student;
        const parent = student.parents?.[0]?.parent;
        const phone = parent?.phone || student.emergencyContactPhone;

        if (phone) {
          recipients.push({
            phone,
            studentName: student.fullName,
            parentName: parent?.fullName || "Parent",
            variables: {
              date: new Date().toLocaleDateString("en-IN"),
            },
          });
        }
      }
    } else {
      // CLASS_SECTION or ALL_PARENTS
      const whereClause: any = { isActive: true };
      if (sectionId) {
        whereClause.sectionId = sectionId;
      } else if (classId) {
        whereClause.section = { classId };
      }

      const students = await ctx.db.student.findMany({
        where: whereClause,
        include: {
          parents: { include: { parent: true } },
        },
      });

      for (const student of students) {
        const parent = student.parents?.[0]?.parent;
        const phone = parent?.phone || student.emergencyContactPhone;
        if (phone) {
          recipients.push({
            phone,
            studentName: student.fullName,
            parentName: parent?.fullName || "Parent",
          });
        }
      }
    }

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: "No matching recipients with phone numbers found for the selected audience." },
        { status: 400 }
      );
    }

    const dispatchResult = await notificationDispatcher.dispatch({
      channel,
      recipients,
      template,
      senderName: school?.name || "School Administration",
    });

    return NextResponse.json({
      success: true,
      message: `Dispatched ${dispatchResult.successful} out of ${dispatchResult.total} notifications via ${channel}.`,
      result: dispatchResult,
    });
  } catch (error) {
    console.error("Send notification error:", error);
    return NextResponse.json({ error: "Failed to dispatch notifications" }, { status: 500 });
  }
}
