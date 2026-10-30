import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

type FixtureRole = 'admin' | 'viewer'
const storageKey = 'overview-fixture-role'
export function readFixtureRole(): FixtureRole {
  const explicit = new URLSearchParams(window.location.search).get('role')
  return explicit === 'viewer' || explicit === 'admin' ? explicit : window.sessionStorage.getItem(storageKey) === 'viewer' ? 'viewer' : 'admin'
}
export function useFixtureRole(): FixtureRole {
  const [params] = useSearchParams()
  const role = readFixtureRole()
  const explicit = params.get('role')
  useEffect(() => { if (explicit === 'viewer' || explicit === 'admin') window.sessionStorage.setItem(storageKey, explicit) }, [explicit])
  return role
}
