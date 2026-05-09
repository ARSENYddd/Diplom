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
    setPath(to)
  }

  return { path, navigate }
}
