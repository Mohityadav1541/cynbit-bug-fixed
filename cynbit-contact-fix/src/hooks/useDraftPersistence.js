import { useState, useEffect, useRef, useCallback } from 'react'
import {
  isStorageAvailable,
  saveScopingDraft,
  loadScopingDraft,
  clearScopingDraft,
} from '../utils/draftStorage'

/**
 * Custom React Hook for resilient, privacy-focused draft auto-persistence.
 *
 * @param {object} formData - Current form state
 * @param {function} onDraftRestored - Callback when a valid draft is found on mount
 * @param {number} [debounceMs=700] - Debounce interval for writes
 */
export function useDraftPersistence(formData, onDraftRestored, debounceMs = 700) {
  const [storageSupported] = useState(() => isStorageAvailable())
  const [hasSavedDraft, setHasSavedDraft] = useState(() => {
    if (!isStorageAvailable()) return false
    const init = loadScopingDraft()
    return Boolean(init.exists && init.valid && init.scoping)
  })
  const [isSaving, setIsSaving] = useState(false)
  const [lastSavedTime, setLastSavedTime] = useState(() => {
    if (!isStorageAvailable()) return null
    const init = loadScopingDraft()
    if (init.exists && init.valid && init.updatedAt) {
      return new Date(init.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    return null
  })
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)

  // Track whether initial hydration has completed
  const isHydratedRef = useRef(false)
  const debounceTimerRef = useRef(null)

  // 1. Initial hydration mark on mount
  useEffect(() => {
    isHydratedRef.current = true
  }, [])

  // 2. Debounced auto-save effect
  useEffect(() => {
    // Skip saving during the initial hydration render
    if (!isHydratedRef.current || !storageSupported) return

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    setIsSaving(true)
    debounceTimerRef.current = setTimeout(() => {
      const res = saveScopingDraft(formData)
      setIsSaving(false)
      if (res.success) {
        setHasSavedDraft(true)
        setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
      }
    }, debounceMs)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [formData, debounceMs, storageSupported])

  // 3. User requests to clear draft (triggers confirmation modal)
  const promptClearDraft = useCallback(() => {
    setIsConfirmModalOpen(true)
  }, [])

  // 4. Confirmed draft discard (resets storage and state)
  const confirmClearDraft = useCallback((onResetState) => {
    clearScopingDraft()
    setHasSavedDraft(false)
    setLastSavedTime(null)
    setIsConfirmModalOpen(false)
    if (typeof onResetState === 'function') {
      onResetState()
    }
  }, [])

  const cancelClearDraft = useCallback(() => {
    setIsConfirmModalOpen(false)
  }, [])

  // 5. Silent clear upon verified successful submission
  const clearDraftOnSubmit = useCallback(() => {
    clearScopingDraft()
    setHasSavedDraft(false)
    setLastSavedTime(null)
  }, [])

  return {
    storageSupported,
    hasSavedDraft,
    isSaving,
    lastSavedTime,
    isConfirmModalOpen,
    promptClearDraft,
    confirmClearDraft,
    cancelClearDraft,
    clearDraftOnSubmit,
  }
}
