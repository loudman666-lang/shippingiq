import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import './Blog.css'

export default function BlogPost() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [html, setHtml] = useState('')
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load index to get metadata for this post
    fetch('/posts/index.json')
      .then(r => r.json())
      .then(posts => {
        const found = posts.find(p => p.slug === slug)
        if (!found) { navigate('/blog'); return }
        setMeta(found)
        // Load the markdown file
        return fetch(`/posts/${slug}.md`)
      })
      .then(r => r && r.text())
      .then(text => {
        if (text) {
          setHtml(parseMarkdown(text))
        }
        setLoading(false)
      })
      .catch(() => { setLoading(false); navigate('/blog') })
  }, [slug, navigate])

  return (
    <div className="blog-page">

      {/* NAV */}
      <nav className="blog-nav">
        <Link to="/" className="blog-nav-logo">
          <span className="blog-nav-dot"></span>
          ShippingIQ
        </Link>
        <div className="blog-nav-actions">
          <Link to="/signin" className="blog-btn-ghost">Sign in</Link>
          <Link to="/signup" className="blog-btn-primary">Start for free</Link>
        </div>
      </nav>

      {/* BACK */}
      <div className="blog-back-bar">
        <Link to="/blog" className="blog-back">← Back to all posts</Link>
      </div>

      {/* ARTICLE */}
      <div className="blog-article-wrap">
        {loading && <p className="blog-loading">Loading…</p>}
        {!loading && meta && (
          <article className="blog-article">
            <div className="blog-article-meta">
              <span className="blog-article-date">{formatDate(meta.date)}</span>
            </div>
            <div
              className="blog-article-body"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </article>
        )}
      </div>

      {/* CTA STRIP */}
      <div className="blog-cta-strip">
        <div className="blog-cta-inner">
          <h3 className="blog-cta-headline">Ready to set up accurate freight calculations?</h3>
          <p className="blog-cta-sub">Upload your carrier rate card and go live at WooCommerce checkout in under an hour.</p>
          <Link to="/signup" className="blog-btn-primary-lg">Start for free</Link>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="blog-footer">
        <Link to="/" className="blog-footer-logo">
          <span className="blog-nav-dot"></span>
          ShippingIQ
        </Link>
        <p className="blog-footer-copy">© 2026 ShippingIQ · Australian-built freight tools for ecommerce</p>
      </footer>

    </div>
  )
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' })
}

// Lightweight markdown parser — handles headings, bold, italic, links, hr, paragraphs
function parseMarkdown(md) {
  const lines = md.split('\n')
  const out = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Headings
    if (/^### /.test(line)) { out.push(`<h3>${inline(line.slice(4))}</h3>`); i++; continue }
    if (/^## /.test(line))  { out.push(`<h2>${inline(line.slice(3))}</h2>`); i++; continue }
    if (/^# /.test(line))   { out.push(`<h1>${inline(line.slice(2))}</h1>`); i++; continue }

    // HR
    if (/^---+$/.test(line.trim())) { out.push('<hr />'); i++; continue }

    // Empty line
    if (line.trim() === '') { i++; continue }

    // Collect paragraph lines
    const para = []
    while (i < lines.length && lines[i].trim() !== '' && !/^#/.test(lines[i]) && !/^---/.test(lines[i].trim())) {
      para.push(lines[i])
      i++
    }
    if (para.length) out.push(`<p>${inline(para.join(' '))}</p>`)
  }

  return out.join('\n')
}

function inline(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
}
