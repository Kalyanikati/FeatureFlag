import React, { useState, useEffect } from 'react'
import { flagAPI } from '../api'

function VersionHistory({ flags, onRollback }) {
  const [selectedFlag, setSelectedFlag] = useState(null)
  const [versions, setVersions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [rollbackModal, setRollbackModal] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState(null)
  const [rollbackReason, setRollbackReason] = useState('')

  useEffect(() => {
    if (selectedFlag) {
      loadVersions()
    }
  }, [selectedFlag])

  const loadVersions = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await flagAPI.getVersions(selectedFlag.key)
      setVersions(response.data)
    } catch (err) {
      setError('Error loading versions: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRollbackOpen = (version) => {
    setSelectedVersion(version)
    setRollbackReason('')
    setRollbackModal(true)
  }

  const handleRollbackSubmit = async (e) => {
    e.preventDefault()
    try {
      setError(null)
      await flagAPI.rollback(selectedFlag.key, selectedVersion.id, rollbackReason)
      setRollbackModal(false)
      loadVersions()
      onRollback()
    } catch (err) {
      setError('Error rolling back: ' + err.response?.data?.detail || err.message)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
          Select a Flag:
        </label>
        <select
          value={selectedFlag?.id || ''}
          onChange={(e) => {
            const flag = flags.find((f) => f.id == e.target.value)
            setSelectedFlag(flag || null)
          }}
          style={{
            padding: '10px',
            borderRadius: '4px',
            border: '1px solid #ddd',
            fontSize: '14px',
            width: '100%',
            maxWidth: '300px',
          }}
        >
          <option value="">-- Choose a flag --</option>
          {flags.map((flag) => (
            <option key={flag.id} value={flag.id}>
              {flag.key} ({flag.name})
            </option>
          ))}
        </select>
      </div>

      {selectedFlag && (
        <div>
          <div
            style={{
              background: 'white',
              padding: '20px',
              borderRadius: '8px',
              marginBottom: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            <h3 style={{ marginBottom: '15px' }}>Version History for: {selectedFlag.key}</h3>
            {error && <div className="alert alert-danger">{error}</div>}

            {loading ? (
              <div className="loading">
                <div className="spinner"></div> Loading versions...
              </div>
            ) : versions.length === 0 ? (
              <p style={{ color: '#999' }}>No versions found for this flag.</p>
            ) : (
              <div className="version-list">
                {versions.map((version) => (
                  <div key={version.id} className="version-item">
                    <div className="version-info">
                      <div className="version-info-title">Version {version.version}</div>
                      <div className="version-info-detail">
                        Created: {new Date(version.created_at).toLocaleString()}
                      </div>
                      <div className="version-info-detail">By: {version.changed_by}</div>
                      {version.change_reason && (
                        <div className="version-info-detail">Reason: {version.change_reason}</div>
                      )}
                      <div
                        style={{
                          background: '#f9f9f9',
                          padding: '10px',
                          borderRadius: '4px',
                          marginTop: '10px',
                          fontSize: '12px',
                          fontFamily: 'monospace',
                        }}
                      >
                        <strong>State:</strong>
                        <pre
                          style={{
                            margin: '5px 0 0 0',
                            overflow: 'auto',
                            maxHeight: '100px',
                          }}
                        >
                          {JSON.stringify(version.state_snapshot, null, 2)}
                        </pre>
                      </div>
                    </div>
                    <button
                      className="btn btn-success btn-small"
                      onClick={() => handleRollbackOpen(version)}
                      style={{ marginLeft: '10px', whiteSpace: 'nowrap' }}
                    >
                      Rollback to V{version.version}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rollback Modal */}
      <div className={`modal ${rollbackModal ? 'active' : ''}`}>
        <div className="modal-content">
          <div className="modal-header">
            Rollback {selectedFlag?.key} to Version {selectedVersion?.version}
          </div>
          <div
            style={{
              background: '#fff3cd',
              padding: '15px',
              borderRadius: '6px',
              marginBottom: '15px',
              border: '1px solid #ffc107',
              color: '#856404',
            }}
          >
            ⚠️ This will revert the flag to the state shown below. The current state will be saved
            as a new version.
          </div>
          {selectedVersion && (
            <div
              style={{
                background: '#f5f5f5',
                padding: '15px',
                borderRadius: '6px',
                marginBottom: '15px',
                fontSize: '12px',
                fontFamily: 'monospace',
              }}
            >
              <strong>Restoring to:</strong>
              <pre style={{ margin: '10px 0 0 0', overflow: 'auto' }}>
                {JSON.stringify(selectedVersion.state_snapshot, null, 2)}
              </pre>
            </div>
          )}
          <form onSubmit={handleRollbackSubmit}>
            <div className="form-group">
              <label>Reason for Rollback (optional)</label>
              <textarea
                value={rollbackReason}
                onChange={(e) => setRollbackReason(e.target.value)}
                placeholder="e.g., Unexpected behavior detected in production"
              />
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setRollbackModal(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-danger">
                Confirm Rollback
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default VersionHistory
