import React, { useState } from 'react'
import { flagAPI } from '../api'

function FlagManager({ flags, onFlagCreated, onFlagUpdated, onFlagDeleted }) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingFlag, setEditingFlag] = useState(null)
  const [formData, setFormData] = useState({
    key: '',
    name: '',
    description: '',
    is_enabled: true,
    rollout_percentage: 100,
  })
  const [error, setError] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const resetForm = () => {
    setFormData({
      key: '',
      name: '',
      description: '',
      is_enabled: true,
      rollout_percentage: 100,
    })
    setError(null)
  }

  const handleCreateOpen = () => {
    resetForm()
    setEditingFlag(null)
    setShowCreateModal(true)
  }

  const handleEditOpen = (flag) => {
    setEditingFlag(flag)
    setFormData({
      key: flag.key,
      name: flag.name,
      description: flag.description,
      is_enabled: flag.is_enabled,
      rollout_percentage: flag.rollout_percentage,
    })
    setShowEditModal(true)
  }

  const handleSubmitCreate = async (e) => {
    e.preventDefault()
    try {
      setError(null)
      await flagAPI.create(formData)
      setShowCreateModal(false)
      resetForm()
      onFlagCreated()
    } catch (err) {
      setError(err.response?.data?.detail || 'Error creating flag')
    }
  }

  const handleSubmitEdit = async (e) => {
    e.preventDefault()
    try {
      setError(null)
      const updateData = {
        name: formData.name,
        description: formData.description,
        is_enabled: formData.is_enabled,
        rollout_percentage: formData.rollout_percentage,
      }
      await flagAPI.update(editingFlag.key, updateData)
      setShowEditModal(false)
      resetForm()
      onFlagUpdated()
    } catch (err) {
      setError(err.response?.data?.detail || 'Error updating flag')
    }
  }

  const handleDelete = async (key) => {
    if (window.confirm(`Delete flag "${key}"? This action cannot be undone.`)) {
      try {
        setDeleting(key)
        await flagAPI.delete(key)
        onFlagDeleted()
      } catch (err) {
        alert('Error deleting flag: ' + err.message)
      } finally {
        setDeleting(null)
      }
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <button className="btn btn-primary" onClick={handleCreateOpen}>
          + Create New Flag
        </button>
      </div>

      {flags.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: '#999' }}>No feature flags created yet. Create one to get started!</p>
        </div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Key</th>
              <th>Name</th>
              <th>Description</th>
              <th>Status</th>
              <th>Rollout</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {flags.map((flag) => (
              <tr key={flag.id}>
                <td>
                  <code style={{ background: '#f5f5f5', padding: '4px 8px', borderRadius: '4px' }}>
                    {flag.key}
                  </code>
                </td>
                <td>{flag.name}</td>
                <td style={{ color: '#666', fontSize: '13px' }}>{flag.description}</td>
                <td>
                  <span
                    className={`badge ${flag.is_enabled ? 'badge-success' : 'badge-danger'}`}
                  >
                    {flag.is_enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </td>
                <td>
                  <span style={{ fontWeight: '600' }}>{flag.rollout_percentage}%</span>
                </td>
                <td>
                  <div className="actions">
                    <button
                      className="btn btn-secondary btn-small"
                      onClick={() => handleEditOpen(flag)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-danger btn-small"
                      onClick={() => handleDelete(flag.key)}
                      disabled={deleting === flag.key}
                    >
                      {deleting === flag.key ? '...' : 'Delete'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Create Modal */}
      <div className={`modal ${showCreateModal ? 'active' : ''}`}>
        <div className="modal-content">
          <div className="modal-header">Create New Flag</div>
          {error && <div className="alert alert-danger">{error}</div>}
          <form onSubmit={handleSubmitCreate}>
            <div className="form-group">
              <label>Flag Key (unique identifier) *</label>
              <input
                type="text"
                required
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                placeholder="e.g., checkout_v2"
              />
            </div>
            <div className="form-group">
              <label>Display Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Checkout V2 Rollout"
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What is this flag for?"
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Status</label>
                <select
                  value={formData.is_enabled ? 'enabled' : 'disabled'}
                  onChange={(e) =>
                    setFormData({ ...formData, is_enabled: e.target.value === 'enabled' })
                  }
                >
                  <option value="enabled">Enabled</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>
              <div className="form-group">
                <label>Rollout Percentage (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.rollout_percentage}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      rollout_percentage: parseInt(e.target.value),
                    })
                  }
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Create Flag
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Edit Modal */}
      <div className={`modal ${showEditModal ? 'active' : ''}`}>
        <div className="modal-content">
          <div className="modal-header">Edit Flag: {editingFlag?.key}</div>
          {error && <div className="alert alert-danger">{error}</div>}
          <form onSubmit={handleSubmitEdit}>
            <div className="form-group">
              <label>Display Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Status</label>
                <select
                  value={formData.is_enabled ? 'enabled' : 'disabled'}
                  onChange={(e) =>
                    setFormData({ ...formData, is_enabled: e.target.value === 'enabled' })
                  }
                >
                  <option value="enabled">Enabled</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>
              <div className="form-group">
                <label>Rollout Percentage (%)</label>
                <div className="slider-container">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    className="slider"
                    value={formData.rollout_percentage}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        rollout_percentage: parseInt(e.target.value),
                      })
                    }
                  />
                  <div className="slider-value">{formData.rollout_percentage}%</div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Update Flag
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default FlagManager
