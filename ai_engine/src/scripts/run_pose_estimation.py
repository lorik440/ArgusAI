import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from proccesing.video_processor import VideoProcessor


def main():
    processor = VideoProcessor()
    processor.process_camera()

if __name__ == "__main__":
    main()
