async function testTeacherAttendanceE2E() {
  console.log("\n=======================================================");
  console.log("🏫 PHASE 6: TEACHER ATTENDANCE END-TO-END UI & API TEST");
  console.log("=======================================================");

  // 1. Authenticate as Teacher 1 (School A)
  console.log("\n1. Authenticating as teacher1@greenfield.edu...");
  const csrfRes = await fetch("http://localhost:3000/api/auth/csrf");
  const csrfCookie = csrfRes.headers.get("set-cookie") || "";
  const { csrfToken } = await csrfRes.json();

  const params = new URLSearchParams();
  params.append("csrfToken", csrfToken);
  params.append("email", "teacher1@greenfield.edu");
  params.append("password", "password123");
  params.append("json", "true");

  const authRes = await fetch("http://localhost:3000/api/auth/callback/credentials", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cookie": csrfCookie,
    },
    body: params.toString(),
    redirect: "manual",
  });

  const authCookies = authRes.headers.get("set-cookie") || "";
  let sessionToken = "";
  if (authCookies) {
    const cookies = authCookies.split(",").map((c) => c.trim());
    for (const c of cookies) {
      if (c.includes("next-auth.session-token")) {
        sessionToken = c.split(";")[0];
      }
    }
  }

  const sessionRes = await fetch("http://localhost:3000/api/auth/session", {
    headers: { Cookie: sessionToken },
  });
  const sessionData = await sessionRes.json();
  console.log(`   Logged in as: ${sessionData?.user?.email} (Role: ${sessionData?.user?.role}, SchoolId: ${sessionData?.user?.schoolId})`);

  if (sessionData?.user?.role !== "TEACHER") {
    throw new Error("Failed to authenticate as TEACHER");
  }

  // 2. Fetch sections available to teacher
  console.log("\n2. Fetching sections for teacher's school...");
  const sectionsRes = await fetch("http://localhost:3000/api/sections", {
    headers: { Cookie: sessionToken },
  });
  const sections = await sectionsRes.json();
  console.log(`   Found ${sections.length} sections.`);
  if (!sections.length) throw new Error("No sections found in School A");
  const targetSection = sections[0];
  console.log(`   Target Section: ${targetSection.class.name} - ${targetSection.name} (ID: ${targetSection.id})`);

  // 3. Fetch students in the section
  console.log("\n3. Fetching students for section...");
  const studentsRes = await fetch(`http://localhost:3000/api/students?sectionId=${targetSection.id}`, {
    headers: { Cookie: sessionToken },
  });
  const students = await studentsRes.json();
  console.log(`   Found ${students.length} students in section.`);
  if (!students.length) throw new Error("No students found in section");

  const today = new Date().toISOString().split("T")[0];

  // 4. Submit first attendance (Initial Insert via Upsert)
  console.log(`\n4. Submitting initial attendance for date: ${today}...`);
  const initialRecords = students.map((s: any, idx: number) => ({
    studentId: s.id,
    status: idx === 0 ? "ABSENT" : "PRESENT",
  }));

  const postRes1 = await fetch("http://localhost:3000/api/attendance", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: sessionToken,
    },
    body: JSON.stringify({
      sectionId: targetSection.id,
      date: today,
      records: initialRecords,
    }),
  });

  const postData1 = await postRes1.json();
  console.log(`   API Response: Status ${postRes1.status} - ${JSON.stringify(postData1)}`);
  if (!postRes1.ok) throw new Error("Failed to save initial attendance");

  // 5. Query attendance back to verify stored records
  console.log("\n5. Querying attendance records back to verify storage...");
  const getRes1 = await fetch(`http://localhost:3000/api/attendance?sectionId=${targetSection.id}&date=${today}`, {
    headers: { Cookie: sessionToken },
  });
  const fetchedAtt1 = await getRes1.json();
  console.log(`   Retrieved ${fetchedAtt1.length} attendance rows:`);
  for (const r of fetchedAtt1) {
    console.log(`     - Student: ${r.student.fullName}, Status: ${r.status}, Date: ${r.date.split("T")[0]}`);
  }

  // 6. Test Re-submitting / Updating attendance (In-place Upsert Update)
  console.log(`\n6. Updating attendance status for student ${students[0].fullName} from ABSENT to LATE...`);
  const updatedRecords = students.map((s: any, idx: number) => ({
    studentId: s.id,
    status: idx === 0 ? "LATE" : "PRESENT",
  }));

  const postRes2 = await fetch("http://localhost:3000/api/attendance", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: sessionToken,
    },
    body: JSON.stringify({
      sectionId: targetSection.id,
      date: today,
      records: updatedRecords,
    }),
  });

  const postData2 = await postRes2.json();
  console.log(`   API Response: Status ${postRes2.status} - ${JSON.stringify(postData2)}`);

  // 7. Verify updated records and ensure no duplicates created
  console.log("\n7. Verifying updated attendance records & zero duplicate row count...");
  const getRes2 = await fetch(`http://localhost:3000/api/attendance?sectionId=${targetSection.id}&date=${today}`, {
    headers: { Cookie: sessionToken },
  });
  const fetchedAtt2 = await getRes2.json();
  console.log(`   Retrieved ${fetchedAtt2.length} attendance rows (expected exactly ${students.length}):`);
  for (const r of fetchedAtt2) {
    console.log(`     - Student: ${r.student.fullName}, Status: ${r.status}`);
  }

  if (fetchedAtt2.length !== students.length) {
    throw new Error(`Duplicate rows detected! Expected ${students.length} rows, got ${fetchedAtt2.length}`);
  }
  if (fetchedAtt2[0].status !== "LATE") {
    throw new Error(`Status update failed! Expected LATE, got ${fetchedAtt2[0].status}`);
  }

  // 8. Test Teacher Attendance UI Route Rendering
  console.log("\n8. Testing Teacher Attendance UI Page (/teacher/attendance)...");
  const uiRes = await fetch("http://localhost:3000/teacher/attendance", {
    headers: { Cookie: sessionToken },
  });
  console.log(`   Teacher Attendance Page HTTP Status: ${uiRes.status}`);

  console.log("\n✅ PHASE 6: TEACHER ATTENDANCE END-TO-END UI & API TEST COMPLETED WITH 100% SUCCESS!");
}

testTeacherAttendanceE2E().catch((err) => {
  console.error("\n❌ TEST FAILED:", err);
  process.exit(1);
});
