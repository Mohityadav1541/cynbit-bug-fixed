import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DATA_DIR = path.resolve(__dirname, '../data')
const DATA_FILE = path.resolve(DATA_DIR, 'inquiries.json')

export const LOCAL_STORE_LIMITATIONS = {
  mode: 'LOCAL_DEVELOPMENT_FALLBACK',
  disclaimer:
    'LOCAL DEVELOPMENT FALLBACK STORE ACTIVE: DATABASE_URL is not set. Inquiries are stored in local file storage (server/data/inquiries.json).',
  limitations: [
    'Single-node storage: Does not support multi-instance horizontal scaling or distributed cloud replicas.',
    'Ephemeral in containerized environments: Data will be reset if the container or ephemeral disk is destroyed.',
    'No transactional guarantees: Lacks ACID transactions, foreign key constraints, and WAL replication.',
    'Concurrency: File-based persistence under extreme concurrency may experience I/O contention.',
  ],
}

class LocalDevelopmentStore {
  constructor() {
    this.inMemoryList = []
    this.initStorage()
  }

  initStorage() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true })
      }
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8')
        this.inMemoryList = JSON.parse(raw)
      } else {
        fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), 'utf-8')
      }
    } catch (err) {
      console.warn('[LocalStore Warning]: Could not initialize file storage, falling back to memory only:', err.message)
    }
  }

  save(inquiry) {
    const record = {
      ...inquiry,
      id: inquiry.id || `loc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      createdAt: inquiry.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    this.inMemoryList.unshift(record)

    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.inMemoryList, null, 2), 'utf-8')
    } catch (err) {
      console.warn('[LocalStore Warning]: Failed to persist inquiry to disk:', err.message)
    }

    return record
  }

  findByReferenceId(referenceId) {
    return this.inMemoryList.find((i) => i.referenceId === referenceId) || null
  }

  list() {
    return [...this.inMemoryList]
  }

  clear() {
    this.inMemoryList = []
    try {
      if (fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), 'utf-8')
      }
    } catch {
      // ignore
    }
  }
}

export const localDevStore = new LocalDevelopmentStore()

