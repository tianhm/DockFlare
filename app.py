import logging
from flask import Flask, render_template
import os # <--- ADDED

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
app = Flask(__name__)
app.secret_key = os.urandom(24) # <--- ADDED
app.config['PREFERRED_URL_SCHEME'] = 'https' # <--- ADDED

@app.route('/')
def super_minimal_route():
    logging.info("Attempting to render super_minimal.html")
    try:
        return render_template('super_minimal.html')
    except Exception as e:
        logging.error(f"Error rendering super_minimal.html: {e}", exc_info=True)
        return "Error rendering template, check logs", 500

if __name__ == '__main__':
    logging.info("Starting SUPER MINIMAL Flask app for testing render_template.")
    app.run(host='0.0.0.0', port=5000, debug=True)