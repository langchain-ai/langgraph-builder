'use client'

import React, { useEffect, useRef } from 'react'
import { type CustomNodeType } from './nodes'
import { type CustomEdgeType } from './edges'
import { Viewport } from '@xyflow/react'

type GraphData = {
  name: string,
  nodes: CustomNodeType[]
  edges: CustomEdgeType[]
  viewport: Viewport
}


interface LoadGraphModalProps {
  isOpen?: boolean
  onClose: () => void
  onLoadGraph?: ( data: GraphData ) => void
  title?: string
  buttonText?: string
  hideBackDrop?: boolean
  className?: string
  noClickThrough?: boolean
}

export const LoadGraphModal: React.FC<LoadGraphModalProps> = ({
  isOpen = true,
  onClose,
  onLoadGraph,
  title = 'Load Graph',
  buttonText = 'Choose File',
  hideBackDrop = false,
  className = '',
  noClickThrough = false,
}) => {
  const modalRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node) && !noClickThrough) {
        onClose()
      }
    }

    if (isOpen && !hideBackDrop) {
      document.addEventListener('mousedown', handleOutsideClick)
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [isOpen, hideBackDrop, noClickThrough, onClose])


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && onLoadGraph) {
      const reader = new FileReader()
      reader.onload = e => {
        try {
          const content = e.target?.result as string
          const graphData = JSON.parse(content) as GraphData
          onLoadGraph(graphData)
          onClose()
        } catch (error) {
          console.error('Invalid graph file format:', error)
        }
      }
      reader.onerror = e => {
        console.error('Error reading file:', e)
      }
      reader.readAsText(file)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${hideBackDrop ? '' : 'bg-black bg-opacity-50'}`}
      style={{ pointerEvents: noClickThrough ? 'auto' : 'none' }}
    >
      <div
        ref={modalRef}
        className={`bg-white ring-1 ring-black ring-opacity-5 border-3 border-slate-600 rounded-lg p-6 max-w-md mx-auto ${className}`}
        style={{ pointerEvents: 'auto' }}
      >
        <div className='flex flex-col justify-center items-center text-center'>
          <h2 className='text-2xl font-medium'>{title}</h2>
          <div className='text-md md:text-lg text-gray-500 pt-2 text-center max-w-md'>
            <input
              ref={fileInputRef}
              type='file'
              accept='.json,.graph'
              onChange={handleFileChange}
              className='mt-4'
            />
          </div>
          <div className='flex gap-4 mt-6'>
            <button
              onClick={() => fileInputRef.current?.click()}
              className='bg-[#076699] rounded-md text-white px-4 py-2 font-medium hover:bg-[#06578a]'
            >
              {buttonText}
            </button>
            <button
              onClick={onClose}
              className='bg-gray-300 rounded-md text-black px-4 py-2 font-medium hover:bg-gray-400'
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoadGraphModal
