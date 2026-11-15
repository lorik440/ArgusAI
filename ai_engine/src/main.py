from fastapi import FastAPI

app = FastAPI(title="ArgusAI AI Engine")


@app.get("/health")
def health() -> dict[str, str | bool]:
    return {
        "status": "scaffold",
        "service": "ai-engine",
        "inference_available": False,
    }
