import { Appointment, Startup, User } from '../types';

export interface MornaiNotification {
  id: string;
  type: 'match' | 'message' | 'progress' | 'opportunity' | 'appointment';
  title: string;
  description: string;
  timestamp: number;
  action: string;
  startupId?: string;
}

export interface MornaiPreferences {
  lastVisitedAt?: number;
  savedTalentIds?: string[];
  savedStartupIds?: string[];
  followedStartupIds?: string[];
  readNotificationIds?: string[];
  dailyFocus?: string;
}

export const normalizePreferences = (raw: unknown): MornaiPreferences => {
  const value = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  return {
    lastVisitedAt: typeof value.lastVisitedAt === 'number' ? value.lastVisitedAt : undefined,
    savedTalentIds: Array.isArray(value.savedTalentIds) ? value.savedTalentIds.filter((id): id is string => typeof id === 'string') : [],
    savedStartupIds: Array.isArray(value.savedStartupIds) ? value.savedStartupIds.filter((id): id is string => typeof id === 'string') : [],
    followedStartupIds: Array.isArray(value.followedStartupIds) ? value.followedStartupIds.filter((id): id is string => typeof id === 'string') : [],
    readNotificationIds: Array.isArray(value.readNotificationIds) ? value.readNotificationIds.filter((id): id is string => typeof id === 'string') : [],
    dailyFocus: typeof value.dailyFocus === 'string' ? value.dailyFocus : undefined,
  };
};

const dateToTimestamp = (date?: string) => {
  if (!date) return Date.now();
  const parsed = new Date(date.includes('T') ? date : `${date}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? Date.now() : parsed.getTime();
};

export const scoreTalentForStartup = (talent: User, startup?: Startup | null) => {
  if (!startup) return 72;
  const skills = (talent.skills || []).map((skill) => skill.toLowerCase());
  const stack = (startup.techStack || []).map((skill) => skill.toLowerCase());
  const required = (startup.openRoles || []).flatMap((role) => role.status === 'open' ? role.skills : []).map((skill) => skill.toLowerCase());
  const matched = Array.from(new Set([...stack, ...required])).filter((skill) => skills.some((item) => item === skill || item.includes(skill) || skill.includes(item)));
  const skillScore = Math.min(45, matched.length * 7);
  const reputationScore = Math.min(25, Math.round((talent.reputationScore || 80) * 0.25));
  const activityScore = Math.min(20, Math.round((talent.completedMilestones || 0) * 0.7));
  return Math.min(98, Math.max(60, 55 + skillScore + reputationScore + activityScore));
};

export const scoreStartupForTalent = (startup: Startup, talent: User) => {
  const skills = (talent.skills || []).map((skill) => skill.toLowerCase());
  const roleSkills = (startup.openRoles || [])
    .filter((role) => role.status === 'open')
    .flatMap((role) => role.skills)
    .map((skill) => skill.toLowerCase());
  const matched = Array.from(new Set(roleSkills)).filter((skill) =>
    skills.some((item) => item === skill || item.includes(skill) || skill.includes(item))
  );
  const score = 68 + Math.min(25, matched.length * 7) + (startup.verified ? 4 : 0) + Math.min(3, startup.openRoles.length);
  return Math.min(98, score);
};

export const buildMornaiNotifications = (
  user: User,
  startups: Startup[],
  appointments: Appointment[],
  now = Date.now(),
): MornaiNotification[] => {
  const items: MornaiNotification[] = [];

  if (user.role === 'founder') {
    const owned = startups.filter((startup) => startup.founderId === user.id);
    owned.forEach((startup) => {
      startup.openRoles.filter((role) => role.status === 'open').forEach((role) => {
        const ts = dateToTimestamp(role.postedDate);
        items.push({
          id: `role-${role.id}`,
          type: 'opportunity',
          title: `${role.title} is still open`,
          description: `${role.applicantCount || 0} applicants or interested builders are attached to this opportunity.`,
          timestamp: ts,
          action: 'Review role',
          startupId: startup.id,
        });
      });
      const unfinished = startup.tasks.filter((task) => task.status !== 'done');
      if (unfinished.length) {
        items.push({
          id: `tasks-${startup.id}`,
          type: 'progress',
          title: `${unfinished.length} execution item${unfinished.length === 1 ? '' : 's'} need attention`,
          description: `Your startup still has work moving through the current roadmap.`,
          timestamp: now - 60_000,
          action: 'Open workspace',
          startupId: startup.id,
        });
      }
    });
  } else {
    startups
      .filter((startup) => startup.openRoles.some((role) => role.status === 'open'))
      .sort((a, b) => scoreStartupForTalent(b, user) - scoreStartupForTalent(a, user))
      .slice(0, 8)
      .forEach((startup) => {
        const score = scoreStartupForTalent(startup, user);
        items.push({
          id: `match-${startup.id}`,
          type: 'match',
          title: `${startup.name} matches your profile`,
          description: `${score}% fit with ${startup.openRoles.filter((role) => role.status === 'open').length} open opportunity${startup.openRoles.filter((role) => role.status === 'open').length === 1 ? '' : 'ies'}.`,
          timestamp: now - 45_000,
          action: 'Explore startup',
          startupId: startup.id,
        });
      });
  }

  appointments
    .filter((appointment) => appointment.status === 'pending' || appointment.status === 'confirmed')
    .forEach((appointment) => {
      items.push({
        id: `appointment-${appointment.id}`,
        type: 'appointment',
        title: appointment.status === 'pending' ? 'A founder sync needs attention' : 'You have a founder sync coming up',
        description: `${appointment.startupName} • ${appointment.roleTitle} • ${appointment.date}`,
        timestamp: dateToTimestamp(appointment.date),
        action: 'Open sync',
        startupId: appointment.startupId,
      });
    });

  return items
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 24);
};

export const formatRelativeDate = (timestamp?: number) => {
  if (!timestamp) return 'recently';
  const diff = Math.max(0, Date.now() - timestamp);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};
