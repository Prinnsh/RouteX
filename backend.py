from flask import Flask, request, jsonify
from flask_cors import CORS
import smtplib
import random
import csv
import os
from dotenv import load_dotenv
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Safely load secure environment variables for cloud instances
load_dotenv()

app = Flask(__name__)
# Enable CORS for frontend interoperability
CORS(app)

@app.route('/generate-demo', methods=['GET'])
def generate_demo():
    try:
        dataset = []
        filepath = 'ahmedabad_brts_logs.csv'
        if not os.path.exists(filepath):
            return jsonify({'status': 'error', 'message': 'Dataset missing on server!'}), 404
            
        with open(filepath, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                dataset.append({
                    'route_id': row['route_id'],
                    'bus_id': row['bus_id'],
                    'capacity': int(row['capacity']),
                    'passengers': int(row['passengers']),
                    'time_slot': row['time_slot'],
                    'trip_number': row['trip_number'],
                    'date': row['date']
                })
        return jsonify({'status': 'success', 'dataset': dataset}), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

# ==== STAGE 1: Full-Stack AI Simulation Engine ====

@app.route('/analyze-ai', methods=['POST'])
def analyze_ai():
    try:
        data = request.json.get('dataset', [])
        BUS_RUNNING_COST = 2000

        # Step 1: Utilization Intelligence
        routeData = {}
        for record in data:
            rid = record.get('route_id')
            if rid not in routeData:
                routeData[rid] = {'totalPass': 0, 'totalCap': 0, 'records': 0, 'timeSlots': {}}
            
            routeData[rid]['totalPass'] += int(record.get('passengers', 0))
            routeData[rid]['totalCap'] += int(record.get('capacity', 0))
            routeData[rid]['records'] += 1

            ts = record.get('time_slot')
            if ts not in routeData[rid]['timeSlots']:
                routeData[rid]['timeSlots'][ts] = {'pass': 0, 'cap': 0, 'count': 0}
            
            routeData[rid]['timeSlots'][ts]['pass'] += int(record.get('passengers', 0))
            routeData[rid]['timeSlots'][ts]['cap'] += int(record.get('capacity', 0))
            routeData[rid]['timeSlots'][ts]['count'] += 1

        routeMetrics = []
        for route_id, stats in routeData.items():
            util_raw = (stats['totalPass'] / stats['totalCap'] * 100) if stats['totalCap'] > 0 else 0
            utilization = round(util_raw)
            
            status = 'Optimal'
            if utilization < 40: status = 'Underutilized'
            elif utilization > 75: status = 'Overloaded'

            avg_empty = max(0, (stats['totalCap'] - stats['totalPass']) / stats['records']) if stats['records'] > 0 else 0
            wastedCost = round((avg_empty / (stats['totalCap'] / stats['records'])) * BUS_RUNNING_COST) if stats['totalCap'] > 0 else 0

            routeMetrics.append({
                'route': route_id,
                'utilization': utilization,
                'status': status,
                'wastedDailyCost': wastedCost,
                'timeSlots': stats['timeSlots']
            })

        # Step 2: Predict Demand & Reliability
        predictions = []
        totalSystemReliability = 0

        for route in routeMetrics:
            maxAvgDemand = 0
            peakSlot = ""
            varianceCount = 0

            for slot, sdata in route['timeSlots'].items():
                avg_demand = sdata['pass'] / sdata['count'] if sdata['count'] > 0 else 0
                if avg_demand > maxAvgDemand:
                    maxAvgDemand = avg_demand
                    peakSlot = slot
                
                # simulate stability mapping
                if abs(avg_demand - (route['utilization']/100 * (sdata['cap']/sdata['count']))) > 10:
                    varianceCount += 1
            
            base_rel = 95
            delay_sim = random.uniform(0, 5)
            overcrowd_penalty = 15 if route['status'] == 'Overloaded' else (5 if route['status'] == 'Underutilized' else 0)
            demand_stability = (varianceCount / len(route['timeSlots']) * 10) if len(route['timeSlots']) > 0 else 0

            reliabilityScore = round(max(0, base_rel - delay_sim - overcrowd_penalty - demand_stability))
            totalSystemReliability += reliabilityScore

            effScore = 100
            if route['utilization'] < 40: effScore -= (40 - route['utilization']) * 1.5
            if route['utilization'] > 75: effScore -= (route['utilization'] - 75) * 1.2
            effScore = max(0, min(100, round(effScore)))

            predictions.append({
                'route': route['route'],
                'utilization': route['utilization'],
                'status': route['status'],
                'reliabilityScore': reliabilityScore,
                'efficiencyScore': effScore,
                'nextPeakHour': peakSlot,
                'wastedDailyCost': route['wastedDailyCost']
            })

        sysReliability = round(totalSystemReliability / len(routeMetrics)) if routeMetrics else 0

        # Step 3: Fleet Optimization Engine
        overloaded = sorted([r for r in predictions if r['status'] == 'Overloaded'], key=lambda x: x['utilization'], reverse=True)
        underutilized = sorted([r for r in predictions if r['status'] == 'Underutilized'], key=lambda x: x['utilization'])

        redistributionPlan = []
        recommendations = []
        alerts = []
        totalSavings = 0
        avgEffIncrease = 0

        underIdx = 0
        for overRoute in overloaded:
            if underIdx < len(underutilized):
                underRoute = underutilized[underIdx]
                busesToMove = 2 if overRoute['utilization'] > 90 else 1
                
                recommendations.append({
                    'text': f"Move {busesToMove} bus(es) from Route {underRoute['route']} to Route {overRoute['route']}",
                    'type': 'action',
                    'classType': 'action-add'
                })
                
                redistributionPlan.append({
                    'from': underRoute['route'],
                    'to': overRoute['route'],
                    'buses': busesToMove
                })

                totalSavings += underRoute['wastedDailyCost'] * 0.4
                avgEffIncrease += random.uniform(5, 10) + 10
                underIdx += 1

        for r in overloaded: alerts.append(f"Route {r['route']} likely overcrowded tomorrow during {r['nextPeakHour']}")
        for r in underutilized: alerts.append(f"Route {r['route']} shows consistent underutilization, wasting ₹{r['wastedDailyCost']}/day")

        return jsonify({
            'status': 'success',
            'routesOut': predictions,
            'sysReliability': sysReliability,
            'aiSystemSysOut': {
                'recommendations': recommendations,
                'redistributionPlan': redistributionPlan,
                'alerts': alerts,
                'expectedImpact': {
                    'efficiencyGain': round(avgEffIncrease / max(1, len(redistributionPlan)) + 8),
                    'fuelSavings': round(totalSavings)
                }
            }
        }), 200

    except Exception as e:
        print(f"Server Backend Analysis Error: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

# ==== STAGE 2: Realtime Dispatch Systems ====

SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
EMAIL_ADDRESS = os.getenv("SMTP_EMAIL", "applegaming440@gmail.com")
APP_PASSWORD = os.getenv("SMTP_PASSWORD", "")

@app.route('/send-email', methods=['POST'])
def send_email():
    try:
        data = request.json
        to_email = data.get('to_email')
        subject = data.get('subject')
        message_body = data.get('message')

        print(f"Sending SMTP email to: {to_email}")

        msg = MIMEMultipart()
        msg['From'] = f"BRTS Fleet Control <{EMAIL_ADDRESS}>"
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(message_body, 'plain'))

        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(EMAIL_ADDRESS, APP_PASSWORD)
        server.send_message(msg)
        server.quit()

        return jsonify({"status": "success", "message": "Email delivered to SMTP gate!"}), 200

    except Exception as e:
        print(f"SMTP Error: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    print(f"BRTS Backend Server Started on port {port}")
    app.run(host='0.0.0.0', port=port, debug=False)
