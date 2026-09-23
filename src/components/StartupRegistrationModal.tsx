import React, { useState } from 'react';
import { PartnershipMode, RolePartnership, Startup, User } from '../types';
import { convertLocalToUsd, convertUsd, formatAnyCurrency, getCurrencyOptions, useLocalizedCurrency } from '../lib/currency';
import { storage } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { X, Sparkles, BrainCircuit, Rocket, PlusCircle, Check, UploadCloud, ImagePlus } from 'lucide-react';


const ROLE_SUGGESTIONS: Record<string, string[]> = {
  'Artificial Intelligence': ['AI Engineer', 'AI Product Manager', 'Prompt Engineer', 'ML Engineer', 'Frontend Developer', 'Backend Developer', 'Full-Stack Developer', 'UI/UX Designer', 'Growth Marketer', 'Sales Specialist', 'Content Creator', 'Video Editor'],
  'ClimateTech': ['Climate Data Analyst', 'IoT Engineer', 'Hardware Engineer', 'Backend Developer', 'Frontend Developer', 'Product Manager', 'Growth Marketer', 'Business Development Manager', 'Video Editor'],
  'Developer Tools': ['Frontend Developer', 'Backend Developer', 'Full-Stack Developer', 'DevOps Engineer', 'Cloud Engineer', 'Developer Advocate', 'UI/UX Designer', 'Product Manager', 'Growth Marketer', 'Video Editor'],
  'Biotech': ['Bioinformatics Engineer', 'ML Engineer', 'Research Analyst', 'Data Scientist', 'Frontend Developer', 'Backend Developer', 'Product Manager', 'Regulatory Specialist', 'Growth Marketer', 'Video Editor'],
  'Fintech': ['Backend Developer', 'Full-Stack Developer', 'Data Analyst', 'Data Scientist', 'Cybersecurity Engineer', 'Product Manager', 'UI/UX Designer', 'Risk Analyst', 'Growth Marketer', 'Sales Specialist'],
  'HealthTech': ['AI Engineer', 'Backend Developer', 'Frontend Developer', 'Full-Stack Developer', 'Health Data Analyst', 'Product Manager', 'UI/UX Designer', 'Clinical Operations Specialist', 'Growth Marketer', 'Video Editor'],
};

const ALL_ROLE_OPTIONS = [
  // Engineering & software
  'Software Engineer','Software Developer','Coder','Programmer','Frontend Developer','Backend Developer','Full-Stack Developer',
  'Web Developer','Mobile App Developer','Android Developer','iOS Developer','React Developer','React Native Developer',
  'Next.js Developer','Vue.js Developer','Angular Developer','Node.js Developer','Python Developer','Java Developer','C++ Developer',
  'C# Developer','.NET Developer','Go Developer','Rust Developer','PHP Developer','Ruby Developer','Swift Developer','Kotlin Developer',
  'Flutter Developer','Dart Developer','WordPress Developer','Shopify Developer','Webflow Developer','Framer Developer',
  'API Developer','API Integration Specialist','Database Developer','Database Administrator','SQL Developer','QA Engineer',
  'QA Tester','Automation Tester','Test Engineer','SDET','DevOps Engineer','DevSecOps Engineer','Cloud Engineer',
  'Cloud Architect','Solutions Architect','Software Architect','Site Reliability Engineer','Platform Engineer','Infrastructure Engineer',
  'Systems Engineer','Network Engineer','Network Administrator','IT Administrator','IT Support Specialist','Technical Support Engineer',
  'Release Engineer','Build Engineer','Embedded Systems Engineer','Firmware Engineer','Hardware Engineer','Robotics Engineer',
  'IoT Engineer','Game Developer','Unity Developer','Unreal Engine Developer','Blockchain Developer','Web3 Developer',
  'Smart Contract Developer','Cybersecurity Engineer','Security Engineer','Ethical Hacker','Penetration Tester','Security Analyst',
  'Security Architect',

  // AI, data & research
  'AI Engineer','AI Developer','AI Agent Developer','AI Researcher','AI Research Engineer','Machine Learning Engineer',
  'ML Engineer','Deep Learning Engineer','NLP Engineer','Computer Vision Engineer','Generative AI Engineer','LLM Engineer',
  'RAG Engineer','MLOps Engineer','Prompt Engineer','AI Product Manager','AI Project Manager','AI Solutions Architect',
  'AI Operations Specialist','AI Automation Specialist','Data Engineer','Data Scientist','Data Analyst','Business Intelligence Analyst',
  'BI Developer','Analytics Engineer','Data Architect','Data Quality Analyst','Data Labeling Specialist','Research Analyst',
  'Research Scientist','Market Research Analyst','Business Analyst','Operations Research Analyst','Statistician',

  // Product & design
  'Product Manager','Associate Product Manager','Technical Product Manager','Product Owner','Product Operations Manager',
  'Product Analyst','Product Researcher','Program Manager','Project Manager','Project Coordinator','Scrum Master','Agile Coach',
  'UX Designer','UI Designer','UI/UX Designer','Product Designer','UX Researcher','UX Writer','Interaction Designer',
  'Visual Designer','Graphic Designer','Brand Designer','Brand Strategist','Design Lead','Design Systems Designer',
  'Web Designer','Mobile App Designer','Motion Designer','3D Designer','3D Artist','3D Modeler','3D Animator',
  'Illustrator','Presentation Designer','Logo Designer','Creative Director','Art Director','Design Director','Figma Designer',

  // Marketing, content & media
  'Marketing Manager','Marketing Specialist','Marketing Strategist','Growth Marketer','Growth Manager','Growth Hacker',
  'Digital Marketing Specialist','Performance Marketer','Product Marketer','Content Marketer','Content Strategist',
  'SEO Specialist','Technical SEO Specialist','Local SEO Specialist','SEM Specialist','Google Ads Specialist','Meta Ads Specialist',
  'Social Media Manager','Social Media Specialist','Community Manager','Community Builder','Influencer Marketing Manager',
  'Creator Partnerships Manager','Affiliate Marketing Manager','Email Marketing Specialist','Lifecycle Marketing Manager',
  'CRM Specialist','Marketing Automation Specialist','PR Specialist','Public Relations Manager','Communications Manager',
  'Copywriter','Content Writer','Technical Writer','Script Writer','Creative Writer','Editor','Proofreader','Blogger',
  'Newsletter Writer','Content Creator','Creator Manager','YouTube Manager','Instagram Manager','TikTok Manager',
  'Video Editor','Short-form Video Editor','Long-form Video Editor','Video Producer','Video Director','Filmmaker',
  'Motion Graphics Artist','VFX Artist','Colorist','Color Grading Specialist','Sound Designer','Audio Editor',
  'Podcast Producer','Voice-over Artist','Photographer','Product Photographer','Thumbnail Designer',

  // Sales, business & partnerships
  'Sales Manager','Sales Specialist','Sales Executive','Business Development Manager','Business Development Executive',
  'Business Development Representative','Sales Development Representative','Account Executive','Account Manager',
  'Key Account Manager','Enterprise Sales Specialist','B2B Sales Specialist','B2C Sales Specialist','Inside Sales Representative',
  'Partnerships Manager','Partnerships Specialist','Channel Partnerships Manager','Customer Success Manager','Customer Success Specialist',
  'Customer Support Specialist','Customer Experience Specialist','Client Success Manager','Solutions Consultant',
  'Sales Operations Specialist','Revenue Operations Manager','Sales Enablement Specialist','Lead Generation Specialist',
  'Appointment Setter','Recruitment Sales Specialist',

  // Startup leadership & operations
  'Co-Founder','Chief Executive Officer (CEO)','Chief Technology Officer (CTO)','Chief Operating Officer (COO)','Marketing Expert',
  'Chief Marketing Officer (CMO)','Chief Product Officer (CPO)','Chief Financial Officer (CFO)','Chief Growth Officer (CGO)',
  'Chief Revenue Officer (CRO)','Chief People Officer (CPO)','Chief of Staff','Startup Operator','Startup Generalist',
  'Operations Manager','Business Operations Manager','Operations Specialist','Strategy Manager','Business Strategy Consultant',
  'Management Consultant','Strategy Consultant','Program Operations Manager','Project Operations Manager','Executive Assistant',
  'Virtual Assistant','Office Manager','Founder Associate','Business Operations Analyst','Process Improvement Specialist',

  // Finance, legal & compliance
  'Financial Analyst','Finance Manager','FP&A Analyst','Accountant','Bookkeeper','Financial Controller','Auditor',
  'Tax Specialist','GST Specialist','Investment Analyst','Financial Planner','Financial Modeling Analyst','Risk Analyst',
  'Risk Manager','Treasury Specialist','Credit Analyst','Procurement Specialist','Vendor Manager','Legal Counsel',
  'Corporate Lawyer','Contract Lawyer','Legal Researcher','Contract Manager','Compliance Specialist','Privacy Specialist',
  'Data Protection Specialist','Regulatory Affairs Specialist','Intellectual Property Specialist','Paralegal',

  // People & recruiting
  'HR Manager','HR Specialist','People Operations Manager','People Operations Specialist','Talent Acquisition Specialist',
  'Recruiter','Technical Recruiter','Executive Recruiter','Talent Sourcer','Recruitment Coordinator','People Partner',
  'Learning & Development Specialist','Training Manager','Employee Experience Manager','Employer Branding Specialist',
  'Compensation & Benefits Specialist','HR Analyst','Leadership Coach','Career Coach','Mentor','Trainer','Facilitator',

  // Healthcare, science & education
  'Healthcare Manager','Healthcare Administrator','Medical Researcher','Clinical Researcher','Clinical Operations Specialist',
  'Public Health Specialist','Health Data Analyst','Nutritionist','Fitness Coach','Pharmaceutical Researcher','Biotech Researcher',
  'Biotechnology Engineer','Life Sciences Researcher','Laboratory Technician','Scientific Writer','Science Communicator',
  'Teacher','Tutor','Instructor','Course Creator','Instructional Designer','Curriculum Designer','E-learning Specialist',
  'Educational Technology Specialist','Language Teacher','Translator','Localization Specialist',

  // Practical, creative & specialist roles
  'Civil Engineer','Mechanical Engineer','Electrical Engineer','Chemical Engineer','Industrial Engineer','Architect',
  'Construction Manager','CAD Designer','AutoCAD Designer','Manufacturing Engineer','Quality Assurance Specialist',
  'Quality Control Specialist','Supply Chain Manager','Logistics Manager','Inventory Manager','Event Manager',
  'Hospitality Manager','Travel Planner','Real Estate Specialist','Property Manager','Interior Designer','Interior Stylist',
  'Fashion Designer','Music Producer','Music Composer','DJ','Actor','Voice Actor','Streamer','Gamer','Esports Manager',
  'Community Moderator','Customer Service Representative','Retail Manager','General Virtual Assistant'
];

const ROLE_KEYWORDS: Record<string, string[]> = {
  'AI Engineer': ['Python', 'Machine Learning', 'LLM', 'RAG', 'AI'],
  'AI Product Manager': ['Product', 'AI', 'Roadmaps', 'User Research'],
  'Prompt Engineer': ['Prompt Design', 'LLM', 'AI', 'Evaluation'],
  'ML Engineer': ['Python', 'Machine Learning', 'PyTorch', 'MLOps'],
  'Frontend Developer': ['React', 'TypeScript', 'CSS', 'UI'],
  'Backend Developer': ['Node.js', 'Python', 'APIs', 'Databases'],
  'Full-Stack Developer': ['React', 'TypeScript', 'Node.js', 'Database'],
  'DevOps Engineer': ['AWS', 'Docker', 'CI/CD', 'Kubernetes'],
  'Cloud Engineer': ['AWS', 'Cloud Architecture', 'Docker', 'DevOps'],
  'UI/UX Designer': ['Figma', 'UX Research', 'Prototyping', 'UI Design'],
  'Product Manager': ['Roadmaps', 'User Research', 'Analytics', 'Product'],
  'Growth Marketer': ['SEO', 'Analytics', 'Content', 'Acquisition'],
  'Marketing Expert': ['Marketing Strategy', 'Brand', 'Content', 'Acquisition'],
  'Sales Specialist': ['B2B Sales', 'Outreach', 'CRM', 'Negotiation'],
  'Content Creator': ['Content Strategy', 'Copywriting', 'Social Media', 'Video'],
  'Video Editor': ['Premiere Pro', 'After Effects', 'Short-form Video', 'Motion'],
  'Data Analyst': ['SQL', 'Excel', 'Analytics', 'Dashboards'],
  'Data Scientist': ['Python', 'SQL', 'Machine Learning', 'Statistics'],
};

const normalizeRole = (value: string) => value.trim().toLowerCase();

const PARTNERSHIP_MODES: Array<{ value: PartnershipMode; label: string; description: string }> = [
  { value: 'equity', label: 'Equity', description: 'Offer ownership in the startup.' },
  { value: 'pay_per_hour', label: 'Based on hour', description: 'Pay a fixed amount for each hour worked.' },
  { value: 'pay_per_task', label: 'Per task', description: 'Pay for each clearly defined task or deliverable.' },
  { value: 'fixed_project', label: 'Per project', description: 'Pay one agreed amount for the complete project.' },
  { value: 'pay_on_delivery', label: 'Pay on delivery / milestone', description: 'Release payment when the agreed result is delivered.' },
  { value: 'monthly_salary', label: 'Monthly salary / stipend', description: 'Recurring cash compensation per month.' },
  { value: 'revenue_share', label: 'Share of company revenue', description: 'Pay a percentage of company revenue.' },
  { value: 'profit_share', label: 'Share of company profit', description: 'Pay a percentage of company profit.' },
  { value: 'commission', label: 'Sales commission', description: 'Pay a percentage tied to sales or collected revenue.' },
  { value: 'equity_plus_cash', label: 'Equity + cash', description: 'Combine startup ownership with cash compensation.' },
  { value: 'helper', label: 'Volunteer / helper', description: 'No required cash payment; define the arrangement.' },
  { value: 'work_exchange', label: 'Work exchange', description: 'Exchange defined work or non-cash value.' },
  { value: 'custom', label: 'Custom arrangement', description: 'Describe another compensation structure.' },
];

interface StartupRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onRegisterStartup: (newStartup: Startup) => Promise<void> | void;
}

export const StartupRegistrationModal: React.FC<StartupRegistrationModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onRegisterStartup,
}) => {
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [industry, setIndustry] = useState('Artificial Intelligence');
  const [stage, setStage] = useState<'Pre-Seed' | 'Seed' | 'Series A'>('Pre-Seed');
  const [pitch, setPitch] = useState('');
  const [problem, setProblem] = useState('');
  const [solution, setSolution] = useState('');
  const [targetCustomer, setTargetCustomer] = useState('');
  const [businessModel, setBusinessModel] = useState('');
  const [tractionDetails, setTractionDetails] = useState('');
  const [competitiveAdvantage, setCompetitiveAdvantage] = useState('');
  const [foundingStory, setFoundingStory] = useState('');
  const [vision, setVision] = useState('');
  const [currentChallenges, setCurrentChallenges] = useState('');
  const [techStackInput, setTechStackInput] = useState('React, TypeScript, Python, Gemini API');
  const [fundingRaised, setFundingRaised] = useState('$150,000');
  const [valuationUsd, setValuationUsd] = useState('2500000');
  const [location, setLocation] = useState('San Francisco, CA (Remote)');
  const [roleInput, setRoleInput] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [rolePartnerships, setRolePartnerships] = useState<Record<string, RolePartnership>>({});
  const [roleError, setRoleError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const { currency, rates, format: formatMoney } = useLocalizedCurrency(currentUser);
  const currencyOptions = React.useMemo(() => getCurrencyOptions(), []);

  const roleSuggestions = React.useMemo(() => {
    const industryRoles = ROLE_SUGGESTIONS[industry] || ROLE_SUGGESTIONS['Artificial Intelligence'];
    const leadershipRoles = ['Chief Executive Officer (CEO)', 'Chief Technology Officer (CTO)', 'Chief Operating Officer (COO)', 'Chief Marketing Officer (CMO)', 'Marketing Expert'];
    const query = normalizeRole(roleInput);
    const source = query ? ALL_ROLE_OPTIONS : [...industryRoles, ...leadershipRoles];
    return source
      .filter((role, index, list) => list.findIndex((item) => normalizeRole(item) === normalizeRole(role)) === index)
      .filter((role) => !query || normalizeRole(role).includes(query))
      .slice(0, 10);
  }, [industry, roleInput]);

  const roleKeywords = React.useMemo(() => {
    const latestRole = selectedRoles[selectedRoles.length - 1];
    if (latestRole && ROLE_KEYWORDS[latestRole]) return ROLE_KEYWORDS[latestRole];
    return techStackInput.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 4);
  }, [selectedRoles, techStackInput]);

  const addRole = (role: string) => {
    const clean = role.trim();
    if (!clean) return;
    if (!selectedRoles.some((item) => normalizeRole(item) === normalizeRole(clean))) {
      setSelectedRoles((prev) => [...prev, clean]);
      setRolePartnerships((prev) => ({
        ...prev,
        [clean]: prev[clean] || {
          mode: 'pay_per_task',
          label: 'Per task',
          amount: 150,
          amountUsd: convertLocalToUsd(150, currency, rates),
          currencyCode: currency,
          unit: 'task',
        },
      }));
    }
    setRoleInput('');
    setRoleError('');
  };

  const removeRole = (role: string) => {
    setSelectedRoles((prev) => prev.filter((item) => item !== role));
    setRolePartnerships((prev) => {
      const next = { ...prev };
      delete next[role];
      return next;
    });
  };

  const updatePartnership = (role: string, patch: Partial<RolePartnership>) => {
    setRolePartnerships((prev) => ({
      ...prev,
      [role]: {
        ...(prev[role] || { mode: 'pay_per_task', label: 'Pay per work / task' }),
        ...patch,
      },
    }));
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !tagline.trim()) return;

    const finalRoles = [...selectedRoles, ...(roleInput.trim() ? [roleInput.trim()] : [])]
      .filter((role, index, arr) => arr.findIndex((item) => normalizeRole(item) === normalizeRole(role)) === index);

    if (finalRoles.length === 0) {
      setRoleError('Add at least one role your startup needs.');
      return;
    }

    const startupQuestions: Array<[string, string, number]> = [
      ['Problem', problem, 40],
      ['Solution', solution, 40],
      ['Target customer', targetCustomer, 25],
      ['Business model', businessModel, 20],
      ['Traction / validation', tractionDetails, 20],
      ['Competitive advantage', competitiveAdvantage, 30],
      ['Founding story', foundingStory, 30],
      ['Long-term vision', vision, 30],
      ['Current challenges', currentChallenges, 20],
    ];
    const missingQuestion = startupQuestions.find(([, value, min]) => value.trim().length < min);
    if (missingQuestion) {
      setSaveError(missingQuestion[0] + ' must be at least ' + missingQuestion[2] + ' characters so your startup profile is clear.');
      return;
    }

    setIsSynthesizing(true);
    setSaveError('');
    setRoleError('');

    const techStack = techStackInput.split(',').map(s => s.trim()).filter(Boolean);
    const startupId = 'startup-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    const createdDate = new Date();

    let startupLogo = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=200&q=80';
    let startupCover = 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80';

    try {
      if (logoFile) {
        const logoRef = ref(storage, `startups/${startupId}/logo-${Date.now()}-${logoFile.name.replace(/[^a-zA-Z0-9._-]/g, '')}`);
        await uploadBytes(logoRef, logoFile, { contentType: logoFile.type });
        startupLogo = await getDownloadURL(logoRef);
      }
      if (coverFile) {
        const coverRef = ref(storage, `startups/${startupId}/cover-${Date.now()}-${coverFile.name.replace(/[^a-zA-Z0-9._-]/g, '')}`);
        await uploadBytes(coverRef, coverFile, { contentType: coverFile.type });
        startupCover = await getDownloadURL(coverRef);
      }
    } catch (uploadError) {
      console.error('Startup image upload failed:', uploadError);
      setSaveError('The startup image upload failed. Please try smaller image files and try again.');
      setIsSynthesizing(false);
      return;
    }
    const createdDay = createdDate.toISOString().split('T')[0];


    // Build base object
    const newStartup: Startup = {
      id: startupId,
      name: name.trim(),
      tagline: tagline.trim(),
      industry,
      stage,
      problem: problem.trim(),
      solution: solution.trim(),
      targetCustomer: targetCustomer.trim(),
      businessModel: businessModel.trim(),
      tractionDetails: tractionDetails.trim(),
      competitiveAdvantage: competitiveAdvantage.trim(),
      foundingStory: foundingStory.trim(),
      vision: vision.trim(),
      currentChallenges: currentChallenges.trim(),
      website: `https://${name.trim().toLowerCase().replace(/\s+/g, '')}.io`,
      foundedYear: String(new Date().getFullYear()),
      location,
      founderId: currentUser.id,
      founderName: currentUser.name,
      founderAvatar: currentUser.avatar,
      fundingRaised,
      valuationUsd: Number(valuationUsd) || 0,
      currencyCode: currency,
      investorReadinessScore: 84,
      growthVelocityScore: 88,
      verified: true,
      logo: startupLogo,
      coverImage: startupCover,
      pitch: pitch.trim() || tagline.trim(),
      techStack,
      historyLogs: [
        {
          id: 'hist-reg-' + startupId,
          date: createdDay,
          type: 'milestone',
          title: 'Registered on THE MORN AI Ecosystem',
          description: `${name} registered on THE MORN AI by ${currentUser.name} to onboard skilled talent via AI sprint delegation.`,
          impact: 'Initialized automated AI Co-Founder memory index.',
        },
      ],
      roadmap: [
        {
          id: `rm-${Date.now()}-1`,
          phase: 'Phase 1 MVP Sprint',
          title: 'Core Architecture & Contributor Onboarding',
          description: 'Ship initial product iteration and integrate newly joined skill contributors.',
          duration: 'Weeks 1-4',
          kpiTarget: 'Launch private beta to 100 pilot users',
          status: 'in_progress',
          talentNeeded: finalRoles,
          riskFactors: 'Sprint execution pace',
        },
        {
          id: `rm-${Date.now()}-2`,
          phase: 'Phase 2 Traction',
          title: 'Telemetry Analytics & Syndicate Pitching',
          description: 'Validate customer retention cohorts and syndicate with angel investors.',
          duration: 'Weeks 5-8',
          kpiTarget: '$15k MRR or 5,000 active sessions',
          status: 'upcoming',
          talentNeeded: finalRoles.slice(0, 2),
          riskFactors: 'Customer acquisition cost',
        },
      ],
      openRoles: finalRoles.map((role, index) => ({
        id: startupId + '-role-' + (index + 1),
        startupId,
        startupName: name.trim(),
        startupLogo: startupLogo,
        title: role,
        type: rolePartnerships[role]?.label || 'Per task',
        equityRange: rolePartnerships[role]?.equityPercent ? String(rolePartnerships[role]?.equityPercent) + '%' : 'Not applicable',
        stipendRange: rolePartnerships[role]?.amount !== undefined
          ? formatAnyCurrency(rolePartnerships[role]!.amount!, rolePartnerships[role]!.currencyCode || currency)
          : (rolePartnerships[role]?.amountUsd ? formatAnyCurrency(rolePartnerships[role]!.amountUsd!, 'USD') : 'Founder-defined'),
        commitment: rolePartnerships[role]?.milestone || 'Founder-defined',
        partnership: rolePartnerships[role] || {
          mode: 'pay_per_task',
          label: 'Per task',
          amount: 150,
          amountUsd: convertLocalToUsd(150, currency, rates),
          currencyCode: currency,
          unit: 'task',
        },
        skills: ROLE_KEYWORDS[role] || techStack.slice(0, 4),
        description: 'Join ' + name.trim() + ' as a ' + role + ' and help move the startup roadmap forward.',
        responsibilities: ['Own deliverables for the selected role', 'Collaborate with the founder and startup team'],
        idealCandidate: 'A motivated ' + role + ' who wants meaningful ownership in an early-stage startup.',
        postedDate: createdDay,
        applicantCount: 0,
        status: 'open' as const,
      })),
      members: [
        {
          userId: currentUser.id,
          name: currentUser.name,
          role: 'Founder & CEO',
          avatar: currentUser.avatar,
          joinedDate: new Date().toISOString().split('T')[0],
          equityOrStipend: 'Founder Equity',
          status: 'active',
          skills: currentUser.skills,
          profileDetails: currentUser.onboarding || {},
        },
      ],
      tasks: [
        {
          id: startupId + '-task-1',
          startupId,
          assigneeId: currentUser.id,
          assigneeName: currentUser.name,
          assigneeAvatar: currentUser.avatar,
          title: 'Set up Sprint Backlog & Onboard First Contributor',
          priority: 'High',
          status: 'todo',
          estimatedHours: 6,
          deadline: '3 days',
          description: 'Review incoming talent appointments and allocate the first Phase 1 sprint package.',
          actionItems: ['Review talent applications', 'Confirm sync slots', 'Define first contributor deliverable'],
          aiMentoringTip: 'Keep initial onboarding tasks modular and below 10 hours for fast contributor momentum.',
          createdAt: createdDay,
        },
        {
          id: startupId + '-task-2',
          startupId,
          assigneeId: currentUser.id,
          assigneeName: currentUser.name,
          assigneeAvatar: currentUser.avatar,
          title: 'Validate the MVP scope',
          priority: 'High',
          status: 'todo',
          estimatedHours: 4,
          deadline: '5 days',
          description: 'Turn the startup problem, target customer and first milestone into a clear MVP scope.',
          actionItems: ['Write the core user flow', 'Define the non-negotiable MVP features', 'Remove low-priority scope'],
          aiMentoringTip: 'A smaller validated loop beats a large roadmap that nobody ships.',
          createdAt: createdDay,
        },
        {
          id: startupId + '-task-3',
          startupId,
          assigneeId: currentUser.id,
          assigneeName: currentUser.name,
          assigneeAvatar: currentUser.avatar,
          title: 'Publish the first contributor opportunity',
          priority: 'Medium',
          status: 'todo',
          estimatedHours: 3,
          deadline: '7 days',
          description: 'Review the published roles and make the first opportunity specific enough for a skilled contributor to act on.',
          actionItems: ['Choose the highest-priority role', 'Clarify expected output', 'Publish and review incoming interest'],
          aiMentoringTip: 'Good role definitions describe the outcome, not just the job title.',
          createdAt: createdDay,
        },
      ],
    };

    // Attempt AI roadmap enhancement
    try {
      const res = await fetch('/api/ai/generate-roadmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startup: newStartup }),
      });
      const data = await res.json();
      if (data.roadmap && Array.isArray(data.roadmap) && data.roadmap.length > 0) {
        newStartup.roadmap = data.roadmap.map((rm: any, idx: number) => ({
          id: `rm-gen-${Date.now()}-${idx}`,
          phase: rm.phase || `Phase ${idx + 1}`,
          title: rm.objective || rm.title || 'Milestone',
          description: (rm.milestones || []).join('. ') || rm.description || '',
          duration: rm.duration || 'Weeks 1-4',
          kpiTarget: rm.kpiTarget || 'Validate metrics',
          status: idx === 0 ? ('in_progress' as const) : ('upcoming' as const),
          talentNeeded: rm.talentNeeded || ['Engineer'],
          riskFactors: rm.riskFactors || 'Market velocity',
        }));
      }
    } catch (err) {
      console.warn('AI roadmap generation fallback to default', err);
    }

    try {
      await onRegisterStartup(newStartup);
      setName('');
      setTagline('');
      setPitch('');
      setProblem('');
      setSolution('');
      setTargetCustomer('');
      setBusinessModel('');
      setTractionDetails('');
      setCompetitiveAdvantage('');
      setFoundingStory('');
      setVision('');
      setCurrentChallenges('');
      setValuationUsd('2500000');
      setRoleInput('');
      setSelectedRoles([]);
      setRolePartnerships({});
      setIsSynthesizing(false);
      onClose();
    } catch (err) {
      console.error('Startup registration failed:', err);
      setIsSynthesizing(false);
      setSaveError('The startup could not be saved. Check your Firebase connection and try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/55 p-2 backdrop-blur-sm sm:p-4">
      <div className="relative mx-auto flex max-h-[calc(100dvh-1rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150 sm:max-h-[calc(100dvh-2rem)]">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-20 grid h-9 w-9 place-items-center rounded-full border border-white/20 bg-white/10 p-2 text-white/80 backdrop-blur-md transition-colors hover:bg-white/20 hover:text-white sm:right-4 sm:top-4"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="shrink-0 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 p-5 text-white sm:p-6">
          <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-1">
            <Rocket className="w-4 h-4" />
            Founder Onboarding
          </div>
          <h3 className="text-xl font-extrabold font-['Outfit']">
            Register Your Ongoing Startup
          </h3>
          <p className="text-xs text-indigo-200 mt-1">
            Publish your startup to the THE MORN AI community, enable skilled talent appointments, and activate your automated AI Co-Founder.
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 pb-7 space-y-4 sm:p-6 sm:pb-8"
        >
          
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/50 p-4 text-left cursor-pointer hover:border-violet-400 hover:bg-violet-50 transition">
              <span className="flex items-center gap-2 text-xs font-black text-violet-700"><ImagePlus className="h-4 w-4" /> Startup logo</span>
              <span className="mt-1 block text-[10px] text-slate-500">PNG/JPG/WebP • up to 10 MB</span>
              <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => setLogoFile(event.target.files?.[0] || null)} />
              <span className="mt-3 flex items-center gap-2 text-[11px] font-bold text-slate-600"><UploadCloud className="h-3.5 w-3.5 text-violet-500" /> {logoFile?.name || 'Choose logo'}</span>
            </label>
            <label className="rounded-2xl border border-dashed border-sky-200 bg-sky-50/50 p-4 text-left cursor-pointer hover:border-sky-400 hover:bg-sky-50 transition">
              <span className="flex items-center gap-2 text-xs font-black text-sky-700"><ImagePlus className="h-4 w-4" /> Background image</span>
              <span className="mt-1 block text-[10px] text-slate-500">PNG/JPG/WebP • up to 10 MB</span>
              <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => setCoverFile(event.target.files?.[0] || null)} />
              <span className="mt-3 flex items-center gap-2 text-[11px] font-bold text-slate-600"><UploadCloud className="h-3.5 w-3.5 text-sky-500" /> {coverFile?.name || 'Choose image'}</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Startup Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. SynapseAI, EcoMetric"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Industry Sector
              </label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-medium"
              >
                <option value="Artificial Intelligence">Artificial Intelligence</option>
                <option value="ClimateTech">ClimateTech</option>
                <option value="Developer Tools">Developer Tools</option>
                <option value="Biotech">Biotech</option>
                <option value="Fintech">Fintech</option>
                <option value="HealthTech">HealthTech</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              One-Line Mission / Tagline
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Autonomous voice agents for clinic triage"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Current Stage
              </label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value as any)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-medium"
              >
                <option value="Pre-Seed">Pre-Seed</option>
                <option value="Seed">Seed</option>
                <option value="Series A">Series A</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Funding Raised
              </label>
              <input
                type="text"
                placeholder="e.g. $150,000"
                value={fundingRaised}
                onChange={(e) => setFundingRaised(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Company Valuation ({currency})
              </label>
              <input
                type="number"
                min="0"
                value={valuationUsd ? convertUsd(Number(valuationUsd), currency, rates) : ''}
                onChange={(e) => setValuationUsd(String(convertLocalToUsd(Number(e.target.value) || 0, currency, rates)))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
              />
              <p className="mt-1 text-[9px] text-slate-400">Displayed to viewers in their regional currency.</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Location
              </label>
              <input
                type="text"
                placeholder="e.g. San Francisco (Remote)"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Tech Stack (comma separated)
            </label>
            <input
              type="text"
              placeholder="React, TypeScript, Python, PyTorch, Gemini API"
              value={techStackInput}
              onChange={(e) => setTechStackInput(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
            />
          </div>

          <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-violet-600 shadow-sm"><BrainCircuit className="h-4 w-4" /></span>
              <div>
                <p className="text-xs font-black text-slate-950">Build a clear startup profile</p>
                <p className="mt-1 text-[10px] leading-5 text-slate-500">Answer these questions so contributors can understand the startup before they connect. The AI buttons are design-only for now.</p>
              </div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <StartupQuestion label="What problem are you solving?" value={problem} onChange={setProblem} min={40} rows={4} placeholder="Explain the customer pain, who experiences it, and why it matters." />
              <StartupQuestion label="How does your solution work?" value={solution} onChange={setSolution} min={40} rows={4} placeholder="Describe the product, service, workflow or technology." />
              <StartupQuestion label="Who is the target customer?" value={targetCustomer} onChange={setTargetCustomer} min={25} rows={3} placeholder="Define the buyer, user, market segment or customer profile." />
              <StartupQuestion label="How does the startup make money?" value={businessModel} onChange={setBusinessModel} min={20} rows={3} placeholder="Describe pricing, subscriptions, transactions or services." />
              <StartupQuestion label="What traction or validation do you have?" value={tractionDetails} onChange={setTractionDetails} min={20} rows={3} placeholder="Users, revenue, pilots, waitlist, experiments or partnerships." />
              <StartupQuestion label="What is your competitive advantage?" value={competitiveAdvantage} onChange={setCompetitiveAdvantage} min={30} rows={3} placeholder="Explain why this startup can win and what is hard to copy." />
              <StartupQuestion label="Why did you start this company?" value={foundingStory} onChange={setFoundingStory} min={30} rows={3} placeholder="Share the founder insight, story or experience behind the startup." />
              <StartupQuestion label="What is the long-term vision?" value={vision} onChange={setVision} min={30} rows={3} placeholder="Describe what you want this company to become." />
              <StartupQuestion label="What are the biggest challenges right now?" value={currentChallenges} onChange={setCurrentChallenges} min={20} rows={3} placeholder="List the bottlenecks where the right contributor can create leverage." />
            </div>
          </section>

          <div className="rounded-2xl border border-violet-200 bg-violet-50/70 p-4">
            <div className="flex items-center gap-2">
              <PlusCircle className="h-4 w-4 text-violet-600" />
              <div>
                <p className="text-xs font-extrabold text-violet-950">What roles do you need?</p>
                <p className="text-[10px] text-violet-700">Search across the full role directory, then select one or add your own custom role.</p>
              </div>
            </div>

            <input
              type="text"
              value={roleInput}
              onChange={(e) => setRoleInput(e.target.value)}
              placeholder="e.g. Video Editor, AI Engineer, Sales..."
              className="mt-3 w-full px-3 py-2.5 text-sm border border-violet-200 rounded-xl bg-white focus:ring-2 focus:ring-violet-400 focus:outline-none font-semibold"
            />

            {roleInput.trim() && roleSuggestions.length === 0 && (
              <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-[10px] font-bold text-amber-800">No matching suggested role.</p>
                <button
                  type="button"
                  onClick={() => addRole(roleInput)}
                  className="mt-1 inline-flex items-center gap-1.5 text-xs font-extrabold text-amber-900"
                >
                  <PlusCircle className="h-3.5 w-3.5" /> Use “{roleInput.trim()}”
                </button>
              </div>
            )}

            <div className="mt-2 flex flex-wrap gap-2">
              {roleSuggestions.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => addRole(role)}
                  className="rounded-full border border-violet-200 bg-white px-2.5 py-1.5 text-[10px] font-extrabold text-violet-700 hover:bg-violet-50"
                >
                  + {role}
                </button>
              ))}
            </div>

            {selectedRoles.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedRoles.map((role) => (
                  <span key={role} className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-1.5 text-[10px] font-extrabold text-white">
                    <Check className="h-3 w-3 text-emerald-300" />
                    {role}
                    <button
                      type="button"
                      onClick={() => removeRole(role)}
                      className="ml-1 text-slate-300 hover:text-white"
                      aria-label={'Remove ' + role}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {selectedRoles.length > 0 && (
              <div className="mt-4 space-y-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[.15em] text-violet-700">Partnership for each role</p>
                  <p className="mt-1 text-[10px] leading-5 text-violet-700/80">You choose the exact way the contributor will work with your startup. This is shown publicly before they open the startup.</p>
                </div>

                {selectedRoles.map((role) => {
                  const partnership = rolePartnerships[role] || {
                    mode: 'pay_per_task' as const,
                    label: 'Per task',
                    amount: 150,
                    amountUsd: convertLocalToUsd(150, currency, rates),
                    currencyCode: currency,
                    unit: 'task',
                    details: '',
                  };
                  const mode = PARTNERSHIP_MODES.find((item) => item.value === partnership.mode) || PARTNERSHIP_MODES[4];

                  return (
                    <div key={role} className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-black text-slate-950">{role}</p>
                          <p className="mt-0.5 text-[10px] text-slate-500">{mode.description}</p>
                        </div>
                        <button type="button" onClick={() => removeRole(role)} className="text-[10px] font-black text-slate-400 hover:text-rose-600">Remove</button>
                      </div>

                      <select
                        value={partnership.mode}
                        onChange={(event) => {
                          const nextMode = event.target.value as PartnershipMode;
                          const nextMeta = PARTNERSHIP_MODES.find((item) => item.value === nextMode)!;
                          updatePartnership(role, {
                            mode: nextMode,
                            label: nextMeta.label,
                            ...(nextMode === 'equity' ? { amountUsd: undefined, unit: undefined } : {}),
                          });
                        }}
                        className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-50"
                      >
                        {PARTNERSHIP_MODES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                      </select>

                      {partnership.mode === 'equity' && (
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="text-[9px] font-black uppercase tracking-[.12em] text-slate-400">Equity offered</label>
                            <div className="mt-1 flex overflow-hidden rounded-xl border border-slate-200">
                              <input type="number" min="0" max="100" step="0.01" value={partnership.equityPercent || ''} onChange={(event) => updatePartnership(role, { equityPercent: event.target.value })} placeholder="e.g. 2.0" className="min-w-0 flex-1 bg-white px-3 py-2 text-xs outline-none" />
                              <span className="grid place-items-center bg-slate-50 px-3 text-xs font-black text-slate-500">%</span>
                            </div>
                          </div>
                          <div>
                            <label className="text-[9px] font-black uppercase tracking-[.12em] text-slate-400">Ownership scope</label>
                            <input value={partnership.details || ''} onChange={(event) => updatePartnership(role, { details: event.target.value })} placeholder="e.g. CTO-level technical direction" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none" />
                          </div>
                        </div>
                      )}

                      {['pay_per_hour', 'pay_per_task', 'fixed_project', 'pay_on_delivery', 'monthly_salary', 'work_exchange', 'equity_plus_cash'].includes(partnership.mode) && (
                        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_180px]">
                          <div>
                            <label className="text-[9px] font-black uppercase tracking-[.12em] text-slate-400">Money amount</label>
                            <input type="number" min="0" step="0.01" value={partnership.amount ?? ''} onChange={(event) => {
                              const amount = Number(event.target.value);
                              updatePartnership(role, {
                                amount: Number.isFinite(amount) ? amount : undefined,
                                amountUsd: Number.isFinite(amount) ? convertLocalToUsd(amount, partnership.currencyCode || currency, rates) : undefined,
                              });
                            }} placeholder="Enter amount" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none" />
                            <p className="mt-1 text-[9px] text-slate-400">Enter the exact amount in the selected currency.</p>
                          </div>
                          <div>
                            <label className="text-[9px] font-black uppercase tracking-[.12em] text-slate-400">Currency</label>
                            <select value={partnership.currencyCode || currency} onChange={(event) => {
                              const nextCurrency = event.target.value;
                              const localAmount = partnership.amount || 0;
                              updatePartnership(role, {
                                currencyCode: nextCurrency,
                                amountUsd: localAmount ? convertLocalToUsd(localAmount, nextCurrency, rates) : undefined,
                              });
                            }} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-800 outline-none">
                              {currencyOptions.map((option) => <option key={option.code} value={option.code}>{option.label}</option>)}
                            </select>
                          </div>
                        </div>
                      )}

                      {['revenue_share', 'profit_share', 'commission'].includes(partnership.mode) && (
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="text-[9px] font-black uppercase tracking-[.12em] text-slate-400">{partnership.mode === 'profit_share' ? 'Profit share' : partnership.mode === 'commission' ? 'Commission' : 'Revenue share'}</label>
                            <div className="mt-1 flex overflow-hidden rounded-xl border border-slate-200">
                              <input type="number" min="0" max="100" step="0.01" value={partnership.equityPercent || ''} onChange={(event) => updatePartnership(role, { equityPercent: event.target.value })} placeholder="e.g. 5" className="min-w-0 flex-1 bg-white px-3 py-2 text-xs outline-none" />
                              <span className="grid place-items-center bg-slate-50 px-3 text-xs font-black text-slate-500">%</span>
                            </div>
                          </div>
                          <div>
                            <label className="text-[9px] font-black uppercase tracking-[.12em] text-slate-400">How it is calculated</label>
                            <input value={partnership.details || ''} onChange={(event) => updatePartnership(role, { details: event.target.value })} placeholder="e.g. net profit, collected sales or subscription revenue" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none" />
                          </div>
                        </div>
                      )}

                      {(partnership.mode === 'helper' || partnership.mode === 'custom') && (
                        <div className="mt-3">
                          <label className="text-[9px] font-black uppercase tracking-[.12em] text-slate-400">{partnership.mode === 'custom' ? 'Custom compensation terms' : 'Helper arrangement'}</label>
                          <textarea rows={3} value={partnership.details || ''} onChange={(event) => updatePartnership(role, { details: event.target.value })} placeholder="Describe exactly how the contributor will be compensated or what the helper receives." className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs leading-5 outline-none" />
                        </div>
                      )}

                      <div className="mt-3">
                        <label className="text-[9px] font-black uppercase tracking-[.12em] text-slate-400">Scope / milestone</label>
                        <input value={partnership.milestone || ''} onChange={(event) => updatePartnership(role, { milestone: event.target.value })} placeholder="What work, period or outcome is covered?" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none" />
                      </div>

                      <div className="mt-3">
                        <label className="text-[9px] font-black uppercase tracking-[.12em] text-slate-400">Success expectation</label>
                        <input value={partnership.expectation || ''} onChange={(event) => updatePartnership(role, { expectation: event.target.value })} placeholder="What does success look like for this role?" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-3 rounded-xl border border-violet-100 bg-white/80 p-3">
              <p className="text-[9px] font-extrabold uppercase tracking-[.14em] text-violet-500">Key skills / keywords</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {roleKeywords.map((keyword) => (
                  <span key={keyword} className="rounded-full bg-violet-50 px-2 py-1 text-[9px] font-bold text-violet-700">
                    {keyword}
                  </span>
                ))}
              </div>
            </div>

            {roleError && <p className="mt-2 text-xs font-bold text-rose-600">{roleError}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Problem & Solution Pitch
            </label>
            <div className="relative">
              <textarea rows={3} placeholder="Describe the market opportunity, customer pain points, and current traction..." value={pitch} onChange={(e) => setPitch(e.target.value)} className="w-full px-3 py-2 pr-16 pb-10 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium" />
              <AiAssistButton />
            </div>
          </div>

          <div className="bg-indigo-50 p-3.5 rounded-xl border border-indigo-100 flex items-start gap-2.5 text-xs text-indigo-900">
            <BrainCircuit className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Your selected roles will be saved with this startup. MornAI will not invent an extra job during creation.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSynthesizing}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2"
            >
              <Sparkles className={`w-4 h-4 ${isSynthesizing ? 'animate-spin' : ''}`} />
              {isSynthesizing ? 'Synthesizing with AI...' : 'Register Startup & Initialize AI'}
            </button>
          </div>

          {saveError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-700">
              {saveError}
            </div>
          )}

        </form>

      </div>
    </div>
  );
};


const AiAssistButton = () => (
  <button
    type="button"
    disabled
    title="AI startup writing assistance will be connected in the final AI rollout."
    className="absolute bottom-2 right-2 inline-flex h-7 items-center gap-1 rounded-lg border border-violet-200 bg-white/90 px-2 text-[9px] font-black text-violet-600 shadow-sm opacity-90 disabled:cursor-not-allowed"
  >
    <Sparkles className="h-3 w-3" /> AI
  </button>
);

const StartupQuestion = ({ label, value, onChange, min, rows, placeholder }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min: number;
  rows: number;
  placeholder: string;
}) => (
  <label className="block">
    <span className="mb-2 block text-[10px] font-black uppercase tracking-[.11em] text-slate-500">
      {label} • minimum {min} characters
    </span>
    <div className="relative">
      <textarea required minLength={min} rows={rows} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-16 pb-10 text-xs leading-6 text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-50" />
      <AiAssistButton />
    </div>
  </label>
);
