import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Hash } from 'src/auth/utils/hash';

@Injectable()
export class ScaleSeederService {
  private readonly logger = new Logger(ScaleSeederService.name);

  constructor(private readonly dataSource: DataSource) {}

  async seed() {
    const started = Date.now();
    this.logger.warn('Replacing existing SiteTrack data with the assignment-scale dataset');
    const password = await Hash.hash('password123');
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    try {
      await runner.query(`
        TRUNCATE TABLE
          delivery_lines,
          deliveries,
          stocks,
          stores,
          task_dependencies,
          tasks,
          task_counters,
          notifications,
          invitations,
          project_members,
          projects,
          project_counters,
          materials,
          sessions,
          users
        RESTART IDENTITY CASCADE
      `);

      await runner.query(`
        INSERT INTO users (id, name, email, password, role, "createdAt", "updatedAt")
        VALUES
          (gen_random_uuid(), 'Super Admin', 'superadmin@sitetrack.com', $1, 'SUPER_ADMIN', now(), now()),
          (gen_random_uuid(), 'Store Manager', 'storemanager@sitetrack.com', $1, 'COMPANY_STORE_MANAGER', now(), now()),
          (gen_random_uuid(), 'Site User', 'user@sitetrack.com', $1, 'USER', now(), now())
      `, [password]);
      await runner.query(`
        INSERT INTO users (id, name, email, password, role, "createdAt", "updatedAt")
        SELECT gen_random_uuid(), 'User ' || n, 'user' || n || '@sitetrack.test', $1, 'USER', now(), now()
        FROM generate_series(1, 4997) n
      `, [password]);
      this.logger.log('Users ready');

      await runner.query(`
        INSERT INTO projects (id, code, name, "plannedStartDate", "plannedEndDate", "createdAt", "updatedAt")
        SELECT gen_random_uuid(),
          'PRJ-' || lpad(n::text, 4, '0'),
          'Site ' || n,
          (DATE '2024-01-01' + ((n % 500) || ' days')::interval)::date,
          (DATE '2025-01-01' + ((n % 500) || ' days')::interval)::date,
          now(), now()
        FROM generate_series(1, 2000) n
      `);
      await runner.query(`INSERT INTO project_counters (id, "lastNumber") VALUES (1, 2000)`);
      this.logger.log('Projects ready');

      await runner.query(`CREATE TEMP TABLE seed_users AS SELECT id, (row_number() OVER (ORDER BY email) - 1)::int AS n FROM users`);
      await runner.query(`CREATE TEMP TABLE seed_projects AS SELECT id, code, substring(code from 5)::int AS n FROM projects`);

      await runner.query(`
        INSERT INTO project_members (id, "projectId", "userId", "isAdmin", "createdAt")
        SELECT gen_random_uuid(), p.id, u.id, slot = 0, now()
        FROM seed_projects p
        JOIN generate_series(0, (p.n % 50)) AS slot ON true
        JOIN seed_users u ON u.n = ((p.n * 13 + slot) % 5000)
      `);
      this.logger.log('Members ready');

      await runner.query(`
        INSERT INTO invitations (id, "projectId", "inviterId", "inviteeId", status, "answeredAt", "createdAt")
        SELECT gen_random_uuid(), p.id, inviter.id, invitee.id, 'PENDING', NULL, now()
        FROM generate_series(1, 10000) k
        JOIN seed_projects p ON p.n = ((k - 1) % 2000) + 1
        JOIN seed_users invitee ON invitee.n = ((k - 1) / 2000)
        JOIN seed_users inviter ON inviter.n = (invitee.n + 1) % 5000
      `);
      await runner.query(`
        INSERT INTO invitations (id, "projectId", "inviterId", "inviteeId", status, "answeredAt", "createdAt")
        SELECT gen_random_uuid(), p.id, inviter.id, invitee.id,
          (ARRAY['ACCEPTED','REJECTED','WITHDRAWN'])[1 + (k % 3)]::invitations_status_enum,
          now(), now()
        FROM generate_series(1, 40000) k
        JOIN seed_projects p ON p.n = ((k - 1) % 2000) + 1
        JOIN seed_users invitee ON invitee.n = (100 + (k % 4900))
        JOIN seed_users inviter ON inviter.n = (invitee.n + 3) % 5000
      `);
      await runner.query(`
        INSERT INTO notifications (id, "userId", type, "invitationId", "readAt", "createdAt")
        SELECT gen_random_uuid(), "inviteeId", 'PROJECT_INVITATION', id, NULL, "createdAt"
        FROM invitations
        WHERE status = 'PENDING'
      `);
      this.logger.log('Invitations ready');

      await runner.query(`
        INSERT INTO materials (id, name, category, unit, "createdAt", "updatedAt")
        SELECT gen_random_uuid(),
          'Material ' || n,
          (ARRAY['Cement','Aggregates','Steel','Masonry','Timber','Electrical'])[1 + (n % 6)],
          (ARRAY['bag','m3','ton','pcs','m','kg'])[1 + (n % 6)],
          now(), now()
        FROM generate_series(1, 20000) n
      `);
      await runner.query(`CREATE TEMP TABLE seed_materials AS SELECT id, row_number() OVER (ORDER BY name)::int AS n FROM materials`);
      this.logger.log('Materials ready');

      await runner.query(`
        INSERT INTO stores (id, type, "projectId", "createdAt")
        SELECT gen_random_uuid(), 'COMPANY', NULL, now()
      `);
      await runner.query(`
        INSERT INTO stores (id, type, "projectId", "createdAt")
        SELECT gen_random_uuid(), 'PROJECT', id, now()
        FROM projects
      `);
      await runner.query(`
        INSERT INTO stocks (id, "storeId", "materialId", quantity, "reorderPoint", "lastDeliveryAt", "updatedAt")
        SELECT gen_random_uuid(), s.id, m.id,
          CASE WHEN m.n % 17 = 0 THEN 0 WHEN m.n % 17 = 1 THEN 40 ELSE 1000 + (m.n % 500) END,
          100, NULL, now()
        FROM stores s
        JOIN seed_materials m ON true
        WHERE s.type = 'COMPANY'
      `);
      await runner.query(`
        INSERT INTO stocks (id, "storeId", "materialId", quantity, "reorderPoint", "lastDeliveryAt", "updatedAt")
        SELECT gen_random_uuid(), s.id, m.id, 10 + (p.n % 30), NULL, now() - ((p.n % 60) || ' days')::interval, now()
        FROM stores s
        JOIN seed_projects p ON p.id = s."projectId"
        JOIN generate_series(1, 5) slot ON true
        JOIN seed_materials m ON m.n = ((p.n + slot) % 20000) + 1
        WHERE s.type = 'PROJECT'
      `);
      this.logger.log('Stores ready');

      await runner.query(`
        INSERT INTO tasks (id, "projectId", code, name, "plannedStartDate", "plannedEndDate", status, "createdAt", "updatedAt")
        SELECT gen_random_uuid(), p.id, p.code || '-T-' || lpad(seq::text, 4, '0'),
          'Task ' || seq,
          (DATE '2024-01-01' + ((seq % 500) || ' days')::interval)::date,
          (DATE '2024-04-01' + ((seq % 500) || ' days')::interval)::date,
          (ARRAY['NOT_STARTED','IN_PROGRESS','DONE'])[1 + (seq % 3)]::tasks_status_enum,
          now(), now()
        FROM seed_projects p
        JOIN LATERAL generate_series(1, CASE WHEN p.n = 1 THEN 3000 WHEN p.n <= 1249 THEN 249 ELSE 248 END) AS seq ON true
      `);
      await runner.query(`
        INSERT INTO task_counters ("projectId", "lastNumber")
        SELECT "projectId", MAX(substring(code from '-T-(\\d+)$')::int)
        FROM tasks
        GROUP BY "projectId"
      `);
      this.logger.log('Tasks ready');

      await runner.query(`
        INSERT INTO task_dependencies (id, "taskId", "dependsOnTaskId", "createdAt")
        SELECT gen_random_uuid(), task.id, earlier.id, now()
        FROM tasks task
        JOIN tasks earlier ON earlier."projectId" = task."projectId"
          AND substring(earlier.code from '-T-(\\d+)$')::int = substring(task.code from '-T-(\\d+)$')::int - 1
      `);
      await runner.query(`
        INSERT INTO task_dependencies (id, "taskId", "dependsOnTaskId", "createdAt")
        SELECT gen_random_uuid(), task.id, earlier.id, now()
        FROM tasks task
        JOIN tasks earlier ON earlier."projectId" = task."projectId"
          AND substring(earlier.code from '-T-(\\d+)$')::int = substring(task.code from '-T-(\\d+)$')::int - 2
        WHERE substring(task.code from '-T-(\\d+)$')::int >= 3
      `);
      await runner.query(`
        INSERT INTO task_dependencies (id, "taskId", "dependsOnTaskId", "createdAt")
        SELECT gen_random_uuid(), task.id, earlier.id, now()
        FROM tasks task
        JOIN projects project ON project.id = task."projectId"
        JOIN tasks earlier ON earlier."projectId" = task."projectId"
          AND substring(earlier.code from '-T-(\\d+)$')::int = substring(task.code from '-T-(\\d+)$')::int - 3
        WHERE substring(project.code from 5)::int <= 14
          AND substring(task.code from '-T-(\\d+)$')::int >= 4
      `);
      this.logger.log('Dependencies ready');

      await runner.query(`
        CREATE TEMP TABLE seed_deliveries AS
        SELECT gen_random_uuid() AS id,
          gs.n,
          CASE WHEN gs.n % 2 = 0 THEN 'COMPANY_TO_PROJECT' ELSE 'PROJECT_TO_COMPANY' END AS direction,
          CASE WHEN gs.n % 20 = 0 THEN 'IN_TRANSIT' WHEN gs.n % 20 = 1 THEN 'REJECTED' WHEN gs.n % 20 = 2 THEN 'CANCELLED' ELSE 'DELIVERED' END AS status,
          p.id AS "projectId"
        FROM generate_series(1, 400000) AS gs(n)
        JOIN seed_projects p ON p.n = ((gs.n - 1) % 2000) + 1
      `);
      await runner.query(`
        INSERT INTO deliveries (id, direction, status, "projectId", "senderUserId", "receiverUserId", "sentAt", "receivedAt", "createdAt")
        SELECT d.id, d.direction::deliveries_direction_enum, d.status::deliveries_status_enum, d."projectId", sender.id,
          CASE WHEN d.status = 'IN_TRANSIT' THEN NULL ELSE sender.id END,
          now() - ((d.n % 400) || ' days')::interval,
          CASE WHEN d.status = 'IN_TRANSIT' THEN NULL ELSE now() - ((d.n % 30) || ' days')::interval END,
          now()
        FROM seed_deliveries d
        JOIN seed_users sender ON sender.n = (d.n % 5000)
      `);
      for (let start = 1; start <= 400000; start += 50000) {
        const end = Math.min(start + 49999, 400000);
        await runner.query(`
          INSERT INTO delivery_lines (id, "deliveryId", "materialId", quantity)
          SELECT gen_random_uuid(), d.id, m.id, 1 + ((d.n + line_no) % 9)
          FROM seed_deliveries d
          JOIN generate_series(1, CASE WHEN d.n <= 200000 THEN 8 ELSE 7 END) AS line_no ON true
          JOIN seed_materials m ON m.n = ((d.n + line_no) % 20000) + 1
          WHERE d.n BETWEEN $1 AND $2
        `, [start, end]);
        this.logger.log(`Delivery lines through ${end}`);
      }

      const [counts] = await runner.query(`
        SELECT
          (SELECT count(*) FROM users) AS users,
          (SELECT count(*) FROM projects) AS projects,
          (SELECT count(*) FROM invitations) AS invitations,
          (SELECT count(*) FROM tasks) AS tasks,
          (SELECT count(*) FROM task_dependencies) AS dependencies,
          (SELECT count(*) FROM materials) AS materials,
          (SELECT count(*) FROM deliveries) AS deliveries,
          (SELECT count(*) FROM delivery_lines) AS lines
      `);
      this.logger.log(`Scale seed finished in ${Math.round((Date.now() - started) / 1000)}s ${JSON.stringify(counts)}`);
    } finally {
      await runner.release();
    }
  }
}
