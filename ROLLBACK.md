# Production checkpoint: past-tense

User instruction recorded 12 October 2026 (Asia/Kuala_Lumpur): when the user says **past-tense**, restore production to the version they approved at https://apexelerate.vercel.app/.

- Git checkpoint tag: `past-tense-2026-10-12`
- Commit: `a95c7096caba3ed1c7d8abaf70c84bb06f7e90eb`
- Repository: `https://github.com/Pyth66666/next.git`
- Verification: all 18 tracked public assets at this commit matched the live production assets on 12 October 2026 (line endings normalized).
- Includes Gemini integration, phone layouts, and the Startup/Hackathon Pitch Studio.
- Uncommitted real-learning/admin-demo changes present when the checkpoint was recorded are NOT part of this checkpoint. Preserve them separately; do not discard them during a restore.

## When the user invokes past-tense

Restore this checkpoint's code to production using a reversible deployment rollback or a new deployment of the tagged commit. Inspect deployment access and state first; do not force-push or reset the user's working tree. Verify the live site after the restore and report the result.

This is a code checkpoint, not a database, environment-variable, credential, or full Vercel deployment backup. Preserve current secrets and user data. Do not roll back or delete database records. If restoring code requires incompatible database changes or additional permissions, explain the blocker before proceeding.
