"""YOLOv5 Acne Detection Model - Backend Logic

Production-safe loader that avoids crashing when the YOLO repo cannot be
fetched from GitHub (e.g., rate limits, no egress). Prefer local sources
and gracefully degrade to a no-op detector when unavailable.
"""
import os
import pathlib
from typing import Optional, List, Dict

import cv2
import numpy as np
import torch

class AcneDetector:
    def __init__(self, weights_path: Optional[str] = None):
        """Initialize detector; do not hard-fail if YOLO cannot be loaded.

        Env vars supported:
        - DISABLE_ACNE_DETECTOR=1 -> skip loading entirely
        - YOLOV5_LOCAL_DIR -> absolute path to a local yolov5 repo directory
        """
        self.model = None

        if os.getenv("DISABLE_ACNE_DETECTOR", "0") in ("1", "true", "True"):
            print("⚠️ AcneDetector disabled via DISABLE_ACNE_DETECTOR")
            return

        # Default weights path (repo contains best.pt)
        if weights_path is None:
            weights_path = os.path.abspath(
                os.path.join(
                    os.path.dirname(__file__),
                    "../YOLOv5 Acne Detector Model/best.pt",
                )
            )

        # Try loading from a local yolov5 repo first to avoid GitHub rate limits
        yolo_local_dir = os.getenv("YOLOV5_LOCAL_DIR")

        # Windows/Posix path fix (harmless on Linux)
        posix_backup = pathlib.PosixPath
        pathlib.PosixPath = pathlib.WindowsPath
        try:
            if yolo_local_dir and os.path.isdir(yolo_local_dir):
                print(f"🔎 Loading YOLOv5 from local dir: {yolo_local_dir}")
                self.model = torch.hub.load(
                    yolo_local_dir,
                    "custom",
                    path=weights_path,
                    force_reload=False,
                    trust_repo=True,
                )
            else:
                # As a last resort, attempt remote repo; may fail on Render (403)
                print("🌐 Loading YOLOv5 from remote repo ultralytics/yolov5 (may hit rate limits)")
                self.model = torch.hub.load(
                    "ultralytics/yolov5",
                    "custom",
                    path=weights_path,
                    force_reload=False,
                    trust_repo=True,
                )

            if self.model is not None:
                self.model.to("cpu")  # Explicitly move model to CPU
                self.model.conf = 0.25
                self.model.iou = 0.45
                self.model.eval()
                print("✅ YOLOv5 AcneDetector ready (CPU)")
        except Exception as e:
            # Don’t crash the app in production due to model issues
            self.model = None
            print(f"⚠️ YOLO model not available: {e}. Acne detection will be disabled.")
        finally:
            pathlib.PosixPath = posix_backup

    def detect(self, image: np.ndarray) -> List[Dict]:
        """Run detection; return [] if model is unavailable."""
        if self.model is None:
            return []

        # Ensure RGB
        if len(image.shape) == 2:
            image = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)
        elif image.shape[2] == 4:
            image = cv2.cvtColor(image, cv2.COLOR_RGBA2RGB)

        results = self.model(image)
        detections = []
        for *box, conf, cls in results.pred[0]:
            x1, y1, x2, y2 = map(int, box)
            class_name = results.names[int(cls)]
            detections.append({
                "box": [x1, y1, x2, y2],
                "confidence": float(conf),
                "class": class_name,
            })
        return detections
