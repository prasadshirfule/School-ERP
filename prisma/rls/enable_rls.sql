-- ==============================================================================
-- VIDYORA — POSTGRESQL ROW-LEVEL SECURITY (RLS) POLICIES
-- Multi-Tenant Database Hardening Layer
-- Enforces strict tenant isolation at the PostgreSQL storage engine level.
-- Context is scoped per transaction using: app.current_school_id
-- ==============================================================================

-- 1. RUNTIME APPLICATION ROLE (NOBYPASSRLS)
-- Separates administrative/migration connection from runtime application execution
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'vidyora_app') THEN
        CREATE ROLE vidyora_app NOBYPASSRLS;
    ELSE
        ALTER ROLE vidyora_app NOBYPASSRLS;
    END IF;
END $$;

GRANT USAGE ON SCHEMA public TO vidyora_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO vidyora_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO vidyora_app;
GRANT vidyora_app TO CURRENT_USER;

-- 2. APPLY RLS TO ALL 33 TENANT-OWNED TABLES
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
        -- Enable RLS on table
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
        
        -- Force RLS so table owner also obeys policies
        EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', tbl);
        
        -- Drop existing policy if exists
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', tbl || '_tenant_isolation', tbl);
        
        -- Create comprehensive tenant isolation policy
        -- Uses current_setting('app.current_school_id', true): fails closed if unset
        EXECUTE format('
            CREATE POLICY %I ON %I
            FOR ALL
            USING ("schoolId" = NULLIF(current_setting(''app.current_school_id'', true), ''''))
            WITH CHECK ("schoolId" = NULLIF(current_setting(''app.current_school_id'', true), ''''));
        ', tbl || '_tenant_isolation', tbl);
    END LOOP;
END $$;
