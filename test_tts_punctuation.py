
import subprocess
import os

text = "Hello world. How are you? This is a test!"
voice = "en-US-GuyNeural"
output_media = "test_audio_en.mp3"
output_srt = "test_subs_en.srt"

print(f"Generating voice for: {text}")

try:
    subprocess.run([
        "python", "-m", "edge_tts",
        "--text", text,
        "--voice", voice,
        "--write-media", output_media,
        "--write-subtitles", output_srt
    ], check=True)

    if os.path.exists(output_srt):
        with open(output_srt, "r", encoding="utf-8") as f:
            content = f.read()
            print("\nGenerated SRT content:")
            print("-" * 20)
            print(content)
            print("-" * 20)
    else:
        print("SRT file was not generated.")

except Exception as e:
    print(f"Error: {e}")
# Kept files for inspection
