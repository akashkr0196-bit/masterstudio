import cv2
import logging
import numpy as np
import os

logger = logging.getLogger(__name__)

# Optional import so the API can start and report no matches if AI dependencies fail.
try:
    from insightface.app import FaceAnalysis
    HAS_INSIGHTFACE = True
except ImportError:
    HAS_INSIGHTFACE = False

class FaceRecognitionAI:
    def __init__(self):
        self.enabled = False
        self.app = None
        self.det_size = self._read_detection_size()
        
        if HAS_INSIGHTFACE:
            logger.info("InsightFace detected. Initializing FaceAnalysis engine.")
            try:
                # Initialize with face detection (det) and recognition (rec) models.
                # Uses ONNX Runtime under the hood.
                # Note: This will download models on first execution (to ~/.insightface/models/)
                self.app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
                self.app.prepare(ctx_id=0, det_size=(self.det_size, self.det_size))
                self.enabled = True
                logger.info("InsightFace FaceAnalysis engine initialized with det_size=%s.", self.det_size)
            except Exception as e:
                logger.warning("Failed to initialize InsightFace engine. Face recognition is disabled.", exc_info=e)
        else:
            logger.warning("InsightFace or ONNX Runtime is unavailable. Face recognition is disabled.")

    def _read_detection_size(self) -> int:
        raw_value = os.getenv("AI_FACE_DET_SIZE", "960")
        try:
            det_size = int(raw_value)
        except ValueError:
            logger.warning("Invalid AI_FACE_DET_SIZE=%s. Falling back to 960.", raw_value)
            return 960
        return max(640, min(det_size, 1280))

    def process_image(self, image_bytes: bytes):
        """
        Processes an image, detects faces, and extracts 512-D embeddings.
        Returns a list of dictionaries with bounding box coords and embedding vector.
        """
        if self.enabled and self.app:
            try:
                # Convert bytes to numpy array
                nparr = np.frombuffer(image_bytes, np.uint8)
                img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                if img is None:
                    return []
                
                faces = self.app.get(img)
                faces = sorted(
                    faces,
                    key=lambda face: float((face.bbox[2] - face.bbox[0]) * (face.bbox[3] - face.bbox[1])),
                    reverse=True,
                )
                results = []
                for face in faces:
                    bbox = face.bbox.tolist() # [x1, y1, x2, y2]
                    embedding = face.normed_embedding.tolist() # 512-dimensional vector
                    results.append({
                        "bbox": bbox,
                        "embedding": embedding
                    })
                return results
            except Exception as e:
                logger.warning("Error processing image with InsightFace.", exc_info=e)

        return []

    def compute_similarity(self, emb1: list, emb2: list) -> float:
        """
        Computes cosine similarity between two 512-D embeddings.
        Returns similarity score between -1 and 1.
        """
        vec1 = np.array(emb1)
        vec2 = np.array(emb2)
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)
        if norm1 == 0 or norm2 == 0:
            return 0.0
        return float(np.dot(vec1, vec2) / (norm1 * norm2))

ai_engine = FaceRecognitionAI()
