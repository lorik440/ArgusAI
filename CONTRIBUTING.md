# Contributing to ArgusAI

Thanks for contributing! ArgusAI is an early-stage scaffold. The backend and AI engine currently provide basic health checks; video processing, inference, persistence, authentication, and the full dashboard are not implemented yet.

## Getting started

1. Create a branch for your change. The architecture guide suggests prefixes such as `backend/`, `ai/`, `behavior/`, or `frontend/`.
2. Run the services from the repository root:

   ```powershell
   docker compose up --build
   ```

3. Open the frontend at <http://localhost:5173/>.
4. Check the service health endpoints:
   - Backend: <http://localhost:8000/health>
   - AI engine: <http://localhost:8001/health>

Use `localhost` in browser URLs; `0.0.0.0` is a server bind address, not a browser destination.

## Before submitting

- For frontend changes, run `npm run build` from the `frontend` directory.
- For service changes, build and run the relevant Docker Compose services and check their health endpoints.
- Add or update tests when introducing behavior. The current scaffold does not yet have a general automated test suite.
- Update the documentation when behavior, setup, or service interfaces change.

## Project structure

- `frontend/` contains the Vite web app.
- `backend/` contains the user-facing backend API.
- `ai_engine/` contains server-side AI and video-processing work.
- `docs/architecture.md` describes the intended architecture.
- Each Python service has its own `requirements.txt`; add dependencies to the service that uses them.

As the AI-to-backend integration is implemented, document the payload format and keep the interface clear and consistent.

## Privacy and security

- Never commit credentials, `.env` files, student or classroom footage, recordings, or model weights.
- Use `.env.example` only for placeholder variable names and non-sensitive example values.
- Use synthetic or appropriately authorized data for development and testing.
- Keep the AI engine private to the application unless there is a specific, secured reason to expose it.
- Treat generated alerts as prompts for human review, not as proof of misconduct or automated decisions about students.

## Pull requests

- Keep changes focused and explain what they do and why.
- Include steps to reproduce or verify the change.
- Note any known limitations, especially when functionality is still a scaffold.
- Check that you are not including generated files, local environments, secrets, or large model artifacts.

ArgusAI is licensed under AGPL-3.0. Check the license and any applicable third-party model or dataset terms before contributing or redistributing those materials.
