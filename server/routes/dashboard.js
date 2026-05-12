import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { wrap } from '../middleware/async.js';

const router = Router();
router.use(requireAuth);

router.get('/:orgId/dashboard/summary', wrap(async (req, res) => {
  const { orgId } = req.params;
  const userId = req.user.id;

  const { rows: orgRows } = await query(
    'SELECT enabled_features FROM organizations WHERE id = $1',
    [orgId]
  );
  if (!orgRows[0]) return res.status(404).json({ error: 'Org not found' });

  const features = new Set(orgRows[0].enabled_features ?? []);
  const summary = {};

  await Promise.all([
    features.has('announcements') && query(
      `SELECT title, created_at
       FROM announcements WHERE org_id = $1
       ORDER BY created_at DESC LIMIT 3`,
      [orgId]
    ).then(({ rows }) => {
      summary.announcements = rows.map(r => ({ title: r.title, createdAt: r.created_at }));
    }),

    features.has('events') && query(
      `SELECT title, start_at, location
       FROM events WHERE org_id = $1 AND start_at > NOW()
       ORDER BY start_at ASC LIMIT 3`,
      [orgId]
    ).then(({ rows }) => {
      summary.events = rows.map(r => ({ title: r.title, startAt: r.start_at, location: r.location }));
    }),

    features.has('forum') && query(
      `SELECT fp.title, u.name AS author, COUNT(fc.id)::int AS comment_count
       FROM forum_posts fp
       JOIN users u ON fp.author_id = u.id
       LEFT JOIN forum_comments fc ON fc.post_id = fp.id
       WHERE fp.org_id = $1
       GROUP BY fp.id, fp.title, fp.created_at, u.name
       ORDER BY fp.created_at DESC LIMIT 3`,
      [orgId]
    ).then(({ rows }) => {
      summary.forum = rows.map(r => ({ title: r.title, author: r.author, commentCount: r.comment_count }));
    }),

    features.has('chat') && query(
      `SELECT r.name,
         (SELECT content FROM chat_messages
          WHERE room_id = r.id ORDER BY created_at DESC LIMIT 1) AS last_message
       FROM chat_rooms r WHERE r.org_id = $1 ORDER BY r.name LIMIT 1`,
      [orgId]
    ).then(({ rows }) => {
      if (rows[0]) {
        summary.chat = { roomName: rows[0].name, lastMessage: rows[0].last_message ?? null, unreadCount: 0 };
      }
    }),

    features.has('shop') && Promise.all([
      query(
        `SELECT name, price FROM shop_items
         WHERE org_id = $1 AND active = true
         ORDER BY created_at DESC LIMIT 3`,
        [orgId]
      ),
      query(
        `SELECT status FROM orders
         WHERE org_id = $1 AND user_id = $2
         ORDER BY created_at DESC LIMIT 1`,
        [orgId, userId]
      ),
    ]).then(([{ rows: items }, { rows: orders }]) => {
      summary.shop = {
        items: items.map(i => ({ name: i.name, price: Number(i.price) })),
        duesStatus: orders[0]?.status === 'paid' ? 'paid' : 'unpaid',
      };
    }),
  ].filter(Boolean));

  res.json(summary);
}));

export default router;
