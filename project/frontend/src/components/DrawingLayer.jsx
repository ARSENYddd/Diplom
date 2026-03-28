import { useRef, useState, useEffect, useCallback } from 'react'

/**
 * SVG drawing overlay on top of the chart.
 * When tool === 'cursor' → pointer-events: none (chart works normally).
 * When any drawing tool → captures mouse and draws shapes.
 */
export default function DrawingLayer({ tool, drawings, onDrawingsChange, containerRef }) {
  const svgRef = useRef(null)
  const [preview, setPreview] = useState(null)   // shape being drawn right now
  const [startPt, setStartPt] = useState(null)

  const isDrawing = tool !== 'cursor'

  // Convert mouse event → coordinates relative to the SVG container
  const getCoords = useCallback((e) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }, [])

  const handleMouseDown = useCallback((e) => {
    if (!isDrawing) return
    e.preventDefault()
    const pt = getCoords(e)
    setStartPt(pt)

    if (tool === 'hline') {
      // Horizontal line: place immediately on click
      onDrawingsChange(prev => [...prev, { type: 'hline', y: pt.y, id: Date.now() }])
    } else if (tool === 'vline') {
      onDrawingsChange(prev => [...prev, { type: 'vline', x: pt.x, id: Date.now() }])
    } else {
      setPreview({ type: tool, x1: pt.x, y1: pt.y, x2: pt.x, y2: pt.y })
    }
  }, [tool, isDrawing, getCoords, onDrawingsChange])

  const handleMouseMove = useCallback((e) => {
    if (!isDrawing || !startPt) return
    if (tool === 'hline' || tool === 'vline') return
    const pt = getCoords(e)
    setPreview(prev => prev ? { ...prev, x2: pt.x, y2: pt.y } : null)
  }, [isDrawing, startPt, tool, getCoords])

  const handleMouseUp = useCallback((e) => {
    if (!isDrawing || !startPt || !preview) return
    const pt = getCoords(e)
    // Ignore tiny accidental clicks (< 5px)
    const dist = Math.hypot(pt.x - startPt.x, pt.y - startPt.y)
    if (dist > 5) {
      onDrawingsChange(prev => [...prev, { ...preview, x2: pt.x, y2: pt.y, id: Date.now() }])
    }
    setPreview(null)
    setStartPt(null)
  }, [isDrawing, startPt, preview, getCoords, onDrawingsChange])

  // Cancel drawing on Escape
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') { setPreview(null); setStartPt(null) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const svgW = svgRef.current?.clientWidth  || 0
  const svgH = svgRef.current?.clientHeight || 0

  const renderShape = (s, isPreview = false) => {
    const stroke    = isPreview ? '#fbbf24' : s.type === 'rect' ? '#818cf8' : '#f87171'
    const strokeDash = isPreview ? '6 3' : s.type === 'line' ? '0' : '0'
    const opacity   = isPreview ? 0.7 : 0.9

    switch (s.type) {
      case 'line':
        return (
          <line key={s.id ?? 'preview'}
            x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
            stroke={stroke} strokeWidth={2} strokeDasharray={strokeDash}
            opacity={opacity} strokeLinecap="round"
          />
        )
      case 'hline':
        return (
          <line key={s.id ?? 'preview'}
            x1={0} y1={s.y} x2={svgW} y2={s.y}
            stroke="#34d399" strokeWidth={1.5} strokeDasharray="6 3"
            opacity={opacity}
          />
        )
      case 'vline':
        return (
          <line key={s.id ?? 'preview'}
            x1={s.x} y1={0} x2={s.x} y2={svgH}
            stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="6 3"
            opacity={opacity}
          />
        )
      case 'rect': {
        const x = Math.min(s.x1, s.x2)
        const y = Math.min(s.y1, s.y2)
        const w = Math.abs(s.x2 - s.x1)
        const h = Math.abs(s.y2 - s.y1)
        return (
          <rect key={s.id ?? 'preview'}
            x={x} y={y} width={w} height={h}
            stroke={stroke} strokeWidth={1.5} fill={stroke}
            fillOpacity={0.08} opacity={opacity}
          />
        )
      }
      default: return null
    }
  }

  return (
    <svg
      ref={svgRef}
      style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        pointerEvents: isDrawing ? 'all' : 'none',
        cursor: tool === 'cursor' ? 'default'
              : tool === 'hline'  ? 'row-resize'
              : tool === 'vline'  ? 'col-resize'
              : 'crosshair',
        zIndex: 10,
        userSelect: 'none',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => { setPreview(null); setStartPt(null) }}
    >
      {drawings.map(s => renderShape(s))}
      {preview && renderShape(preview, true)}
    </svg>
  )
}
