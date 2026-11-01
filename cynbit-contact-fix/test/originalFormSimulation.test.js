import test from 'node:test'
import assert from 'node:assert/strict'

// Simulation of the Original Production Pattern (page-a581c8d7462124d9.js)
async function simulateOriginalPattern(promiseFn) {
  const events = []
  let loading = false
  let submitted = false
  let error = null

  try {
    // 1. Initial State
    loading = true
    events.push({ step: 'SET_LOADING_TRUE', loading })

    // 2. Bare await without internal try/catch
    const result = await promiseFn()

    // 3. Subsequent state updates (ONLY reached if promise resolves!)
    loading = false
    events.push({ step: 'SET_LOADING_FALSE', loading })

    if (result.success) {
      submitted = true
      events.push({ step: 'SET_SUBMITTED_TRUE', submitted })
    } else {
      error = 'Something went wrong.'
      events.push({ step: 'SET_ERROR', error })
    }
  } catch (uncaughtErr) {
    // Intercepted by global runtime / test harness
    events.push({ step: 'UNHANDLED_REJECTION', error: uncaughtErr.message })
    // CRITICAL BUG IN ORIGINAL SOURCE:
    // Notice that loading is NOT set to false here, and error is NOT set here!
  }

  return { loading, submitted, error, events }
}

// Simulation of the Improved Resilient Pattern (try/catch/finally)
async function simulateImprovedPattern(promiseFn) {
  const events = []
  let loading = false
  let submitted = false
  let error = null

  try {
    loading = true
    events.push({ step: 'SET_LOADING_TRUE', loading })

    const result = await promiseFn()

    if (result.success) {
      submitted = true
      events.push({ step: 'SET_SUBMITTED_TRUE', submitted })
    } else {
      error = 'Server returned error.'
      events.push({ step: 'SET_ERROR', error })
    }
  } catch (err) {
    // 1. Catch handler safely intercepts network failure
    error = err.message || 'Network failure detected.'
    events.push({ step: 'CATCH_ERROR', error })
  } finally {
    // 2. Finally block ALWAYS guarantees loading reset
    loading = false
    events.push({ step: 'FINALLY_RESET_LOADING', loading })
  }

  return { loading, submitted, error, events }
}

test('1. Original Pattern with Rejection: demonstrates frozen loading state and skipped error handler', async () => {
  const rejectingPromise = () => Promise.reject(new TypeError('Failed to fetch'))

  const outcome = await simulateOriginalPattern(rejectingPromise)

  // VERIFY THE BUG:
  // 1. Loading state remains stuck in true!
  assert.equal(outcome.loading, true, 'Loading state should fail to reset in original code')
  // 2. Submitted is false
  assert.equal(outcome.submitted, false)
  // 3. User error message is null because execution never reached the error setter
  assert.equal(outcome.error, null, 'Error state was skipped because rejection aborted execution before error handler')
  // 4. Verify event sequence
  assert.equal(outcome.events[0].step, 'SET_LOADING_TRUE')
  assert.equal(outcome.events[1].step, 'UNHANDLED_REJECTION')
  assert.equal(outcome.events.some((e) => e.step === 'SET_LOADING_FALSE'), false, 'SET_LOADING_FALSE was never reached')
})

test('2. Original Pattern with Success: normal resolution works only when network is flawless', async () => {
  const resolvingPromise = () => Promise.resolve({ success: true })

  const outcome = await simulateOriginalPattern(resolvingPromise)

  assert.equal(outcome.loading, false)
  assert.equal(outcome.submitted, true)
  assert.equal(outcome.error, null)
  assert.equal(outcome.events.some((e) => e.step === 'SET_LOADING_FALSE'), true)
})

test('3. Improved Pattern with Rejection: guarantees loading reset and actionable error handling', async () => {
  const rejectingPromise = () => Promise.reject(new TypeError('Failed to fetch'))

  const outcome = await simulateImprovedPattern(rejectingPromise)

  // VERIFY THE FIX:
  // 1. Loading state is ALWAYS reset to false in finally block!
  assert.equal(outcome.loading, false, 'Loading state must be reset to false in finally block')
  // 2. Error is caught and surfaced to the user
  assert.ok(outcome.error.includes('Failed to fetch'))
  // 3. Verify event sequence
  assert.equal(outcome.events.some((e) => e.step === 'FINALLY_RESET_LOADING'), true)
  assert.equal(outcome.events.some((e) => e.step === 'CATCH_ERROR'), true)
})

