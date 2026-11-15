from fastapi import FastAPI

app = FastAPI(title="ArgusAI Backend")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "backend"}
