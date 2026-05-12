import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/', requireAuth, async (req, res) => {
  const { name, slug, branding, enabledFeatures } = req.body;
  if (!name || !slug) return res.status(400).json({ error: 'name and slug required' });
  try {
    const orgId = uuid();
    await pool.query(
      'INSERT INTO organizations (id, name, slug, branding, enabled_features) VALUES ($1, $2, $3, $4, $5)',
      [orgId, name, slug, JSON.stringify(branding ?? {}), enabledFeatures ?? []]
    );
    const membershipId = uuid();
    await pool.query(
      'INSERT INTO memberships (id, org_id, user_id, role, status, joined_at) VALUES ($1, $2, $3, $4, $5, NOW())',
      [membershipId, orgId, req.user.id, 'owner', 'active']
    );
    res.status(201).json({ id: orgId, name, slug });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Slug already taken' });
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:orgId', requireAuth, async (req, res) => {
  const { orgId } = req.params;
  try {
    const { rows } = await pool.query('SELECT * FROM organizations WHERE id = $1', [orgId]);
    if (!rows[0]) return res.status(404).json({ error: 'Org not found' });
    const org = rows[0];
    res.json({
      id: org.id,
      name: org.name,
      slug: org.slug,
      branding: org.branding,
      enabledFeatures: org.enabled_features,
    });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:orgId', requireAuth, async (req, res) => {
  const { orgId } = req.params;
  const { name, branding } = req.body;
  try {
    await pool.query(
      'UPDATE organizations SET name = COALESCE($1, name), branding = COALESCE($2, branding) WHERE id = $3',
      [name, branding ? JSON.stringify(branding) : null, orgId]
    );
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:orgId/features', requireAuth, async (req, res) => {
  const { orgId } = req.params;
  const { enabledFeatures } = req.body;
  if (!Array.isArray(enabledFeatures)) return res.status(400).json({ error: 'enabledFeatures must be an array' });
  try {
    await pool.query('UPDATE organizations SET enabled_features = $1 WHERE id = $2', [enabledFeatures, orgId]);
    res.json({ enabledFeatures });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
