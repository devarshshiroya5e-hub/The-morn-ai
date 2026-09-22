export type UserRole = 'founder' | 'employee';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  title: string;
  bio: string;
  skills: string[];
  startupId?: string;
  hourlyRate?: string;
  equityPreference?: string;
  reputationScore?: number;
  completedMilestones?: number;
  onboarding?: {
    story?: string;
    goal?: string;
    startupName?: string;
    startupStage?: string;
    industry?: string;
    availability?: string;
    workStyle?: string;
    experienceLevel?: string;
    profileTitle?: string;
    contribution?: string;
    motivation?: string;
    problem?: string;
    targetCustomer?: string;
    traction?: string;
    previousWins?: string;
    desiredRole?: string;
    focusAreas?: string;
    achievements?: string;
    idealStartup?: string;
    region?: string;
    countryCode?: string;
  };
}

export type PartnershipMode =
  | 'equity'
  | 'helper'
  | 'pay_on_delivery'
  | 'pay_per_hour'
  | 'pay_per_task'
  | 'fixed_project'
  | 'revenue_share'
  | 'equity_plus_cash';

export interface RolePartnership {
  mode: PartnershipMode;
  label: string;
  equityPercent?: string;
  amountUsd?: number;
  unit?: string;
  milestone?: string;
  details?: string;
}

export interface StartupHistoryLog {
  id: string;
  date: string;
  type: 'pivot' | 'milestone' | 'tech_choice' | 'traction' | 'funding' | 'bottleneck';
  title: string;
  description: string;
  impact: string;
}

export interface StartupMember {
  userId: string;
  name: string;
  role: string;
  avatar: string;
  joinedDate: string;
  equityOrStipend: string;
  status: 'active' | 'invited';
  skills?: string[];
  profileDetails?: User['onboarding'];
}

export interface RoadmapMilestone {
  id: string;
  phase: string;
  title: string;
  description: string;
  duration: string;
  kpiTarget: string;
  status: 'completed' | 'in_progress' | 'upcoming';
  talentNeeded: string[];
  riskFactors?: string;
}

export interface RolePost {
  id: string;
  startupId: string;
  startupName: string;
  startupLogo?: string;
  title: string;
  type: string;
  equityRange: string;
  stipendRange: string;
  partnership?: RolePartnership;
  commitment: string;
  skills: string[];
  description: string;
  responsibilities: string[];
  idealCandidate: string;
  postedDate: string;
  applicantCount: number;
  status: 'open' | 'filled';
}

export interface Appointment {
  id: string;
  participants?: string[];
  startupId: string;
  startupName: string;
  founderId: string;
  founderName: string;
  talentId: string;
  talentName: string;
  talentAvatar: string;
  talentSkills: string[];
  roleTitle: string;
  date: string;
  time: string;
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled';
  meetingLink: string;
  pitchMessage: string;
  aiMatchScore: number;
  aiPreparationBrief?: string;
  createdDate: string;
}

export interface TaskItem {
  id: string;
  startupId: string;
  assigneeId: string;
  assigneeName: string;
  assigneeAvatar?: string;
  title: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'todo' | 'in_progress' | 'review' | 'done';
  estimatedHours: number;
  deadline: string;
  description: string;
  actionItems: string[];
  aiMentoringTip: string;
  createdAt: string;
}

export interface Startup {
  id: string;
  name: string;
  tagline: string;
  logo: string;
  coverImage?: string;
  industry: string;
  stage: 'Idea' | 'Pre-Seed' | 'Seed' | 'Series A';
  pitch: string;
  techStack: string[];
  website: string;
  foundedYear: string;
  founderId: string;
  founderName: string;
  founderAvatar: string;
  historyLogs: StartupHistoryLog[];
  members: StartupMember[];
  memberIds?: string[];
  persisted?: boolean;
  roadmap: RoadmapMilestone[];
  openRoles: RolePost[];
  tasks: TaskItem[];
  fundingRaised: string;
  valuationUsd?: number;
  location: string;
  currencyCode?: string;
  investorReadinessScore: number;
  growthVelocityScore: number;
  verified: boolean;
}

export interface PredictiveInsights {
  growthVelocityScore: number;
  investorReadinessScore: number;
  timeToMvpAcceleration: string;
  runwayImpactMonths: string;
  predictiveObservations: string[];
  networkSynergies: { name: string; fit: string; reason: string }[];
}

export interface MatchingAnalysis {
  matchScore: number;
  strengths: string[];
  synergyAnalysis: string;
  suggestedNextSteps: string;
}


export interface ChatMessage {
  id: string;
  roomId?: string;
  roomType?: 'world' | 'private';
  participants?: string[];
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  text: string;
  createdAt: string;
  createdAtClient?: number;
  clientId?: string;
  status?: 'sending' | 'sent' | 'failed';
  startupId?: string;
  recipientId?: string;
}


export interface MornaiPreferencesData {
  lastVisitedAt?: number;
  savedTalentIds?: string[];
  savedStartupIds?: string[];
  followedStartupIds?: string[];
  readNotificationIds?: string[];
  dailyFocus?: string;
  dailyStreak?: number;
  lastActiveDate?: string;
  dailyActionsCompleted?: number;
}

export interface ConnectionRequest {
  id: string;
  fromUserId: string;
  fromName: string;
  fromAvatar?: string;
  toUserId: string;
  toName: string;
  toAvatar?: string;
  participants: string[];
  startupId?: string;
  startupName?: string;
  roleId?: string;
  roleTitle?: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  createdAt?: unknown;
  createdAtClient: number;
  updatedAtClient?: number;
}
