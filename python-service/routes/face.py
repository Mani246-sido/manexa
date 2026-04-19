from flask import Blueprint, request, jsonify
from services.face_service import get_face_encoding

face_routes = Blueprint("face_routes", __name__)

@face_routes.route("/register-face", methods=["POST"])
def register_face():
    if "image" not in request.files:
        return jsonify({"error": "No image provided"}), 400

    image = request.files["image"]

    encoding = get_face_encoding(image)

    if encoding is None:
        return jsonify({"error": "No face detected"}), 400

    if encoding == "multiple_faces":
        return jsonify({"error": "Multiple faces detected"}), 400

    return jsonify({
        "message": "Face encoded successfully",
        "encoding": encoding
    })