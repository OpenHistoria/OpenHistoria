"use client"

interface MiniSparklineProps {
  values: readonly number[]
  /** Tailwind text colour class controlling the polyline stroke. */
  className?: string
  /** Lower/upper bound when min/max should be fixed (e.g. 0..100). */
  min?: number
  max?: number
  width?: number
  height?: number
}

/**
 * Tiny inline SVG sparkline. ~No internal layout cost; pass a coloured
 * className to control the stroke (uses `currentColor`).
 */
export function MiniSparkline({
  values,
  className,
  min,
  max,
  width = 48,
  height = 12,
}: MiniSparklineProps) {
  if (values.length < 2) return null
  const computedMin = min ?? Math.min(...values)
  const computedMax = max ?? Math.max(...values)
  const range = computedMax - computedMin || 1
  const stepX = width / (values.length - 1)
  const points = values
    .map((v, i) => {
      const x = i * stepX
      const y = height - ((v - computedMin) / range) * height
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(" ")
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={className}
      preserveAspectRatio="none"
      aria-hidden
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth={1}
        points={points}
      />
    </svg>
  )
}
