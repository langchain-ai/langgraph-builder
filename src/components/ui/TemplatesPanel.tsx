import { Node, Edge } from '@xyflow/react'
import { MarkerType } from 'reactflow'
import { X } from 'lucide-react'

type Template = {
  id: string
  name: string
  description: string
  nodes: Node[]
  edges: Edge[]
}

const templates: Template[] = [
  {
    id: 'rag',
    name: 'RAG Pipeline',
    description: 'A basic RAG (Retrieval Augmented Generation) pipeline with document retrieval and generation.',
    nodes: [
      { id: 'source', type: 'source', position: { x: 0, y: 0 }, data: { label: 'source' } },
      { id: 'retriever', type: 'custom', position: { x: 0, y: 150 }, data: { label: 'retriever' } },
      { id: 'model_call', type: 'custom', position: { x: 0, y: 300 }, data: { label: 'model_call' } },
      { id: 'end', type: 'end', position: { x: 0, y: 600 }, data: { label: 'end' } },
    ],
    edges: [
      {
        id: 'source->retriever',
        source: 'source',
        target: 'retriever',
        type: 'self-connecting-edge',
        markerEnd: { type: MarkerType.ArrowClosed },
      },
      {
        id: 'retriever->model_call',
        source: 'retriever',
        target: 'model_call',
        type: 'self-connecting-edge',
        markerEnd: { type: MarkerType.ArrowClosed },
      },
      {
        id: 'model_call->end',
        source: 'model_call',
        target: 'end',
        type: 'self-connecting-edge',
        markerEnd: { type: MarkerType.ArrowClosed },
      },
    ],
  },
  {
    id: 'agent',
    name: 'Agent with Tools',
    description: 'An agent that can use different tools based on the input.',
    nodes: [
      { id: 'source', type: 'source', position: { x: 0, y: 0 }, data: { label: 'source' } },
      { id: 'model', type: 'custom', position: { x: 0, y: 150 }, data: { label: 'model' } },
      { id: 'tools', type: 'custom', position: { x: 200, y: 350 }, data: { label: 'tools' } },
      { id: 'end', type: 'end', position: { x: 0, y: 600 }, data: { label: 'end' } },
    ],
    edges: [
      {
        id: 'source->model',
        source: 'source',
        target: 'model',
        type: 'self-connecting-edge',
        markerEnd: { type: MarkerType.ArrowClosed },
      },
      {
        id: 'model->tools',
        source: 'model',
        target: 'tools',
        type: 'self-connecting-edge',
        label: 'route_after_model',
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
      },
      {
        id: 'tools->model',
        source: 'tools',
        target: 'model',
        type: 'self-connecting-edge',
        markerEnd: { type: MarkerType.ArrowClosed },
      },
      {
        id: 'model->end',
        source: 'model',
        target: 'end',
        type: 'self-connecting-edge',
        animated: true,
        label: 'route_after_model',
        markerEnd: { type: MarkerType.ArrowClosed },
      },
    ],
  },
]

interface TemplatesPanelProps {
  onSelectTemplate: (template: Template) => void
  onClose: () => void
}

export default function TemplatesPanel({ onSelectTemplate, onClose }: TemplatesPanelProps) {
  return (
    <div className='fixed left-5 top-20 z-50 w-80 bg-white rounded-lg shadow-xl p-4'>
      <div className='flex justify-between items-center mb-4'>
        <h2 className='text-lg font-semibold'>Templates</h2>
        <button
          onClick={onClose}
          className='font-bold text-gray-400 hover:text-gray-600 transition-colors duration-300 ease-in-out'
        >
          <X size={25} />
        </button>
      </div>
      <div className='space-y-4'>
        {templates.map((template) => (
          <div
            key={template.id}
            className='p-4 border rounded-lg hover:border-[#2F6868] cursor-pointer transition-colors'
            onClick={() => {
              onSelectTemplate(template)
            }}
          >
            <h3 className='font-medium text-gray-900'>{template.name}</h3>
            <p className='text-sm text-gray-600 mt-1'>{template.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export type { Template }
