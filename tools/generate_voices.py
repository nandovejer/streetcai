"""Genera las voces del locutor con Piper TTS (código abierto, sin conexión) a public/assets/voice/.
Uso: python tools/generate_voices.py <carpeta_con_el_modelo> [voz]
Requiere: piper-tts, y ffmpeg en el PATH.

Voz por defecto: es_ES-sharvard-medium, locutor masculino (español de España, CC-BY 3.0: hay que citar
el corpus Sharvard, ver la pantalla de créditos), descargable de
https://huggingface.co/rhasspy/piper-voices/tree/main/es/es_ES/sharvard/medium
Cada frase se pasa por un filtro de voz robot de recreativa (metálica, 8 bits) y se guarda en MP3 mono.
"""
import os, subprocess, sys, tempfile, wave
from piper import PiperVoice, SynthesisConfig

# Texto escrito "a la gaditana" para que una voz castellana suene más de Cádiz: seseo (s por c/z),
# eses y erres finales que se comen, reducciones (perfeto, marejá) y expresiones de allí (picha, quillo; el motor no tiene la [ʃ] gaditana).
FIGHTERS = {  # id: (nombre hablado, especial hablado)
    'chapa': ('Chapa', 'Chapaso'),
    'ares': ('Are', 'Levantera'),
    'alba': ('Alba', 'Marejá'),
    'martin': ('Martín', 'Sombreraso'),
    'selu': ('Selu', 'Chirigota'),
}

def phrases():
    p = {
        'round1': '¡Ronda uno!', 'round2': '¡Ronda do!', 'round3': '¡Ronda tre!',
        'round4': '¡Ronda cuatro!', 'round5': '¡Ronda sinco!',
        'fight': '¡A peleá, picha!', 'ko': '¡Kei ou!', 'time': '¡Tiempo!', 'perfect': '¡Perfecto!', 'draw': '¡Empate, quillo!',
        'title': '¡Strit Cai!', 'gameover': '¡Se acabó lo que se daba!', 'select': '¡Elige tu luchadó!',
        'continue': '¿Sigue, quillo?', 'champion': '¡Campeón de Cai!',
    }
    for fid, (name, special) in FIGHTERS.items():
        p[f'win_{fid}'] = f'¡{name} gana!'
        p[f'super_{fid}'] = f'¡{special}!'
        for oid, (oname, _) in FIGHTERS.items():
            if oid != fid: p[f'vs_{fid}_{oid}'] = f'¡{name} contra {oname}!'
    return p

# Filtro de voz robot de recreativa: fase constante en la FFT (voz metálica de tono plano), luego
# baja resolución a 16 kHz y 8 bits (sonido "digitalizado" de los 90) y normalización.
FILTER = ("afftfilt=real='hypot(re,im)*cos(0)':imag='hypot(re,im)*sin(0)':win_size=512:overlap=0.75,"
          'aresample=16000,acrusher=bits=8:mode=log:aa=1,aresample=44100,'
          'adelay=40,apad=pad_dur=0.12,loudnorm=I=-14:TP=-1.5:LRA=7')

def main():
    model_dir = sys.argv[1]
    voice = sys.argv[2] if len(sys.argv) > 2 else 'es_ES-sharvard-medium'
    out_dir = 'public/assets/voice'
    os.makedirs(out_dir, exist_ok=True)
    v = PiperVoice.load(os.path.join(model_dir, voice + '.onnx'))
    # locutor masculino (speaker 0), algo más rápido: el habla gaditana va ligera
    cfg = SynthesisConfig(speaker_id=0, length_scale=1.0, noise_scale=0.6, noise_w_scale=0.5)
    items = phrases()
    with tempfile.TemporaryDirectory() as tmp:
        for vid, text in items.items():
            raw = os.path.join(tmp, vid + '.wav')
            with wave.open(raw, 'wb') as wf:
                v.synthesize_wav(text, wf, syn_config=cfg)
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', raw, '-af', FILTER, '-ac', '1', '-ar', '44100',
                            '-c:a', 'libmp3lame', '-b:a', '80k', os.path.join(out_dir, vid + '.mp3')], check=True)
    print(f'{len(items)} voces en {out_dir} ({voice})')

if __name__ == '__main__':
    main()
