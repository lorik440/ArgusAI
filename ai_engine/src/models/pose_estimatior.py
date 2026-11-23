import sys
from pathlib import Path

from ultralytics import YOLO

src_dir = str(Path(__file__).resolve().parents[1])
if src_dir not in sys.path:
    sys.path.insert(0, src_dir)

from config.settings import DEVICE


class PoseEstimator:
    def __init__(self, model_path="ai_engine/weights/yolo11n-pose.pt"):

        self.model=YOLO(model_path)

        self.device =DEVICE

    def estimate(self, frame):

        results= self.model.predict(
            source=frame,
            device=self.device,
            conf=0.25,
            imgsz=640,
            verbose=False
        )

        return results