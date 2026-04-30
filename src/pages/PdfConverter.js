import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import './Dashboard.css'
import './PdfConverter.css'

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function PdfConverter() {
  const { profile, merchant, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()

  const [carrierName, setCarrierName] = useState('')
  const [pdfFile, setPdfFile] = useState(null)
  const [step, setStep] = useState(null) // null | 'uploading' | 'extracting' | 'done'
  const [rowCount, setRowCount] = useState(0)
  const [csv, setCsv] = useState('')
  const [corrections, setCorrections] = useState([])
  const [error, setError] = useState('')

  const avatarInitial = profile?.full_name?.charAt(0) || merchant?.name?.charAt(0) || '?'
  const canConvert = carrierName.trim() && pdfFile && !step

  async function handleSignOut() {
    await signOut()
    navigate('/signin')
  }

  async function handleConvert() {
    setError('')
    setCsv('')
    setRowCount(0)
    setStep('uploading')

    try {
      const pdfBase64 = await readFileAsBase64(pdfFile)
      setStep('extracting')

      const { data: { session } } = await supabase.auth.getSession()
      const { data, error: fnError } = await supabase.functions.invoke('convert-pdf-to-csv', {
        body: { pdfBase64, mediaType: 'application/pdf', carrierName: carrierName.trim() },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })

      if (fnError) throw fnError
      if (data.error) throw new Error(data.error)

      setCsv(data.csv)
      setRowCount(data.rowCount)
      setCorrections(data.corrections || [])
      setStep('done')
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
      setStep(null)
    }
  }

  function handleDownload() {
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${carrierName.trim().toLowerCase().replace(/\s+/g, '-')}-rate-card.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleReset() {
    setStep(null)
    setCsv('')
    setRowCount(0)
    setCorrections([])
    setError('')
    setPdfFile(null)
    setCarrierName('')
  }

  const previewLines = csv ? csv.trim().split('\n').slice(0, 11).join('\n') : ''
  const converting = step === 'uploading' || step === 'extracting'

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-logo"><span className="sidebar-logo-dot" />ShippingIQ</div>
        <nav className="sidebar-nav">
          <a href="/dashboard" className="nav-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            Dashboard
          </a>
          <a href="/carriers" className="nav-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
            Carriers
          </a>
          <a href="/rules" className="nav-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            Rules
          </a>
          <a href="/quote" className="nav-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
            Get a Quote
          </a>
          <a href="/resources" className="nav-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            Resources
          </a>
          <a href="/convert" className="nav-item active">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4"/><polyline points="14 2 14 8 20 8"/><path d="M2 15h10"/><path d="m9 18 3-3-3-3"/></svg>
            Rate Card Converter
          </a>
          {isAdmin && (<>
            <div className="nav-divider" />
            <a href="/team" className="nav-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              Team
            </a>
            <a href="/settings" className="nav-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              Settings
            </a>
          </>)}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-avatar">{avatarInitial}</div>
            <div className="user-info">
              <div className="user-name">{profile?.full_name || merchant?.name}</div>
              <div className="user-role">{isAdmin ? 'Admin' : 'User'}</div>
            </div>
          </div>
          <button className="signout-btn" onClick={handleSignOut}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Sign out
          </button>
        </div>
      </aside>

      <main className="main">
        <div className="main-inner">
          <div className="main-header">
            <div>
              <h1 className="main-title">Rate Card Converter</h1>
              <p className="main-subtitle">Upload a carrier PDF rate card and we'll convert it to a CSV ready to upload into ShippingIQ.</p>
            </div>
          </div>

          <div className="card" style={{ maxWidth: '560px' }}>
            <div style={{ padding: '12px 14px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', fontSize: '13px', color: '#0369a1', lineHeight: '1.6', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p style={{ margin: 0 }}>For the most accurate results, ask your carrier for a CSV or Excel rate sheet and upload it directly — no conversion needed.</p>
              <p style={{ margin: 0 }}>If your carrier only provides a PDF, upload it here and we'll convert it. Use the original PDF from your carrier — emailed directly or exported digitally. Scanned or photographed rate cards may produce errors.</p>
              <p style={{ margin: 0 }}><strong>Important:</strong> AI conversion is not guaranteed to be 100% accurate. Destination names and rate values should always be verified against your original PDF before uploading. Minor errors in a small number of rows are possible — particularly in scanned documents or PDFs with complex formatting.</p>
            </div>
            {step !== 'done' && (
              <>
                <div className="form-group">
                  <label className="form-label">Carrier name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={carrierName}
                    onChange={e => setCarrierName(e.target.value)}
                    placeholder="e.g. Allied Express"
                    disabled={converting}
                    style={{ maxWidth: '320px' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label className="form-label">Rate card PDF</label>
                  <input
                    type="file"
                    accept=".pdf"
                    className="form-input"
                    onChange={e => setPdfFile(e.target.files?.[0] || null)}
                    disabled={converting}
                    style={{ padding: '8px 12px', cursor: 'pointer' }}
                  />
                </div>

                {converting && (
                  <div className="converter-steps">
                    <div className={`converter-step ${step === 'uploading' ? 'active' : 'done'}`}>
                      {step === 'uploading'
                        ? <span className="converter-spinner" />
                        : <svg className="converter-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      }
                      Uploading PDF...
                    </div>
                    <div className={`converter-step ${step === 'extracting' ? 'active' : step === 'done' ? 'done' : ''}`}>
                      {step === 'extracting'
                        ? <span className="converter-spinner" />
                        : <span style={{ width: 14, height: 14, flexShrink: 0 }} />
                      }
                      Extracting rates...
                    </div>
                  </div>
                )}

                {error && (
                  <div style={{ marginBottom: '16px', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', fontSize: '13px', color: '#dc2626' }}>
                    {error}
                  </div>
                )}

                <button
                  className="btn-primary"
                  onClick={handleConvert}
                  disabled={!canConvert}
                  style={{ padding: '10px 24px' }}
                >
                  {converting ? 'Converting…' : 'Convert to CSV'}
                </button>

                {converting && (
                  <p style={{ marginTop: '12px', fontSize: '13px', color: 'var(--ink-muted)', lineHeight: '1.5' }}>
                    This may take 60–90 seconds. Please don't close or refresh this page.
                  </p>
                )}
              </>
            )}

            {step === 'done' && (
              <>
                <div className="converter-steps" style={{ marginBottom: '20px' }}>
                  <div className="converter-step done">
                    <svg className="converter-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    Done — {rowCount} rate{rowCount !== 1 ? 's' : ''} extracted.
                  </div>
                </div>

                <div style={{ padding: '12px 14px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', fontSize: '13px', color: '#166534', lineHeight: '1.6', marginBottom: '16px' }}>
                  Before uploading this CSV, open it and compare destination names and rates against your original PDF. Check for missing rows, incorrect values, or destinations that look unfamiliar.
                </div>

                {corrections.length > 0 && (
                  <div style={{ padding: '12px 14px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '8px', fontSize: '13px', color: '#92400e', lineHeight: '1.6', marginBottom: '16px' }}>
                    <div style={{ fontWeight: '600', marginBottom: '6px' }}>Auto-corrected {corrections.length} destination name{corrections.length !== 1 ? 's' : ''}:</div>
                    {corrections.map(c => (
                      <div key={c.original}>{c.original} → {c.corrected}</div>
                    ))}
                  </div>
                )}

                <div className="converter-preview" style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--ink)', marginBottom: '8px' }}>
                    Preview (first 10 rows)
                  </div>
                  <pre>{previewLines}</pre>
                </div>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button className="btn-primary" onClick={handleDownload} style={{ padding: '10px 24px' }}>
                    Download CSV
                  </button>
                  <button
                    onClick={handleReset}
                    style={{ padding: '10px 20px', fontSize: '14px', fontWeight: '500', color: 'var(--ink-muted)', background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer' }}
                  >
                    Convert another
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
