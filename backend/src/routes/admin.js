const express = require('express');
const db = require('../config/database');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();

// Protect all admin routes
router.use(adminAuth);

// Admin home
router.get('/', (req, res) => {
  res.send('<h1>Raksha Admin</h1><p><a href="/api/admin/users">Users</a></p>');
});

// List users with pagination and filters
router.get('/users', async (req, res) => {
  const page = parseInt(req.query.page || '1');
  const pageSize = parseInt(req.query.pageSize || '20');
  const search = (req.query.search || '').trim().toLowerCase();
  const status = (req.query.status || '').trim();
  const role = (req.query.role || '').trim();

  let base = db('users');
  let query = base.clone().select('*').orderBy('created_at', 'desc');
  if (search) {
    query = query.whereILike('email', `%${search}%`).orWhereILike('full_name', `%${search}%`);
  }
  if (status) {
    query = query.andWhere('status', status);
  }
  if (role) {
    query = query.andWhere('role', role);
  }

  const totalRows = await base.clone().count('* as count').first();
  const total = parseInt(totalRows.count);

  const users = await query.offset((page - 1) * pageSize).limit(pageSize);

  const rows = users.map(u => `
    <tr>
      <td><a href="/api/admin/users/${u.id}">${u.id}</a></td>
      <td>${u.email}</td>
      <td>${u.full_name || ''}</td>
      <td>${u.nationality || '-'}</td>
      <td>${u.phone_number || '-'}</td>
      <td>
        ${u.verification_status}
        ${u.verification_status === 'pending' ? `<form method="post" action="/api/admin/users/${u.id}/verify" style="display:inline;margin-left:8px;"><button type="submit" style="padding:2px 8px;font-size:12px;">Approve</button></form>` : ''}
      </td>
      <td>${u.role}</td>
      <td>${u.status}</td>
      <td>${u.location_enabled ? 'yes' : 'no'}</td>
      <td>${u.created_at}</td>
    </tr>
  `).join('');

  const html = `
    <html>
      <head>
        <title>Users - Raksha Admin</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 16px; color: #222; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd; padding: 8px; font-size: 14px; }
          th { background: #f5f5f5; text-align: left; }
          .filters { margin-bottom: 12px; }
          input, select { padding: 6px; margin-right: 8px; }
        </style>
      </head>
      <body>
        <h2>Users</h2>
        <div class="filters">
          <form method="get" action="/api/admin/users">
            <input type="text" name="search" placeholder="Search email/name" value="${search}">
            <select name="status">
              <option value="">All Status</option>
              <option value="active" ${status==='active'?'selected':''}>Active</option>
              <option value="disabled" ${status==='disabled'?'selected':''}>Disabled</option>
            </select>
            <select name="role">
              <option value="">All Roles</option>
              <option value="user" ${role==='user'?'selected':''}>User</option>
              <option value="admin" ${role==='admin'?'selected':''}>Admin</option>
            </select>
            <input type="number" name="page" value="${page}" min="1" style="width:60px;">
            <input type="number" name="pageSize" value="${pageSize}" min="5" style="width:80px;">
            <button type="submit">Apply</button>
          </form>
        </div>
        <p>Total: ${total}</p>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Email</th>
              <th>Name</th>
              <th>Nationality</th>
              <th>Phone</th>
              <th>Verification</th>
              <th>Role</th>
              <th>Status</th>
              <th>Location Enabled</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </body>
    </html>
  `;

  res.send(html);
});

// User details with recent alerts
router.get('/users/:id', async (req, res) => {
  const id = req.params.id;
  const user = await db('users').where('id', id).first();
  if (!user) {
    return res.status(404).send('<h3>User not found</h3>');
  }

  const alerts = await db('emergency_alerts')
    .where('user_id', id)
    .orderBy('created_at', 'desc')
    .limit(50);

  const alertRows = alerts.map(a => `
    <tr>
      <td>${a.id}</td>
      <td>${a.latitude}, ${a.longitude}</td>
      <td>${a.message || ''}</td>
      <td>${a.status}</td>
      <td>${a.created_at}</td>
      <td>${a.resolved_at || ''}</td>
    </tr>
  `).join('');

  const html = `
    <html>
      <head>
        <title>User ${user.email} - Raksha Admin</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 16px; color: #222; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd; padding: 8px; font-size: 14px; }
          th { background: #f5f5f5; text-align: left; }
          .kv { display: grid; grid-template-columns: 200px 1fr; gap: 6px; margin-bottom: 16px; }
          .kv div { padding: 4px 0; }
          a { color: #0069c2; text-decoration: none; }
        </style>
      </head>
      <body>
        <p><a href="/api/admin/users">← Back to users</a></p>
        <h2>User Details</h2>
        <div class="kv">
          <div><b>ID</b></div><div>${user.id}</div>
          <div><b>Email</b></div><div>${user.email}</div>
          <div><b>Name</b></div><div>${user.full_name || '-'}</div>
          <div><b>Nationality</b></div><div>${user.nationality || '-'}</div>
          <div><b>Phone</b></div><div>${user.phone_number || '-'}</div>
          <div><b>Verification</b></div><div>${user.verification_status}${user.verification_status === 'pending' ? ` <form method="post" action="/api/admin/users/${user.id}/verify" style="display:inline;margin-left:8px;"><button type="submit" style="padding:2px 8px;font-size:12px;">Approve</button></form>` : ''}</div>
          <div><b>Role</b></div><div>${user.role}</div>
          <div><b>Status</b></div><div>${user.status}</div>
          <div><b>Location Enabled</b></div><div>${user.location_enabled ? 'yes' : 'no'}</div>
          <div><b>Created</b></div><div>${user.created_at}</div>
          <div><b>Updated</b></div><div>${user.updated_at}</div>
        </div>

        <h3>Recent Alerts (max 50)</h3>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Location</th>
              <th>Message</th>
              <th>Status</th>
              <th>Created</th>
              <th>Resolved</th>
            </tr>
          </thead>
          <tbody>
            ${alertRows}
          </tbody>
        </table>
      </body>
    </html>
  `;

  res.send(html);
});

// Approve/verify a user
router.post('/users/:id/verify', async (req, res) => {
  const id = req.params.id;
  await db('users').where('id', id).update({ verification_status: 'verified' });
  res.redirect('/api/admin/users');
});

// PUT endpoint for verification (supports both POST and PUT)
router.put('/users/:id/verify', async (req, res) => {
  const id = req.params.id;
  const { status } = req.body; // Can be 'verified' or 'rejected'
  
  const validStatuses = ['verified', 'rejected', 'pending'];
  const newStatus = validStatuses.includes(status) ? status : 'verified';
  
  const [user] = await db('users')
    .where('id', id)
    .update({ 
      verification_status: newStatus,
      updated_at: new Date()
    })
    .returning('*');
  
  if (!user) {
    return res.status(404).json({ 
      success: false,
      error: 'User not found' 
    });
  }
  
  res.json({ 
    success: true,
    user: {
      id: user.id,
      email: user.email,
      verification_status: user.verification_status
    },
    message: `User ${newStatus === 'verified' ? 'verified' : newStatus} successfully`
  });
});

module.exports = router;
