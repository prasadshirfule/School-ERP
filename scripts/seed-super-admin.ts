import prisma from "../src/lib/prisma";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL || "superadmin@platform.schoolerp.com";
  const password = process.env.SUPER_ADMIN_PASSWORD || "SuperAdminSecret2026!";

  console.log(`Checking Platform Super Admin account (${email})...`);

  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    if (existing.role !== Role.SUPER_ADMIN) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { role: Role.SUPER_ADMIN, schoolId: null, status: "ACTIVE", isActive: true },
      });
      console.log(`✅ Updated existing user ${email} to Role.SUPER_ADMIN.`);
    } else {
      console.log(`✅ Platform Super Admin account already exists: ${email}`);
    }
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const superAdmin = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: Role.SUPER_ADMIN,
      schoolId: null,
      isActive: true,
      status: "ACTIVE",
      emailVerified: new Date(),
    },
  });

  console.log(`✅ Successfully provisioned Platform Super Admin account:`);
  console.log(`   Email: ${superAdmin.email}`);
  console.log(`   ID:    ${superAdmin.id}`);
  console.log(`   Role:  ${superAdmin.role}`);
}

main()
  .catch((e) => {
    console.error("Failed to seed Super Admin:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
