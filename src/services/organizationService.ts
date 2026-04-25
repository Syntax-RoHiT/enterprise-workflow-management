

import type { Organization, Team, TeamMember, ServiceResult, AppRole } from '@/lib/types';

export type LocalOrg = Organization & { passcode: string };

const DB_KEY = 'nexus:mock_db';

interface MockDB {
  organizations: LocalOrg[];
  teams: Team[];
  members: TeamMember[];
}

function getDB(): MockDB {
  const data = localStorage.getItem(DB_KEY);
  if (!data) return { organizations: [], teams: [], members: [] };
  try {
    return JSON.parse(data);
  } catch {
    return { organizations: [], teams: [], members: [] };
  }
}

function saveDB(db: MockDB) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function generatePasscode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export const organizationService = {
  async listMine(userId?: string): Promise<ServiceResult<Organization[]>> {
    if (!userId) return { data: [], error: null };
    const db = getDB();

    const myOrgs = db.organizations.filter(org => 
      db.members.some(m => m.user_id === userId && m.team_id === org.id) // using team_id as org_id for membership here for simplicity
    );
    return { data: myOrgs, error: null };
  },

  async create(name: string, userId: string): Promise<ServiceResult<Organization>> {
    const db = getDB();
    const newOrg: LocalOrg = {
      id: crypto.randomUUID(),
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      passcode: generatePasscode(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.organizations.push(newOrg);

    db.members.push({
      id: crypto.randomUUID(),
      team_id: newOrg.id, // Storing org memberships in the same table
      user_id: userId,
      role: 'admin',
      created_at: new Date().toISOString(),
    });
    
    saveDB(db);
    return { data: newOrg, error: null };
  },

  async joinWithPasscode(passcode: string, userId: string): Promise<ServiceResult<Organization>> {
    const db = getDB();
    const org = db.organizations.find(o => o.passcode === passcode);
    
    if (!org) {
      return { data: null, error: { code: 'NOT_FOUND', message: 'Invalid passcode.' } };
    }

    const isMember = db.members.some(m => m.team_id === org.id && m.user_id === userId);
    if (!isMember) {
      db.members.push({
        id: crypto.randomUUID(),
        team_id: org.id,
        user_id: userId,
        role: 'member',
        created_at: new Date().toISOString(),
      });
      saveDB(db);
    }
    
    return { data: org, error: null };
  },

  async getPasscode(orgId: string): Promise<ServiceResult<string>> {
    const db = getDB();
    const org = db.organizations.find(o => o.id === orgId);
    return { data: org?.passcode || '', error: null };
  },

  async listTeams(orgId: string): Promise<ServiceResult<Team[]>> {
    const db = getDB();
    const orgTeams = db.teams.filter(t => t.organization_id === orgId);
    return { data: orgTeams, error: null };
  },

  async addTeam(orgId: string, name: string): Promise<ServiceResult<Team>> {
    const db = getDB();
    const newTeam: Team = {
      id: crypto.randomUUID(),
      organization_id: orgId,
      name,
      created_at: new Date().toISOString(),
    };
    db.teams.push(newTeam);
    saveDB(db);
    return { data: newTeam, error: null };
  },

  async listMembers(orgId: string): Promise<ServiceResult<TeamMember[]>> {
    const db = getDB();

    const members = db.members.filter(m => m.team_id === orgId);
    return { data: members, error: null };
  },

  async addMember(teamId: string, userId: string, role: AppRole = 'member'): Promise<ServiceResult<null>> {
    return { data: null, error: { code: 'NOT_IMPLEMENTED', message: 'Use passcode to join.' } };
  },

  async removeMember(teamId: string, userId: string): Promise<ServiceResult<null>> {
    const db = getDB();
    db.members = db.members.filter(m => !(m.team_id === teamId && m.user_id === userId));
    saveDB(db);
    return { data: null, error: null };
  },
};
