# Kickoff prompt — paste into a fresh Claude Code session

Start the session in the **new** (empty) repo directory, with the two reference repos added
as additional working directories if you want the agent to consult them.

---

You are building a multi-channel food ordering + inventory management platform from
scratch. The full specification is at:

`c:\Users\iamjn\Desktop\WEBZ\CediBites\cedibites\docs\CLONE_BUILD_BRIEF.md`

**Read that document in full before writing any code.** It is a 10-phase build plan for a
system with ~125 page routes, 111 migrations, 75 permissions and 10 roles. Most of its
non-obvious rules exist because the obvious design failed in production — §10 is the list
of those failures.

Your instructions:

1. **Read the brief end to end first.** Do not start Phase 0 until you have.
2. **Ask me the five questions in §12 before Phase 0.** They change the shape of the build
   and I need to answer them, not you. Ask them together, in one go.
3. Once answered, **fill the parameter table in §0.4** and record it in the new repo's
   `CLAUDE.md` along with a short summary of the architecture laws in §2. That file is what
   keeps later sessions consistent with earlier ones.
4. **Work one phase at a time, in the order given.** Each phase in §9 ends with a gate.
   Every gate is a test, not a prose assertion — write the test, name it in the commit
   message, and do not begin the next phase until it passes.
5. **Report at each gate** using the §11.3 handback format: what was built, gate result
   with test names, current test baseline as a number with each failure's cause named,
   decisions you made yourself, anything deferred and why.
6. If the brief and your instinct disagree, **follow the brief and flag the disagreement.**
7. The reference repos named in §0.3 are an answer key for resolving ambiguity — never a
   source to copy credentials, seeded data, or the two stale design docs it warns about.

Begin with step 1, then step 2. Do not scaffold anything yet.

---

## Notes for the human running this

- **Budget the phases across sessions.** Phases 0–2 are one session's work. Phases 6–8
  (the inventory subsystem) are three sessions minimum. Don't try to run the whole thing in
  one context window — the brief is written so a cold session can pick up at any phase
  boundary.
- **The §12 answers are the highest-leverage thing you provide.** Question 4
  (multi-tenant?) in particular: if the answer is yes and it is discovered at Phase 6, most
  of Phases 1–5 need reworking.
- **Question 2 deserves real thought before you start.** Deferring the IMS to v2 roughly
  halves the build, but Phase 2's menu-option ids and Phase 3's deduction hooks must still
  be designed for it or you will pay the original's "one dish per branch" bill a second
  time (brief §3.3).
- Keep `CLAUDE.md` in the new repo current at every gate. It is the only thing carrying
  decisions between sessions.
