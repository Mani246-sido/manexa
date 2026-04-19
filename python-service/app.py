from flask import Flask
from routes.face import face_routes

app = Flask(__name__)

app.register_blueprint(face_routes)

@app.route("/")
def home():
    return {"message": "Face AI Service Running 💀"}

if __name__ == "__main__":
    app.run(port=5001, debug=True)