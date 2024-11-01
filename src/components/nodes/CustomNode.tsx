import { useButtonText } from '@/contexts/ButtonTextContext'
import type { NodeProps, Node as NodeType } from '@xyflow/react'
import { Handle, Position } from '@xyflow/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export type CustomNodeData = {
  label: string
  isEdgeMode: boolean
}

export type CustomNode = NodeType<CustomNodeData>

export function NodeDisplay(props: { children: React.ReactNode; nodeWidth: number }) {
  const randomBorderColor = useMemo(() => {
    const hue = Math.floor(Math.random() * 360)
    const saturation = 70 + Math.random() * 30
    const lightness = 60 + Math.random() * 20
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`
  }, [])

  return (
    <div className='rounded-md p-0 ' style={{ backgroundColor: randomBorderColor, border: 'none' }}>
      <div
        className='rounded-md p-2'
        style={{
          border: `2px solid ${randomBorderColor}`,
          backgroundColor: 'rgba(26,26,36,0.8)',
          width: `${props.nodeWidth}px`,
        }}
      >
        {props.children}
      </div>
    </div>
  )
}

export default function CustomNode({ data, id }: NodeProps<CustomNode>) {
  const { buttonTexts, updateButtonText } = useButtonText()
  const [nodeWidth, setNodeWidth] = useState(150)
  const inputRef = useRef<HTMLInputElement>(null)

  const randomBorderColor = useMemo(() => {
    const hue = Math.floor(Math.random() * 360)
    const saturation = 70 + Math.random() * 30
    const lightness = 60 + Math.random() * 20
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateButtonText(id, e.target.value)
    adjustNodeSize()
  }

  const adjustNodeSize = useCallback(() => {
    if (inputRef.current) {
      const textWidth = inputRef.current.scrollWidth
      const newWidth = Math.max(150, textWidth)
      setNodeWidth(newWidth)
    }
  }, [])

  useEffect(() => {
    updateButtonText(id, data.label)
  }, [])

  useEffect(() => {
    adjustNodeSize()
  }, [buttonTexts[id], adjustNodeSize])

  return (
    <NodeDisplay nodeWidth={nodeWidth}>
      <input
        ref={inputRef}
        type='text'
        className='w-full outline-none rounded-md text-center p-0 text-white'
        value={buttonTexts[id]}
        onChange={handleInputChange}
        style={{
          backgroundColor: 'transparent',
          color: randomBorderColor,
          width: '100%',
        }}
      />
      <Handle
        type='source'
        style={{ width: data.isEdgeMode ? '20px' : '10px', height: data.isEdgeMode ? '20px' : '10px' }}
        position={Position.Bottom}
      />
      <Handle
        type='target'
        style={{ width: data.isEdgeMode ? '20px' : '10px', height: data.isEdgeMode ? '20px' : '10px' }}
        position={Position.Top}
      />
    </NodeDisplay>
  )
}
