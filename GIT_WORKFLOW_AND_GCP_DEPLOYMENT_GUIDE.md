# Enterprise Git Workflow & GCP VM Deployment Handbook

This guide walks you step-by-step through real-world multi-developer scenarios using your newly created repository `gcp-react-java-app`.

---

## 1. Governance & Staging vs Production Setup

- **`staging` Branch**: Pre-production integration branch. Auto-deploys to Staging GCP VM on Port `8080`.
- **`main` Branch**: Production branch. Requires PR approval from Code Owner before merging. Auto-deploys to Prod GCP VM on Port `80`.

---

## 2. GitHub Branch Protection Setup

Go to GitHub -> **Settings -> Branches -> Add branch protection rule**:
- **Branch pattern**: `main` (and `staging`)
- ✅ Check **Require a pull request before merging** (Require 1 approval)
- ✅ Check **Require status checks to pass before merging** (`Build & Test Spring Boot Monolith`, `Lint & Build React Frontend`)

---

## 3. Hands-On Developer Workflow Commands

### Scenario A: Create a Feature & Submit Pull Request (PR)

```bash
# 1. Switch to staging and pull latest changes
git checkout staging
git pull origin staging

# 2. Create a new feature branch for your task
git checkout -b feature/analytics-dashboard

# 3. Make code changes in React (src/App.jsx) or Spring Boot (backend/)

# 4. Commit and push feature branch to GitHub
git add .
git commit -m "feat: added real-time analytics dashboard component"
git push -u origin feature/analytics-dashboard
```

**On GitHub**:
1. Open Pull Request: Base `staging` ← Compare `feature/analytics-dashboard`.
2. GitHub Actions runs `ci-pr-checks.yml` quality gate automatically.
3. Reviewer approves PR and merges code.

---

### Scenario B: Multi-Developer Merge Conflict Simulation & Resolution

When two developers edit the same line in `src/App.jsx`:

```bash
# 1. Developer B switches to feature branch
git checkout feature/analytics-dashboard

# 2. Fetch latest changes from remote
git fetch origin

# 3. Merge staging into local branch to catch conflict locally
git merge origin/staging
```

**Git will mark conflict in file `src/App.jsx`**:
```javascript
<<<<<<< HEAD (Your changes)
const APP_TITLE = "Real-Time Analytics Portal";
=======
const APP_TITLE = "Enterprise Monolith Dashboard";
>>>>>>> origin/staging (Developer A's merged code)
```

```bash
# 4. Edit file in IDE to keep desired code, remove conflict markers.

# 5. Commit resolved merge and push to GitHub
git add src/App.jsx
git commit -m "fix(merge): resolved title conflict between feature branch and staging"
git push origin feature/analytics-dashboard
```
*Your PR status on GitHub turns GREEN ✅ and can now be merged!*
