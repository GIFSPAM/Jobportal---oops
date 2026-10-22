/**
 * End-to-end smoke test for the Jobportal-oops API.
 *
 * Exercises the three roles plus the guest surface over real HTTP against a
 * running server and an empty-ish database, asserting both the payload shapes
 * and the authorisation rules. Exits non-zero on the first failure so it can
 * gate a deployment or a CI job.
 *
 *   node scripts/smoke-test.mjs [baseUrl]
 *
 * Requires seeded demo accounts (see `seeds/demo-data.sql`).
 */
const BASE = process.argv[2] ?? 'http://localhost:5000/api';

const PASSWORD = 'DemoPass123!';
const RUN_ID = `${Date.now()}`.slice(-9);

const failures = [];
let passed = 0;

const ok = (label, condition, detail) => {
  if (condition) {
    passed += 1;
    return;
  }
  failures.push(`${label}${detail ? ` :: ${detail}` : ''}`);
  console.error(`  ✗ ${label}${detail ? ` :: ${detail}` : ''}`);
};

/** Thin HTTP wrapper that understands the `{success, message, data, count}` envelope. */
async function request(method, path, { token, body, form, raw, expect = [200, 201] } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload;
  if (form) {
    payload = form;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const response = await fetch(`${BASE}${path}`, { method, headers, body: payload });
  const contentType = response.headers.get('content-type') ?? '';

  if (raw || !contentType.includes('application/json')) {
    return {
      status: response.status,
      buffer: Buffer.from(await response.arrayBuffer()),
      contentType,
    };
  }

  const json = await response.json();
  return { status: response.status, ...json };
}

async function expectOk(label, method, path, options = {}) {
  const result = await request(method, path, options);
  const allowed = options.expect ?? [200, 201];
  ok(`${label} -> ${result.status}`, allowed.includes(result.status), JSON.stringify(result).slice(0, 300));
  if (!allowed.includes(result.status)) console.error(`     ${method} ${path}`);
  return result;
}

async function expectFail(label, method, path, status, options = {}) {
  const result = await request(method, path, { ...options, expect: [status] });
  ok(
    `${label} -> ${status}`,
    result.status === status && result.success === false && typeof result.message === 'string',
    JSON.stringify(result).slice(0, 300),
  );
  if (result.status !== status) console.error(`     ${method} ${path} gave ${result.status}`);
  return result;
}

const pdfBytes = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n',
  'utf8',
);

async function main() {
  console.log(`Smoke-testing ${BASE}\n`);

  // ---------------------------------------------------------------- guest ---
  console.log('• guest surface');
  const jobs = await expectOk('GET /public/jobs', 'GET', '/public/jobs');
  ok('jobs envelope carries count', typeof jobs.count === 'number');
  ok('job rows use the published snake_case shape', !jobs.data?.length || 'job_id' in jobs.data[0]);

  const landing = await expectOk('GET /public/landing-jobs', 'GET', '/public/landing-jobs');
  ok('landing feed is capped at 6', landing.count <= 6, `got ${landing.count}`);

  await expectOk('GET /public/skills', 'GET', '/public/skills');
  await expectFail('GET /public/jobs/:id (missing)', 'GET', '/public/jobs/99999999', 404);
  await expectFail('unauthenticated /seeker/stats', 'GET', '/seeker/stats', 401);

  // ----------------------------------------------------------------- auth ---
  console.log('• authentication');
  const seekerEmail = `smoke.seeker.${RUN_ID}@jobytes.test`;
  const employerEmail = `smoke.employer.${RUN_ID}@jobytes.test`;

  const seekerRegister = await expectOk('register jobseeker', 'POST', '/auth/register', {
    body: {
      email: seekerEmail,
      password: PASSWORD,
      role: 'jobseeker',
      full_name: 'Smoke Seeker',
      phone_number: '5550001111',
      education: 'B.Tech',
      experience_years: 3,
    },
  });
  ok('register returns a token', Boolean(seekerRegister.data?.token));
  ok('register returns user_id', typeof seekerRegister.data?.user_id === 'number');

  await expectFail('duplicate email', 'POST', '/auth/register', 409, {
    body: { email: seekerEmail, password: PASSWORD, role: 'jobseeker', full_name: 'Dup' },
  });

  await expectFail(
    'jobseeker registration without full_name',
    'POST',
    '/auth/register',
    400,
    { body: { email: `nofullname.${RUN_ID}@x.test`, password: PASSWORD, role: 'jobseeker' } },
  );

  await expectFail(
    'admin registration with a wrong secret',
    'POST',
    '/auth/register',
    403,
    { body: { email: `smoke.admin.${RUN_ID}@x.test`, password: PASSWORD, role: 'admin', secretKey: 'nope' } },
  );

  await expectFail('login with a wrong password', 'POST', '/auth/login', 401, {
    body: { email: seekerEmail, password: 'not-the-password' },
  });

  const seekerLogin = await expectOk('login jobseeker', 'POST', '/auth/login', {
    body: { email: seekerEmail, password: PASSWORD },
  });
  const seekerToken = seekerLogin.data.token;

  const employerRegister = await expectOk('register employer', 'POST', '/auth/register', {
    body: {
      email: employerEmail,
      password: PASSWORD,
      role: 'employer',
      company_name: `Smoke Co ${RUN_ID}`,
      industry: 'Testing',
      company_size: '11-50',
      company_location: 'Remote',
      company_website: 'https://example.com',
      company_phone: '5550002222',
    },
  });
  const employerToken = (
    await expectOk('login employer', 'POST', '/auth/login', {
      body: { email: employerEmail, password: PASSWORD },
    })
  ).data.token;
  const employerId = employerRegister.data.user_id;

  const adminLogin = await expectOk('login admin', 'POST', '/auth/login', {
    body: { email: 'admin.demo@jobytes.test', password: PASSWORD },
  });
  const adminToken = adminLogin.data.token;

  const demoSeekerLogin = await expectOk('login seeded seeker', 'POST', '/auth/login', {
    body: { email: 'seeker.demo@jobytes.test', password: PASSWORD },
  });
  const demoSeekerToken = demoSeekerLogin.data.token;

  // -------------------------------------------------- cross-role guard ------
  console.log('• authorisation');
  await expectFail('employer hitting a seeker route', 'GET', '/seeker/stats', 403, { token: employerToken });
  await expectFail('seeker hitting an employer route', 'GET', '/employer/stats', 403, { token: seekerToken });
  await expectFail('seeker hitting an admin route', 'GET', '/admin/stats', 403, { token: seekerToken });
  await expectFail('guest hitting an employer route', 'GET', '/employer/stats', 401);
  await expectFail('garbage bearer token', 'GET', '/seeker/stats', 401, { token: 'not.a.jwt' });

  // --------------------------------------------------------- seeker flow ----
  console.log('• seeker flow');
  await expectOk('GET /seeker/profile', 'GET', '/seeker/profile', { token: seekerToken });
  await expectOk('PUT /seeker/profile', 'PUT', '/seeker/profile', {
    token: seekerToken,
    body: { full_name: 'Smoke Seeker', education: 'M.Tech', experience_years: 4, phone_number: '5550001111' },
  });
  await expectOk('PUT /seeker/skills', 'PUT', '/seeker/skills', {
    token: seekerToken,
    body: { skills: [{ name: 'SQL', proficiency: 'advanced' }, { name: 'Docker', proficiency: 'intermediate' }] },
  });
  const profile = await expectOk('profile reflects the skills', 'GET', '/seeker/profile', { token: seekerToken });
  ok('skills persisted', Array.isArray(profile.data?.skills) && profile.data.skills.length === 2,
    JSON.stringify(profile.data?.skills));

  await expectOk('PUT /seeker/profile/resume (upload)', 'PUT', '/seeker/profile/resume', {
    token: seekerToken,
    form: buildForm('resume', 'smoke-resume.pdf', pdfBytes, 'application/pdf'),
  });
  const ownResume = await expectOk('download own resume', 'GET', '/seeker/profile/resume/download', {
    token: seekerToken,
    raw: true,
  });
  ok('resume download streams a pdf', ownResume.status === 200 && ownResume.buffer.length > 10);
  await expectFail(
    'non-PDF resume rejected',
    'PUT',
    '/seeker/profile/resume',
    400,
    { token: seekerToken, form: buildForm('resume', 'virus.exe', Buffer.from('MZ'), 'application/octet-stream') },
  );

  await expectOk('POST /seeker/photo', 'POST', '/seeker/photo', {
    token: seekerToken,
    form: buildForm('image', 'avatar.png', PNG_BYTES, 'image/png'),
  });

  await expectOk('saved job: normalise state', 'DELETE', '/seeker/saved-jobs/12', {
    token: demoSeekerToken,
    expect: [200, 404],
  });
  await expectOk('saved job: add', 'POST', '/seeker/saved-jobs/12', { token: demoSeekerToken, expect: [201] });
  await expectFail('saved job: duplicate add', 'POST', '/seeker/saved-jobs/12', 409, { token: demoSeekerToken });
  const saved = await expectOk('saved job: list', 'GET', '/seeker/saved-jobs', { token: demoSeekerToken });
  ok('saved list exposes skills', !saved.data?.length || Array.isArray(saved.data[0].skills));
  await expectOk('saved job: remove', 'DELETE', '/seeker/saved-jobs/12', { token: demoSeekerToken });
  await expectFail('saved job: remove missing', 'DELETE', '/seeker/saved-jobs/12', 404, { token: demoSeekerToken });

  // -------------------------------------------------------- employer flow ---
  console.log('• employer flow');
  await expectOk('GET /employer/profile', 'GET', '/employer/profile', { token: employerToken });
  await expectOk('PUT /employer/profile', 'PUT', '/employer/profile', {
    token: employerToken,
    body: { company_name: `Smoke Co ${RUN_ID}`, industry: 'QA', company_size: '11-50' },
  });
  await expectOk('POST /employer/logo', 'POST', '/employer/logo', {
    token: employerToken,
    form: buildForm('image', 'logo.png', PNG_BYTES, 'image/png'),
  });

  const posted = await expectOk('POST /employer/post', 'POST', '/employer/post', {
    token: employerToken,
    body: {
      title: `Smoke Job ${RUN_ID}`,
      description: 'Automated smoke-test opening.',
      location: 'Remote',
      job_type: 'full_time',
      salary_min: 60000,
      salary_max: 90000,
      skills: ['SQL', 'Docker'],
    },
  });
  const jobId = posted.data?.job_id;
  ok('post returns job_id', typeof jobId === 'number');

  const myJobs = await expectOk('GET /employer/my-jobs', 'GET', '/employer/my-jobs', { token: employerToken });
  const mine = myJobs.data?.find((row) => row.job_id === jobId);
  ok('my-jobs contains the new posting', Boolean(mine));
  ok('my-jobs exposes applicant_count', mine ? 'applicant_count' in mine : true);

  await expectOk('PUT /employer/update/:job_id', 'PUT', `/employer/update/${jobId}`, {
    token: employerToken,
    body: { title: `Smoke Job ${RUN_ID} (edited)`, location: 'Hybrid', skills: ['SQL', 'Docker', 'Node.js'] },
  });
  await expectOk('PATCH /employer/status/:job_id', 'PATCH', `/employer/status/${jobId}`, {
    token: employerToken,
    body: { status: 'closed' },
  });
  await expectOk('PATCH /employer/status/:job_id (reopen)', 'PATCH', `/employer/status/${jobId}`, {
    token: employerToken,
    body: { status: 'open' },
  });
  await expectFail(
    'employer cannot touch a foreign job',
    'PUT',
    '/employer/update/12',
    404,
    { token: employerToken, body: { title: 'hijack' } },
  );

  // ----------------------------------------------------------- admin flow ---
  console.log('• admin flow');
  const adminStats = await expectOk('GET /admin/stats', 'GET', '/admin/stats', { token: adminToken });
  // The controller nests the flat SQL aggregates, mirroring the reference API.
  ok(
    'admin stats shape',
    typeof adminStats.data?.users?.total === 'number' &&
      typeof adminStats.data?.jobs?.verified === 'number' &&
      typeof adminStats.data?.applications?.applied === 'number',
    JSON.stringify(adminStats.data),
  );
  await expectOk('GET /admin/users', 'GET', '/admin/users', { token: adminToken });
  await expectOk('GET /admin/all-jobs', 'GET', '/admin/all-jobs', { token: adminToken });
  await expectOk('GET /admin/logs', 'GET', '/admin/logs', { token: adminToken });

  // Status toggling is idempotent, and an admin may not deactivate themselves.
  const seededSeekerId = demoSeekerLogin.data.user_id;
  await expectOk('activate a user', 'PATCH', `/admin/users/${seededSeekerId}/status`, {
    token: adminToken,
    body: { is_active: true },
  });
  await expectOk('activate again (no-op)', 'PATCH', `/admin/users/${seededSeekerId}/status`, {
    token: adminToken,
    body: { is_active: true },
  });
  await expectFail('admin deactivating own account', 'PATCH', `/admin/users/${adminLogin.data.user_id}/status`, 400, {
    token: adminToken,
    body: { is_active: false },
  });
  await expectFail('status on a missing user', 'PATCH', '/admin/users/424242/status', 404, {
    token: adminToken,
    body: { is_active: false },
  });

  await expectOk('verify the new job', 'PATCH', `/admin/verify-job/${jobId}`, { token: adminToken });
  // PATCH /verify-job is idempotent in the reference API, not a state machine.
  await expectOk('verify twice (idempotent)', 'PATCH', `/admin/verify-job/${jobId}`, { token: adminToken });
  await expectFail('verify a missing job', 'PATCH', '/admin/verify-job/424242', 404, { token: adminToken });

  // ------------------------------------------------- seeker x employer ------
  console.log('• cross-role collaboration (apply -> review -> resume)');
  // Applications require a resume on file; make the seeded seeker compliant so
  // the assertion measures the application logic, not the seed state.
  await expectOk('seeded seeker uploads a resume', 'PUT', '/seeker/profile/resume', {
    token: demoSeekerToken,
    form: buildForm('resume', 'demo-resume.pdf', pdfBytes, 'application/pdf'),
  });
  await expectOk('seeker sees the verified job', 'GET', `/public/jobs/${jobId}`);
  await expectOk('job match', 'GET', `/seeker/job-match/${jobId}`, { token: demoSeekerToken });
  await expectOk('apply', 'POST', `/seeker/apply/${jobId}`, { token: demoSeekerToken, expect: [201] });
  await expectFail('apply twice', 'POST', `/seeker/apply/${jobId}`, 409, { token: demoSeekerToken });

  const applications = await expectOk('GET /seeker/my-applications', 'GET', '/seeker/my-applications', {
    token: demoSeekerToken,
  });
  const application = applications.data?.find((row) => row.job_id === jobId);
  ok('application listed', Boolean(application));
  const applicationId = application?.application_id;
  ok('application shape', application ? 'company_name' in application && 'title' in application : true);

  await expectOk('GET /seeker/stats', 'GET', '/seeker/stats', { token: demoSeekerToken });
  await expectOk('employer of the job', 'GET', `/seeker/jobs/employer/${jobId}`, { token: demoSeekerToken });

  const applicants = await expectOk('GET /employer/applicants/:job_id', 'GET', `/employer/applicants/${jobId}`, {
    token: employerToken,
  });
  ok('applicants array returned', Array.isArray(applicants.data));
  const applicant = applicants.data?.[0];
  ok('applicant nests the seeker payload', applicant ? 'seeker' in applicant && 'application_status' in applicant : true);

  if (applicationId) {
    await expectOk(
      'resume_url authorises the owning employer',
      'GET',
      `/auth/resume-download/${applicationId}`,
      { token: employerToken, raw: true },
    );
    await expectFail(
      'resume download is denied to a different seeker',
      'GET',
      `/auth/resume-download/${applicationId}`,
      403,
      { token: seekerToken },
    );
  }

  await expectOk('PATCH /employer/application-status/:id', 'PATCH', `/employer/application-status/${applicationId}`, {
    token: employerToken,
    body: { status: 'shortlisted' },
  });

  if (applicationId) {
    await expectOk('revoke application', 'DELETE', `/seeker/revoke/${applicationId}`, { token: demoSeekerToken });
    await expectFail('revoke twice', 'DELETE', `/seeker/revoke/${applicationId}`, 404, { token: demoSeekerToken });
  }

  await expectOk('delete own job', 'DELETE', `/employer/delete-jobs/${jobId}`, { token: employerToken });
  await expectFail('delete missing job', 'DELETE', `/employer/delete-jobs/${jobId}`, 404, { token: employerToken });

  // -------------------------------------------------------------- report ----
  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length > 0) {
    console.error('\nFailures:');
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exitCode = 1;
  }
}

function buildForm(field, filename, bytes, type) {
  const form = new FormData();
  form.append(field, new Blob([bytes], { type }), filename);
  return form;
}

/** 1×1 transparent PNG. */
const PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

main().catch((error) => {
  console.error(`\nSmoke test crashed: ${error.stack ?? error}`);
  process.exitCode = 1;
});
