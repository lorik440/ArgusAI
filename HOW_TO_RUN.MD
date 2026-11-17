# How to run ArgusAI

## Run with Docker Compose

1. Install and start Docker Desktop.
2. From the repository root, build and start all services:

   ```powershell
   docker compose up --build
   ```

3. Open the frontend at <http://localhost:5173/>.

The service health endpoints are:

- Backend: <http://localhost:8000/health>
- AI engine: <http://localhost:8001/health>

The AI engine currently reports `inference_available: false`; inference is not implemented yet.

To run the services in the background:

```powershell
docker compose up --build -d
```

To view their logs:

```powershell
docker compose logs -f
```

To stop the services:
```powershell
docker compose stop
```

To stop and remove the containers:

```powershell
docker compose down
```

Use `localhost` in browser URLs. The `0.0.0.0` address in the service startup configuration means “listen on all network interfaces”; it is not the address to enter in a browser.
