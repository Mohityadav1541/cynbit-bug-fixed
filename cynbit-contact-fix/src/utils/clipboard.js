/**
 * Clipboard Utility with cross-browser fallback
 * Supports modern navigator.clipboard and fallback document.execCommand
 *
 * @param {string} text - The text to copy
 * @returns {Promise<{ success: boolean, method: 'clipboard-api' | 'execCommand' | 'failed', error?: any }>}
 */
export async function copyToClipboard(text) {
  if (typeof text !== 'string') {
    return { success: false, method: 'failed', error: new Error('Invalid text payload') }
  }

  // 1. Try modern asynchronous Clipboard API (requires secure context HTTPS / localhost)
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text)
      return { success: true, method: 'clipboard-api' }
    } catch (err) {
      // Permission denied or context not allowed — fall through to legacy DOM copy
      console.warn('navigator.clipboard.writeText failed, attempting execCommand fallback:', err)
    }
  }

  // 2. Legacy fallback using invisible textarea + document.execCommand('copy')
  try {
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.top = '-9999px'
    textArea.style.left = '-9999px'
    textArea.style.opacity = '0'
    textArea.setAttribute('readonly', '')
    textArea.setAttribute('aria-hidden', 'true')
    textArea.tabIndex = -1

    document.body.appendChild(textArea)

    // Selection handling for iOS Safari & modern mobile
    textArea.focus()
    textArea.select()
    textArea.setSelectionRange(0, text.length)

    const successful = document.execCommand('copy')
    document.body.removeChild(textArea)

    if (successful) {
      return { success: true, method: 'execCommand' }
    }
    return { success: false, method: 'execCommand', error: new Error('execCommand returned false') }
  } catch (err) {
    console.error('All clipboard operations failed:', err)
    return { success: false, method: 'failed', error: err }
  }
}

