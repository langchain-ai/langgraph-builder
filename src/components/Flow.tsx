'use client'
import { useButtonText } from '@/contexts/ButtonTextContext'
import { useEdgeLabel } from '@/contexts/EdgeLabelContext'
import { Button, ModalDialog, Modal as MuiModal, Snackbar } from '@mui/joy'
import {
  Background,
  OnConnectStart,
  ReactFlow,
  addEdge,
  applyNodeChanges,
  useEdgesState,
  useNodesState,
  type Edge,
  type OnConnect,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { X } from 'lucide-react'
import Image from 'next/image'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MarkerType } from 'reactflow'
import { generateLanggraphCode } from '../codeGeneration/generateLanggraph'
import { generateLanggraphJS } from '../codeGeneration/generateLanggraphJS'
import { CodeGenerationResult } from '../codeGeneration/types'
import { edgeTypes, initialEdges, type CustomEdgeType } from './edges'
import { initialNodes, nodeTypes, type CustomNodeType } from './nodes'

import { ComponentList } from './ComponentsList'
import GenericModal from './GenericModal'

export default function App() {
  const proOptions = { hideAttribution: true }
  const [nodes, setNodes, onNodesChange] = useNodesState<CustomNodeType>(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState<CustomEdgeType>(initialEdges)
  const [generateCodeModalOpen, setGenerateCodeModalOpen] = useState(false)
  const reactFlowWrapper = useRef<any>(null)
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [generatedCode, setGeneratedCode] = useState<CodeGenerationResult | null>(null)
  const { buttonTexts } = useButtonText()
  const [maxNodeLength, setMaxNodeLength] = useState(0)
  const [maxEdgeLength, setMaxEdgeLength] = useState(0)
  const [currentModal, setCurrentModal] = useState<(typeof genericModalArray)[0] | null>(null)
  const { edgeLabels, updateEdgeLabel } = useEdgeLabel()
  const [snackbarOpen, setSnackbarOpen] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState('')

  const [mode, setMode] = useState<undefined | 'node' | 'edge' | 'conditionalEdge'>()

  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)
  useEffect(() => {
    nodesRef.current = nodes
    edgesRef.current = edges
  }, [nodes, edges])

  const handleModalClose = (key: string) => {
    const latestNodes = nodesRef.current
    const latestEdges = edgesRef.current

    const latestIsNodeOneCreated = latestNodes.length > 2
    const latestIsEdgeOneCreated = latestEdges.length > 0
    const latestIsConditionalEdgeCreated = latestEdges.filter((edge) => edge.animated).length > 0
    let canClose = true
    let alertMessage = ''

    switch (key) {
      case 'createNodeModal':
        if (!latestIsNodeOneCreated) {
          canClose = false
          alertMessage = 'Please create at least one node before proceeding'
        }
        break
      case 'createEdgeModal':
        if (!latestIsEdgeOneCreated) {
          canClose = false
          alertMessage = 'Please create at least one edge before proceeding'
        }
        break
      case 'conditionalEdgeModal':
        if (!latestIsConditionalEdgeCreated) {
          canClose = false
          alertMessage = 'Please create at least one conditional edge before proceeding'
        }
        break
      default:
        break
    }

    if (canClose) {
      localStorage.setItem(`${key}Dismissed`, 'true')
      const currentIndex = genericModalArray.findIndex((modal) => modal.key === key)

      let nextModal: (typeof genericModalArray)[0] | null = null
      for (let i = currentIndex + 1; i < genericModalArray.length; i++) {
        const modal = genericModalArray[i]
        const dismissed = localStorage.getItem(`${modal.key}Dismissed`) === 'true'
        if (!dismissed) {
          nextModal = modal
          break
        }
      }

      setCurrentModal(nextModal)
    } else {
      setSnackbarMessage(alertMessage)
      setSnackbarOpen(true)
    }
  }

  const genericModalArray = [
    {
      key: 'welcomeModal',
      noClickThrough: true,
      imageUrl: '/langgraph-logo.png',
      onClose: () => handleModalClose('welcomeModal'),
      title: 'Graph Builder',
      content: (
        <span>
          Use this tool to quickly prototype the architecture of your agent. If you're new to LangGraph, check out our
          docs{' '}
          <a
            style={{ textDecoration: 'underline' }}
            href='https://langchain-ai.github.io/langgraph/tutorials/introduction/'
            target='_blank'
            rel='noopener noreferrer'
          >
            here
          </a>
        </span>
      ),
      buttonText: 'Get Started',
    },

    {
      key: 'createNodeModal',
      hideBackDrop: true,
      className: 'md:absolute md:top-1/2 md:left-10 md:transform md:-translate-y-1/2',
      onClose: () => handleModalClose('createNodeModal'),
      title: 'Create a Node',
      content: 'To create a node, command click anywhere on the screen. Click and drag to move the node around',
      buttonText: 'Continue',
    },
    {
      key: 'createEdgeModal',
      hideBackDrop: true,
      className: 'md:absolute md:top-1/2 md:left-10 md:transform md:-translate-y-1/2',
      onClose: () => handleModalClose('createEdgeModal'),
      title: 'Create a Normal Edge',
      content: 'Click and drag from one node to another to create a normal edge',
      buttonText: 'Continue',
    },
    {
      key: 'conditionalEdgeModal',
      hideBackDrop: true,
      className: 'md:absolute md:top-1/2 md:left-10 md:transform md:-translate-y-1/2',
      onClose: () => handleModalClose('conditionalEdgeModal'),
      title: 'Create a Conditional Edge',
      content:
        'Command click a normal edge or draw multiple edges leaving from the same node to create a conditional edge',
      buttonText: 'Continue',
    },
    {
      key: 'deleteNodeEdgeModal',
      hideBackDrop: true,
      className: 'md:absolute md:top-1/2 md:left-10 md:transform md:-translate-y-1/2',
      onClose: () => handleModalClose('deleteNodeEdgeModal'),
      title: 'Delete a Node or Edge',
      content: 'To delete a node or edge, just click and press delete',
      buttonText: 'Continue',
    },
    {
      key: 'generateCodeModal',
      noClickThrough: true,
      onClose: () => handleModalClose('generateCodeModal'),
      title: 'Happy Building!',
      content: "Once you're done prototyping, click either the Python or JS logo to get code based on your graph",
      buttonText: 'Finish',
    },
  ]

  useEffect(() => {
    for (let i = 0; i < genericModalArray.length; i++) {
      const modal = genericModalArray[i]
      const dismissed = localStorage.getItem(`${modal.key}Dismissed`) === 'true'
      if (!dismissed) {
        setCurrentModal(modal)
        break
      }
    }
  }, [])

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
      const defaultLabel = `default_edge_name`
      const newEdge: CustomEdgeType = {
        ...connection,
        id: edgeId,
        markerEnd: { type: MarkerType.ArrowClosed },
        type: 'self-connecting-edge',
        animated: connection.source === connection.target || mode === 'conditionalEdge',
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
                  label: defaultLabel || edge.label,
                }
              : edge,
          )
        }
        return updatedEdges
      })
      setIsConnecting(false)
      setMode(undefined)
    },
    [setEdges, edges, buttonTexts, updateEdgeLabel, edgeLabels, maxEdgeLength, setMode, mode],
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
      if (isCmdOrCtrlPressed || mode === 'node') {
        addNode(event)
        setMode(undefined)
      }
    },
    [addNode, mode],
  )

  const handleCodeTypeSelection = (type: 'js' | 'python') => {
    let generatedCode
    if (type === 'js') {
      generatedCode = generateLanggraphJS(nodes, edges, buttonTexts, edgeLabels)
    } else {
      generatedCode = generateLanggraphCode(nodes, edges, buttonTexts, edgeLabels)
    }

    setGeneratedCode({ code: generatedCode, nodes, edges })
    setGenerateCodeModalOpen(true)
  }

  const copyCodeToClipboard = () => {
    if (generatedCode) {
      navigator.clipboard
        .writeText(generatedCode.code)
        .then(() => {
          alert('Code copied to clipboard!')
        })
        .catch((err) => {
          console.error('Failed to copy code: ', err)
        })
    }
  }

  const onEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      const isCmdOrCtrlPressed = event.metaKey || event.ctrlKey
      if (isCmdOrCtrlPressed) {
        setEdges((eds) => eds.map((e) => (e.id === edge.id ? { ...e, animated: !e.animated } : e)))
      }
    },
    [setEdges],
  )

  const nodesWithMode = useMemo(() => {
    return nodes.map((node) => {
      return {
        ...node,
        data: { ...node.data, isEdgeMode: mode === 'edge' || mode === 'conditionalEdge' },
      }
    })
  }, [nodes, mode])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'd') {
        setMode((prevMode) => (prevMode === 'node' ? undefined : 'node'))
      } else if (event.key === 'e') {
        setMode((prevMode) => (prevMode === 'edge' ? undefined : 'edge'))
      } else if (event.key === 'c') {
        setMode((prevMode) => (prevMode === 'conditionalEdge' ? undefined : 'conditionalEdge'))
      } else if (event.key === 'Escape') {
        setMode(undefined)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div>
      <Snackbar
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        open={snackbarOpen}
        onClose={(_, reason) => {
          if (reason === 'clickaway') {
            return
          }
          setSnackbarOpen(false)
        }}
        key='bottom-right'
        className='max-w-sm shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5 border-3 border-slate-600'
        autoHideDuration={6000}
      >
        <div>{snackbarMessage}</div>
        <div className='flex border-gray-200'>
          <button
            type='button'
            className='border border-transparent rounded-none rounded-r-lg p-3 flex items-center justify-center text-gray-400 hover:text-gray-500 focus:outline-none'
            onClick={() => setSnackbarOpen(false)}
          >
            <X className='h-5 w-5' aria-hidden='true' />
          </button>
        </div>
      </Snackbar>

      <div ref={reactFlowWrapper} className='z-10 no-scrollbar no-select' style={{ width: '100vw', height: '100vh' }}>
        <ReactFlow<CustomNodeType, CustomEdgeType>
          nodes={nodesWithMode}
          nodeTypes={nodeTypes}
          onEdgeClick={onEdgeClick}
          onNodesChange={handleNodesChange}
          edges={edges.map((edge) => {
            return {
              ...edge,
              data: {
                ...edge.data,
                mode: mode,
              },
            }
          })}
          edgeTypes={edgeTypes}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          fitView
          onConnectStart={onConnectStart}
          className='z-10 bg-[#1a1c24]'
          style={{
            backgroundColor: '#1a1c24',
          }}
          proOptions={proOptions}
          zoomOnDoubleClick={false}
          onPaneClick={handlePaneClick}
        >
          <Background />
        </ReactFlow>
        {currentModal && (
          <GenericModal
            isOpen={true}
            onClose={currentModal.onClose}
            title={currentModal.title}
            content={currentModal.content}
            buttonText={currentModal.buttonText}
            hideBackDrop={currentModal.hideBackDrop}
            className={currentModal.className}
            imageUrl={currentModal.imageUrl}
            noClickThrough={currentModal.noClickThrough}
          />
        )}
        <MuiModal
          hideBackdrop={true}
          onClose={() => {
            setGenerateCodeModalOpen(false)
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setGenerateCodeModalOpen(false)
            }
          }}
          open={generateCodeModalOpen}
        >
          <ModalDialog className='bg-slate-150 absolute top-1/2 left-10 transform -translate-y-1/2'>
            <div className='flex justify-between items-center'>
              <h2 className='text-lg font-bold'>Generated Code:</h2>
              <div className='flex flex-row gap-2'>
                <Button
                  className='bg-[#246161] hover:bg-[#195656] text-white font-bold px-2 rounded w-28'
                  onClick={copyCodeToClipboard}
                >
                  Copy Code
                </Button>
                <Button
                  className='bg-[#FF5C5C] hover:bg-[#E25252] text-white font-bold px-2 rounded'
                  onClick={() => {
                    setGenerateCodeModalOpen(false)
                  }}
                >
                  <X />
                </Button>
              </div>
            </div>
            <div className='overflow-y-scroll overflow-x-scroll justify-center'>
              <pre className='py-6 px-3'>
                <code>{generatedCode?.code}</code>
              </pre>
            </div>
            <div className='flex justify-center'></div>
          </ModalDialog>
        </MuiModal>
        <ComponentList toggleMode={setMode} mode={mode} />
        <div className='flex rounded py-2 px-4 flex-col absolute bottom-16 right-5'>
          <div className='text-white font-bold text-center'> {'Generate Code'}</div>
          <div className='flex flex-row gap-2 pt-3'>
            <Button className='bg-[#246161] hover:bg-[#195656]' onClick={() => handleCodeTypeSelection('python')}>
              <Image src='/python.png' alt='Python' width={35} height={35} />
            </Button>
            <Button className='bg-[#246161] hover:bg-[#195656]' onClick={() => handleCodeTypeSelection('js')}>
              <Image src='/javascript.png' alt='JS' width={35} height={35} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
