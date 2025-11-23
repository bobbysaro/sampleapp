from flask import Flask, request, jsonify, send_from_directory, send_file
import csv
import os
from datetime import datetime
import io
import zipfile

app = Flask(__name__)

# Simple CORS for local use
@app.after_request
def add_cors(resp):
    resp.headers['Access-Control-Allow-Origin'] = '*'
    resp.headers['Access-Control-Allow-Methods'] = 'GET,POST,OPTIONS'
    resp.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    return resp

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
os.makedirs(DATA_DIR, exist_ok=True)

ALLOWED = {'income', 'utilities', 'bills'}

def csv_path(section):
    return os.path.join(DATA_DIR, f"{section}.csv")

def ensure_header(path, section):
    if not os.path.exists(path):
        # determine headers
        if section == 'bills':
            headers = ['name', 'amount', 'balance', 'date', 'saved_at']
        else:
            headers = ['name', 'amount', 'date', 'saved_at']
        with open(path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(headers)

@app.route('/save/<section>', methods=['POST'])
def save_section(section):
    if section not in ALLOWED:
        return jsonify({'error': 'invalid section'}), 400
    data = request.get_json()
    if not data:
        return jsonify({'error': 'no json body'}), 400
    rows = data.get('rows')
    if not isinstance(rows, list):
        return jsonify({'error': 'rows must be an array'}), 400

    path = csv_path(section)
    ensure_header(path, section)

    written = 0
    with open(path, 'a', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        for r in rows:
            # normalize fields
            name = r.get('name', '') if isinstance(r, dict) else ''
            amount = r.get('amount', '') if isinstance(r, dict) else ''
            date = r.get('date', '') if isinstance(r, dict) else ''
            balance = r.get('balance', '') if isinstance(r, dict) else ''
            saved_at = datetime.utcnow().isoformat()
            if section == 'bills':
                writer.writerow([name, amount, balance, date, saved_at])
            else:
                writer.writerow([name, amount, date, saved_at])
            written += 1

    return jsonify({'status': 'ok', 'written': written})

@app.route('/download/all.zip', methods=['GET'])
def download_all_zip():
    # Ensure headers exist for all sections so files are present
    for s in ALLOWED:
        ensure_header(csv_path(s), s)

    mem = io.BytesIO()
    with zipfile.ZipFile(mem, mode='w', compression=zipfile.ZIP_DEFLATED) as zf:
        for s in sorted(ALLOWED):
            p = csv_path(s)
            arcname = f"{s}.csv"
            # add file to zip
            zf.write(p, arcname=arcname)
    mem.seek(0)
    return send_file(mem, mimetype='application/zip', as_attachment=True, download_name='financialplanner_data.zip')


@app.route('/download/<section>', methods=['GET'])
def download_section(section):
    if section not in ALLOWED:
        return jsonify({'error': 'invalid section'}), 400
    path = csv_path(section)
    if not os.path.exists(path):
        return jsonify({'error': 'no data'}), 404
    return send_from_directory(DATA_DIR, f"{section}.csv", as_attachment=True)

if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--host', default='127.0.0.1')
    parser.add_argument('--port', type=int, default=5000)
    args = parser.parse_args()
    app.run(host=args.host, port=args.port)
