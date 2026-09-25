import type { OpeningAnswer } from '@/types/opening';

/**
 * Which checklist lines are asked, given the answers so far.
 *
 * The same rules as App\Services\Openings\Relevance on the server, so a line
 * appears or disappears the moment the answer it hangs on is tapped, without
 * waiting for a save. The server's version is the one that decides what
 * counts when the branch is opened.
 *
 *   { when: 'staff_reported', is: 'problem' }   asked only after that answer
 *   { any_problem: ['Core food stock'] }         asked only if something there is wrong
 *
 * A rule that cannot be followed leaves the line asked.
 */
export function relevance(answers: OpeningAnswer[]): Map<number, boolean> {
    const byKey = new Map(answers.map((a) => [a.key, a]));
    const memo = new Map<string, boolean>();
    const visiting = new Set<string>();

    const asked = (answer: OpeningAnswer): boolean => {
        const known = memo.get(answer.key);
        if (known !== undefined) return known;

        const rule = answer.show_if;
        if (!rule || visiting.has(answer.key)) {
            memo.set(answer.key, true);
            return true;
        }

        visiting.add(answer.key);
        let result = true;

        if ('when' in rule && rule.when) {
            const other = byKey.get(rule.when);
            result = other === undefined ? true : asked(other) && other.answer === (rule.is ?? 'problem');
        } else if ('any_problem' in rule && rule.any_problem) {
            const scopes = rule.any_problem;
            result = answers.some((a) => a.key !== answer.key
                && a.kind === 'check'
                && a.answer === 'problem'
                && (scopes.includes(a.group ?? '') || scopes.includes(a.section))
                && asked(a));
        }

        visiting.delete(answer.key);
        memo.set(answer.key, result);
        return result;
    };

    return new Map(answers.map((a) => [a.id, asked(a)]));
}

/** Whether a line has what it needs. Notes are optional. */
export function isAnswered(a: OpeningAnswer): boolean {
    if (a.kind === 'check') return a.answer !== null;
    if (a.kind === 'number') return a.value !== null && a.value !== '';
    return true;
}
