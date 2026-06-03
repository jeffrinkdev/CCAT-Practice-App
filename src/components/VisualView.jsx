function polygonPoints(sides, cx, cy, radius, rotation = -Math.PI / 2) {
  return Array.from(
    { length: sides },
    (_, index) => {
      const x = cx + radius * Math.cos(rotation + (2 * Math.PI * index) / sides)
      const y = cy + radius * Math.sin(rotation + (2 * Math.PI * index) / sides)
      return `${x},${y}`
    },
  ).join(' ')
}

function BasicShape({ shape, filled, width, height }) {
  const fill = filled ? '#111827' : 'none'
  const stroke = '#111827'

  if (shape === 'circle' || shape === 'oval') {
    return (
      <ellipse
        cx={width / 2}
        cy={height / 2}
        rx={width * 0.28}
        ry={shape === 'oval' ? height * 0.2 : height * 0.28}
        fill={fill}
        stroke={stroke}
        strokeWidth="4"
      />
    )
  }

  if (shape === 'square') {
    return (
      <rect
        x={width * 0.25}
        y={height * 0.25}
        width={width * 0.5}
        height={height * 0.5}
        fill={fill}
        stroke={stroke}
        strokeWidth="4"
      />
    )
  }

  if (shape === 'diamond') {
    return (
      <polygon
        points={`${width / 2},${height * 0.18} ${width * 0.82},${height / 2} ${width / 2},${height * 0.82} ${width * 0.18},${height / 2}`}
        fill={fill}
        stroke={stroke}
        strokeWidth="4"
      />
    )
  }

  if (shape === 'triangle') {
    return (
      <polygon
        points={polygonPoints(3, width / 2, height / 2, Math.min(width, height) * 0.34)}
        fill={fill}
        stroke={stroke}
        strokeWidth="4"
      />
    )
  }

  return (
    <polygon
      points={polygonPoints(5, width / 2, height / 2, Math.min(width, height) * 0.34)}
      fill={fill}
      stroke={stroke}
      strokeWidth="4"
    />
  )
}

function Arrow({ direction, width, height }) {
  const rotation = { N: 0, E: 90, S: 180, W: 270 }[direction] || 0
  return (
    <g transform={`translate(${width / 2} ${height / 2}) rotate(${rotation})`}>
      <line
        x1="0"
        y1={height * 0.25}
        x2="0"
        y2={-height * 0.18}
        stroke="#111827"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <polygon
        points={`0,${-height * 0.34} ${-width * 0.14},${-height * 0.12} ${width * 0.14},${-height * 0.12}`}
        fill="#111827"
      />
    </g>
  )
}

function DotCell({ position, width, height }) {
  const map = {
    tl: [0.25, 0.25],
    tr: [0.75, 0.25],
    br: [0.75, 0.75],
    bl: [0.25, 0.75],
  }
  const point = map[position] || [0.5, 0.5]

  return (
    <>
      <rect x="8" y="8" width={width - 16} height={height - 16} fill="none" stroke="#111827" strokeWidth="3" />
      <circle cx={width * point[0]} cy={height * point[1]} r={Math.min(width, height) * 0.08} fill="#111827" />
    </>
  )
}

function SvgFrame({ width, height, viewBox, children, className = '' }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox={viewBox || `0 0 ${width} ${height}`}
      role="img"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  )
}

function Sequence({ items, labels }) {
  const cellWidth = 110
  const itemHeight = 90
  const labelHeight = labels ? 24 : 0
  const totalWidth = Math.max(cellWidth, items.length * cellWidth)
  const totalHeight = itemHeight + labelHeight

  return (
    <SvgFrame width={totalWidth} height={totalHeight} viewBox={`0 0 ${totalWidth} ${totalHeight}`}>
      {items.map((item, index) => (
        <g key={index} transform={`translate(${index * cellWidth} 0)`}>
          <VisualView visual={item} width={90} height={90} asNested />
          {labels ? (
            <text
              x="45"
              y="108"
              fontSize="13"
              textAnchor="middle"
              fill="#475569"
              fontFamily="system-ui, sans-serif"
            >
              {labels[index] || ''}
            </text>
          ) : null}
        </g>
      ))}
    </SvgFrame>
  )
}

function MatrixSides({ startSides }) {
  return (
    <SvgFrame width={330} height={270} viewBox="0 0 330 270">
      {Array.from({ length: 3 }).map((_, row) =>
        Array.from({ length: 3 }).map((__, col) => {
          const x = col * 110
          const y = row * 90
          const isMissing = row === 2 && col === 2
          return (
            <g key={`${row}-${col}`}>
              <rect x={x + 5} y={y + 5} width="100" height="80" fill="none" stroke="#cbd5e1" />
              {isMissing ? (
                <text x={x + 55} y={y + 52} fontSize="34" textAnchor="middle" fill="#64748b">?</text>
              ) : (
                <polygon
                  points={polygonPoints(startSides + row + col, x + 55, y + 45, 26)}
                  fill="none"
                  stroke="#111827"
                  strokeWidth="3"
                />
              )}
            </g>
          )
        }),
      )}
    </SvgFrame>
  )
}

function ShadingMatrix({ shape }) {
  return (
    <SvgFrame width={330} height={270} viewBox="0 0 330 270">
      {Array.from({ length: 3 }).map((_, row) =>
        Array.from({ length: 3 }).map((__, col) => {
          const x = col * 110
          const y = row * 90
          const isMissing = row === 2 && col === 2
          return (
            <g key={`${row}-${col}`}>
              <rect x={x + 5} y={y + 5} width="100" height="80" fill="none" stroke="#cbd5e1" />
              {isMissing ? (
                <text x={x + 55} y={y + 52} fontSize="34" textAnchor="middle" fill="#64748b">?</text>
              ) : (
                <g transform={`translate(${x + 20} ${y + 10})`}>
                  <BasicShape shape={shape} filled={(row + col) % 2 === 1} width={70} height={70} />
                </g>
              )}
            </g>
          )
        }),
      )}
    </SvgFrame>
  )
}

export default function VisualView({ visual, width = 420, height = 210, asNested = false }) {
  if (!visual) {
    return null
  }

  const kind = visual.kind

  if (kind === 'matrix-sides') {
    return <MatrixSides startSides={visual.startSides || 3} />
  }

  if (kind === 'dot-sequence') {
    return (
      <Sequence
        items={(visual.positions || []).map((position) => ({ kind: 'dot-cell', position }))}
        labels={(visual.positions || []).map((_, index) => `Frame ${index + 1}`)}
      />
    )
  }

  if (kind === 'arrow-sequence') {
    return (
      <Sequence
        items={(visual.directions || []).map((direction) => ({ kind: 'arrow', direction }))}
        labels={(visual.directions || []).map((_, index) => `Frame ${index + 1}`)}
      />
    )
  }

  if (kind === 'odd-one-out') {
    return (
      <Sequence
        items={(visual.items || []).map((item) => ({ kind: 'basic-shape', shape: item.shape, filled: item.filled }))}
        labels={(visual.items || []).map((_, index) => `Figure ${index + 1}`)}
      />
    )
  }

  if (kind === 'shading-matrix') {
    return <ShadingMatrix shape={visual.shape || 'diamond'} />
  }

  const inner = (() => {
    if (kind === 'polygon') {
      return (
        <polygon
          points={polygonPoints(visual.sides || 4, width / 2, height / 2, Math.min(width, height) * 0.34)}
          fill="none"
          stroke="#111827"
          strokeWidth="4"
        />
      )
    }
    if (kind === 'basic-shape') {
      return <BasicShape shape={visual.shape} filled={visual.filled} width={width} height={height} />
    }
    if (kind === 'arrow') {
      return <Arrow direction={visual.direction} width={width} height={height} />
    }
    if (kind === 'dot-cell') {
      return <DotCell position={visual.position} width={width} height={height} />
    }
    return null
  })()

  if (!inner) {
    return null
  }

  return (
    <SvgFrame width={width} height={height} className={asNested ? '' : 'visual-svg'}>
      {inner}
    </SvgFrame>
  )
}