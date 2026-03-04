import type { Memo } from '../types/memo';
import type { Relation, RelationType } from '../types/relation';
import { RELATION_THRESHOLD, MAX_RELATIONS_PER_MEMO } from '../constants/ai';

function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 0;
  const intersection = [...setA].filter((x) => setB.has(x));
  const union = new Set([...setA, ...setB]);
  return intersection.length / union.size;
}

export function computeRelations(
  sourceMemo: Memo,
  allMemos: Memo[]
): Array<Omit<Relation, 'id' | 'createdAt'>> {
  const sourceTagSet = new Set(sourceMemo.tagIds);
  if (sourceTagSet.size === 0) return [];

  return allMemos
    .filter((m) => m.id !== sourceMemo.id)
    .map((target) => {
      const targetTagSet = new Set(target.tagIds);
      const strength = jaccardSimilarity(sourceTagSet, targetTagSet);
      const sharedTagIds = [...sourceTagSet].filter((id) => targetTagSet.has(id));
      return {
        fromMemoId: sourceMemo.id,
        toMemoId: target.id,
        type: 'keyword_overlap' as RelationType,
        strength,
        sharedTagIds,
      };
    })
    .filter((r) => r.strength >= RELATION_THRESHOLD)
    .sort((a, b) => b.strength - a.strength)
    .slice(0, MAX_RELATIONS_PER_MEMO);
}
