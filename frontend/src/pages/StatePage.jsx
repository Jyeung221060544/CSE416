import { useParams } from 'react-router-dom'

export default function StatePage() {
  const { stateId } = useParams()

  return (
    <div className="flex items-center justify-center h-full">
      <h1 className="text-3xl text-white">State: {stateId}</h1>
    </div>
  )
}