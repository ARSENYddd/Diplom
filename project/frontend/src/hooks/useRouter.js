import { useState, useEffect } from 'react'

export function useRouter() {
  const [path, setPath] = useState(() => window.location.pathname)

  useEffect(() => {
    const handler = () => setPath(window.location.pathname)
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [])

  const navigate = (to) => {
    window.history.pushState(null, '', to)
    // Dispatch synthetic popstate so ALL useRouter instances update
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  return { path, navigate }
}
