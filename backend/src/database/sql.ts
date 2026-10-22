/** Schema-level SQL fragments. */

/** Correlated sub-select returning an aliased job's skills as a CSV string. */
export const skillsCsvSubquery = (jobAlias = 'j'): string => `(
  SELECT GROUP_CONCAT(DISTINCT s2.skill_name ORDER BY s2.skill_name)
  FROM JobSkills js2
  INNER JOIN Skills s2 ON s2.skill_id = js2.skill_id
  WHERE js2.job_id = ${jobAlias}.job_id
)`;

/** Converts a comma-separated skill column into a clean string array. */
export const csvToSkills = (csv: string | null | undefined): string[] =>
  (csv ?? '')
    .split(',')
    .map((skill) => skill.trim())
    .filter(Boolean);

/** Coerces a DB value (number | string | null | undefined) to number | null. */
export const toNumber = (value: number | string | null | undefined): number | null =>
  value === null || value === undefined ? null : Number(value);

/** Normalizes and deduplicates skill inputs. */
export const normalizeSkillInputs = (
  values: string[] | undefined,
  normalize: (value: string) => string = (v) => v.trim().toLowerCase(),
): string[] => {
  const seen = new Set<string>();
  const entries: string[] = [];
  for (const value of values ?? []) {
    const name = normalize(value);
    if (!name || seen.has(name)) continue;
    seen.add(name);
    entries.push(name);
  }
  return entries;
};
