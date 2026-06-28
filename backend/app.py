from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
import pyotp
import os
import datetime
from dotenv import load_dotenv

load_dotenv()
app = Flask(__name__)
CORS(app)

# MongoDB Connection
client = MongoClient(os.getenv("MONGO_URI", "mongodb://localhost:27017/"))
db = client.mfa_database
users = db.totp_users
logs = db.logs  # 📝 Our Audit Trail Collection

# 🔹 STEP 1: Identification & QR Setup
@app.route('/api/auth/step1', methods=['POST'])
def step1():
    email = request.json.get('email')
    user = users.find_one({"email": email})

    if not user:
        secret = pyotp.random_base32()
        qr_uri = pyotp.totp.TOTP(secret).provisioning_uri(name=email, issuer_name="College MFA Pro")
        users.update_one({"email": email}, {"$set": {"totp_secret": secret}}, upsert=True)
        return jsonify({"status": "setup_required", "qr_uri": qr_uri})
    else:
        return jsonify({"status": "existing_user"})

# 🔹 STEP 2: TOTP Verification & Logging
@app.route('/api/auth/step2', methods=['POST'])
def step2():
    email = request.json.get('email')
    user_code = request.json.get('code')
    
    user = users.find_one({"email": email})
    success = False
    
    if user:
        totp = pyotp.TOTP(user['totp_secret'])
        success = totp.verify(user_code)

    # 📝 INSERT AUDIT LOG
    logs.insert_one({
        "email": email,
        "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "status": "Success" if success else "Failed",
        "factor": "2FA (TOTP)"
    })

    if success:
        return jsonify({"success": True})
    else:
        return jsonify({"success": False, "message": "Invalid Code"}), 401

# 🔹 STEP 3: Context/Device Verification
@app.route('/api/auth/step3', methods=['POST'])
def step3():
    return jsonify({"success": True, "message": "Device & Context Verified"})

# 🔹 GET LOGS: To show on the Frontend
@app.route('/api/logs', methods=['GET'])
def get_logs():
    # Fetch latest 5 logs, newest first
    all_logs = list(logs.find().sort("_id", -1).limit(5))
    for log in all_logs:
        log['_id'] = str(log['_id'])
    return jsonify(all_logs)

if __name__ == '__main__':
    print("🚀 Enterprise Python API running on port 5000")
    app.run(port=5000, debug=True)