import { useState, useEffect } from 'react'
import useAppStore from '../store/useAppStore'

export default function useStateData() {
    const selectedState = useAppStore((state) => state.selectedState)
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    useEffect(() => {
        if (!selectedState) return
        setLoading(true)
        setError(null)
        setData(null)
        // TODO: replace with real API call once services/api.jsx is implemented
        // api.getStateData(selectedState)
        //   .then(setData)
        //   .catch(setError)
        //   .finally(() => setLoading(false))
    }, [selectedState])

    return { data, loading, error }
}
