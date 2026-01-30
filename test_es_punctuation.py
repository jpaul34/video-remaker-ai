
import subprocess
import os

text = "¿Te sientes sin energía? ¡Toma agua!"
voice = "es-MX-JorgeNeural"
output_media = "test_es_audio.mp3"
output_srt = "test_es_subs.srt"

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
finally:
    if os.path.exists(output_media): os.remove(output_media)
    # Don't remove SRT yet so I can check it
