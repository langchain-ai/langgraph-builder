import type { Node, NodeProps } from '@xyflow/react'
import { Handle, Position } from '@xyflow/react'
import { useMemo } from 'react'

export type EndNodeData = {
  label: string
  isEdgeMode: boolean
}

export type EndNode = Node<EndNodeData>

export default function EndNode({ data }: NodeProps<EndNode>) {
  const randomBorderColor = useMemo(() => {
    const hue = Math.floor(Math.random() * 360)
    const saturation = 70 + Math.random() * 30
    const lightness = 60 + Math.random() * 20
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`
  }, [])

  return (
    <div
      className=' rounded-3xl p-[0.5px]  '
      style={{ border: `1px solid ${randomBorderColor}`, backgroundColor: randomBorderColor }}
    >
      <div className='p-3 px-8 rounded-3xl' style={{ color: randomBorderColor, backgroundColor: `rgba(26,26,36,0.8)` }}>
        __end__
      </div>
      <Handle
        type='target'
        style={{ width: data.isEdgeMode ? '20px' : '10px', height: data.isEdgeMode ? '20px' : '10px' }}
        position={Position.Top}
      />
    </div>
  )
}
