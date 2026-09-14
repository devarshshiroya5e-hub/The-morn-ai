import { Startup, User, RolePost, Appointment, TaskItem } from '../types';

export const INITIAL_USERS: User[] = [
  {
    id: 'user-founder-1',
    name: 'Alex Vance',
    email: 'alex@neuropulse.ai',
    role: 'founder',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
    title: 'Founder & CEO @ NeuroPulse AI',
    bio: 'Ex-DeepMind researcher building autonomous multimodal AI agents for biotech laboratory workflows. Looking for exceptional product builders.',
    skills: ['AI Systems', 'PyTorch', 'System Architecture', 'Fundraising', 'Strategy'],
    startupId: 'startup-1',
    reputationScore: 98,
    completedMilestones: 14,
  },
  {
    id: 'user-talent-1',
    name: 'Elena Rostova',
    email: 'elena.rostova@techdev.io',
    role: 'employee',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=250&q=80',
    title: 'Senior AI & Full-Stack Engineer',
    bio: 'Building responsive React apps paired with Gemini LLM pipelines. 5+ years shipping fast-paced startup MVPs. Open to equity + milestone stipend.',
    skills: ['React', 'TypeScript', 'Gemini API', 'Node.js', 'Tailwind CSS', 'Python'],
    hourlyRate: '$75/hr or 1.5% Equity',
    equityPreference: 'Hybrid (Stipend + 1-2% Equity)',
    reputationScore: 96,
    completedMilestones: 22,
  },
  {
    id: 'user-talent-2',
    name: 'Marcus Chen',
    email: 'marcus.growth@orbit.io',
    role: 'employee',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
    title: 'Product Growth Strategist & Marketer',
    bio: 'Specialist in PLG (Product-Led Growth), viral loops, developer marketing, and pre-seed launch sequences. Scaled 3 B2B tools to $50k MRR.',
    skills: ['Product-Led Growth', 'SEO', 'Go-To-Market', 'User Acquisition', 'Analytics'],
    hourlyRate: '$60/hr',
    equityPreference: 'Equity-leaning',
    reputationScore: 94,
    completedMilestones: 18,
  },
  {
    id: 'user-talent-3',
    name: 'Sarah Lin',
    email: 'sarah.design@craft.studio',
    role: 'employee',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=250&q=80',
    title: 'Principal UI/UX Designer & Design Engineer',
    bio: 'Crafting clean, mathematical design systems and interactive prototypes. Bridges design and frontend code seamlessly.',
    skills: ['Figma', 'UI/UX Design', 'Design Systems', 'Tailwind CSS', 'Prototyping'],
    hourlyRate: '$70/hr',
    equityPreference: 'Flexible',
    reputationScore: 97,
    completedMilestones: 31,
  }
];

export const INITIAL_STARTUPS: Startup[] = [
  {
    id: 'startup-1',
    name: 'NeuroPulse AI',
    tagline: 'Multimodal AI Co-Pilot for Clinical & Biotech Lab Workflows',
    logo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=120&q=80',
    coverImage: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=1200&q=80',
    industry: 'Artificial Intelligence & Biotech',
    stage: 'Pre-Seed',
    pitch: 'Biotech researchers lose 40% of their lab hours to manual assay logging and protocol transcription. NeuroPulse AI automates assay protocols, analyzes spectrometry feeds in real-time, and generates compliance-ready experiment logs with Gemini models.',
    techStack: ['React', 'TypeScript', 'Python', 'Gemini API', 'Tailwind CSS', 'PostgreSQL', 'FastAPI'],
    website: 'https://neuropulse-ai.example.com',
    foundedYear: '2025',
    founderId: 'user-founder-1',
    founderName: 'Alex Vance',
    founderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
    fundingRaised: '$280,000 Angel Round',
    location: 'San Francisco, CA / Remote',
    investorReadinessScore: 84,
    growthVelocityScore: 91,
    verified: true,
    historyLogs: [
      {
        id: 'hist-1',
        date: '2025-11-15',
        type: 'traction',
        title: 'Closed First 3 University Lab Pilots',
        description: 'Signed pilot MOUs with Stanford BioE and UC Berkeley synthetic biology groups to test automated protocol transcription.',
        impact: 'Validated problem severity; researchers reported 3.5 hours saved per day.'
      },
      {
        id: 'hist-2',
        date: '2026-01-20',
        type: 'pivot',
        title: 'Pivoted from General Lab Notes to Multimodal Spectrometry Analysis',
        description: 'Initial text-only transcription had low willingness to pay. Added visual spectrometry and image analysis which doubled user engagement.',
        impact: 'Willingness to pay increased from $20/mo to $250/mo per seat.'
      },
      {
        id: 'hist-3',
        date: '2026-02-10',
        type: 'bottleneck',
        title: 'Current Bottleneck: Frontend Data Visualization & Protocol Sync',
        description: 'Our backend ML pipeline is ready, but researchers need an intuitive, latency-free web dashboard with real-time protocol annotations.',
        impact: 'Need a talented React + Gemini engineer to ship the interactive dashboard before our Q2 Seed round.'
      }
    ],
    members: [
      {
        userId: 'user-founder-1',
        name: 'Alex Vance',
        role: 'Founder & CEO',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
        joinedDate: '2025-08-01',
        equityOrStipend: '70% Equity',
        status: 'active',
        skills: ['AI Systems', 'Strategy', 'Biotech']
      },
      {
        userId: 'user-talent-1',
        name: 'Elena Rostova',
        role: 'Lead Full-Stack AI Engineer',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=250&q=80',
        joinedDate: '2026-02-15',
        equityOrStipend: '2.0% Equity + $2,000/sprint',
        status: 'active',
        skills: ['React', 'TypeScript', 'Gemini API']
      }
    ],
    roadmap: [
      {
        id: 'rm-1',
        phase: 'Phase 1: Lab Dashboard & Real-Time Sync',
        title: 'Interactive Protocol Workspace & Gemini Multimodal Pipeline',
        description: 'Deploy real-time laboratory assay visualizer with interactive image analysis and audio notes.',
        duration: 'Weeks 1-4',
        kpiTarget: 'Sub-300ms protocol generation, 15 active lab trials',
        status: 'in_progress',
        talentNeeded: ['Lead Full-Stack AI Engineer', 'UI/UX Designer'],
        riskFactors: 'High data fidelity requirements for assay images'
      },
      {
        id: 'rm-2',
        phase: 'Phase 2: Automated Workflows & Team Collaboration',
        title: 'Multi-Researcher Co-Lab & Export Engines',
        description: 'Allow multi-user live editing of lab protocols with automated compliance reports for FDA audit prep.',
        duration: 'Weeks 5-8',
        kpiTarget: '99.9% uptime, 40+ active weekly researchers',
        status: 'upcoming',
        talentNeeded: ['DevOps & Cloud Architect', 'Product Growth Marketer'],
        riskFactors: 'Compliance regulatory variations'
      },
      {
        id: 'rm-3',
        phase: 'Phase 3: Seed Round & Commercial Scale',
        title: 'Institutional Tier & Enterprise Single-Sign-On',
        description: 'Launch $15,000/yr enterprise lab tier and pitch top-tier bio-tech venture firms.',
        duration: 'Weeks 9-12',
        kpiTarget: '$12,000 MRR, 88/100 Investor Readiness Score',
        status: 'upcoming',
        talentNeeded: ['B2B Enterprise Lead'],
        riskFactors: 'Long enterprise procurement cycles'
      }
    ],
    openRoles: [
      {
        id: 'role-1',
        startupId: 'startup-1',
        startupName: 'NeuroPulse AI',
        startupLogo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=120&q=80',
        title: 'Lead Full-Stack AI Engineer',
        type: 'Equity + Stipend',
        equityRange: '1.5% - 3.0%',
        stipendRange: '$2,000 - $3,500 / sprint',
        commitment: '20 hrs/week',
        skills: ['React', 'TypeScript', 'Gemini API', 'Tailwind CSS'],
        description: 'Own the primary web application interface connecting lab equipment data streams with our server-side Gemini intelligence models.',
        responsibilities: [
          'Build responsive protocol editing screens with live telemetry feedback',
          'Implement optimistic state updates and robust error boundaries',
          'Collaborate directly with founder Alex Vance on product roadmap priority'
        ],
        idealCandidate: 'Self-directed builder who wants high ownership and equity in an AI biotech breakout.',
        postedDate: '2026-02-18',
        applicantCount: 5,
        status: 'open'
      },
      {
        id: 'role-2',
        startupId: 'startup-1',
        startupName: 'NeuroPulse AI',
        startupLogo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=120&q=80',
        title: 'Product Growth Strategist',
        type: 'Equity + Stipend',
        equityRange: '1.0% - 2.0%',
        stipendRange: '$1,500 / milestone',
        commitment: '10-15 hrs/week',
        skills: ['Product-Led Growth', 'SEO', 'Outreach', 'B2B Marketing'],
        description: 'Design and execute direct outreach to academic research groups and biotech accelerators, converting pilots to annual contracts.',
        responsibilities: [
          'Formulate pilot-to-paid conversion sequence and email triggers',
          'Coordinate customer case study publications with pilot labs',
          'Optimize SolveEarn community appointments and contributor pipelines'
        ],
        idealCandidate: 'Growth hacker with interest in deep tech and science ecosystems.',
        postedDate: '2026-02-22',
        applicantCount: 3,
        status: 'open'
      }
    ],
    tasks: [
      {
        id: 'task-1',
        startupId: 'startup-1',
        assigneeId: 'user-talent-1',
        assigneeName: 'Elena Rostova',
        assigneeAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=250&q=80',
        title: 'Build Protocol Timeline Visualizer with Gemini AI Auto-Tagging',
        priority: 'High',
        status: 'in_progress',
        estimatedHours: 14,
        deadline: 'In 3 days',
        description: 'Create an interactive assay timeline component that highlights protocol milestones and flags reagent expiration risks using AI predictions.',
        actionItems: [
          'Design horizontal milestone timeline with responsive cards',
          'Wire server-side Gemini API endpoint for step anomaly detection',
          'Add one-click export for PDF laboratory audit notes'
        ],
        aiMentoringTip: 'Keep the state management localized so rapid scrubbing through assay frames renders smoothly at 60 FPS without layout shifts.',
        createdAt: '2026-02-28'
      },
      {
        id: 'task-2',
        startupId: 'startup-1',
        assigneeId: 'user-talent-1',
        assigneeName: 'Elena Rostova',
        assigneeAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=250&q=80',
        title: 'Refactor Auth & Role Permissions for Lab Assistants vs PIs',
        priority: 'Medium',
        status: 'todo',
        estimatedHours: 8,
        deadline: 'In 6 days',
        description: 'Ensure lab technicians cannot delete historical protocol logs; enforce read-only audit logging for compliance.',
        actionItems: [
          'Add role check guards to critical API endpoints',
          'Provide clear toast notices for restricted actions'
        ],
        aiMentoringTip: 'Follow the principle of least privilege—default any newly joined assistant to Contributor status until verified by Founder.',
        createdAt: '2026-03-01'
      }
    ]
  },
  {
    id: 'startup-2',
    name: 'GreenGrid Network',
    tagline: 'Decentralized Micro-Grid Energy Trading & Battery Optimization',
    logo: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=120&q=80',
    coverImage: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=1200&q=80',
    industry: 'ClimateTech & Smart Infrastructure',
    stage: 'Seed',
    pitch: 'Residential solar and battery owners waste 35% of excess generated power. GreenGrid enables autonomous peer-to-peer neighborhood power routing with smart contracts, cutting consumer energy costs by 28%.',
    techStack: ['TypeScript', 'Solidity', 'React', 'Node.js', 'PostgreSQL', 'Tailwind CSS'],
    website: 'https://greengrid.network',
    foundedYear: '2024',
    founderId: 'user-founder-2',
    founderName: 'Maya Lin',
    founderAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=250&q=80',
    fundingRaised: '$750,000 Seed Round',
    location: 'Austin, TX / Remote',
    investorReadinessScore: 89,
    growthVelocityScore: 86,
    verified: true,
    historyLogs: [
      {
        id: 'hist-201',
        date: '2025-08-10',
        type: 'milestone',
        title: 'Austin 500-Home Micro-Grid Pilot Deployed',
        description: 'Deployed hardware telemetry across 500 solar-equipped residences in East Austin.',
        impact: 'Achieved average $84 monthly energy savings per household.'
      }
    ],
    members: [
      {
        userId: 'user-founder-2',
        name: 'Maya Lin',
        role: 'Founder & Hardware Architect',
        avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=250&q=80',
        joinedDate: '2024-09-01',
        equityOrStipend: '65% Equity',
        status: 'active',
        skills: ['Renewable Energy', 'IoT', 'Hardware']
      }
    ],
    roadmap: [
      {
        id: 'rm-201',
        phase: 'Phase 1: Dynamic Tariff Oracle Integration',
        title: 'Real-Time Utility Pricing Telemetry',
        description: 'Feed real-time ERCOT spot prices into the neighborhood battery dispatch engine.',
        duration: 'Weeks 1-5',
        kpiTarget: '99.98% pricing feed accuracy',
        status: 'in_progress',
        talentNeeded: ['Backend Data Engineer', 'Smart Contract Auditor'],
        riskFactors: 'Extreme weather volatility spikes'
      }
    ],
    openRoles: [
      {
        id: 'role-201',
        startupId: 'startup-2',
        startupName: 'GreenGrid Network',
        startupLogo: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=120&q=80',
        title: 'Smart Contract & Web3 Integration Engineer',
        type: 'Equity + Stipend',
        equityRange: '1.2% - 2.5%',
        stipendRange: '$2,500 / milestone',
        commitment: '15 hrs/week',
        skills: ['Solidity', 'TypeScript', 'React', 'Ethers.js'],
        description: 'Connect our IoT telemetry micro-controllers to smart settlement vaults with gas-optimized batch transactions.',
        responsibilities: [
          'Audit and refine micro-escrow smart contracts',
          'Build telemetry dashboard with interactive power trade visualizations'
        ],
        idealCandidate: 'Web3 developer passionate about tangible climate impact.',
        postedDate: '2026-02-20',
        applicantCount: 4,
        status: 'open'
      }
    ],
    tasks: []
  },
  {
    id: 'startup-3',
    name: 'Omnilink DevTools',
    tagline: 'Autonomous Real-Time API Schema Sync & Mock Engine',
    logo: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=120&q=80',
    coverImage: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
    industry: 'Developer Tools & Cloud Infrastructure',
    stage: 'Pre-Seed',
    pitch: 'Eliminates backend-frontend integration delays. Omnilink monitors OpenAPI specifications and auto-generates client SDKs, mock mocks, and end-to-end type contracts instantly upon Git pull requests.',
    techStack: ['TypeScript', 'Node.js', 'Go', 'Docker', 'GraphQL', 'React'],
    website: 'https://omnilink.dev',
    foundedYear: '2025',
    founderId: 'user-founder-3',
    founderName: 'Jordan Reed',
    founderAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80',
    fundingRaised: '$150,000 Pre-Seed',
    location: 'Seattle, WA / Remote',
    investorReadinessScore: 78,
    growthVelocityScore: 88,
    verified: true,
    historyLogs: [
      {
        id: 'hist-301',
        date: '2026-01-05',
        type: 'traction',
        title: 'Surpassed 1,200 GitHub Stars on Open Source CLI',
        description: 'Launched the open-source CLI component on HackerNews and trending on GitHub.',
        impact: 'Attracted 45 startup teams requesting the hosted collaborative cloud dashboard.'
      }
    ],
    members: [],
    roadmap: [
      {
        id: 'rm-301',
        phase: 'Phase 1: Cloud Dashboard & GitHub App',
        title: 'Automated PR Check Bot & Schema Diff Viewer',
        description: 'Build web dashboard displaying visual breaking change warnings for API schemas.',
        duration: 'Weeks 1-4',
        kpiTarget: 'Under 10-second CI run time, 100 installed teams',
        status: 'in_progress',
        talentNeeded: ['React Frontend Specialist', 'Golang Systems Engineer'],
        riskFactors: 'GitHub API rate limitations'
      }
    ],
    openRoles: [
      {
        id: 'role-301',
        startupId: 'startup-3',
        startupName: 'Omnilink DevTools',
        startupLogo: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=120&q=80',
        title: 'Senior Frontend Design Engineer',
        type: 'Equity Only',
        equityRange: '2.0% - 4.0%',
        stipendRange: 'Milestone equity grants',
        commitment: '15-20 hrs/week',
        skills: ['React', 'TypeScript', 'Tailwind CSS', 'Figma'],
        description: 'Design and build a world-class, ultra-fast developer dashboard comparable to Linear or Vercel.',
        responsibilities: [
          'Create keyboard-first schema navigation and visual diffing UI',
          'Integrate dark/light modern developer aesthetics with micro-interactions'
        ],
        idealCandidate: 'Frontend craftsperson obsessed with developer experience and sub-50ms UI response.',
        postedDate: '2026-02-25',
        applicantCount: 8,
        status: 'open'
      }
    ],
    tasks: []
  }
];

export const INITIAL_APPOINTMENTS: Appointment[] = [
  {
    id: 'apt-1',
    startupId: 'startup-1',
    startupName: 'NeuroPulse AI',
    founderId: 'user-founder-1',
    founderName: 'Alex Vance',
    talentId: 'user-talent-1',
    talentName: 'Elena Rostova',
    talentAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=250&q=80',
    talentSkills: ['React', 'TypeScript', 'Gemini API', 'Tailwind CSS'],
    roleTitle: 'Lead Full-Stack AI Engineer',
    date: '2026-03-15',
    time: '14:00 PST (30 min)',
    status: 'confirmed',
    meetingLink: 'https://meet.solvearn.net/room/neuropulse-elena-sync',
    pitchMessage: 'Hi Alex! I have built several Gemini multimodal vision dashboards and I am very excited about your biotech lab transcription mission. Would love to align on Phase 1 deliverables!',
    aiMatchScore: 96,
    aiPreparationBrief: 'AI Brief: Candidate Elena has 96% stack match (React + Gemini API). Recommend discussing the real-time assay telemetry timeline component and confirming 15 hrs/week commitment for Phase 1.',
    createdDate: '2026-03-01'
  },
  {
    id: 'apt-2',
    startupId: 'startup-1',
    startupName: 'NeuroPulse AI',
    founderId: 'user-founder-1',
    founderName: 'Alex Vance',
    talentId: 'user-talent-2',
    talentName: 'Marcus Chen',
    talentAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
    talentSkills: ['Product-Led Growth', 'SEO', 'Go-To-Market', 'Analytics'],
    roleTitle: 'Product Growth Strategist',
    date: '2026-03-16',
    time: '11:00 PST (25 min)',
    status: 'pending',
    meetingLink: 'https://meet.solvearn.net/room/neuropulse-marcus-sync',
    pitchMessage: 'Hi Alex, I reviewed NeuroPulse traction logs. I can set up a high-velocity university lab outreach engine to convert 12 new bio-labs in 30 days.',
    aiMatchScore: 91,
    aiPreparationBrief: 'AI Brief: High growth synergy. Marcus previously scaled 3 B2B tech platforms. Evaluate his strategy for bio-lab outreach versus our current academic grant pipelines.',
    createdDate: '2026-03-02'
  }
];

export const initialStartups = INITIAL_STARTUPS;
export const mockFounderUser = INITIAL_USERS[0];
export const mockTalentUsers = INITIAL_USERS.slice(1);
export const mockAppointments = INITIAL_APPOINTMENTS;
