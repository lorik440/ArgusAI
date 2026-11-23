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


## Run live webcam pose detection

From the repository root, run:

```powershell
Set-Location ai_engine\src
..\..\.venv\Scripts\python.exe -m scripts.run_pose_estimation
```

The script opens camera 0 and displays live pose detections. Press `Q` or `Esc` in the camera window to exit. The first run downloads the `yolo11n-pose.pt` model if it is not already available.

# Notice
run_pose_estimation.py is a standalone script that does not require the backend or frontend services to be running. It is intended for testing and development purposes only. The pose detection model is not used in the backend service as per this version. Also, the script does not use the `ai_engine` package, so it can be run without installing the package. and it does not work in docker containers it can only work with local Python environments.   

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
