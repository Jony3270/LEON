from flask import Flask, render_template, request, jsonify
import requests
import os
import base64
from dotenv import load_dotenv
import time
import uuid

# Load environment variables
load_dotenv(dotenv_path=".env")

app = Flask(__name__)

# Configure Hugging Face API
HF_API_KEY = os.getenv("HF_API_KEY")

if not HF_API_KEY or HF_API_KEY == "your_hugging_face_api_key_here":
    print("⚠️  WARNING: Hugging Face API key not found!")
    print("📝 Please follow these steps:")
    print("1. Go to https://huggingface.co/settings/tokens")
    print("2. Create a new token (select 'Read' role)")
    print("3. Copy the token and replace 'your_hugging_face_api_key_here' in the .env file")
    print("4. Restart the application")
    HF_API_KEY = "hf_dummy_key_replace_this"

HF_API_URL = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0"

headers = {
    "Authorization": f"Bearer {HF_API_KEY}",
    "Content-Type": "application/json"
}

@app.route('/')
def index():
    return render_template('Ai.html')

@app.route('/generate', methods=['POST'])
def generate_image():
    data = request.json
    if data is None:
        return jsonify({"error": "Invalid JSON data"}), 400
    
    prompt = data.get('prompt', '')
    
    if not prompt:
        return jsonify({"error": "No prompt provided"}), 400
    
    # Call the Hugging Face API
    try:
        payload = {
            "inputs": prompt,
            "parameters": {
                "negative_prompt": "blurry, bad quality, distorted",
                "num_inference_steps": 30,
                "guidance_scale": 7.5
            }
        }
        
        response = requests.post(HF_API_URL, headers=headers, json=payload)
        
        # Check if the model is still loading
        if response.status_code == 503:
            return jsonify({"error": "Model is loading, please try again in a few minutes"}), 503
        
        # Handle other errors
        if response.status_code != 200:
            try:
                error_detail = response.json()
                print('Hugging Face API error:', error_detail)
            except Exception:
                error_detail = response.text
                print('Hugging Face API error (non-JSON):', error_detail)
            if response.status_code == 401:
                return jsonify({"error": "Invalid API key. Please check your Hugging Face API key in the .env file."}), 401
            elif response.status_code == 429:
                return jsonify({"error": "Rate limit exceeded. Please try again later."}), 429
            else:
                return jsonify({"error": f"API request failed with status code {response.status_code}", "detail": error_detail}), response.status_code
        
        # Save the image
        image_bytes = response.content
        image_id = str(uuid.uuid4())[:8]
        image_path = f"static/images/generated_{image_id}.png"
        
        with open(image_path, "wb") as f:
            f.write(image_bytes)
        
        return jsonify({
            "success": True,
            "image_url": f"/{image_path}",
            "prompt": prompt
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/history')
def history():
    # Get all generated images
    images_dir = "static/images"
    if not os.path.exists(images_dir):
        os.makedirs(images_dir)
        
    images = [f for f in os.listdir(images_dir) if f.startswith("generated_")]
    images.sort(key=lambda x: os.path.getmtime(os.path.join(images_dir, x)), reverse=True)
    
    image_data = [{
        "url": f"/static/images/{img}",
        "created": time.ctime(os.path.getmtime(os.path.join(images_dir, img)))
    } for img in images[:20]]  # Limit to 20 most recent
    
    return jsonify(image_data)

if __name__ == '__main__':
    # Create images directory if it doesn't exist
    if not os.path.exists("static/images"):
        os.makedirs("static/images")
        
    app.run(debug=True)