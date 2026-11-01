import pg from 'pg'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from '../config.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const localJsonPath = path.resolve(__dirname, '../data/inquiries.json')

async function readFromPostgres() {
  const normalizedUrl = (config.DATABASE_URL || '').replace('sslmode=require', 'sslmode=verify-full')
  const pool = new pg.Pool({
    connectionString: normalizedUrl,
    connectionTimeoutMillis: 5000,
    ssl: { rejectUnauthorized: false },
  })

  try {
    const client = await pool.connect()
    const query = `
      SELECT 
        reference_id,
        full_name,
        email,
        phone,
        company,
        engagement_stream,
        project_title,
        project_description,
        business_objective,
        tech_stack,
        timeline,
        budget_range,
        status,
        assigned_architect,
        created_at
      FROM inquiries
      ORDER BY created_at DESC
      LIMIT 20;
    `
    const res = await client.query(query)
    client.release()
    await pool.end()
    return { source: 'Neon PostgreSQL', rows: res.rows }
  } catch (err) {
    await pool.end().catch(() => {})
    throw err
  }
}

function readFromLocalJson() {
  if (!fs.existsSync(localJsonPath)) {
    return { source: 'Local JSON Store', rows: [] }
  }
  try {
    const raw = fs.readFileSync(localJsonPath, 'utf8')
    const list = JSON.parse(raw || '[]')
    const rows = list.map((inq) => ({
      reference_id: inq.referenceId,
      full_name: inq.fullName,
      email: inq.email,
      phone: inq.phone,
      company: inq.company,
      engagement_stream: inq.engagementStream,
      project_title: inq.projectTitle,
      project_description: inq.projectDescription,
      business_objective: inq.businessObjective,
      tech_stack: inq.techStack,
      timeline: inq.timeline,
      budget_range: inq.budgetRange,
      status: inq.status,
      assigned_architect: inq.assignedArchitect,
      created_at: inq.createdAt,
    }))
    return { source: 'Local JSON Fallback', rows }
  } catch {
    return { source: 'Local JSON Fallback', rows: [] }
  }
}

async function main() {
  console.log('\n================================================================================')
  console.log('              CYNBIT ARCHITECTURE DISCOVERY ENGINE — ADMIN INTAKE              ')
  console.log('================================================================================\n')

  let result
  if (config.DATABASE_URL) {
    try {
      result = await readFromPostgres()
    } catch (err) {
      console.warn(`[Admin Warning]: Could not read from PostgreSQL (${err.message}). Checking local JSON...`)
      result = readFromLocalJson()
    }
  } else {
    result = readFromLocalJson()
  }

  const { source, rows } = result

  console.log(`Active Storage Source: ${source}`)
  console.log(`Total Inquiries Found: ${rows.length}\n`)

  if (rows.length === 0) {
    console.log('No project inquiries found. Submit one via http://localhost:5173 to test!')
    console.log('================================================================================\n')
    process.exit(0)
  }

  // Display summary table
  console.table(
    rows.map((r, index) => ({
      '#': index + 1,
      'Reference ID': r.reference_id,
      'Client Name': r.full_name,
      'Company': r.company || '—',
      'Project Title': r.project_title ? r.project_title.slice(0, 30) : '—',
      'Stream': r.engagement_stream,
      'Budget': r.budget_range || '—',
      'Date': r.created_at ? new Date(r.created_at).toLocaleString() : '—',
    }))
  )

  // Display full detail for the most recent request
  const latest = rows[0]
  console.log('\n--------------------------------------------------------------------------------')
  console.log('                 LATEST INQUIRY FULL SCOPING SPECIFICATION                      ')
  console.log('--------------------------------------------------------------------------------')
  console.log(`Reference ID:         ${latest.reference_id}`)
  console.log(`Submission Date:      ${latest.created_at}`)
  console.log(`Client:               ${latest.full_name} <${latest.email}>`)
  console.log(`Phone:                ${latest.phone || 'Not provided'}`)
  console.log(`Company / Org:        ${latest.company || 'Not provided'}`)
  console.log(`Engagement Stream:    ${latest.engagement_stream}`)
  console.log(`Project Title:        ${latest.project_title}`)
  console.log(`Timeline:             ${latest.timeline || 'Flexible'}`)
  console.log(`Budget Range:         ${latest.budget_range || 'Undecided'}`)
  console.log(`Assigned Architect:   ${latest.assigned_architect}`)
  console.log(`Tech Focus:           ${Array.isArray(latest.tech_stack) ? latest.tech_stack.join(', ') : 'None'}`)
  console.log(`\nProject Description:`)
  console.log(`  ${latest.project_description || '—'}`)
  if (latest.business_objective) {
    console.log(`\nBusiness Objective:`)
    console.log(`  ${latest.business_objective}`)
  }
  console.log('================================================================================\n')
}

main().catch((err) => {
  console.error('[Admin Error]:', err.message)
  process.exit(1)
})

