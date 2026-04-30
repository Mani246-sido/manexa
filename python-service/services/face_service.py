import face_recognition
import numpy as np
import cv2
import base64

# ─── Encoding ────────────────────────────────────────────────────────────────
def get_face_encoding(image_b64):
    # base64 decode karo
    img_bytes = base64.b64decode(image_b64)
    np_arr = np.frombuffer(img_bytes, dtype=np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    if image is None:
        return None

    image = cv2.resize(image, (0, 0), fx=0.5, fy=0.5)
    rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

    face_locations = face_recognition.face_locations(rgb_image)

    if len(face_locations) == 0:
        return None

    if len(face_locations) > 1:
        return "multiple_faces"

    encodings = face_recognition.face_encodings(rgb_image, face_locations)
    return encodings[0].tolist()


# ─── Matching ─────────────────────────────────────────────────────────────────
def match_face(unknown_encoding, known_encodings, tolerance=0.5):
    unknown = np.array(unknown_encoding)
    
    for entry in known_encodings:
        known = np.array(entry["encoding"])
        match = face_recognition.compare_faces([known], unknown, tolerance=tolerance)
        if match[0]:
            return entry["student_id"]
    
    return None