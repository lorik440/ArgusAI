import sys
from pathlib import Path

src_dir = str(Path(__file__).resolve().parents[1])
if src_dir not in sys.path:
    sys.path.insert(0, src_dir)

import cv2

from models.pose_estimatior import PoseEstimator


class VideoProcessor:
    def __init__(self):
        self.pose_estimator = PoseEstimator()

    def process_camera(self, camera_index=0):
        camera = cv2.VideoCapture(camera_index)
        if not camera.isOpened():
            camera.release()
            raise RuntimeError(f"Cannot open camera {camera_index}")

        window_name = "ArgusAI Pose Detection"
        window_created = False
        print("Camera started. Press Q or Esc to quit.")

        try:
            while True:
                success, frame = camera.read()
                if not success:
                    raise RuntimeError(f"Failed to read from camera {camera_index}")

                results = self.pose_estimator.estimate(frame)
                if not results:
                    raise RuntimeError("Pose estimation returned no results")

                cv2.imshow(window_name, results[0].plot())
                window_created = True
                if cv2.waitKey(1) & 0xFF in (ord("q"), 27):
                    break
        finally:
            camera.release()
            if window_created:
                cv2.destroyWindow(window_name)
