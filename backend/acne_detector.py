# YOLOv5 Acne Detection Model - Backend Logic (No Streamlit)
import torch
import cv2
import numpy as np
import pathlib
import os

class AcneDetector:
    def __init__(self, weights_path=None):
        # Default path if not provided
        if weights_path is None:
            weights_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../YOLOv5 Acne Detector Model/best.pt'))
        
        # Windows/Posix path fix
        posix_backup = pathlib.PosixPath
        pathlib.PosixPath = pathlib.WindowsPath
        try:
            # Force model to run on CPU to avoid CUDA errors
            self.model = torch.hub.load('ultralytics/yolov5', 'custom', path=weights_path, force_reload=True, trust_repo=True)
            self.model.to('cpu') # Explicitly move model to CPU
            self.model.conf = 0.25
            self.model.iou = 0.45
            self.model.eval()
        finally:
            pathlib.PosixPath = posix_backup

    def detect(self, image: np.ndarray):
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
                'box': [x1, y1, x2, y2],
                'confidence': float(conf),
                'class': class_name
            })
        return detections
