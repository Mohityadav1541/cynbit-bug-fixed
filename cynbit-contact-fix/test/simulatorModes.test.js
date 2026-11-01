import test from 'node:test'
import assert from 'node:assert/strict'
import { submitInquiryMock, SIMULATION_MODES, setSimulationMode } from '../src/utils/mockApi.js'

const SAMPLE_PAYLOAD = {
  serviceStream: 'ai-agents',
  projectTitle: 'Autonomous Logistics Orchestrator',
  projectDescription: 'Enterprise AI multi-agent dispatch system across logistics hubs.',
  fullName: 'Dr. Vikramaditya Rathore',
  email: 'vikram.rathore@cynbit-enterprise.com',
  website_url_hp: '',
}

test('1. Simulator Mode: Normal Response (200 OK)', async () => {
  const res = await submitInquiryMock(SAMPLE_PAYLOAD, SIMULATION_MODES.SUCCESS)

  assert.equal(res.success, true)
  assert.equal(res.statusCode, 200)
  assert.ok(res.inquiryId.startsWith('CYN-'), 'Should return a simulated Cynbit reference ID')
  assert.ok(res.assignedArchitect, 'Should assign a founding architect')
  assert.equal(res.slaResponseHours, 4, 'Should state 4-hour SLA')
})

test('2. Simulator Mode: Network Drop / Offline', async () => {
  await assert.rejects(
    async () => {
      await submitInquiryMock(SAMPLE_PAYLOAD, SIMULATION_MODES.NETWORK_ERROR)
    },
    (err) => {
      assert.ok(err instanceof TypeError, 'Should reject with TypeError replicating native fetch failure')
      assert.match(err.message, /NetworkError|Failed to fetch/i)
      return true
    }
  )
})

test('3. Simulator Mode: Server Error (500)', async () => {
  const res = await submitInquiryMock(SAMPLE_PAYLOAD, SIMULATION_MODES.SERVER_500)

  assert.equal(res.success, false)
  assert.equal(res.statusCode, 500)
  assert.equal(res.errorType, 'SERVER_ERROR')
  assert.match(res.error, /Internal Server Error|SMTP/i)
})

test('4. Simulator Mode: Slow 3G / Delayed Response', async () => {
  const startTime = Date.now()
  const res = await submitInquiryMock(SAMPLE_PAYLOAD, SIMULATION_MODES.SLOW_3G)
  const duration = Date.now() - startTime

  assert.equal(res.success, true)
  assert.equal(res.statusCode, 200)
  assert.ok(duration >= 3400, `Expected delay >= 3400ms, got ${duration}ms`)
})

test('5. Simulator Mode: Rate Limited (429)', async () => {
  const res = await submitInquiryMock(SAMPLE_PAYLOAD, SIMULATION_MODES.RATE_LIMIT)

  assert.equal(res.success, false)
  assert.equal(res.statusCode, 429)
  assert.equal(res.errorType, 'RATE_LIMIT')
  assert.ok(res.retryAfterSeconds > 0, 'Should specify retryAfterSeconds cooldown interval')
  assert.match(res.error, /429|Too Many Requests/i)
})

test('6. Global Simulation Mode Setting: setSimulationMode updates default mode', async () => {
  setSimulationMode(SIMULATION_MODES.RATE_LIMIT)

  // Call without overrideMode
  const res = await submitInquiryMock(SAMPLE_PAYLOAD)
  assert.equal(res.statusCode, 429)

  // Reset back to SUCCESS
  setSimulationMode(SIMULATION_MODES.SUCCESS)
  const resSuccess = await submitInquiryMock(SAMPLE_PAYLOAD)
  assert.equal(resSuccess.statusCode, 200)
})

