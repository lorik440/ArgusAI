# ArgusAI

ArgusAI is an early-stage project exploring how computer vision could help exam supervisors review classroom activity. The proposed system would analyze camera footage, identify events that may need attention, and present an explanation and supporting evidence for a human supervisor to review.

**This repository is currently a starter scaffold, not a working monitoring system.** Only basic service health reporting is implemented; video detection, event processing, and the exam-monitoring dashboard are not. Alerts should be treated as review prompts, not as proof of misconduct or automated decisions about students.

## Intended workflow

The project architecture describes this high-level flow:

1. Receive and sample camera frames.
2. Detect people and relevant objects, then track them over time.
3. Turn detected signals into explainable events.
4. Send events and evidence to a backend.
5. Present them in a supervisor dashboard for human review.

This is the intended design, not functionality available in the current repository. See [docs/architecture.md](docs/architecture.md) for the architecture proposal.

## Current repository

| Path | Present contents / purpose |
| --- | --- |
| `ai_engine/` | Minimal health endpoint; inference is not implemented |
| `backend/` | Minimal FastAPI health endpoint |
| `frontend/` | Minimal Vite page showing backend and AI-engine status |
| `docs/architecture.md` | Proposed components, layout, and data flow |
| `docker-compose.yml` | Local Compose setup for the three starter services |
| `.env.example` | Empty placeholder for future environment configuration |

The application entry points currently provide only basic health/status checks. The AI engine explicitly reports that inference is unavailable; video analysis and monitoring features are not implemented. The architecture document describes a broader planned structure than the files that exist today.

## Repository hygiene

The `.gitignore` excludes environment files, model weights, recordings, and common local artifacts. Do not commit real student footage, credentials, or model weights. Use `.env.example` only for placeholder variable names and non-sensitive example values.

## License

This project is distributed under the GNU Affero General Public License v3.0; see [LICENSE](LICENSE). Third-party model, dataset, and dependency terms may impose additional requirements.
