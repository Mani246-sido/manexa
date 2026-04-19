import face_recognition
import numpy as np
import cv2

def get_face_encoding(image_file):
    file_bytes = np.frombuffer(image_file.read(), np.uint8)
    image = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)

    image = cv2.resize(image, (0, 0), fx=0.5, fy=0.5)

    rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

    face_locations = face_recognition.face_locations(rgb_image)

    if len(face_locations) == 0:
        return None

    if len(face_locations) > 1:
        return "multiple_faces"

    encodings = face_recognition.face_encodings(rgb_image, face_locations)

    return encodings[0].tolist()