import React, { useState, useEffect } from 'react'
import { flagAPI } from './api'
import FlagManager from './components/FlagManager'
import VersionHistory from './components/VersionHistory'
import EcommerceIntegration from './components/EcommerceIntegration'
import './index.css'

function App() {
  const [activeTab, setActiveTab] = useState('flags')
  const [flags, setFlags] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null)

  const loadFlags = async (showSpinner = true) => {
    try {
      if (showSpinner) {
        setLoading(true)
      }
      const response = await flagAPI.getAll()
      setFlags(response.data)
    } catch (error) {
      showMessage('Error loading flags: ' + error.message, 'error')
    } finally {
      if (showSpinner) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    loadFlags()
    // Refresh flags every 5 seconds without interrupting the form state
    const interval = setInterval(() => loadFlags(false), 5000)
    return () => clearInterval(interval)
  }, [])

  const showMessage = (text, type = 'info') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 4000)
  }

  const handleFlagCreated = () => {
    loadFlags()
    showMessage('Flag created successfully!', 'success')
  }

  const handleFlagUpdated = () => {
    loadFlags()
    showMessage('Flag updated successfully!', 'success')
  }

  const handleFlagDeleted = () => {
    loadFlags()
    showMessage('Flag deleted successfully!', 'success')
  }

  const handleRollback = () => {
    loadFlags()
    showMessage('Flag rolled back successfully!', 'success')
  }

  return (
    <div className="container">
      <div className="header">
        <h1>🚀 Feature Flag Dashboard</h1>
        <div style={{ fontSize: '12px', color: '#999' }}>
          Production-Grade Feature Management System
        </div>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`}>{message.text}</div>
      )}

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'flags' ? 'active' : ''}`}
          onClick={() => setActiveTab('flags')}
        >
          📋 Flags
        </button>
        <button
          className={`tab ${activeTab === 'versions' ? 'active' : ''}`}
          onClick={() => setActiveTab('versions')}
        >
          📜 Versions & Rollback
        </button>
        <button
          className={`tab ${activeTab === 'ecommerce' ? 'active' : ''}`}
          onClick={() => setActiveTab('ecommerce')}
        >
          🛒 E-commerce Integration
        </button>
      </div>

      {loading && activeTab === 'flags' ? (
        <div className="loading">
          <div className="spinner"></div> Loading flags...
        </div>
      ) : (
        <>
          {activeTab === 'flags' && (
            <FlagManager
              flags={flags}
              onFlagCreated={handleFlagCreated}
              onFlagUpdated={handleFlagUpdated}
              onFlagDeleted={handleFlagDeleted}
            />
          )}

          {activeTab === 'versions' && (
            <VersionHistory
              flags={flags}
              onRollback={handleRollback}
            />
          )}

          {activeTab === 'ecommerce' && (
            <EcommerceIntegration flags={flags} />
          )}
        </>
      )}
    </div>
  )
}

export default App
