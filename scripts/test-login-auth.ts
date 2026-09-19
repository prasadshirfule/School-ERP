async function testLogin(email: string, password: string) {
  console.log(`\nTesting login for: ${email}...`);
  
  // 1. Get CSRF token
  const csrfRes = await fetch("http://localhost:3000/api/auth/csrf");
  const csrfCookie = csrfRes.headers.get("set-cookie") || "";
  const { csrfToken } = await csrfRes.json();
  console.log(`  CSRF Token obtained: ${csrfToken ? "YES" : "NO"}`);

  // 2. Post credentials to /api/auth/callback/credentials
  const params = new URLSearchParams();
  params.append("csrfToken", csrfToken);
  params.append("email", email);
  params.append("password", password);
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

  console.log(`  Callback Response Status: ${authRes.status}`);
  const authCookies = authRes.headers.get("set-cookie") || "";

  let sessionTokenCookie = "";
  if (authCookies) {
    const cookies = authCookies.split(",").map(c => c.trim());
    for (const c of cookies) {
      if (c.includes("next-auth.session-token")) {
        sessionTokenCookie = c.split(";")[0];
      }
    }
  }

  // 3. Fetch session details using session token
  const sessionRes = await fetch("http://localhost:3000/api/auth/session", {
    headers: {
      "Cookie": sessionTokenCookie || csrfCookie,
    },
  });

  const sessionData = await sessionRes.json();
  console.log(`  Session Data:`, JSON.stringify(sessionData));

  // 4. Test accessing the admin dashboard (/admin/dashboard)
  const dashboardRes = await fetch("http://localhost:3000/admin/dashboard", {
    headers: {
      "Cookie": sessionTokenCookie,
    },
    redirect: "manual",
  });
  console.log(`  Admin Dashboard (/admin/dashboard) HTTP Status: ${dashboardRes.status}`);
  const dashboardHtml = await dashboardRes.text();
  const titleMatch = dashboardHtml.match(/<title>([^<]*)<\/title>/i);
  console.log(`  Rendered Title/Preview: ${titleMatch ? titleMatch[1] : "(HTML received)"}`);

  const isSuccess = (authRes.status === 200 || authRes.status === 302) && (dashboardRes.status === 200);
  const userValid = sessionData?.user?.email === email;
  const roleValid = sessionData?.user?.role === "ADMIN";

  if (isSuccess && userValid && roleValid) {
    console.log(`  ✅ LOGIN & ADMIN DASHBOARD REDIRECT SUCCESSFUL for ${email} (Role: ${sessionData.user.role}, SchoolId: ${sessionData.user.schoolId})`);
    return true;
  } else {
    console.error(`  ❌ LOGIN FAILED for ${email}`);
    return false;
  }
}

async function run() {
  const adminA = await testLogin("admin@greenfield.edu", "password123");
  const adminB = await testLogin("admin@oakridge.edu", "password123");

  if (adminA && adminB) {
    console.log("\n🎉 ALL 6 REQUIREMENTS VERIFIED SUCCESSFULLY!");
    process.exit(0);
  } else {
    console.error("\n❌ VERIFICATION FAILED!");
    process.exit(1);
  }
}

run().catch(console.error);
