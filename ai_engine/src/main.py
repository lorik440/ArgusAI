import subprocess

from fastapi import FastAPI

app = FastAPI(title="ArgusAI AI Engine")

SYSTEM_DEPENDENCIES = ("libgl1", "libglib2.0-0")


@app.get("/health")
def health() -> dict[str, str | bool]:
    return {
        "status": "scaffold",
        "service": "ai-engine",
        "inference_available": False,
    }


@app.get("/dependencies")
def dependencies() -> dict[str, list[dict[str, str]]]:
    result = subprocess.run(
        [
            "dpkg-query",
            "-W",
            r"-f=${binary:Package}\t${Version}\n",
            *SYSTEM_DEPENDENCIES,
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    return {
        "dependencies": [
            {"name": name, "version": version}
            for name, version in (
                line.split("\t", maxsplit=1)
                for line in result.stdout.splitlines()
            )
        ]
    }
