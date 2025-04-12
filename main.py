import sounddevice as sd
from scipy.io.wavfile import write
import tempfile
import os
import argparse
from openai import OpenAI

class AudioTranscriber:
    """A class to handle audio recording and transcription."""
    
    def __init__(self, api_key=None, base_url=None, language="ru"):
        """Initialize the transcriber with optional API settings."""
        self.api_key = api_key
        self.base_url = base_url
        self.language = language
        self.client = self._setup_client()
    
    def _setup_client(self):
        """Set up the OpenAI client with provided credentials."""
        client_args = {}
        if self.api_key:
            client_args["api_key"] = self.api_key
        if self.base_url:
            client_args["base_url"] = self.base_url
        return OpenAI(**client_args)
    
    def record_audio(self, filename, duration=5, fs=44100):
        """Record audio from microphone and save to file.
        
        Args:
            filename: Path to save the audio file
            duration: Recording duration in seconds
            fs: Sample rate
        """
        print(f"Recording for {duration} seconds...")
        recording = sd.rec(int(duration * fs), samplerate=fs, channels=1, dtype='int16')
        sd.wait()
        write(filename, fs, recording)
        print(f"Audio saved to {filename}")
        return filename
    
    def transcribe_audio(self, filepath):
        """Transcribe audio file using OpenAI's Whisper model.
        
        Args:
            filepath: Path to the audio file
        
        Returns:
            Transcription text
        """
        try:
            with open(filepath, "rb") as audio_file:
                transcript = self.client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    language=self.language
                )
            print(transcript)
            return transcript.text
        except Exception as e:
            print(f"Transcription error: {e}")
            return None

def main():
    """Main function to parse arguments and run the application."""
    parser = argparse.ArgumentParser(description="Record and transcribe audio")
    parser.add_argument("--duration", type=int, default=5, help="Recording duration in seconds")
    parser.add_argument("--language", type=str, default="ru", help="Language for transcription")
    parser.add_argument("--save", type=str, help="Save audio to this file instead of using a temp file")
    parser.add_argument("--api-key", type=str, help="OpenAI API key")
    parser.add_argument("--base-url", type=str, help="Custom API base URL")
    
    args = parser.parse_args()
    
    transcriber = AudioTranscriber(
        api_key=args.api_key,
        base_url=args.base_url,
        language=args.language
    )
    
    if args.save:
        # Use the provided filename
        audio_file = args.save
        transcriber.record_audio(audio_file, duration=args.duration)
        transcription = transcriber.transcribe_audio(audio_file)
        print(f"Transcription: {transcription}")
    else:
        # Use a temporary file
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmpfile:
            audio_file = tmpfile.name
            try:
                transcriber.record_audio(audio_file, duration=args.duration)
                transcription = transcriber.transcribe_audio(audio_file)
                print(f"Transcription: {transcription}")
            finally:
                os.remove(audio_file)
                print(f"Temporary file {audio_file} removed")

if __name__ == "__main__":
    main()


