# Argus Watch: Project Structure

This document describes the recommended repository layout for Argus Watch. It is a **monorepo**: one repository containing every part of the system, with one folder per component so each team member knows where they work.

# subject to change as the project evolves, but the current layout is a good starting point.

## Repository layout

```
argus-watch/
├── README.md
├── LICENSE                      # AGPL-3.0
├── .gitignore                   # data/, weights/, .env, *.mp4
├── .env.example                 # example environment variables (no real secrets)
├── docker-compose.yml           # starts backend + db + frontend + ai_engine together
│
├── docs/
│   ├── proposal/                # Propozim_Projekti_SEW.docx
│   ├── architecture.md          # architecture diagram and explanation
│   ├── api-contract.md          # endpoints and data formats
│   ├── test-plan.md             # test scenarios and metrics
│   └── privacy.md               # privacy and data retention
│
├── shared/                      # SHARED CONTRACT (change only by team agreement)
│   ├── inference_schema.json    # AI model output (people, objects, keypoints)
│   ├── event_schema.json        # event sent to the backend
│   └── VERSION                  # contract version
│
├── ai_engine/                   # Lorik, Leona, Besart (Python, runs in the cloud)
│   ├── main.py                  # entry point
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── config/
│   │   ├── settings.py          # FPS, confidence thresholds, exam rules
│   │   ├── cameras.yaml         # camera sources (no real credentials)
│   │   └── zones/
│   │       ├── camera_1.json    # desk polygons for Camera 1
│   │       └── camera_2.json    # desk polygons for Camera 2
│   ├── ingest/
│   │   ├── stream_manager.py    # receives video, timestamps, reconnects
│   │   └── frame_sampler.py     # latest-frame buffer
│   ├── models/                  # Lorik, Leona
│   │   ├── object_detector.py   # YOLO26n (phones, objects)
│   │   ├── pose_estimator.py    # YOLO26n-pose
│   │   ├── inference_service.py # interface returning the shared format
│   │   └── weights/             # .pt files (not in Git, downloaded by script)
│   ├── tracking/                # Besart
│   │   └── person_tracker.py    # ByteTrack, IDs per camera
│   ├── behavior/                # Besart
│   │   ├── seat_mapper.py       # person/object -> seat (A1...C4)
│   │   ├── signals.py           # body turn, hand into neighbor desk, phone
│   │   ├── scoring.py           # review-priority score and weights
│   │   ├── event_builder.py     # builds the explainable event
│   │   └── camera_fusion.py     # links both cameras by seat and time
│   ├── evidence/
│   │   ├── clip_recorder.py     # rolling buffer, clips 5 s before/after
│   │   └── storage.py           # saves clips and snapshots
│   ├── output/
│   │   └── api_client.py        # sends events to the backend
│   ├── visualization/
│   │   └── draw.py              # boxes, skeletons, IDs (debug and demo)
│   └── tests/
│
├── backend/                     # Leona, Dafina, Gresa (FastAPI)
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic/                 # database migrations
│   ├── app/
│   │   ├── main.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   └── security.py      # JWT, hashing, roles
│   │   ├── db/
│   │   │   ├── session.py
│   │   │   └── base.py
│   │   ├── models/              # tables: user, exam, camera, seat, event, review
│   │   ├── schemas/             # Pydantic models (matching shared/)
│   │   ├── api/
│   │   │   └── routes/
│   │   │       ├── auth.py
│   │   │       ├── exams.py
│   │   │       ├── cameras.py
│   │   │       ├── events.py    # ingest from AI, list, filters
│   │   │       ├── reviews.py   # mark reviewed / dismissed
│   │   │       └── evidence.py  # clips and snapshots
│   │   ├── services/
│   │   │   ├── event_service.py
│   │   │   └── evidence_service.py
│   │   └── realtime/
│   │       └── websocket.py     # live notifications to the dashboard
│   └── tests/
│
├── frontend/                    # Dafina, Gresa (e.g. React + Vite)
│   ├── package.json
│   ├── Dockerfile
│   └── src/
│       ├── api/                 # calls to the backend
│       ├── pages/
│       │   ├── LoginPage
│       │   ├── DashboardPage    # list of exams
│       │   ├── LiveExamPage     # cameras + live event timeline
│       │   └── EventReviewPage  # explanation, clips, review buttons
│       ├── components/
│       │   ├── CameraFeed
│       │   ├── EventTimeline
│       │   ├── EventCard
│       │   ├── EvidencePlayer   # two synchronized camera views
│       │   └── CoverageMap      # seat map (green / yellow / grey)
│       ├── hooks/               # useWebSocket, useEvents
│       └── store/
│
├── scripts/
│   ├── download_models.py       # downloads model weights
│   ├── calibrate_zones.py       # draw desk polygons on a frame
│   ├── run_on_video.py          # first experiment (recorded video)
│   └── evaluate.py              # precision, recall, false alerts/hour, FPS
│
├── evaluation/
│   ├── labels/                  # manual labels of staged videos
│   └── results/                 # metric tables and charts
│
├── data/                        # IN .gitignore: videos, clips, recordings
│   └── .gitkeep
│
└── deploy/
    ├── nginx.conf               # HTTPS and proxy
    └── cloud-setup.md           # server deployment steps
```

## Data flow

```
Cameras (WiFi)
   -> ai_engine/ingest      (receive and sample frames)
   -> ai_engine/models      (detect objects, estimate pose)
   -> ai_engine/tracking    (assign temporary IDs)
   -> ai_engine/behavior    (seat mapping, signals, scoring, events)
   -> backend/              (store events and evidence, push live updates)
   -> frontend/             (supervisor dashboard)
```

## Git rules

- Never commit student videos, model weights (`.pt`), `.env` files or camera credentials. Add them to `.gitignore` from the first commit.
- Use branches per area (`ai/...`, `behavior/...`, `backend/...`, `frontend/...`) and merge them with Pull Requests.
- Start small: create only `ai_engine/` and `scripts/run_on_video.py` first, then add the other parts as the development phases require them.

## Suggested `.gitignore` starter

```
# Secrets and environment
.env
*.key

# Data and recordings
data/*
!data/.gitkeep
*.mp4
*.avi
*.mov

# Model weights
*.pt
*.onnx
ai_engine/models/weights/*

# Python
__pycache__/
*.pyc
.venv/

# Node
node_modules/
dist/

# Databases
*.db
*.sqlite3
```

## Licensing note

The project is licensed under AGPL-3.0, which matches Ultralytics YOLO's open-source license. Check the current Ultralytics terms before distributing or commercializing the application.
