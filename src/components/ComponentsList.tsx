import { NodeDisplay } from './nodes/CustomNode'

export const ComponentList = (props: {
  toggleMode: (mode: undefined | 'node' | 'edge' | 'conditionalEdge') => void
  mode: undefined | 'node' | 'edge' | 'conditionalEdge'
}) => {
  const components = [
    { id: 'node', name: 'Node', hotkey: 'd' },
    { id: 'edge', name: 'Edge', hotkey: 'e' },
    { id: 'conditionalEdge', name: 'Conditional Edge', hotkey: 'c' },
  ]

  return (
    <div className='flex rounded-lg p-2 flex-col absolute top-32 right-5 bg-gray-600 border-gray-800 border-2 w-[320px] gap-4'>
      {components.map((component) => (
        <button
          type='button'
          key={component.id}
          className={`flex flex-row justify-between items-center text-lg text-white border-2 box-content hover:bg-gray-700 rounded-lg px-4 py-2 cursor-pointer ${
            props.mode === component.id ? 'bg-gray-700 border-gray-400 ' : 'border-gray-600'
          }`}
          onClick={() =>
            props.toggleMode(
              props.mode === component.id ? undefined : (component.id as 'node' | 'edge' | 'conditionalEdge'),
            )
          }
        >
          {component.name === 'Node' ? (
            <NodeDisplay nodeWidth={200}>
              <div className='text-center flex-1'>{component.name}</div>
            </NodeDisplay>
          ) : component.name === 'Edge' ? (
            <div className='text-center w-[200px] relative flex flex-col items-center'>
              <div className='bg-gray-600 z-10 relative w-fit px-2'>{component.name}</div>
              <div className='absolute w-full top-3 z-0'>
                <div className='h-[8px] bg-gray-400 w-[calc(100%-10px)]' />
                <div className='absolute right-[-16px] top-[-12px] border-[16px] border-transparent border-l-gray-300' />
              </div>
            </div>
          ) : (
            <div className='text-center w-[200px] relative flex flex-col items-center'>
              <div className='bg-gray-600 z-10 relative px-2 w-fit'>{component.name}</div>
              <div className='absolute w-full top-2.5 z-0'>
                <div className='h-[4px] border-t-[5px] border-dotted border-gray-400 w-[calc(100%-10px)] mt-0.5' />
                <div className='absolute right-[-16px] top-[-12px] border-[16px] border-transparent border-l-gray-300' />
              </div>
            </div>
          )}
          <div className='border flex-none rounded-lg size-12 border-gray-800 bg-gray-500 flex items-center justify-center capitalize font-mono'>
            {component.hotkey}
          </div>
        </button>
      ))}
      <button
        type='button'
        key={'cancel'}
        className={`flex flex-row justify-between items-center text-lg text-white border-2 border-gray-600 box-content hover:bg-gray-700 rounded-lg px-4 py-2 cursor-pointer`}
      >
        <div className='text-center w-[200px] relative flex flex-col items-center'>
          <div className='bg-gray-600 z-10 relative px-2 w-fit'>Delete</div>
        </div>
        <div className='border text-3xl flex-none rounded-lg size-12 border-gray-800 bg-gray-500 flex items-center justify-center capitalize font-mono'>
          ⌫
        </div>
      </button>
    </div>
  )
}
