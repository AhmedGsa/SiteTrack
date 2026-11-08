const base = process.env.BASE_URL || 'http://localhost:3000/api/v1';
const stamp = Date.now();

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function api(method, path, { token, body, status } = {}) {
  const response = await fetch(base + path, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }
  if (status !== undefined && response.status !== status) {
    throw new Error(`${method} ${path} expected ${status}, got ${response.status}: ${text}`);
  }
  return payload;
}

async function register(role, label) {
  const email = `${label}-${stamp}@sitetrack.test`;
  const tokens = await api('POST', '/auth/register', {
    status: 201,
    body: { name: label, email, password: 'password123', role },
  });
  assert(tokens.accessToken && tokens.refreshToken, 'register did not return tokens');
  return { email, token: tokens.accessToken, refreshToken: tokens.refreshToken };
}

async function main() {
  const steps = [];
  const step = async (name, fn) => {
    await fn();
    steps.push(name);
    console.log(`ok  ${name}`);
  };

  await step('register user, outsider, and store manager', async () => {
    global.owner = await register('USER', 'owner');
    global.outsider = await register('USER', 'outsider');
    global.manager = await register('COMPANY_STORE_MANAGER', 'manager');
  });

  await step('failed login does not reveal whether the email exists', async () => {
    const unknown = await api('POST', '/auth/login', {
      status: 400,
      body: { email: `missing-${stamp}@sitetrack.test`, password: 'password123' },
    });
    const wrongPassword = await api('POST', '/auth/login', {
      status: 400,
      body: { email: global.owner.email, password: 'wrong-password' },
    });
    assert(unknown.message === wrongPassword.message, 'login errors differ');
  });

  await step('owner creates a project and outsider gets 404', async () => {
    global.project = await api('POST', '/projects', {
      status: 201,
      token: global.owner.token,
      body: {
        name: `Smoke ${stamp}`,
        plannedStartDate: '2026-03-01',
        plannedEndDate: '2026-12-01',
      },
    });
    assert(global.project.isProjectAdmin === true, 'creator is not project admin');
    assert(/^PRJ-\d{4}$/.test(global.project.id), 'project id is not PRJ-xxxx');
    await api('GET', `/projects/${global.project.id}`, { status: 404, token: global.outsider.token });
    await api('GET', '/projects/PRJ-9999', { status: 404, token: global.owner.token });
  });

  await step('invite, accept, and keep the last admin', async () => {
    const invitation = await api('POST', `/projects/${global.project.id}/invitations`, {
      status: 201,
      token: global.owner.token,
      body: { email: global.outsider.email },
    });
    const notes = await api('GET', '/notifications', { status: 200, token: global.outsider.token });
    assert(notes.results.some((note) => note.invitation?.id === invitation.id), 'invitee has no notification');
    await api('POST', `/invitations/${invitation.id}/accept`, { status: 404, token: global.owner.token });
    await api('POST', `/invitations/${invitation.id}/accept`, { status: 201, token: global.outsider.token });
    await api('GET', `/projects/${global.project.id}`, { status: 200, token: global.outsider.token });
    const me = await api('GET', '/users/me', { status: 200, token: global.owner.token });
    await api('DELETE', `/projects/${global.project.id}/members/${me.id}`, {
      status: 400,
      token: global.owner.token,
    });
  });

  await step('task cannot start early and a cycle is rejected', async () => {
    const first = await api('POST', `/projects/${global.project.id}/tasks`, {
      status: 201,
      token: global.owner.token,
      body: { name: 'Foundations', plannedStartDate: '2026-03-01', plannedEndDate: '2026-04-01' },
    });
    const second = await api('POST', `/projects/${global.project.id}/tasks`, {
      status: 201,
      token: global.owner.token,
      body: {
        name: 'Slab',
        plannedStartDate: '2026-04-02',
        plannedEndDate: '2026-05-01',
        dependsOn: [first.id],
      },
    });
    assert(second.blocked === true, 'dependent task is not blocked');
    await api('POST', `/projects/${global.project.id}/tasks/${second.id}/start`, {
      status: 400,
      token: global.owner.token,
    });
    await api('POST', `/projects/${global.project.id}/tasks/${first.id}/dependencies`, {
      status: 400,
      token: global.owner.token,
      body: { dependsOnTaskId: second.id },
    });
    const started = await api('POST', `/projects/${global.project.id}/tasks/${first.id}/start`, {
      status: 201,
      token: global.owner.token,
    });
    assert(started.status === 'IN_PROGRESS', 'start did not move the task');
    await api('POST', `/projects/${global.project.id}/tasks/${first.id}/done`, {
      status: 201,
      token: global.owner.token,
    });
    const unblocked = await api('POST', `/projects/${global.project.id}/tasks/${second.id}/start`, {
      status: 201,
      token: global.owner.token,
    });
    assert(unblocked.status === 'IN_PROGRESS', 'task did not start after its dependency was done');
  });

  await step('only store managers reach the company store', async () => {
    await api('GET', '/company-store/stock', { status: 404, token: global.owner.token });
    global.material = await api('POST', '/materials', {
      status: 201,
      token: global.owner.token,
      body: { name: `Cement ${stamp}`, category: 'Cement', unit: 'bag' },
    });
    const stock = await api('POST', '/company-store/stock', {
      status: 201,
      token: global.manager.token,
      body: { materialId: global.material.id, quantity: 100 },
    });
    assert(stock.quantity === 100, 'added stock quantity is wrong');
  });

  await step('delivery moves stock and cannot overdraw', async () => {
    await api('POST', '/company-store/deliveries', {
      status: 400,
      token: global.manager.token,
      body: {
        projectId: global.project.id,
        lines: [{ materialId: global.material.id, quantity: 1000 }],
      },
    });
    const delivery = await api('POST', '/company-store/deliveries', {
      status: 201,
      token: global.manager.token,
      body: {
        projectId: global.project.id,
        lines: [{ materialId: global.material.id, quantity: 40 }],
      },
    });
    assert(delivery.status === 'IN_TRANSIT', 'delivery did not start in transit');
    const company = await api('GET', '/company-store/stock?page=1&pageSize=10&search=' + encodeURIComponent(global.material.name), {
      status: 200,
      token: global.manager.token,
    });
    const row = company.results.find((item) => item.id === global.material.id);
    assert(row && row.quantity === 60, 'sender stock was not reduced');
    assert(row.quantityInTransit === 40, 'in-transit quantity was not counted');
    await api('POST', `/projects/${global.project.id}/deliveries/${delivery.id}/record`, {
      status: 404,
      token: global.manager.token,
    });
    await api('POST', `/projects/${global.project.id}/deliveries/${delivery.id}/record`, {
      status: 201,
      token: global.owner.token,
    });
    const projectStore = await api('GET', `/projects/${global.project.id}/store?page=1&pageSize=10`, {
      status: 200,
      token: global.owner.token,
    });
    const stored = projectStore.results.find((item) => item.id === global.material.id);
    assert(stored && stored.quantity === 40, 'receiver stock was not increased');
  });

  await step('logout kills the session', async () => {
    await api('POST', '/auth/logout', { status: 200, token: global.owner.token });
    await api('GET', '/users/me', { status: 401, token: global.owner.token });
    await api('POST', '/auth/refresh', { status: 401, token: global.owner.refreshToken });
  });

  console.log(`\n${steps.length} checks passed`);
}

main().catch((error) => {
  console.error(`\nfailed: ${error.message}`);
  process.exit(1);
});
