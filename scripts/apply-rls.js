const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const envPath = path.join(process.cwd(), '.env.local');
const env = fs.readFileSync(envPath, 'utf8');

let unpooledUrl = '';
for (const line of env.split('\n')) {
  const trimmed = line.trim();
  if (trimmed.startsWith('DATABASE_URL_UNPOOLED=')) {
    let v = trimmed.substring('DATABASE_URL_UNPOOLED='.length).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    unpooledUrl = v;
  }
}

const prisma = new PrismaClient({
  datasources: { db: { url: unpooledUrl } }
});

async function main() {
  try {
    console.log('Applying PostgreSQL Row-Level Security (RLS) policies and runtime role...');

    // 1. Create runtime role vidyora_app with NOBYPASSRLS
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'vidyora_app') THEN
          CREATE ROLE vidyora_app NOBYPASSRLS;
        ELSE
          ALTER ROLE vidyora_app NOBYPASSRLS;
        END IF;
      END $$;
    `);

    // 2. Grant permissions to vidyora_app
    await prisma.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO vidyora_app;`);
    await prisma.$executeRawUnsafe(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO vidyora_app;`);
    await prisma.$executeRawUnsafe(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO vidyora_app;`);
    await prisma.$executeRawUnsafe(`GRANT vidyora_app TO CURRENT_USER;`);

    // 3. Enable and Force RLS on all 33 tenant tables
    await prisma.$executeRawUnsafe(`
      DO $$
      DECLARE
          tbl text;
          tenant_tables text[] := ARRAY[
              'AcademicYear',
              'AdmissionApplication',
              'AuditLog',
              'Class',
              'ClassSubject',
              'Department',
              'ExamSubject',
              'ExamType',
              'Examination',
              'FeeDiscount',
              'FeeInstallment',
              'FeeInvoice',
              'FeePayment',
              'FeeStructure',
              'GradingScale',
              'Notification',
              'PaymentReversal',
              'Period',
              'SchoolMembership',
              'Section',
              'StaffAttendance',
              'StaffLeaveRequest',
              'Student',
              'StudentAttendance',
              'StudentDocument',
              'StudentGuardian',
              'StudentMark',
              'StudentReportCard',
              'Subject',
              'TeacherAssignment',
              'TeacherProfile',
              'TimetableSlot',
              'TransferCertificate'
          ];
      BEGIN
          FOREACH tbl IN ARRAY tenant_tables
          LOOP
              EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
              EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', tbl);
              EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', tbl || '_tenant_isolation', tbl);
              EXECUTE format('
                  CREATE POLICY %I ON %I
                  FOR ALL
                  USING ("schoolId" = NULLIF(current_setting(''app.current_school_id'', true), ''''))
                  WITH CHECK ("schoolId" = NULLIF(current_setting(''app.current_school_id'', true), ''''));
              ', tbl || '_tenant_isolation', tbl);
          END LOOP;
      END $$;
    `);

    console.log('RLS policies enabled and forced across all 33 tenant-scoped tables.');

    // Verify RLS status
    const rlsStatus = await prisma.$queryRaw`
      SELECT c.relname as table_name, c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity = true
      ORDER BY c.relname;
    `;
    console.log(`Verified ${rlsStatus.length} tables with RLS enabled and forced.`);
  } catch (err) {
    console.error('Failed to apply RLS:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
