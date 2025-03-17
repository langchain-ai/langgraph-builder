import React, { useEffect, useState, useContext, useLayoutEffect, useRef } from 'react'
import { BaseEdge, EdgeProps, getBezierPath, useReactFlow } from '@xyflow/react'
import { useEdgeLabel } from '@/contexts/EdgeLabelContext'
import { EditingContext } from '@/contexts/EditingContext'
import { createPortal } from 'react-dom'

interface SelfConnectingEdgeProps extends EdgeProps {
  data?: {
    onLabelClick: (id: string) => void
    updateEdgeLabel: (id: string, newLabel: string) => void
    onEdgeUnselect?: (edgeId: string) => void
  }
}

const ColorPicker = ({
  color,
  onChange,
  onClose,
  isAnimated,
  onAnimationToggle,
  edgeId,
}: {
  color: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onClose: (edgeId: string) => void
  isAnimated: boolean
  onAnimationToggle: () => void
  edgeId: string
}) => {
  return createPortal(
    <div className='fixed bottom-5 left-5 z-50' style={{ width: '280px' }}>
      <div className='flex flex-col gap-3 bg-white p-4 rounded-lg shadow-xl'>
        <div className='flex justify-between items-center'>
          <span className='text-sm font-semibold text-gray-800'>Edge Settings</span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onClose(edgeId)
            }}
            className='text-sm bg-slate-800 hover:bg-slate-900 text-slate-100 py-1 px-2 rounded-md'
          >
            Done
          </button>
        </div>
        <div className='relative'>
          <input
            type='color'
            value={color}
            onChange={onChange}
            className='relative w-full h-[80px] cursor-pointer rounded-lg shadow-md ring-1 ring-gray-200'
            onClick={(e) => e.stopPropagation()}
          />
          <div className='mt-2 flex justify-center'>
            <div className='bg-gray-100 px-3 py-1 rounded-full'>
              <code className='text-sm font-mono text-gray-700'>{color.toUpperCase()}</code>
            </div>
          </div>
        </div>
        <div className='flex items-center justify-between mt-2 px-1'>
          <span className='text-sm text-gray-700'>Conditional</span>
          <button
            onClick={onAnimationToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isAnimated ? 'bg-slate-800' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isAnimated ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// Create a context to track which edge is having its color edited
export const ColorEditingContext = React.createContext<{
  activeEdgeId: string | null
  setActiveEdgeId: (id: string | null) => void
}>({
  activeEdgeId: null,
  setActiveEdgeId: () => {},
})

// Provider component to wrap around ReactFlow
export const ColorEditingProvider = ({ children }: { children: React.ReactNode }) => {
  const [activeEdgeId, setActiveEdgeId] = useState<string | null>(null)
  return (
    <ColorEditingContext.Provider value={{ activeEdgeId, setActiveEdgeId }}>{children}</ColorEditingContext.Provider>
  )
}

export default function SelfConnectingEdge(props: SelfConnectingEdgeProps) {
  const { sourceX, sourceY, targetX, targetY, id, markerEnd, source, label, animated } = props
  const { setEdges } = useReactFlow()
  const { edgeLabels, updateEdgeLabel } = useEdgeLabel()
  const [currentLabel, setCurrentLabel] = useState(edgeLabels[source])
  const { editingEdgeId, setEditingEdgeId } = useContext(EditingContext)
  const [labelWidth, setLabelWidth] = useState(130)
  const [edgeColor, setEdgeColor] = useState('#BDBDBD')
  const labelRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement | null>(null)

  const { activeEdgeId, setActiveEdgeId } = useContext(ColorEditingContext)

  const isColorPickerActive = activeEdgeId === id

  // Add a measuring div to the DOM
  useEffect(() => {
    const div = document.createElement('div')
    div.style.position = 'absolute'
    div.style.visibility = 'hidden'
    div.style.whiteSpace = 'nowrap'
    div.style.fontSize = '12px'
    div.style.fontFamily = 'inherit'
    document.body.appendChild(div)
    measureRef.current = div

    return () => {
      if (measureRef.current) {
        document.body.removeChild(measureRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (measureRef.current) {
      const textToMeasure = String(edgeLabels[source] || label || ' ')
      measureRef.current.textContent = textToMeasure
      const width = measureRef.current.offsetWidth
      setLabelWidth(width + 30)
    }
  }, [edgeLabels[source], label, source])

  useEffect(() => {
    setCurrentLabel(edgeLabels[source])
  }, [edgeLabels, source])

  const handleSvgClick = () => {
    setActiveEdgeId(id)
  }

  const handleLabelClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingEdgeId(id)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    setCurrentLabel(e.target.value)
  }

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.stopPropagation()
    updateEdgeLabel(source, currentLabel)

    // Update all edges with the same source in React Flow
    setEdges((eds) =>
      eds.map((edge) => {
        if (edge.source === source) {
          return {
            ...edge,
            label: currentLabel,
          }
        }
        return edge
      }),
    )

    setEditingEdgeId(null)
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation()

    if (e.key === 'Enter') {
      updateEdgeLabel(source, currentLabel)

      // Update all edges with the same source in React Flow
      setEdges((eds) =>
        eds.map((edge) => {
          if (edge.source === source) {
            return {
              ...edge,
              label: currentLabel,
            }
          }
          return edge
        }),
      )

      setEditingEdgeId(null)
    }
    if (e.key === 'Escape') {
      setCurrentLabel(edgeLabels[source] || (label as string))
      setEditingEdgeId(null)
    }
  }

  const handleForeignObjectDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
  }

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEdgeColor(e.target.value)
    // Update edge color in React Flow
    setEdges((eds) =>
      eds.map((edge) => (edge.id === id ? { ...edge, data: { ...edge.data, color: e.target.value } } : edge)),
    )
  }

  const handleAnimationToggle = () => {
    setEdges((eds) => eds.map((edge) => (edge.id === id ? { ...edge, animated: !edge.animated } : edge)))
  }

  if (props.source !== props.target) {
    const [edgePath] = getBezierPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
    })

    // Calculate the true midpoint of the edge
    const midX = (sourceX + targetX) / 2
    const midY = (sourceY + targetY) / 2
    // if normal conditional edge
    return (
      <svg
        className='cursor-pointer'
        onClick={() => handleSvgClick()}
        width='100%'
        height='100%'
        style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'all' }}
        // other svg attributes
      >
        <>
          <defs>
            <marker
              id={`triangle-${id}`}
              markerWidth='5'
              markerHeight='18'
              viewBox='-15 -15 30 30'
              markerUnits='strokeWidth'
              orient='auto-start-reverse'
              refX='0'
              refY='0'
            >
              <path d='M -22.5 -18 L 0 0 L -22.5 18 Z' style={{ fill: edgeColor }} />
            </marker>
          </defs>
          <BaseEdge
            {...props}
            id={id}
            path={edgePath}
            markerEnd={`url(#triangle-${id})`}
            style={{
              stroke: edgeColor,
              strokeWidth: props.selected ? 6 : 3.9,
              transition: 'stroke-width 0.3s ease-in-out',
              filter: props.selected ? 'drop-shadow(0 0 3px rgba(0, 0, 0, 0.3))' : 'none',
            }}
          />
          {isColorPickerActive && (
            <ColorPicker
              color={edgeColor}
              onChange={handleColorChange}
              onClose={(edgeId) => {
                setActiveEdgeId(null)
                props.data?.onEdgeUnselect?.(edgeId)
              }}
              edgeId={id}
              isAnimated={!!animated}
              onAnimationToggle={handleAnimationToggle}
            />
          )}
          {animated &&
            (editingEdgeId === id ? (
              <foreignObject
                style={{
                  overflow: 'visible',
                }}
                x={midX - (labelWidth + 20) / 2}
                y={midY - 17.5}
                width={Math.max(labelWidth, 50)}
                height={35}
                onDoubleClick={handleForeignObjectDoubleClick}
              >
                <input
                  type='text'
                  value={currentLabel}
                  onChange={handleInputChange}
                  onBlur={handleInputBlur}
                  autoFocus
                  onKeyDown={(e) => {
                    e.stopPropagation()
                    handleInputKeyDown(e)
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                  }}
                  onDoubleClick={handleForeignObjectDoubleClick}
                  className={`
                bg-[#F5F5F7] outline-none border border-[#D1D2D9] text-center text-[#333333] w-full h-full text-xs rounded-full
                transition-all duration-500 ease-in-out min-w-[50px]
              `}
                />
              </foreignObject>
            ) : (
              <foreignObject
                style={{
                  overflow: 'visible',
                }}
                x={midX - (labelWidth + 20) / 2}
                y={midY - 17.5}
                width={Math.max(labelWidth, 50)}
                height={35}
                onDoubleClick={handleForeignObjectDoubleClick}
              >
                <div
                  onClick={(e) => {
                    e.stopPropagation()
                    handleLabelClick(e)
                  }}
                  onDoubleClick={handleForeignObjectDoubleClick}
                  className={`
                bg-[#F5F5F7] border border-[#D1D2D9] 
                flex items-center justify-center text-center 
                text-[#333333] h-full text-xs rounded-full
                w-full transition-all duration-500 ease-in-out min-w-[50px]
              `}
                >
                  <span
                    ref={labelRef}
                    className='whitespace-nowrap text-center transition-all duration-500 ease-in-out min-w-[25px]'
                  >
                    {edgeLabels[source] || label || ' '}
                  </span>
                </div>
              </foreignObject>
            ))}
        </>
      </svg>
    )
  }

  const edgePath = `M ${sourceX} ${sourceY} A 60 60 0 1 0 ${targetX} ${targetY}`
  // if cycle
  return (
    <svg
      className='cursor-pointer'
      onClick={() => handleSvgClick()}
      width='100%'
      height='100%'
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'all' }}
    >
      <>
        <defs>
          <marker
            id={`triangle-cycle-${id}`}
            markerWidth='5'
            markerHeight='18'
            viewBox='-15 -15 30 30'
            markerUnits='strokeWidth'
            orient='auto-start-reverse'
            refX='0'
            refY='0'
          >
            <path d='M -22.5 -18 L 0 0 L -22.5 18 Z' style={{ fill: edgeColor }} />
          </marker>
        </defs>
        <BaseEdge
          path={edgePath}
          markerEnd={`url(#triangle-cycle-${id})`}
          style={{
            stroke: edgeColor,
            strokeWidth: props.selected ? 6 : 3.9,
            transition: 'stroke-width 0.3s ease-in-out',
            filter: props.selected ? 'drop-shadow(0 0 3px rgba(0, 0, 0, 0.3))' : 'none',
          }}
        />
        {isColorPickerActive && (
          <ColorPicker
            color={edgeColor}
            onChange={handleColorChange}
            onClose={(edgeId) => {
              setActiveEdgeId(null)
              props.data?.onEdgeUnselect?.(edgeId)
            }}
            edgeId={id}
            isAnimated={!!animated}
            onAnimationToggle={handleAnimationToggle}
          />
        )}
        {animated &&
          (editingEdgeId === id ? (
            <foreignObject
              style={{
                overflow: 'visible',
              }}
              x={sourceX}
              y={sourceY}
              width={Math.max(labelWidth, 50)}
              height={35}
              onDoubleClick={handleForeignObjectDoubleClick}
            >
              <input
                type='text'
                value={currentLabel}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                onKeyDown={(e) => {
                  e.stopPropagation()
                  handleInputKeyDown(e)
                }}
                onClick={(e) => {
                  e.stopPropagation()
                }}
                onDoubleClick={handleForeignObjectDoubleClick}
                autoFocus
                className={`
                bg-[#F5F5F7] outline-none border border-[#D1D2D9] text-center w-full h-full text-xs text-[#333333] rounded-full
                transition-all duration-500 ease-in-out min-w-[50px]
              `}
              />
            </foreignObject>
          ) : (
            <foreignObject
              style={{
                overflow: 'visible',
              }}
              x={sourceX}
              y={sourceY}
              width={Math.max(labelWidth, 50)}
              height={35}
              onDoubleClick={handleForeignObjectDoubleClick}
            >
              <div
                onClick={(e) => {
                  e.stopPropagation()
                  handleLabelClick(e)
                }}
                onDoubleClick={handleForeignObjectDoubleClick}
                className={`
                bg-[#F5F5F7] border border-[#D1D2D9] 
                flex items-center justify-center text-center 
                text-[#333333] h-full text-xs rounded-full
                w-full transition-all duration-500 ease-in-out min-w-[50px]
              `}
              >
                <span
                  ref={labelRef}
                  className='whitespace-nowrap text-center transition-all duration-500 ease-in-out min-w-[25px]'
                >
                  {edgeLabels[source] || label || ' '}
                </span>
              </div>
            </foreignObject>
          ))}
      </>
    </svg>
  )
}
