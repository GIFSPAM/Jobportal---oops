import { describe, expect, it } from 'vitest';
import { csvToSkills, skillsCsvSubquery } from './sql';

describe('csvToSkills', () => {
  it('returns an empty array for null or undefined', () => {
    expect(csvToSkills(null)).toEqual([]);
    expect(csvToSkills(undefined)).toEqual([]);
  });

  it('returns an empty array for an empty column', () => {
    expect(csvToSkills('')).toEqual([]);
  });

  it('splits the column and trims each entry', () => {
    expect(csvToSkills('Angular,TypeScript,SQL')).toEqual(['Angular', 'TypeScript', 'SQL']);
    expect(csvToSkills('  Angular ,  TypeScript  ')).toEqual(['Angular', 'TypeScript']);
  });

  it('drops empty segments left by doubled or trailing separators', () => {
    expect(csvToSkills('Angular,,SQL')).toEqual(['Angular', 'SQL']);
    expect(csvToSkills(',Angular,')).toEqual(['Angular']);
    expect(csvToSkills(', ,')).toEqual([]);
  });
});

describe('skillsCsvSubquery', () => {
  it('correlates the sub-select on the caller-supplied alias', () => {
    const sql = skillsCsvSubquery('jobs');
    expect(sql).toContain('WHERE js2.job_id = jobs.job_id');
  });

  it('defaults to the conventional job alias', () => {
    expect(skillsCsvSubquery()).toContain('WHERE js2.job_id = j.job_id');
  });

  it('is a parenthesised scalar sub-select so it can be composed in a SELECT list', () => {
    const sql = skillsCsvSubquery();
    expect(sql.startsWith('(')).toBe(true);
    expect(sql.trimEnd().endsWith(')')).toBe(true);
  });
});
