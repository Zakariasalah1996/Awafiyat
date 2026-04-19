import struct, math, wave, os

SAMPLE_RATE = 22050
AMPLITUDE = 32000

def write_wav(filename, samples):
    with wave.open(filename, 'w') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(SAMPLE_RATE)
        f.writeframes(b''.join(samples))
    size = os.path.getsize(filename)
    print(f"  {filename}: {size/1024:.0f} KB")

# 1. جرس مطبخ (الحالي - محسّن)
print("1. Kitchen Bell (جرس مطبخ)")
samples = []
for i in range(SAMPLE_RATE * 8):
    t = i / SAMPLE_RATE
    cycle = t % 0.8
    if cycle < 0.12:
        freq = 2000
        env = 1.0 - (cycle / 0.12) * 0.3
        val = math.sin(2*math.pi*freq*t)*env + 0.5*math.sin(2*math.pi*freq*2*t)*env
    elif cycle < 0.28:
        freq = 2500
        env = 1.0 - ((cycle-0.16)/0.12)*0.3
        val = math.sin(2*math.pi*freq*t)*env + 0.5*math.sin(2*math.pi*freq*2*t)*env
    elif cycle < 0.44:
        freq = 2000
        env = 1.0 - ((cycle-0.32)/0.12)*0.3
        val = math.sin(2*math.pi*freq*t)*env
    else:
        val = 0
    samples.append(struct.pack('<h', int(AMPLITUDE * max(-1, min(1, val)))))
write_wav('assets/alarm_kitchen.wav', samples)

# 2. نغمة كلاسيكية (رنين هاتف قديم)
print("2. Classic Ring (نغمة كلاسيكية)")
samples = []
for i in range(SAMPLE_RATE * 8):
    t = i / SAMPLE_RATE
    cycle = t % 2.0
    if cycle < 1.0:
        freq1, freq2 = 440, 480
        env = 0.8 + 0.2 * math.sin(2*math.pi*20*t)
        val = 0.5*math.sin(2*math.pi*freq1*t) + 0.5*math.sin(2*math.pi*freq2*t)
        val *= env
    else:
        val = 0
    samples.append(struct.pack('<h', int(AMPLITUDE * max(-1, min(1, val)))))
write_wav('assets/alarm_classic.wav', samples)

# 3. تنبيه رقمي (beep beep)
print("3. Digital Beep (تنبيه رقمي)")
samples = []
for i in range(SAMPLE_RATE * 8):
    t = i / SAMPLE_RATE
    cycle = t % 0.5
    if cycle < 0.15:
        freq = 1000
        val = math.sin(2*math.pi*freq*t)
        val += 0.3*math.sin(2*math.pi*freq*3*t)
    elif cycle < 0.25:
        val = 0
    elif cycle < 0.4:
        freq = 1200
        val = math.sin(2*math.pi*freq*t)
        val += 0.3*math.sin(2*math.pi*freq*3*t)
    else:
        val = 0
    samples.append(struct.pack('<h', int(AMPLITUDE * max(-1, min(1, val)))))
write_wav('assets/alarm_digital.wav', samples)

# 4. جرس هادئ (chime ناعم)
print("4. Soft Chime (جرس هادئ)")
samples = []
for i in range(SAMPLE_RATE * 8):
    t = i / SAMPLE_RATE
    cycle = t % 2.0
    if cycle < 1.5:
        note_t = cycle
        freq = 523.25  # C5
        env = math.exp(-note_t * 2.0) * 0.7
        val = math.sin(2*math.pi*freq*t)*env
        val += 0.4*math.sin(2*math.pi*freq*2*t)*env*math.exp(-note_t*3)
        val += 0.2*math.sin(2*math.pi*freq*3*t)*env*math.exp(-note_t*4)
        if cycle > 0.5 and cycle < 1.0:
            freq2 = 659.25  # E5
            env2 = math.exp(-(cycle-0.5)*2.0)*0.5
            val += math.sin(2*math.pi*freq2*t)*env2
    else:
        val = 0
    samples.append(struct.pack('<h', int(AMPLITUDE * max(-1, min(1, val)))))
write_wav('assets/alarm_chime.wav', samples)

# 5. صفارة إنذار (urgent)
print("5. Urgent Siren (صفارة عاجلة)")
samples = []
for i in range(SAMPLE_RATE * 8):
    t = i / SAMPLE_RATE
    cycle = t % 1.0
    freq = 800 + 400 * math.sin(2*math.pi*2*t)  # sweeping frequency
    val = math.sin(2*math.pi*freq*t)
    val += 0.3*math.sin(2*math.pi*freq*1.5*t)
    # brief gap every second
    if cycle > 0.9:
        val *= (1.0 - cycle) / 0.1
    samples.append(struct.pack('<h', int(AMPLITUDE * max(-1, min(1, val)))))
write_wav('assets/alarm_urgent.wav', samples)

print("\nDone! All 5 alarm sounds created.")
