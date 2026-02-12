'use client'

import React, { useState } from 'react'

interface MultiButtonProps {
  options?: string[]
  onSelectionChange?: (option: string, index: number) => void
  lang?: string
}

const MultiButton = ({ options = ['Python', 'Typescript'], onSelectionChange, lang }: MultiButtonProps) => {
  const [selectedOption, setSelectedOption] = useState( () => { 
    if( lang  ) {
      const index = options.findIndex( o =>  o.toLowerCase()===lang.toLowerCase() );
      return index>=0 ? index : 0;
    } 
    return 0;
})

  const handleOptionClick = (index: number) => {
    setSelectedOption(index)
    if (onSelectionChange) {
      onSelectionChange(options[index], index)
    }
  }

  return (
    <div className='w-full max-w-xs'>
      <div className='rounded-lg border border-gray-200 bg-white p-1 flex shadow-sm'>
        <button
          className={`flex-1 py-2 px-6 text-md font-medium transition-colors duration-800 ease-in-out ${
            selectedOption === 0 ? 'text-gray-700' : 'text-gray-300'
          }`}
          onClick={() => handleOptionClick(0)}
        >
          {options[0]}
        </button>

        <button
          className={`flex-1 py-2 border-l border-gray-200 px-6 text-md font-medium transition-colors ${
            selectedOption === 1 ? 'text-gray-700' : 'text-gray-400'
          }`}
          onClick={() => handleOptionClick(1)}
        >
          {options[1]}
        </button>
      </div>
    </div>
  )
}

export default MultiButton
