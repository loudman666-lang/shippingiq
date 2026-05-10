import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import './Blog.css'

export default function Blog() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/posts/index.json')
      .then(r => r.json())
      .then(data => {
        setPosts(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

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

      {/* HEADER */}
      <div className="blog-header">
        <div className="blog-header-inner">
          <div className="blog-label">Blog</div>
          <h1 className="blog-title">Shipping & freight guides<br />for Australian stores</h1>
          <p className="blog-subtitle">Practical advice on WooCommerce shipping setup, carrier rate management, and reducing cart abandonment.</p>
        </div>
      </div>

      {/* POSTS */}
      <div className="blog-content">
        {loading && <p className="blog-loading">Loading posts…</p>}
        {!loading && posts.length === 0 && <p className="blog-loading">No posts yet.</p>}
        {!loading && posts.length > 0 && (
          <div className="blog-list">
            {posts.map(post => (
              <Link to={`/blog/${post.slug}`} key={post.slug} className="blog-card">
                <div className="blog-card-date">{formatDate(post.date)}</div>
                <h2 className="blog-card-title">{post.title}</h2>
                <p className="blog-card-desc">{post.description}</p>
                <span className="blog-card-read">Read article →</span>
              </Link>
            ))}
          </div>
        )}
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
