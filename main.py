import sounddevice as sd
from scipy.io.wavfile import write
import tempfile
import os
from openai import OpenAI

# Record voice from mic
def record_audio(filename, duration=5, fs=44100):
    print("Recording...")
    recording = sd.rec(int(duration * fs), samplerate=fs, channels=1, dtype='int16')
    sd.wait()
    write(filename, fs, recording)
    print(f"Saved to {filename}")

# Transcribe with Whisper
def transcribe_audio(filepath):
    client = OpenAI(
#        api_key="IZIBbUTsb3CmvZGmoN36hXnz2pjY4JHu",
#        base_url="https://api.lemonfox.ai/v1"
    )

    with open(filepath, "rb") as audio_file:
        transcript = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            language="ru"
        )
    print(transcript)
    print("Transcription:", transcript.text)

# Use temp file to record and transcribe
with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmpfile:
    record_audio(tmpfile.name, duration=15)
    transcribe_audio(tmpfile.name)
    os.remove(tmpfile.name)


