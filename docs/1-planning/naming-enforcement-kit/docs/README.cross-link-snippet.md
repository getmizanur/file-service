# README Cross-link Snippet

Add this to your repo root README.md (near deployment / infra sections):

```md
## AWS Resource Naming

All AWS resources follow the project naming standard:
- `/agents/AGENTS.md` (agent system overview)
- `/docs/aws-naming-convention.md` (AWS resource naming convention source of truth)

Before creating new AWS resources (S3, IAM, EC2, etc.), ensure names comply with the convention and are validated by CI.
```
