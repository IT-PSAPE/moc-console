import { useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/lib/auth-context"
import { routes } from "@/screens/console-routes"

export function useLogin() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError("")
    setLoading(true)
    const result = await signIn(email, password)
    if (result.error) {
      setError(result.error.message)
      setLoading(false)
      return
    }
    navigate(`/${routes.dashboard}`, { replace: true })
  }

  return {
    state: { email, password, error, loading },
    actions: { setEmail, setPassword, submit },
  }
}
