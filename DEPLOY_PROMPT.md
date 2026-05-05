# Deploy Prompt for Claude Agent

## Task
Commit and push recent code changes to the LinkedIn Content Assistant repository to trigger CI/Vercel deployment.

## Context
- **Workspace Path**: `C:\Users\Admin\Desktop\Agentic Workflows\ABDUL WORKFLOWS\LinkedIn Content Assitant`
- **Frontend Path**: `frontend/`
- **Recent Changes**:
  - `frontend/src/lib/notion.ts` — Improved Notion formatter with paragraph splitting and executive snapshot blocks
  - `frontend/scripts/migrate_latest_strategy.js` — Migration script to reformat existing strategy pages

## Steps to Execute

1. **Check if git is initialized**
   ```powershell
   cd "C:\Users\Admin\Desktop\Agentic Workflows\ABDUL WORKFLOWS\LinkedIn Content Assitant"
   git status
   ```
   If `.git` folder exists, skip to Step 3.
   If not initialized, proceed to Step 2.

2. **Initialize git (if needed)**
   ```powershell
   git init
   git remote add origin <YOUR_GITHUB_REPO_URL>
   # Example: git remote add origin https://github.com/yourname/linkedin-content-assistant.git
   ```

3. **Stage, commit, and push changes**
   ```powershell
   cd "C:\Users\Admin\Desktop\Agentic Workflows\ABDUL WORKFLOWS\LinkedIn Content Assitant"
   git add -A
   git commit -m "Improve Notion formatter with paragraph splitting and executive snapshot; add strategy page migration script"
   git push origin main
   ```

4. **Verify deployment**
   - Check your GitHub Actions or Vercel dashboard
   - Deployment should start automatically after push
   - Monitor logs for any build errors

## Expected Outcome
- Changes pushed to `origin/main`
- CI pipeline (GitHub Actions or Vercel) triggers automatically
- New version deployed to production with improved Notion formatting

## Troubleshooting
- If `git push` fails with "branch main not found", try `git push origin HEAD:main`
- If remote is not set, run: `git remote add origin <REPO_URL>`
- Check git config: `git config --global user.email` and `git config --global user.name`

---

**Note**: Replace `<YOUR_GITHUB_REPO_URL>` with your actual GitHub repository URL.
