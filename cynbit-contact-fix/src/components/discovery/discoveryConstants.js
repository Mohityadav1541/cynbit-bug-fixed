import { Bot, Layers, Cloud, Cpu } from 'lucide-react'

export const STEPS = [
  { id: 1, label: 'Engagement Stream', short: 'Stream' },
  { id: 2, label: 'Project Details', short: 'Details' },
  { id: 3, label: 'Tech Stack', short: 'Tech' },
  { id: 4, label: 'Timeline & Budget', short: 'Timeline' },
  { id: 5, label: 'Contact Info', short: 'Contact' },
  { id: 6, label: 'Review & Submit', short: 'Review' },
]

export const STREAM_OPTIONS = [
  {
    id: 'ai-agents',
    title: 'Autonomous AI Agents',
    desc: 'Self-governing enterprise agents, LLM orchestration, RAG knowledge graphs, and multi-agent workflows tailored to operational bottlenecks.',
    icon: Bot,
    highlights: ['Multi-Agent Systems', 'Vector Search & RAG', 'Enterprise Guardrails'],
  },
  {
    id: 'fullstack-architecture',
    title: 'Full-Stack Architecture',
    desc: 'Scalable Next.js 15, high-performance React architectures, optimistic state management, and real-time backend microservices.',
    icon: Layers,
    highlights: ['Next.js 15 / React 19', 'Optimistic UI', 'Clean Enterprise Modularity'],
  },
  {
    id: 'cloud-infra',
    title: 'Cloud & Infrastructure',
    desc: 'Fault-tolerant distributed cloud architecture, Kubernetes containerization, automated CI/CD pipelines, and zero-trust security postures.',
    icon: Cloud,
    highlights: ['AWS / GCP / Azure', 'Kubernetes Orchestration', 'Zero-Trust Hardening'],
  },
  {
    id: 'bitelevate',
    title: 'BitElevate Corporate',
    desc: 'Strategic corporate incubation, technical digital acceleration, fast-track enterprise MVPs, and dedicated digital engineering capability building.',
    icon: Cpu,
    highlights: ['Executive MVP Sprints', 'Architecture Advisory', 'Team Upskilling'],
  },
]

export const TECH_OPTIONS = [
  { id: 'React', label: 'React', category: 'Frontend' },
  { id: 'Next.js', label: 'Next.js', category: 'Frontend' },
  { id: 'Node.js', label: 'Node.js', category: 'Backend' },
  { id: 'Python', label: 'Python', category: 'Backend / AI' },
  { id: 'Java', label: 'Java', category: 'Enterprise Backend' },
  { id: 'PostgreSQL', label: 'PostgreSQL', category: 'Database' },
  { id: 'MongoDB', label: 'MongoDB', category: 'Database' },
  { id: 'AWS', label: 'AWS', category: 'Cloud' },
  { id: 'Azure', label: 'Azure', category: 'Cloud' },
  { id: 'Google Cloud', label: 'Google Cloud', category: 'Cloud' },
  { id: 'AI/LLM Integration', label: 'AI/LLM Integration', category: 'AI Architecture' },
  { id: 'Other', label: 'Other', category: 'Custom' },
]

export const TIMELINE_OPTIONS = [
  { id: 'under-1-month', label: 'Less than 1 month', desc: 'Urgent sprint execution & rapid prototyping' },
  { id: '1-3-months', label: '1 – 3 months', desc: 'Standard production cycle & MVP release' },
  { id: '3-6-months', label: '3 – 6 months', desc: 'Comprehensive enterprise system architecture' },
  { id: 'over-6-months', label: 'More than 6 months', desc: 'Multi-phase strategic digital transformation' },
  { id: 'not-decided', label: 'Not decided', desc: 'Determine milestones collaboratively during discovery' },
]

export const BUDGET_BRACKETS = [
  { value: 0, label: 'Undecided', range: 'Discuss with Architect', tier: 'Flexible Discovery' },
  { value: 1, label: '$5k – $15k', range: 'Architectural Prototype / MVP', tier: 'Sprint Tier' },
  { value: 2, label: '$15k – $35k', range: 'Production Microservice / AI Pipeline', tier: 'Growth Tier' },
  { value: 3, label: '$35k – $75k', range: 'Enterprise Multi-System Architecture', tier: 'Scale Tier' },
  { value: 4, label: '$75k+', range: 'Full Transformative Enterprise Platform', tier: 'Flagship Tier' },
]

