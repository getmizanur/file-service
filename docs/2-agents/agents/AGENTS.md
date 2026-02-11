# 🤖 Global Agents Index

This index provides an overview of all AI agents and human-defined roles in the project.  
It documents **who does what**, **where logs are stored**, and **how roles interrelate**.

---

# 🧩 Roles Overview
These are abstract roles that any AI agent may assume depending on context.

| Role | Description | File |
|------|-------------|------|
| **Architect** | Designs the system, evaluates trade-offs, defines structure and boundaries | `/agents/roles/architect.md` |
| **Engineer** | Implements features, writes code, applies best practices | `/agents/roles/engineer.md` |
| **Developer** | Focuses on coding efficiency, debugging, refactoring, execution-level tasks | `/agents/roles/developer.md` |
| **Researcher** | Investigates technologies, compares alternatives, provides feasibility analysis | `/agents/roles/researcher.md` |
| **Tester** | Designs tests, evaluates reliability, defines edge cases and acceptance criteria | `/agents/roles/tester.md` |
| **DevOps** | Manages CI/CD, infra, deployments, observability, automation | `/agents/roles/devops.md` |

---

# 🤖 Agents Overview
These are individual AI agents used within the project.  
Each agent has its own profile, prompts, and logs.

| Agent | Description / Purpose | Folder |
|-------|------------------------|--------|
| **ChatGPT** | General-purpose reasoning, architect, researcher, refinement, planning | `/agents/chatgpt/` |
| **Claude** | High-clarity writing, coding, developer, engineer, structured reasoning, analysis | `/agents/claude/` |
| **Antigravity** | High-clarity writing, coding, developer, engineer, structured reasoning, analysis | `/agents/antigravity/` |
| **DeepSeek** | Optimization, debugging, math-heavy or algorithmic tasks | `/agents/deepseek/` |
| **Gemini** | Cross-domain insight, integration, creativity | `/agents/gemini/` |
| **Llama** | Lightweight alternative perspective / offline reasoning | `/agents/llama/` |

> ⚠️ Add or remove agents as needed.  
> Each agent’s folder contains:
>
> ```
> profile.md
> prompts.md
> /logs/YYYY-MM-DD-topic.md
> ```

---

# 🔗 Project Logging Structure

### **Session Logs**
Human-readable summaries of daily or per-block work: