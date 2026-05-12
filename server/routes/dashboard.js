import { Router } from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/:orgId/dashboard/summary', requireAuth, async (req, res) => {
  const { orgId } = req.params;
  const userId = req.user.id;

  try {
    const { rows: orgRows } = await pool.query(
      'SELECT enabled_features FROM organizations WHERE id = $1',
      [orgId]
    );
    if (!orgRows[0]) return res.status(404).json({ error: 'Org not found' });

    const enabledFeatures = orgRows[0].enabled_features ?? [];
    const summary = {};

    if (enabledFeatures.includes('announcements')) {
      const { rows } = await pool.query(
        'SELECT title, created_at FROM announcements WHERE org_id = $1 ORDER BY created_at DESC LIMIT 3',
        [orgId]
      );
      summary.announcements = rows.map(r => ({ title: r.title, createdAt: r.created_at }));
    }

    if (enabledFeatures.includes('events')) {
      const { rows } = await pool.query(
        `SELECT title, start_at, location FROM events
         WHERE org_id = $1 AND start_at > NOW()
         ORDER BY start_at ASC LIMIT 3`,
        [orgId]
      );
      summary.events = rows.map(r => ({ title: r.title, startAt: r.start_at, location: r.location }));
    }

    if (enabledFeatures.includes('forum')) {
      const { rows } = await pool.query(
        `SELECT fp.title, u.name AS author,
          (SELECT COUNT(*) FROM forum_comments fc WHERE fc.post_id = fp.id) AS comment_count
         FROM forum_posts fp
         JOIN users u ON fp.author_id = u.id
         WHERE fp.org_id = $1
         ORDER BY fp.created_at DESC LIMIT 3`,
        [orgId]
      );
      summary.forum = rows.map(r => ({
        title: r.title,
        author: r.author,
        commentCount: Number(r.comment_count),
      }));
    }

    if (enabledFeatures.includes('chat')) {
      const { rows: roomRows } = await pool.query(
        'SELECT id, name FROM chat_rooms WHERE org_id = $1 ORDER BY name LIMIT 1',
        [orgId]
      );
      if (roomRows[0]) {
        const { rows: msgRows } = await pool.query(
          'SELECT content FROM chat_messages WHERE room_id = $1 ORDER BY created_at DESC LIMIT 1',
          [roomRows[0].id]
        );
        summary.chat = {
          roomName: roomRows[0].name,
          lastMessage: msgRows[0]?.content ?? null,
          unreadCount: 0,
        };
      }
    }

    if (enabledFeatures.includes('shop')) {
      const { rows: items } = await pool.query(
        'SELECT name, price FROM shop_items WHERE org_id = $1 AND active = true ORDER BY created_at DESC LIMIT 3',
        [orgId]
      );
      const { rows: orders } = await pool.query(
        `SELECT status FROM orders WHERE org_id = $1 AND user_id = $2
         ORDER BY created_at DESC LIMIT 1`,
        [orgId, userId]
      );
      summary.shop = {
        items: items.map(i => ({ name: i.name, price: Number(i.price) })),
        duesStatus: orders[0]?.status === 'paid' ? 'paid' : 'unpaid',
      };
    }

    res.json(summary);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
