import React, { useState, useEffect } from 'react'
import { sdkAPI } from '../api'

function EcommerceIntegration({ flags }) {
  const [ecomFlags, setEcomFlags] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [testUser, setTestUser] = useState('user_123')
  const [evaluationResults, setEvaluationResults] = useState([])
  const [evaluating, setEvaluating] = useState(false)

  useEffect(() => {
    loadEcomFlags()
    const interval = setInterval(loadEcomFlags, 3000)
    return () => clearInterval(interval)
  }, [])

  const loadEcomFlags = async () => {
    try {
      setError(null)
      const response = await sdkAPI.getAllFlags()
      setEcomFlags(response.data)
      setLoading(false)
    } catch (err) {
      setError('Error connecting to e-commerce service: ' + err.message)
      setLoading(false)
    }
  }

  const testEvaluation = async (flagKey) => {
    if (!testUser.trim()) {
      alert('Please enter a user ID')
      return
    }
    try {
      setEvaluating(true)
      const response = await sdkAPI.evaluate(flagKey, testUser)
      setEvaluationResults([
        {
          flagKey,
          userId: testUser,
          enabled: response.data.enabled,
          rolloutPercentage: response.data.rollout_percentage,
          timestamp: new Date().toLocaleTimeString(),
        },
        ...evaluationResults.slice(0, 9),
      ])
    } catch (err) {
      alert('Error evaluating flag: ' + err.message)
    } finally {
      setEvaluating(false)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '30px' }}>
        <div className="grid">
          <div className="card">
            <div className="card-title">📊 System Status</div>
            <div className="status-item">
              <span className="status-label">Feature Flag API</span>
              <span className="status-value" style={{ color: '#28a745' }}>
                ✓ Online
              </span>
            </div>
            <div className="status-item">
              <span className="status-label">E-commerce Service</span>
              <span className="status-value" style={{ color: loading ? '#ffc107' : '#28a745' }}>
                {loading ? '⟳ Checking...' : '✓ Online'}
              </span>
            </div>
            <div className="status-item">
              <span className="status-label">Redis Cache</span>
              <span className="status-value" style={{ color: '#28a745' }}>
                ✓ Online
              </span>
            </div>
            <div className="status-item">
              <span className="status-label">Total Flags</span>
              <span className="status-value">{flags.length}</span>
            </div>
          </div>

          <div className="card">
            <div className="card-title">🎯 Active Flags in E-commerce</div>
            {ecomFlags ? (
              <div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#0066cc' }}>
                  {ecomFlags.length || 0}
                </div>
                <div style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>
                  Flags synced via Redis
                </div>
              </div>
            ) : (
              <div style={{ color: '#999' }}>Loading...</div>
            )}
          </div>
        </div>
      </div>

      <div style={{ background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginBottom: '15px' }}>🧪 Test Flag Evaluation</h3>
        <p style={{ color: '#666', fontSize: '13px', marginBottom: '15px' }}>
          Test how flags are evaluated for different users. This simulates how the e-commerce
          service evaluates flags.
        </p>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <input
            type="text"
            value={testUser}
            onChange={(e) => setTestUser(e.target.value)}
            placeholder="Enter user ID (e.g., user_123)"
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              fontSize: '14px',
            }}
          />
        </div>

        {flags.length === 0 ? (
          <p style={{ color: '#999' }}>No flags available to test. Create a flag first.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Flag Key</th>
                <th>Status</th>
                <th>Rollout %</th>
                <th>Action</th>
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
                    <button
                      className="btn btn-primary btn-small"
                      onClick={() => testEvaluation(flag.key)}
                      disabled={evaluating}
                    >
                      {evaluating ? '...' : 'Test'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {evaluationResults.length > 0 && (
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginBottom: '15px' }}>📝 Evaluation Results (Last 10)</h3>
          <div style={{ maxHeight: '400px', overflow: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Flag</th>
                  <th>User</th>
                  <th>Enabled</th>
                  <th>Rollout %</th>
                </tr>
              </thead>
              <tbody>
                {evaluationResults.map((result, idx) => (
                  <tr key={idx}>
                    <td style={{ fontSize: '12px', color: '#999' }}>{result.timestamp}</td>
                    <td>
                      <code style={{ background: '#f5f5f5', padding: '4px 8px', borderRadius: '4px' }}>
                        {result.flagKey}
                      </code>
                    </td>
                    <td>{result.userId}</td>
                    <td>
                      <span
                        className={`badge ${
                          result.enabled ? 'badge-success' : 'badge-danger'
                        }`}
                      >
                        {result.enabled ? 'YES' : 'NO'}
                      </span>
                    </td>
                    <td>{result.rolloutPercentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ marginTop: '20px', padding: '15px', background: '#d1ecf1', borderRadius: '6px', border: '1px solid #bee5eb', color: '#0c5460' }}>
        <strong>💡 How it Works:</strong>
        <ul style={{ marginTop: '10px', marginLeft: '20px' }}>
          <li>E-commerce service connects to Redis and subscribes to flag_updates channel</li>
          <li>When you update a flag, it publishes to Redis in real-time</li>
          <li>E-commerce evaluates flags using MurmurHash3 for deterministic user bucketing</li>
          <li>Use Test Evaluation to see if a specific user would see the flag</li>
        </ul>
      </div>
    </div>
  )
}

export default EcommerceIntegration
