import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

function App() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState({});

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_BASE_URL}/admin/users`);
      setUsers(response.data.users || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch users');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId) => {
    try {
      setProcessing({ ...processing, [userId]: 'approving' });
      const response = await axios.post(`${API_BASE_URL}/approve-user`, { userId });
      
      if (response.data.success) {
        // Refresh the user list
        await fetchUsers();
        alert('User approved successfully!');
      } else {
        alert('Failed to approve user');
      }
    } catch (err) {
      alert(`Error approving user: ${err.message}`);
      console.error('Error approving user:', err);
    } finally {
      setProcessing({ ...processing, [userId]: null });
    }
  };

  const handleReject = async (userId) => {
    if (!window.confirm('Are you sure you want to reject this user?')) {
      return;
    }

    try {
      setProcessing({ ...processing, [userId]: 'rejecting' });
      const response = await axios.post(`${API_BASE_URL}/reject-user`, { userId });
      
      if (response.data.success) {
        // Refresh the user list
        await fetchUsers();
        alert('User rejected successfully!');
      } else {
        alert('Failed to reject user');
      }
    } catch (err) {
      alert(`Error rejecting user: ${err.message}`);
      console.error('Error rejecting user:', err);
    } finally {
      setProcessing({ ...processing, [userId]: null });
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { class: 'status-pending', label: 'Pending' },
      activated: { class: 'status-active', label: 'Active' },
      rejected: { class: 'status-rejected', label: 'Rejected' }
    };
    const statusInfo = statusMap[status] || { class: 'status-unknown', label: status };
    return <span className={`status-badge ${statusInfo.class}`}>{statusInfo.label}</span>;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-IE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="App">
        <div className="loading">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="app-header">
        <h1>🛡️ Raksha Admin Panel</h1>
        <p>User Registration Management</p>
        <button className="refresh-btn" onClick={fetchUsers}>
          🔄 Refresh
        </button>
      </header>

      {error && (
        <div className="error-banner">
          ⚠️ {error}
        </div>
      )}

      <div className="container">
        <div className="stats">
          <div className="stat-card">
            <div className="stat-number">{users.length}</div>
            <div className="stat-label">Total Users</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{users.filter(u => u.status === 'pending').length}</div>
            <div className="stat-label">Pending Approval</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{users.filter(u => u.status === 'activated').length}</div>
            <div className="stat-label">Active Users</div>
          </div>
        </div>

        {users.length === 0 ? (
          <div className="empty-state">
            <p>No users found</p>
          </div>
        ) : (
          <div className="users-table">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>ID Document</th>
                  <th>Status</th>
                  <th>Registered</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.userId}>
                    <td className="user-name">{user.name || 'N/A'}</td>
                    <td className="user-email">{user.email}</td>
                    <td className="user-phone">{user.phone || 'N/A'}</td>
                    <td className="user-document">
                      {user.idDocument ? (
                        <a 
                          href={`${API_BASE_URL}${user.idDocument.path}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="document-link"
                        >
                          📄 View Document
                        </a>
                      ) : (
                        <span className="no-document">No document</span>
                      )}
                    </td>
                    <td>{getStatusBadge(user.status)}</td>
                    <td className="user-date">{formatDate(user.createdAt)}</td>
                    <td className="actions">
                      {user.status === 'pending' && (
                        <>
                          <button
                            className="btn-approve"
                            onClick={() => handleApprove(user.userId)}
                            disabled={processing[user.userId]}
                          >
                            {processing[user.userId] === 'approving' ? '⏳' : '✓'} Approve
                          </button>
                          <button
                            className="btn-reject"
                            onClick={() => handleReject(user.userId)}
                            disabled={processing[user.userId]}
                          >
                            {processing[user.userId] === 'rejecting' ? '⏳' : '✗'} Reject
                          </button>
                        </>
                      )}
                      {user.status === 'activated' && (
                        <span className="status-text">Approved</span>
                      )}
                      {user.status === 'rejected' && (
                        <span className="status-text">Rejected</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
