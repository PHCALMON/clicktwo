---
name: Audit Squad Vigilia
description: Complete audit of Squad Vigilia (10 agents, 13 tasks, 1 workflow) — 51% pass rate, main issues are shallow agents (<100 lines), missing SEM_MENSAGEM in 7 tasks, missing anti-spam in 5 tasks, no timeout/escalation on human gates
type: project
---

Audited 2026-03-16. Squad Vigilia = squad de atendimento IA para produtora audiovisual E2 Studio.

**Key findings:**
- Domain rules (Rapha gate, Julia/Dudu cliente, Tiago protegido): 100% PASS
- Task swimlane separation and output format: 100% PASS
- Agents average 72 lines (target: 300+), no Voice DNA, no self-validation quality gates
- 7/13 tasks lack SEM_MENSAGEM fallback
- 5/8 recurring tasks lack anti-spam rules (only sentinel-prazo has all 4)
- Workflow gates lack timeout + escalation + explicit reject actions
- 2 Pulse tasks missing (motivacao, ociosidade) — agent defines 4 types, only 2 tasks exist

**Why:** Process Absolutist principle — if executor CAN do it wrong, the process is wrong. Agents can generate garbage without data, can spam, and human gates can stall indefinitely.

**How to apply:** Use this as baseline for re-audit after fixes. Track which of the 5 priority actions get addressed.
