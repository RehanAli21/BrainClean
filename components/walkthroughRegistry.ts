import type React from 'react'

const refs = new Map<string, React.RefObject<any>>()

export function registerRef(key: string, ref: React.RefObject<any>) {
  refs.set(key, ref)
}

export function unregisterRef(key: string) {
  refs.delete(key)
}

export function getRef(key: string) {
  return refs.get(key)
}

let _walkthroughActive = false

export function isWalkthroughActive() {
  return _walkthroughActive
}

export function setWalkthroughActive(active: boolean) {
  _walkthroughActive = active
}

let _showWalkthrough: (() => void) | null = null

export function onShowWalkthrough(cb: (() => void) | null) {
  _showWalkthrough = cb
}

export function triggerWalkthrough() {
  _showWalkthrough?.()
}
