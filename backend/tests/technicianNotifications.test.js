const request = require('supertest');
const { createApp } = require('../src/app');
const app = createApp();
const { query } = require('../src/db/pool');
const { signToken } = require('../src/middleware/auth');

describe('Technician Notifications API', () => {
  let techToken;
  let technicianId;
  let createdNotifId;

  beforeAll(async () => {
    // Find or create test technician
    const techRes = await query('SELECT id, nama FROM technicians LIMIT 1');
    if (techRes.rows.length > 0) {
      technicianId = techRes.rows[0].id;
    } else {
      const ins = await query("INSERT INTO technicians (nama, no_hp, status) VALUES ('Test Tech', '081234567890', 'aktif') RETURNING id");
      technicianId = ins.rows[0].id;
    }

    techToken = signToken({
      id: 99999,
      nama: 'Test Tech',
      role: 'technician',
      technicianId: technicianId,
    });

    // Insert a test notification for this technician
    const notifRes = await query(`
      INSERT INTO notifications (target_role, target_id, title, message, type, is_read, created_at)
      VALUES ('technician', $1, 'Tugas Servis Baru', 'Anda ditugaskan pada tiket #TEST', 'booking', false, NOW())
      RETURNING id
    `, [technicianId]);
    createdNotifId = notifRes.rows[0].id;
  });

  afterAll(async () => {
    if (createdNotifId) {
      await query('DELETE FROM notifications WHERE id = $1', [createdNotifId]);
    }
  });

  it('GET /api/v1/technician/notifications returns notification list and unread count', async () => {
    const res = await request(app)
      .get('/api/v1/technician/notifications')
      .set('Authorization', `Bearer ${techToken}`)
      .expect(200);

    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toBeDefined();
    expect(res.body.meta.unread_count).toBeGreaterThanOrEqual(1);
    
    const found = res.body.data.find(n => n.id === createdNotifId);
    expect(found).toBeDefined();
    expect(found.is_read).toBe(false);
  });

  it('PATCH /api/v1/technician/notifications/:id/read marks notification as read', async () => {
    const res = await request(app)
      .patch(`/api/v1/technician/notifications/${createdNotifId}/read`)
      .set('Authorization', `Bearer ${techToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.id).toBe(createdNotifId);

    // Verify in db
    const check = await query('SELECT is_read FROM notifications WHERE id = $1', [createdNotifId]);
    expect(check.rows[0].is_read).toBe(true);
  });

  it('PATCH /api/v1/technician/notifications/read-all marks all notifications as read', async () => {
    const res = await request(app)
      .patch('/api/v1/technician/notifications/read-all')
      .set('Authorization', `Bearer ${techToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);

    const check = await request(app)
      .get('/api/v1/technician/notifications?unread=true')
      .set('Authorization', `Bearer ${techToken}`)
      .expect(200);

    expect(check.body.meta.unread_count).toBe(0);
  });
});
