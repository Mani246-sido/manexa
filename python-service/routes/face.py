from flask import Blueprint, request, jsonify
from services.face_service import get_face_encoding, match_face

face_bp = Blueprint('face', __name__)

# ─── Encode Face ──────────────────────────────────────────────────────────────
@face_bp.route('/encode-face', methods=['POST'])
def encode_face():
    data = request.get_json()
    image_b64 = data.get('image')

    if not image_b64:
        return jsonify({ 'success': False, 'message': 'No image provided' }), 400

    encoding = get_face_encoding(image_b64)

    if encoding is None:
        return jsonify({ 'success': False, 'message': 'No face detected' }), 400

    if encoding == "multiple_faces":
        return jsonify({ 'success': False, 'message': 'Multiple faces detected, only one allowed' }), 400

    return jsonify({ 'success': True, 'encoding': encoding })


# ─── Recognize Face ───────────────────────────────────────────────────────────
@face_bp.route('/recognize-face', methods=['POST'])
def recognize_face():
    data = request.get_json()
    image_b64 = data.get('image')
    known_encodings = data.get('known_encodings')  # [{student_id, encoding}]

    if not image_b64:
        return jsonify({ 'matched': False, 'message': 'No image provided' }), 400

    if not known_encodings:
        return jsonify({ 'matched': False, 'message': 'No known encodings provided' }), 400

    unknown_encoding = get_face_encoding(image_b64)

    if unknown_encoding is None:
        return jsonify({ 'matched': False, 'message': 'No face detected' }), 400

    if unknown_encoding == "multiple_faces":
        return jsonify({ 'matched': False, 'message': 'Multiple faces detected' }), 400

    student_id = match_face(unknown_encoding, known_encodings)

    if not student_id:
        return jsonify({ 'matched': False, 'message': 'Face not recognized' }), 404

    return jsonify({ 'matched': True, 'student_id': student_id })