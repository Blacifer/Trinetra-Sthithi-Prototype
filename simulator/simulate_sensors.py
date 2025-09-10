# simulator/simulate_sensors.py
#!/usr/bin/env python3
import time, random, argparse, requests

parser = argparse.ArgumentParser()
parser.add_argument('--server', default='http://localhost:4000')
parser.add_argument('--interval', type=float, default=1.0)
args = parser.parse_args()

zones = ['GHAT1', 'GHAT2', 'MAIN']   # use the zone ids your UI expects
print('Simulator starting. Sending to', args.server)

while True:
    zone = random.choices(zones, weights=[0.5,0.3,0.2])[0]
    base_crowd = random.randint(20, 200)
    if random.random() < 0.08:
        base_crowd += random.randint(100, 400)
    payload = {
        'zone': zone,
        'crowdCount': base_crowd,
        'avgTemp': round(random.uniform(24, 40),1),
        'noiseDb': round(random.uniform(40, 100),1),
        'pm25': round(random.uniform(10, 250),1),
        'zli': random.randint(0, 100),
        't': int(time.time() * 1000)
    }
    try:
        # NOTE: server expects /api/sensor
        r = requests.post(args.server + '/api/sensor', json=payload, timeout=2)
        if r.status_code == 200:
            print('sent', zone, payload)
        else:
            print('server err', r.status_code, r.text)
    except Exception as e:
        print('error', e)
    time.sleep(args.interval)