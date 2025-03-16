'use client'
import type { Node } from '@xyflow/react'
import { useCallback, useState, useRef, useEffect } from 'react'
import {
  Background,
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  OnConnectStart,
  type OnConnect,
  applyNodeChanges,
  type Edge,
} from '@xyflow/react'
import { MarkerType } from 'reactflow'
import '@xyflow/react/dist/style.css'
import { initialNodes, nodeTypes, type CustomNodeType } from './nodes'
import { initialEdges, edgeTypes, type CustomEdgeType } from './edges'
import { useButtonText } from '@/contexts/ButtonTextContext'
import { useEdgeLabel } from '@/contexts/EdgeLabelContext'
import { Modal as MuiModal, ModalDialog, Tooltip, Snackbar } from '@mui/joy'
import { X, Copy, Info, Check, Download } from 'lucide-react'
import { Highlight, themes } from 'prism-react-renderer'
import MultiButton from './ui/multibutton'
import GenericModal from './GenericModal'
import { ColorEditingProvider } from './edges/SelfConnectingEdge'
import JSZip from 'jszip'
import TemplatesPanel, { type Template } from './ui/TemplatesPanel'

// Loading spinner component
const LoadingSpinner = () => (
  <div className='flex items-center justify-center'>
    <div className='w-12 h-12 border-4 border-[#2F6868] border-t-transparent rounded-full animate-spin'></div>
  </div>
)

type OnboardingStep = {
  key: string
  type: 'modal' | 'tooltip'
  title?: string
  content: string | JSX.Element
  buttonText?: string
  imageUrl?: string
  placement?: TooltipPlacement
  targetNodeId?: string
  tooltipOffset?: { x: number; y: number }
  nodes?: Node[]
  edges?: Edge[]
  position?: {
    top?: string
    right?: string
    bottom?: string
    left?: string
  }
  className?: string
}

type TooltipPlacement =
  | 'top'
  | 'left'
  | 'bottom'
  | 'right'
  | 'bottom-end'
  | 'bottom-start'
  | 'left-end'
  | 'left-start'
  | 'right-end'
  | 'right-start'
  | 'top-end'
  | 'top-start'

export default function App() {
  const proOptions = { hideAttribution: true }
  const [nodes, setNodes, onNodesChange] = useNodesState<CustomNodeType>(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState<CustomEdgeType>(initialEdges)
  const [generateCodeModalOpen, setGenerateCodeModalOpen] = useState(false)
  const [showOnboardingToast, setShowOnboardingToast] = useState(false)
  const reactFlowWrapper = useRef<any>(null)
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const { buttonTexts } = useButtonText()
  const [maxNodeLength, setMaxNodeLength] = useState(0)
  const [maxEdgeLength, setMaxEdgeLength] = useState(0)
  const [conditionalGroupCount, setConditionalGroupCount] = useState(0)
  const { edgeLabels, updateEdgeLabel } = useEdgeLabel()
  const [activeFile, setActiveFile] = useState<'stub' | 'implementation' | 'spec'>('stub')
  const [generatedFiles, setGeneratedFiles] = useState<{
    python?: { stub?: string; implementation?: string }
    typescript?: { stub?: string; implementation?: string }
  }>({})
  const [language, setLanguage] = useState<'python' | 'typescript'>('python')
  const [initialOnboardingComplete, setInitialOnboardingComplete] = useState<boolean | null>(null)
  const [currentOnboardingStep, setCurrentOnboardingStep] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [infoPanelOpen, setInfoPanelOpen] = useState(false)
  const [justCopied, setJustCopied] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [generatedYamlSpec, setGeneratedYamlSpec] = useState<string>('')
  const [isTemplatesPanelOpen, setIsTemplatesPanelOpen] = useState(false)

  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()

    window.addEventListener('resize', checkMobile)

    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const MockColorPicker = () => (
    <div
      className={`fixed bottom-5 cursor-disabled left-5 z-50 ${!initialOnboardingComplete ? 'cursor-not-allowed' : ''}`}
      style={{ width: '280px' }}
    >
      <div className='flex flex-col gap-3 bg-white p-4 rounded-lg shadow-xl'>
        <div className='flex justify-between items-center'>
          <span className='text-sm font-semibold text-gray-800'>Set edge color</span>
          <button
            disabled
            className='text-sm cursor-not-allowed bg-slate-800 hover:bg-slate-900 text-slate-100 py-1 px-2 rounded-md'
          >
            Done
          </button>
        </div>
        <div className='relative'>
          <div className='relative cursor-not-allowed w-full h-[80px] rounded-lg shadow-md ring-1 ring-gray-200 bg-gray-100'></div>
          <div className='mt-2 flex justify-center'>
            <div className='bg-gray-100 px-3 py-1 rounded-full'>
              <code className='text-sm font-mono text-gray-700'>#BDBDBD</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const hasValidSourceToEndPath = useCallback(() => {
    if (!edges.length) return false

    const sourceNode = nodes.find((node) => node.type === 'source')
    const endNode = nodes.find((node) => node.type === 'end')

    if (!sourceNode || !endNode) return false

    const hasSourceEdge = edges.some((edge) => edge.source === sourceNode.id)
    const hasEndEdge = edges.some((edge) => edge.target === endNode.id)

    return hasSourceEdge && hasEndEdge
  }, [nodes, edges])

  useEffect(() => {
    nodesRef.current = nodes
    edgesRef.current = edges
  }, [nodes, edges])

  useEffect(() => {
    const initialComplete = localStorage.getItem('initialOnboardingComplete')
    setInitialOnboardingComplete(initialComplete === 'true' ? true : false)
  }, [])

  const onboardingSteps: OnboardingStep[] = [
    {
      key: 'tooltip0',
      type: 'modal',
      placement: 'top' as TooltipPlacement,
      title: 'Graph Builder',
      content: (
        <span>Let's get started with a quick onboarding! During onboarding, canvas interaction will be disabled</span>
      ),
      buttonText: 'Start',
      imageUrl: '/langgraph-logo.png',
    },
    {
      key: 'tooltip1',
      type: 'tooltip',
      placement: 'left' as TooltipPlacement,
      title: '1 of 7: How to create a node',
      content: '⌘ + click anywhere on the canvas to create a node. Nodes can have custom labels',
      targetNodeId: 'custom1',
      tooltipOffset: { x: 0, y: 0 },
      nodes: [
        { id: 'source', type: 'source', position: { x: 0, y: 0 }, data: { label: 'source' } },
        { id: 'end', type: 'end', position: { x: 0, y: 600 }, data: { label: 'end' } },
        { id: 'custom1', type: 'custom', position: { x: 0, y: 200 }, data: { label: 'Supervisor' } },
      ],
    },
    {
      key: 'tooltip2',
      type: 'tooltip',
      placement: 'left' as TooltipPlacement,
      title: '2 of 7: How to create an edge',
      content: 'Connect two nodes by dragging from the bottom of one node to the top of another',
      targetNodeId: 'custom1',
      tooltipOffset: { x: 0, y: -120 },
      nodes: [
        { id: 'source', type: 'source', position: { x: 0, y: 0 }, data: { label: 'source' } },
        { id: 'end', type: 'end', position: { x: 0, y: 600 }, data: { label: 'end' } },
        { id: 'custom1', type: 'custom', position: { x: 0, y: 200 }, data: { label: 'Supervisor' } },
      ],
      edges: [
        { id: 'source->custom1', source: 'source', target: 'custom1', markerEnd: { type: MarkerType.ArrowClosed } },
      ],
    },
    {
      key: 'tooltip3',
      type: 'tooltip',
      placement: 'right' as TooltipPlacement,
      title: '3 of 7: How to create a conditional edge',
      content:
        'Connect one node to multiple nodes to create a conditional edge. Conditional edges can have custom labels',
      targetNodeId: 'custom1',
      tooltipOffset: { x: 10, y: 0 },
      nodes: [
        { id: 'source', type: 'source', position: { x: 0, y: 0 }, data: { label: 'source' } },
        { id: 'end', type: 'end', position: { x: 0, y: 600 }, data: { label: 'end' } },
        { id: 'custom1', type: 'custom', position: { x: 0, y: 200 }, data: { label: 'Supervisor' } },
        { id: 'custom2', type: 'custom', position: { x: isMobile ? -120 : -200, y: 350 }, data: { label: 'RAG' } },
        { id: 'custom3', type: 'custom', position: { x: isMobile ? 120 : 200, y: 350 }, data: { label: 'Web Search' } },
      ],
      edges: [
        { id: 'source->custom1', source: 'source', target: 'custom1', markerEnd: { type: MarkerType.ArrowClosed } },
        {
          id: 'custom1->custom2',
          source: 'custom1',
          target: 'custom2',
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed },
          type: 'self-connecting-edge',
          label: 'conditional_edge_1',
        },
        {
          id: 'custom1->custom3',
          source: 'custom1',
          target: 'custom3',
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed },
          type: 'self-connecting-edge',
          label: 'conditional_edge_1',
        },
        { id: 'custom2->end', source: 'custom2', target: 'end', markerEnd: { type: MarkerType.ArrowClosed } },
        { id: 'custom3->end', source: 'custom3', target: 'end', markerEnd: { type: MarkerType.ArrowClosed } },
      ],
    },
    {
      key: 'tooltip4',
      type: 'tooltip',
      placement: 'left' as TooltipPlacement,
      title: '4 of 7: How to create a cycle',
      content: 'Create a loop by dragging from the bottom of one node to the top of itself',
      targetNodeId: 'custom3',
      tooltipOffset: { x: -10, y: 0 },
      nodes: [
        { id: 'source', type: 'source', position: { x: 0, y: 0 }, data: { label: 'source' } },
        { id: 'end', type: 'end', position: { x: 0, y: 600 }, data: { label: 'end' } },
        { id: 'custom1', type: 'custom', position: { x: 0, y: 200 }, data: { label: 'Supervisor' } },
        { id: 'custom2', type: 'custom', position: { x: isMobile ? -120 : -200, y: 350 }, data: { label: 'RAG' } },
        { id: 'custom3', type: 'custom', position: { x: isMobile ? 120 : 200, y: 350 }, data: { label: 'Web Search' } },
      ],
      edges: [
        { id: 'source->custom1', source: 'source', target: 'custom1', markerEnd: { type: MarkerType.ArrowClosed } },
        {
          id: 'custom1->custom2',
          source: 'custom1',
          target: 'custom2',
          animated: true,
          label: 'conditional_edge_1',
          markerEnd: { type: MarkerType.ArrowClosed },
          type: 'self-connecting-edge',
        },
        {
          id: 'custom1->custom3',
          source: 'custom1',
          target: 'custom3',
          animated: true,
          label: 'conditional_edge_1',
          markerEnd: { type: MarkerType.ArrowClosed },
          type: 'self-connecting-edge',
        },
        { id: 'custom2->end', source: 'custom2', target: 'end', markerEnd: { type: MarkerType.ArrowClosed } },
        {
          id: 'custom3->end',
          source: 'custom3',
          animated: true,
          label: 'conditional_edge_2',
          target: 'end',
          type: 'self-connecting-edge',
          markerEnd: { type: MarkerType.ArrowClosed },
        },
        {
          id: 'custom1->custom1',
          source: 'custom3',
          target: 'custom3',
          animated: true,
          label: 'conditional_edge_2',
          type: 'self-connecting-edge',
          markerEnd: { type: MarkerType.ArrowClosed },
        },
      ],
    },
    {
      key: 'tooltip5',
      type: 'tooltip',
      placement: 'left' as TooltipPlacement,
      title: '5 of 7: Edge colors',
      content:
        'You can click on an edge and give it a color. This helps distinguish between different edges on the graph',
      targetNodeId: 'custom1',
      tooltipOffset: { x: 0, y: 0 },
      nodes: [
        { id: 'source', type: 'source', position: { x: 0, y: 0 }, data: { label: 'source' } },
        { id: 'end', type: 'end', position: { x: 0, y: 600 }, data: { label: 'end' } },
        { id: 'custom1', type: 'custom', position: { x: 0, y: 200 }, data: { label: 'Supervisor' } },
        { id: 'custom2', type: 'custom', position: { x: isMobile ? -120 : -200, y: 350 }, data: { label: 'RAG' } },
        { id: 'custom3', type: 'custom', position: { x: isMobile ? 120 : 200, y: 350 }, data: { label: 'Web Search' } },
      ],
      edges: [
        { id: 'source->custom1', source: 'source', target: 'custom1', markerEnd: { type: MarkerType.ArrowClosed } },
        {
          id: 'custom1->custom2',
          source: 'custom1',
          target: 'custom2',
          animated: true,
          label: 'conditional_edge_1',
          markerEnd: { type: MarkerType.ArrowClosed },
          type: 'self-connecting-edge',
        },
        {
          id: 'custom1->custom3',
          source: 'custom1',
          target: 'custom3',
          animated: true,
          label: 'conditional_edge_1',
          markerEnd: { type: MarkerType.ArrowClosed },
          type: 'self-connecting-edge',
        },
        {
          id: 'custom2->end',
          source: 'custom2',
          target: 'end',
          markerEnd: { type: MarkerType.ArrowClosed },
        },
        {
          id: 'custom3->end',
          source: 'custom3',
          animated: true,
          label: 'conditional_edge_2',
          type: 'self-connecting-edge',
          target: 'end',
          markerEnd: { type: MarkerType.ArrowClosed },
        },
        {
          id: 'custom1->custom1',
          source: 'custom3',
          target: 'custom3',
          animated: true,
          label: 'conditional_edge_2',
          type: 'self-connecting-edge',
          markerEnd: { type: MarkerType.ArrowClosed },
        },
      ],
    },
    {
      key: 'tooltip6',
      type: 'tooltip',
      placement: 'left' as TooltipPlacement,
      title: '6 of 7: Delete a node or edge',
      content: 'To delete a node or edge, click on it and press backspace',
      targetNodeId: 'custom1',
      tooltipOffset: { x: 0, y: 0 },
      nodes: [
        { id: 'source', type: 'source', position: { x: 0, y: 0 }, data: { label: 'source' } },
        { id: 'end', type: 'end', position: { x: 0, y: 600 }, data: { label: 'end' } },
        { id: 'custom1', type: 'custom', position: { x: 0, y: 200 }, data: { label: 'Supervisor' } },
        { id: 'custom2', type: 'custom', position: { x: isMobile ? -120 : -200, y: 350 }, data: { label: 'RAG' } },
        { id: 'custom3', type: 'custom', position: { x: isMobile ? 120 : 200, y: 350 }, data: { label: 'Web Search' } },
      ],
      edges: [
        { id: 'source->custom1', source: 'source', target: 'custom1', markerEnd: { type: MarkerType.ArrowClosed } },
        {
          id: 'custom1->custom2',
          source: 'custom1',
          target: 'custom2',
          animated: true,
          label: 'conditional_edge_1',
          markerEnd: { type: MarkerType.ArrowClosed },
          type: 'self-connecting-edge',
        },
        {
          id: 'custom1->custom3',
          source: 'custom1',
          target: 'custom3',
          animated: true,
          label: 'conditional_edge_1',
          markerEnd: { type: MarkerType.ArrowClosed },
          type: 'self-connecting-edge',
        },
        { id: 'custom2->end', source: 'custom2', target: 'end', markerEnd: { type: MarkerType.ArrowClosed } },
        {
          id: 'custom3->end',
          source: 'custom3',
          target: 'end',
          animated: true,
          label: 'conditional_edge_2',
          type: 'self-connecting-edge',
          markerEnd: { type: MarkerType.ArrowClosed },
        },
        {
          id: 'custom1->custom1',
          source: 'custom3',
          target: 'custom3',
          animated: true,
          label: 'conditional_edge_2',
          type: 'self-connecting-edge',
          markerEnd: { type: MarkerType.ArrowClosed },
        },
      ],
    },
    {
      key: 'tooltip7',
      type: 'tooltip',
      title: '7 of 7: Generate Code',
      content:
        "Once you're finished designing the graph, you can generate boilerplate code for it in Python and TypeScript",
      position: {
        top: '100px',
        right: '10px',
      },
      placement: 'bottom',
      nodes: [
        { id: 'source', type: 'source', position: { x: 0, y: 0 }, data: { label: 'source' } },
        { id: 'end', type: 'end', position: { x: 0, y: 600 }, data: { label: 'end' } },
        { id: 'custom1', type: 'custom', position: { x: 0, y: 200 }, data: { label: 'Supervisor' } },
        { id: 'custom2', type: 'custom', position: { x: isMobile ? -120 : -200, y: 350 }, data: { label: 'RAG' } },
        { id: 'custom3', type: 'custom', position: { x: isMobile ? 120 : 200, y: 350 }, data: { label: 'Web Search' } },
      ],
      edges: [
        { id: 'source->custom1', source: 'source', target: 'custom1', markerEnd: { type: MarkerType.ArrowClosed } },
        {
          id: 'custom1->custom2',
          source: 'custom1',
          target: 'custom2',
          animated: true,
          label: 'conditional_edge_1',
          markerEnd: { type: MarkerType.ArrowClosed },
          type: 'self-connecting-edge',
        },
        {
          id: 'custom1->custom3',
          source: 'custom1',
          target: 'custom3',
          animated: true,
          label: 'conditional_edge_1',
          markerEnd: { type: MarkerType.ArrowClosed },
          type: 'self-connecting-edge',
        },
        { id: 'custom2->end', source: 'custom2', target: 'end', markerEnd: { type: MarkerType.ArrowClosed } },
        {
          id: 'custom3->end',
          source: 'custom3',
          animated: true,
          label: 'conditional_edge_2',
          type: 'self-connecting-edge',
          target: 'end',
          markerEnd: { type: MarkerType.ArrowClosed },
        },
        {
          id: 'custom1->custom1',
          source: 'custom3',
          target: 'custom3',
          animated: true,
          label: 'conditional_edge_2',
          type: 'self-connecting-edge',
          markerEnd: { type: MarkerType.ArrowClosed },
        },
      ],
    },
    {
      key: 'tooltip8',
      type: 'modal',
      placement: 'top' as TooltipPlacement,
      title: "You're ready!",
      content: <span>Onboarding complete. Happy building!</span>,
      buttonText: 'Start',
      imageUrl: '/langgraph-logo.png',
    },
  ]

  const handleOnboardingNext = () => {
    if (currentOnboardingStep === onboardingSteps.length - 1) {
      localStorage.setItem('initialOnboardingComplete', 'true')
      setInitialOnboardingComplete(true)
    } else {
      if (currentOnboardingStep === onboardingSteps.length - 2) {
        setNodes(initialNodes)
        setEdges(initialEdges)
      }
      setCurrentOnboardingStep((prev) => prev + 1)
    }
  }

  const handleNodesChange = useCallback(
    (changes: any) => {
      onNodesChange(changes)
    },
    [onNodesChange],
  )

  const handleEdgesChange = useCallback(
    (changes: any) => {
      onEdgesChange(changes)
    },
    [onEdgesChange],
  )

  const onConnectStart: OnConnectStart = useCallback(() => {
    setIsConnecting(true)
  }, [nodes, setIsConnecting])

  const onConnect: OnConnect = useCallback(
    (connection) => {
      const edgeId = `edge-${maxEdgeLength + 1}`
      setMaxEdgeLength((prev) => prev + 1)

      const existingSourceEdges = edges.filter((edge) => edge.source === connection.source)
      let defaultLabel = 'conditional_edge'
      let newCount = conditionalGroupCount

      if (existingSourceEdges.length > 0) {
        // Check if there's a template edge label we should preserve
        const templateLabel = existingSourceEdges[0].label?.toString()
        if (templateLabel && !templateLabel.startsWith('conditional_edge')) {
          defaultLabel = templateLabel
        } else {
          const hasAnimatedEdges = existingSourceEdges.some((edge) => edge.animated)
          if (!hasAnimatedEdges) {
            newCount = conditionalGroupCount + 1
            setConditionalGroupCount(newCount)
          }
          defaultLabel = `conditional_edge_${newCount}`
        }
      }

      const newEdge: CustomEdgeType = {
        ...connection,
        id: edgeId,
        markerEnd: { type: MarkerType.ArrowClosed },
        type: 'self-connecting-edge',
        animated: connection.source === connection.target,
        label: defaultLabel,
      }

      setEdges((prevEdges) => {
        const updatedEdges = addEdge(newEdge, prevEdges)
        const sourceEdges = updatedEdges.filter((edge) => edge.source === connection.source)
        if (sourceEdges.length > 1) {
          return updatedEdges.map((edge) =>
            edge.source === connection.source
              ? {
                  ...edge,
                  animated: true,
                  label: defaultLabel,
                }
              : edge,
          )
        }
        return updatedEdges
      })
      setIsConnecting(false)
    },
    [setEdges, edges, conditionalGroupCount, buttonTexts, updateEdgeLabel, edgeLabels, maxEdgeLength],
  )

  const addNode = useCallback(
    (event: React.MouseEvent) => {
      if (isConnecting) {
        setIsConnecting(false)
        return
      }

      if (reactFlowWrapper) {
        const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect()

        const position = reactFlowInstance.screenToFlowPosition({
          x: event.clientX - reactFlowBounds.left,
          y: event.clientY - reactFlowBounds.top,
        })

        const newNode: CustomNodeType = {
          id: `node-${maxNodeLength + 1}`,
          type: 'custom',
          position,
          selected: true,
          data: { label: `Node ${maxNodeLength + 1}` },
        }
        setMaxNodeLength(maxNodeLength + 1)

        setNodes((prevNodes) => {
          return applyNodeChanges(
            [
              {
                type: 'add',
                item: newNode,
              },
            ],
            prevNodes,
          )
        })
      }
    },
    [nodes, setNodes, reactFlowInstance, reactFlowWrapper, isConnecting, applyNodeChanges, maxNodeLength],
  )

  const handlePaneClick = useCallback(
    (event: React.MouseEvent) => {
      const isCmdOrCtrlPressed = event.metaKey || event.ctrlKey
      if (isCmdOrCtrlPressed) {
        if (initialOnboardingComplete === false) {
          setShowOnboardingToast(true)
          setTimeout(() => setShowOnboardingToast(false), 3000)
          return
        }
        addNode(event)
      }
    },
    [addNode, initialOnboardingComplete],
  )

  const onEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      const isCmdOrCtrlPressed = event.metaKey || event.ctrlKey
      if (isCmdOrCtrlPressed) {
        setEdges((eds) => eds.map((e) => (e.id === edge.id ? { ...e, animated: !e.animated } : e)))
      }
    },
    [setEdges],
  )

  const flowNodes =
    !initialOnboardingComplete &&
    currentOnboardingStep < onboardingSteps.length &&
    onboardingSteps[currentOnboardingStep].nodes
      ? onboardingSteps[currentOnboardingStep].nodes
      : nodes

  const flowEdges =
    !initialOnboardingComplete &&
    currentOnboardingStep < onboardingSteps.length &&
    onboardingSteps[currentOnboardingStep].edges
      ? onboardingSteps[currentOnboardingStep].edges
      : edges

  function generateSpec(edges: any, currentLanguage: 'python' | 'typescript' = language): string {
    // Step 1: Separate normal edges and animated edges
    const normalEdges: any[] = edges.filter((edge: any) => !edge.animated)
    const animatedEdges: any[] = edges.filter((edge: any) => edge.animated === true)

    // Step 2: Group animated edges by source
    const animatedEdgesBySource: Record<string, Edge[]> = {}
    animatedEdges.forEach((edge) => {
      if (!animatedEdgesBySource[edge.source]) {
        animatedEdgesBySource[edge.source] = []
      }
      animatedEdgesBySource[edge.source].push(edge)
    })

    // Step 3: Build nodes list (unique nodes from all edges, excluding source and end nodes)
    const nodeNames: Set<string> = new Set()
    edges.forEach((edge: any) => {
      const sourceNode = nodes.find((n) => n.id === edge.source)
      const targetNode = nodes.find((n) => n.id === edge.target)

      // Only add nodes that aren't source or end nodes
      if (sourceNode && sourceNode.type !== 'source' && sourceNode.type !== 'end' && sourceNode.data?.label) {
        nodeNames.add(sourceNode.data.label as string)
      }
      if (targetNode && targetNode.type !== 'source' && targetNode.type !== 'end' && targetNode.data?.label) {
        nodeNames.add(targetNode.data.label as string)
      }
    })

    // Step 4: Build YAML structure with special handling for source/end connections
    const yaml = {
      name: 'CustomAgent',
      nodes: Array.from(nodeNames).map((name) => ({ name })),
      edges: [
        // Handle source node connections (convert to __start__)
        ...normalEdges
          .filter((edge) => {
            const sourceNode = nodes.find((n) => n.id === edge.source)
            return sourceNode?.type === 'source'
          })
          .map((edge) => {
            const targetNode = nodes.find((n) => n.id === edge.target)
            return {
              from: '__start__',
              to: targetNode?.data?.label || '',
            }
          }),

        // Handle end node connections (convert to __end__)
        ...normalEdges
          .filter((edge) => {
            const targetNode = nodes.find((n) => n.id === edge.target)
            return targetNode?.type === 'end'
          })
          .map((edge) => {
            const sourceNode = nodes.find((n) => n.id === edge.source)
            return {
              from: sourceNode?.data?.label || '',
              to: '__end__',
            }
          }),

        // Handle normal edges between custom nodes
        ...normalEdges
          .filter((edge) => {
            const sourceNode = nodes.find((n) => n.id === edge.source)
            const targetNode = nodes.find((n) => n.id === edge.target)
            return sourceNode?.type !== 'source' && targetNode?.type !== 'end'
          })
          .map((edge) => {
            const sourceNode = nodes.find((n) => n.id === edge.source)
            const targetNode = nodes.find((n) => n.id === edge.target)
            return {
              from: sourceNode?.data?.label || '',
              to: targetNode?.data?.label || '',
            }
          }),

        // Handle conditional edges
        ...Object.entries(animatedEdgesBySource).map(([source, edges]) => {
          const sourceNode = nodes.find((n) => n.id === source)
          // If source is the source node, use __start__ instead
          const fromNode = sourceNode?.type === 'source' ? '__start__' : sourceNode?.data?.label || ''
          return {
            from: fromNode,
            condition: String(edges[0].label || ''),
            paths: edges.map((edge) => {
              const targetNode = nodes.find((n) => n.id === edge.target)
              // If target is the end node, use __end__ instead
              return targetNode?.type === 'end' ? '__end__' : targetNode?.data?.label || ''
            }),
          }
        }),
      ],
    }

    // Convert to YAML string
    const yamlString = Object.entries(yaml)
      .map(([key, value]) => {
        if (key === 'nodes') {
          // @ts-ignore
          return `${key}:\n${value.map((node: any) => `  - name: ${node.name}`).join('\n')}`
        }
        if (key === 'edges') {
          return `${key}:\n${value
            // @ts-ignore
            .map((edge: any) => {
              if ('condition' in edge) {
                return `  - from: ${edge.from}\n    condition: ${edge.condition}\n    paths: [${edge.paths.join(', ')}]`
              }
              return `  - from: ${edge.from}\n    to: ${edge.to}`
            })
            .join('\n')}`
        }
        return `${key}: ${value}`
      })
      .join('\n')
    console.log(yamlString, 'yaml string')

    // Add descriptive comment at the top
    const fileExt = currentLanguage === 'python' ? '.py' : '.ts'
    const comment = `# This YAML was auto-generated based on an architecture 
# designed in LangGraph Builder (https://build.langchain.com).
#
# The YAML was used by langgraph-gen (https://github.com/langchain-ai/langgraph-gen-py) 
# to generate a code stub for a LangGraph application that follows the architecture.
#
# langgraph-gen is an open source CLI tool that converts YAML specifications into LangGraph code stubs.
#
# The code stub generated from this YAML can be found in stub${fileExt}.
#
# A placeholder implementation for the generated stub can be found in implementation${fileExt}.

`

    return comment + yamlString
  }

  const handleLanguageChange = async (option: string) => {
    const newLanguage = option.toLowerCase() as 'python' | 'typescript'
    setLanguage(newLanguage)
    // Update the YAML spec with new file extensions when language changes
    setGeneratedYamlSpec(generateSpec(edges, newLanguage))
  }

  const generateCodeWithLanguage = async (lang: 'python' | 'typescript' = language) => {
    try {
      setIsLoading(true)
      setGenerateCodeModalOpen(true)
      const spec = generateSpec(edges, lang)
      setGeneratedYamlSpec(spec)

      const [pythonResponse, typescriptResponse] = await Promise.all([
        fetch('/api/generate-code', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            spec: spec,
            language: 'python',
            format: 'yaml',
          }),
        }),
        fetch('/api/generate-code', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            spec: spec,
            language: 'typescript',
            format: 'yaml',
          }),
        }),
      ])

      const [pythonData, typescriptData] = await Promise.all([pythonResponse.json(), typescriptResponse.json()])

      setGeneratedFiles({
        python: {
          stub: pythonData.stub,
          implementation: pythonData.implementation,
        },
        typescript: {
          stub: typescriptData.stub,
          implementation: typescriptData.implementation,
        },
      })
      setActiveFile('spec')
    } catch (error) {
      console.error('Failed to generate code:', error)
      setGeneratedFiles({})
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerateCode = () => {
    generateCodeWithLanguage('python')
  }

  const activeCode = activeFile === 'spec' ? generatedYamlSpec : generatedFiles[language]?.[activeFile] || ''
  const fileExtension = language === 'python' ? '.py' : '.ts'

  // New helper to copy active code to the clipboard
  const copyActiveCode = () => {
    if (activeCode) {
      navigator.clipboard
        .writeText(activeCode)
        .then(() => {
          setJustCopied(true)
          setTimeout(() => setJustCopied(false), 1500)
        })
        .catch((err) => console.error('Failed to copy code: ', err))
    }
  }

  const calculateTooltipPosition = (
    targetNodeId: string,
    placement: TooltipPlacement,
    offset: { x: number; y: number } = { x: 0, y: 0 },
  ): React.CSSProperties => {
    if (!reactFlowInstance || !targetNodeId) {
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
    }

    const node = reactFlowInstance.getNode(targetNodeId)
    if (!node) {
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
    }

    const transform = reactFlowInstance.getViewport()
    const nodePosition = {
      x: node.position.x * transform.zoom + transform.x,
      y: node.position.y * transform.zoom + transform.y,
    }

    const nodeElement = document.querySelector(`[data-id="${targetNodeId}"]`)
    const nodeRect = nodeElement?.getBoundingClientRect()
    const nodeHeight = nodeRect?.height || 40
    const nodeWidth = nodeRect?.width || 150
    const tooltipGap = 12 // Base gap between node and tooltip

    // Apply the user-provided offset to the node position
    nodePosition.x += offset.x
    nodePosition.y += offset.y

    switch (placement.split('-')[0]) {
      case 'top':
        return {
          top: `${nodePosition.y - tooltipGap}px`,
          left: `${nodePosition.x + nodeWidth / 2}px`,
          transform: 'translate(-50%, -100%)',
        }
      case 'bottom':
        return {
          top: `${nodePosition.y + nodeHeight + tooltipGap}px`,
          left: `${nodePosition.x + nodeWidth / 2}px`,
          transform: 'translate(-50%, 0)',
        }
      case 'left':
        return {
          top: `${nodePosition.y + nodeHeight / 2}px`,
          left: `${nodePosition.x - tooltipGap}px`,
          transform: 'translate(-100%, -50%)',
        }
      case 'right':
        return {
          top: `${nodePosition.y + nodeHeight / 2}px`,
          left: `${nodePosition.x + nodeWidth + tooltipGap}px`,
          transform: 'translate(0, -50%)',
        }
      default:
        return {
          top: `${nodePosition.y + nodeHeight + tooltipGap}px`,
          left: `${nodePosition.x + nodeWidth / 2}px`,
          transform: 'translate(-50%, 0)',
        }
    }
  }

  const downloadAsZip = () => {
    const zip = new JSZip()

    // Use the stored YAML specification
    zip.file('spec.yml', generatedYamlSpec)

    // Only add files for the currently selected language
    if (language === 'python') {
      if (generatedFiles.python?.stub) {
        zip.file('stub.py', generatedFiles.python.stub)
      }
      if (generatedFiles.python?.implementation) {
        zip.file('implementation.py', generatedFiles.python.implementation)
      }
    } else {
      if (generatedFiles.typescript?.stub) {
        zip.file('stub.ts', generatedFiles.typescript.stub)
      }
      if (generatedFiles.typescript?.implementation) {
        zip.file('implementation.ts', generatedFiles.typescript.implementation)
      }
    }

    // Generate and download the zip
    zip.generateAsync({ type: 'blob' }).then((content) => {
      const url = window.URL.createObjectURL(content)
      const link = document.createElement('a')
      link.href = url
      link.download = 'langgraph-agent.zip'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    })
  }

  const handleTemplateSelect = (template: Template) => {
    setNodes(template.nodes)
    setEdges(template.edges)
    setIsTemplatesPanelOpen(false)
  }

  return (
    <div className='w-screen h-screen'>
      <div className='absolute top-5 left-5 z-50 flex gap-2'>
        <button
          onClick={() => initialOnboardingComplete && setIsTemplatesPanelOpen(!isTemplatesPanelOpen)}
          className={`flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-md transition-shadow ${
            !initialOnboardingComplete ? 'cursor-not-allowed opacity-70' : 'hover:shadow-lg'
          }`}
          disabled={!initialOnboardingComplete}
        >
          <svg
            xmlns='http://www.w3.org/2000/svg'
            width='16'
            height='16'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
          >
            <rect x='3' y='3' width='18' height='18' rx='2' ry='2'></rect>
            <line x1='3' y1='9' x2='21' y2='9'></line>
            <line x1='9' y1='21' x2='9' y2='9'></line>
          </svg>
          Templates
        </button>
      </div>
      <div className='absolute top-5 right-5 z-50 flex gap-2'>
        <div className='flex flex-row gap-2'>
          <Tooltip
            title={
              !hasValidSourceToEndPath() && initialOnboardingComplete ? 'Create a valid graph to generate code' : ''
            }
            placement='bottom'
            arrow
          >
            <button
              className={`py-2 px-3 rounded-md transition-colors duration-200 ${
                !initialOnboardingComplete
                  ? currentOnboardingStep >= 3
                    ? 'bg-[#2F6868] cursor-not-allowed opacity-100'
                    : 'bg-gray-500 opacity-70 cursor-not-allowed'
                  : hasValidSourceToEndPath()
                    ? 'bg-[#2F6868] cursor-pointer hover:bg-[#245757]'
                    : 'bg-gray-500 opacity-70 cursor-not-allowed'
              }`}
              onClick={hasValidSourceToEndPath() && initialOnboardingComplete ? handleGenerateCode : undefined}
              disabled={!hasValidSourceToEndPath() || !initialOnboardingComplete}
            >
              <div className='text-[#333333] font-medium text-center text-slate-100'> {'Generate Code'}</div>
            </button>
          </Tooltip>
          <button
            disabled={!initialOnboardingComplete}
            className={`p-3 rounded-md shadow-lg border border-[#2F6868] text-[#2F6868] focus:outline-none ${
              !initialOnboardingComplete ? 'cursor-not-allowed' : ''
            }`}
            aria-label='Toggle Information Panel'
            onClick={() => setInfoPanelOpen(!infoPanelOpen)}
          >
            <Info className='h-6 w-6' />
          </button>
        </div>
      </div>

      {isTemplatesPanelOpen && (
        <TemplatesPanel onSelectTemplate={handleTemplateSelect} onClose={() => setIsTemplatesPanelOpen(false)} />
      )}

      <div ref={reactFlowWrapper} className='no-scrollbar no-select' style={{ width: '100vw', height: '100vh' }}>
        <ColorEditingProvider>
          {!initialOnboardingComplete && (
            <style>
              {`
                .react-flow__node,
                .react-flow__node *,
                .react-flow__node:hover,
                .react-flow__node:hover * {
                  cursor: not-allowed !important;
                  pointer-events: none !important;
                }
              `}
            </style>
          )}
          <ReactFlow<CustomNodeType, CustomEdgeType>
            nodes={flowNodes}
            nodeTypes={nodeTypes}
            onEdgeClick={onEdgeClick}
            onNodesChange={handleNodesChange}
            edges={flowEdges?.map((edge) => ({
              ...edge,
              data: {
                ...edge.data,
              },
            }))}
            edgeTypes={edgeTypes}
            onEdgesChange={handleEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            fitView
            onConnectStart={onConnectStart}
            className='z-10 bg-[#EAEAEA]'
            style={{ backgroundColor: '#EAEAEA' }}
            proOptions={proOptions}
            zoomOnDoubleClick={false}
            onPaneClick={handlePaneClick}
          >
            <Background />
          </ReactFlow>
        </ColorEditingProvider>

        <Snackbar
          open={showOnboardingToast}
          onClose={() => setShowOnboardingToast(false)}
          autoHideDuration={3000}
          color='neutral'
          variant='outlined'
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          Canvas interaction is temporarily disabled during onboarding
        </Snackbar>

        <div className='sm:hidden z-20 absolute top-0 left-0 w-full h-full flex items-center justify-center bg-black bg-opacity-50'>
          <GenericModal
            imageUrl='/langgraph-logo.png'
            onButtonClick={() => {
              window.location.href = 'sms:&body=build.langchain.com'
            }}
            isOpen={true}
            onClose={() => {}}
            title='Desktop Only'
            content='LangGraph Builder is not supported on mobile devices'
            buttonText='Text me the link'
          />
        </div>
        <div className='hidden sm:block'>
          {/* Sidebar */}
          <div
            className={`
            fixed bottom-0 left-0 bg-white shadow-xl rounded-md z-20 
            transform transition-transform duration-300 
            ${infoPanelOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
          >
            <div className='flex flex-col p-6 space-y-5'>
              <div className='flex flex-row items-center justify-between'>
                <h2 className='text-xl font-medium'>Key Commands</h2>
                <button
                  className='font-bold text-gray-400 hover:text-gray-600 transition-colors duration-300 ease-in-out'
                  onClick={() => setInfoPanelOpen(false)}
                >
                  <X size={25} />
                </button>
              </div>
              <div>
                <p className='text-sm text-slate-800'>Create a node</p>
                <p className='mt-2'>⌘ + click anywhere on the canvas</p>
              </div>
              <div>
                <p className='text-sm text-slate-800'>Create an edge</p>
                <p className='mt-2'>click + drag from the bottom of one node to the top of another</p>
              </div>
              <div>
                <p className='text-sm text-slate-800'>Create a conditional edge</p>
                <p className='mt-2'>connect one node to multiple nodes</p>
              </div>
              <div>
                <p className='text-sm text-slate-800'>Create a cycle</p>
                <p className='mt-2'>click + drag from the bottom to the top of a node</p>
              </div>
              <div>
                <p className='text-sm text-slate-800'>Delete an edge/node</p>
                <p className='mt-2'>click the edge/node and hit the backspace key</p>
              </div>
              <div>
                <p className='text-sm text-slate-800'>Color an edge</p>
                <p className='mt-2'>click the edge and select an option from the color picker</p>
              </div>
            </div>
          </div>

          {initialOnboardingComplete === false && currentOnboardingStep < onboardingSteps.length && (
            <div
              className='fixed inset-0 z-10'
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 10,
                pointerEvents: 'none',
              }}
            >
              {onboardingSteps[currentOnboardingStep].type === 'modal' ? (
                <div>
                  <GenericModal
                    isOpen={true}
                    onClose={handleOnboardingNext}
                    title={onboardingSteps[currentOnboardingStep].title || ''}
                    content={<div>{onboardingSteps[currentOnboardingStep].content}</div>}
                    buttonText={onboardingSteps[currentOnboardingStep].buttonText || ''}
                    imageUrl={onboardingSteps[currentOnboardingStep].imageUrl}
                  />
                </div>
              ) : (
                <>
                  {/* Desktop Tooltip */}
                  <div
                    className={`fixed pointer-events-auto ${onboardingSteps[currentOnboardingStep].className || ''} hidden lg:block`}
                    style={{
                      ...(onboardingSteps[currentOnboardingStep].position
                        ? onboardingSteps[currentOnboardingStep].position
                        : calculateTooltipPosition(
                            onboardingSteps[currentOnboardingStep].targetNodeId || '',
                            onboardingSteps[currentOnboardingStep].placement || 'top',
                            onboardingSteps[currentOnboardingStep].tooltipOffset,
                          )),
                      pointerEvents: 'auto',
                    }}
                  >
                    <div className='py-3 px-3 flex bg-white rounded-lg shadow-lg flex-col w-[280px] md:w-[380px]'>
                      <div className='flex flex-row items-center justify-between'>
                        <div className='text-sm font-medium'>{onboardingSteps[currentOnboardingStep].title}</div>
                        <button
                          onClick={handleOnboardingNext}
                          className='text-sm bg-slate-800 hover:bg-slate-900 text-slate-100 py-1 px-2 rounded-md'
                        >
                          Next
                        </button>
                      </div>
                      <div className='text-sm pt-3'>{onboardingSteps[currentOnboardingStep].content}</div>
                    </div>
                  </div>

                  {/* Mobile Tooltip */}
                  <div className='fixed bottom-[150px] right-5 z-50 pointer-events-auto lg:hidden'>
                    <div className='py-3 px-3 flex bg-white rounded-lg shadow-lg flex-col w-[280px] md:w-[380px]'>
                      <div className='flex flex-row items-center justify-between'>
                        <div className='text-sm font-medium'>{onboardingSteps[currentOnboardingStep].title}</div>
                        <button
                          onClick={handleOnboardingNext}
                          className='text-sm bg-slate-800 hover:bg-slate-900 text-slate-100 py-1 px-2 rounded-md'
                        >
                          Next
                        </button>
                      </div>
                      <div className='text-sm pt-3'>{onboardingSteps[currentOnboardingStep].content}</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {initialOnboardingComplete === false && currentOnboardingStep === 5 && <MockColorPicker />}

          <MuiModal
            hideBackdrop={true}
            onClose={() => {
              setGenerateCodeModalOpen(false)
            }}
            onClick={(e: React.MouseEvent) => {
              if (e.target === e.currentTarget) {
                setGenerateCodeModalOpen(false)
              }
            }}
            open={generateCodeModalOpen}
          >
            <ModalDialog className='bg-slate-150 hidden sm:block absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2'>
              <>
                <div className='flex flex-col'>
                  {!isLoading && (generatedFiles.python?.stub || generatedFiles.python?.implementation) && (
                    <div className='flex flex-row justify-between items-center'>
                      <h2 className='md:text-lg font-medium'>Generated Code:</h2>
                      <div className='flex py-3 md:py-0 flex-row gap-2'>
                        <button
                          onClick={downloadAsZip}
                          className='px-3 py-1 bg-white rounded-lg border border-gray-300 hover:bg-gray-50'
                          title='Download as ZIP'
                        >
                          <Download size={18} />
                        </button>
                        <div className='max-w-xs pr-3'>
                          <MultiButton onSelectionChange={(option) => handleLanguageChange(option)} />
                        </div>
                        <button
                          className='font-bold pr-3 text-gray-400 hover:text-gray-600 transition-colors duration-300 ease-in-out'
                          onClick={() => {
                            setGenerateCodeModalOpen(false)
                          }}
                        >
                          <X size={25} />
                        </button>
                      </div>
                    </div>
                  )}

                  <div className='flex flex-col gap-3'>
                    {!isLoading && (generatedFiles.python?.stub || generatedFiles.python?.implementation) ? (
                      <div className='mt-3 md:w-[50vw] md:h-[80vh]'>
                        <div className='flex'>
                          <button
                            className={`px-3 rounded-t-md ${activeFile === 'spec' ? 'bg-[#246161] text-white' : 'bg-gray-200'}`}
                            onClick={() => setActiveFile('spec')}
                          >
                            spec.yml
                          </button>
                          <button
                            className={`px-3 rounded-t-md py-1 ${activeFile === 'stub' ? 'bg-[#246161] text-white' : 'bg-gray-200'}`}
                            onClick={() => setActiveFile('stub')}
                          >
                            {`stub${fileExtension}`}
                          </button>
                          <button
                            className={`px-3 rounded-t-md ${activeFile === 'implementation' ? 'bg-[#246161] text-white' : 'bg-gray-200'}`}
                            onClick={() => setActiveFile('implementation')}
                          >
                            {`implementation${fileExtension}`}
                          </button>
                        </div>
                        <div className='relative bg-gray-100 overflow-hidden h-[calc(80vh-30px)]'>
                          <button
                            onClick={copyActiveCode}
                            className='absolute top-5 right-6 z-10 p-1 bg-white rounded border border-gray-300 hover:bg-gray-50'
                            title='Copy code to clipboard'
                          >
                            {justCopied ? <Check size={18} /> : <Copy size={18} />}
                          </button>
                          <Highlight
                            theme={themes.nightOwl}
                            code={activeCode}
                            language={activeFile === 'spec' ? 'yaml' : language === 'python' ? 'python' : 'typescript'}
                          >
                            {({ style, tokens, getLineProps, getTokenProps }) => (
                              <pre className='p-3 overflow-auto h-full max-h-full' style={{ ...style, height: '100%' }}>
                                {tokens.map((line, i) => (
                                  <div key={i} {...getLineProps({ line })}>
                                    {line.map((token, key) => (
                                      <span key={key} {...getTokenProps({ token })} />
                                    ))}
                                  </div>
                                ))}
                              </pre>
                            )}
                          </Highlight>
                        </div>
                      </div>
                    ) : (
                      <div className='mt-3 md:w-[50vw] md:h-[80vh] flex items-center justify-center'>
                        <div className='flex flex-col items-center gap-4'>
                          <div className='flex'>
                            <LoadingSpinner />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            </ModalDialog>
          </MuiModal>
        </div>
      </div>
    </div>
  )
}
