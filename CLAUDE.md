# Rules for Claude

## Identity & attribution
- **Never** list Claude as a git collaborator. No `Co-Authored-By: Claude`, no "Generated with Claude Code" footer, no attribution of any kind in commit messages, PR descriptions, or code comments.
- All git activity happens as the user:
  - Name: `perpaterb`
  - Email: `zcarss@gmail.com`
- Remote: https://github.com/Perpaterb/helperPage.git

## Branching
- Every feature / change goes on a **new branch**. Never commit directly to `main`.
- Branch names should be short and descriptive (e.g. `feat/drag-animations`, `fix/search-filter`).

## Commit cadence
- Commit between every prompt from the user. Treat each prompt as a checkpoint: finish the work, commit it, then report back.
- Small, focused commits. If a prompt produced multiple logical changes, split them into multiple commits on the same branch.
- Never skip hooks (`--no-verify`) or bypass signing.
- Never amend or force-push without explicit instruction — always create new commits so history is recoverable.

## Environment
- Plain Node + Vite. No Docker.
  - Install: `npm install`
  - Dev server: `npm run dev`
  - Build: `npm run build`
  - Preview built output: `npm run preview`

## Deployment
- Production is GitHub Pages at https://perpaterb.github.io/helperPage/
- CI/CD is in `.github/workflows/deploy.yml` — every push to `main` triggers a build and publishes the `dist/` folder to Pages.
- `vite.config.ts` reads `BASE_PATH` env var; CI sets it to `/helperPage/`. Local defaults to `/`.

## Workflow summary
1. User sends a prompt.
2. Create or switch to an appropriate feature branch.
3. Make the changes, verify via `npm run build`.
4. Commit with a clear message (no Claude attribution).
5. Report back to the user.
