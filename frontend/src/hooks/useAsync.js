import { useState, useCallback } from 'react'

export function useAsync() {
  const [state, setState] = useState({ loading: false, error: null, data: null })

  const run = useCallback(async (promise) => {
    setState({ loading: true, error: null, data: null })
    try {
      const data = await promise
      setState({ loading: false, error: null, data })
      return data
    } catch (e) {
      setState({ loading: false, error: e.message, data: null })
      throw e
    }
  }, [])

  return { ...state, run }
}
