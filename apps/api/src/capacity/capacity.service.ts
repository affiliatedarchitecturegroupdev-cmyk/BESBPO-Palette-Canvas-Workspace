import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Database } from '../db/database';

export interface CapacityRow {
  person_id: string;
  name: string;
  weekly_hours: number;
  threshold_pct: number;
  allocated_hours: number;   // open-task estimate hours
  utilisation_pct: number;   // allocated / weekly * 100
  over_threshold: boolean;
  skills: Array<{ name: string; level: number }>;
}

export interface SkillCoverageRow {
  skill: string;
  holders: number;
  avg_level: number;
  demand_hours: number;      // open-task estimate hours mentioning the skill
}

/** P6-01: capacity planning — skills + load thresholds per person. */
@Injectable()
export class CapacityService {
  constructor(private readonly db: Database) {}

  async byPerson(orgId: string): Promise<CapacityRow[]> {
    const { rows } = await this.db.query<{
      person_id: string; name: string; weekly_hours: string; threshold_pct: number; allocated_hours: string;
    }>(
      `SELECT p.id AS person_id, p.name,
              COALESCE(pc.weekly_hours, 40) AS weekly_hours,
              COALESCE(pc.threshold_pct, 85) AS threshold_pct,
              COALESCE(SUM(t.estimate_hours) FILTER (WHERE t.status <> 'done'), 0) AS allocated_hours
       FROM person p
       LEFT JOIN person_capacity pc ON pc.person_id = p.id AND pc.org_id = $1
       LEFT JOIN task t ON t.assignee_id = p.id AND t.org_id = $1
       WHERE p.org_id = $1
       GROUP BY p.id, p.name, pc.weekly_hours, pc.threshold_pct
       ORDER BY p.name`,
      [orgId],
    );
    const skills = await this.db.query<{ person_id: string; name: string; level: number }>(
      `SELECT ps.person_id, s.name, ps.level
       FROM person_skill ps JOIN skill s ON s.id = ps.skill_id
       WHERE ps.org_id = $1 ORDER BY s.name`,
      [orgId],
    );
    const byPerson = new Map<string, Array<{ name: string; level: number }>>();
    for (const s of skills.rows) {
      const list = byPerson.get(s.person_id) ?? [];
      list.push({ name: s.name, level: s.level });
      byPerson.set(s.person_id, list);
    }
    return rows.map((r) => {
      const weekly = Number(r.weekly_hours);
      const allocated = Number(r.allocated_hours);
      const utilisation = weekly > 0 ? (allocated / weekly) * 100 : 0;
      return {
        person_id: r.person_id,
        name: r.name,
        weekly_hours: weekly,
        threshold_pct: r.threshold_pct,
        allocated_hours: allocated,
        utilisation_pct: Math.round(utilisation * 10) / 10,
        over_threshold: utilisation > r.threshold_pct,
        skills: byPerson.get(r.person_id) ?? [],
      };
    });
  }

  async skillCoverage(orgId: string): Promise<SkillCoverageRow[]> {
    const { rows } = await this.db.query<{ skill: string; holders: string; avg_level: string; demand_hours: string }>(
      `SELECT s.name AS skill,
              COUNT(ps.id) AS holders,
              COALESCE(AVG(ps.level), 0) AS avg_level,
              COALESCE((
                SELECT SUM(t.estimate_hours) FROM task t
                WHERE t.org_id = $1 AND t.status <> 'done'
                  AND (t.title ILIKE '%' || s.name || '%')
              ), 0) AS demand_hours
       FROM skill s
       LEFT JOIN person_skill ps ON ps.skill_id = s.id AND ps.org_id = $1
       WHERE s.org_id = $1
       GROUP BY s.id, s.name
       ORDER BY s.name`,
      [orgId],
    );
    return rows.map((r) => ({
      skill: r.skill,
      holders: Number(r.holders),
      avg_level: Math.round(Number(r.avg_level) * 10) / 10,
      demand_hours: Number(r.demand_hours),
    }));
  }

  async upsertCapacity(orgId: string, personId: string, weeklyHours: number, thresholdPct: number) {
    return this.db.one(
      `INSERT INTO person_capacity (id, org_id, person_id, weekly_hours, threshold_pct)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (org_id, person_id) DO UPDATE SET weekly_hours = EXCLUDED.weekly_hours, threshold_pct = EXCLUDED.threshold_pct
       RETURNING id, person_id, weekly_hours, threshold_pct`,
      [randomUUID(), orgId, personId, weeklyHours, thresholdPct] as never[],
    );
  }

  async addSkill(orgId: string, name: string) {
    const existing = await this.db.oneOrNull<{ id: string }>(
      'SELECT id FROM skill WHERE org_id = $1 AND name = $2',
      [orgId, name],
    );
    if (existing) return existing;
    return this.db.one('INSERT INTO skill (id, org_id, name) VALUES ($1,$2,$3) RETURNING id, name', [
      randomUUID(), orgId, name,
    ] as never[]);
  }

  async assignSkill(orgId: string, personId: string, skillId: string, level: number) {
    return this.db.one(
      `INSERT INTO person_skill (id, org_id, person_id, skill_id, level)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (person_id, skill_id) DO UPDATE SET level = EXCLUDED.level
       RETURNING id, person_id, skill_id, level`,
      [randomUUID(), orgId, personId, skillId, level] as never[],
    );
  }
}
