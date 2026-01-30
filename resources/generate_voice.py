import asyncio
import edge_tts
import json
import sys
import os

async def main():
    if len(sys.argv) < 5:
        print("Usage: python generate_voice.py <text> <voice> <output_audio> <output_json>")
        sys.exit(1)

    text_file = sys.argv[1]
    voice = sys.argv[2]
    output_audio = sys.argv[3]
    output_json = sys.argv[4]

    # Read text from file with UTF-8 encoding
    with open(text_file, "r", encoding="utf-8") as f:
        text = f.read()

    print(f"DEBUG: Text length: {len(text)} characters", file=sys.stderr)
    print(f"DEBUG: Voice: {voice}", file=sys.stderr)

    communicate = edge_tts.Communicate(text, voice)
    words = []

    # Stream audio and capture word boundaries
    with open(output_audio, "wb") as f:
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                # offset and duration are in 100ns units
                start = chunk["offset"] / 10000000
                duration = chunk["duration"] / 10000000
                words.append({
                    "text": chunk["text"],
                    "start": round(start, 3),
                    "end": round(start + duration, 3)
                })
            else:
                print(f"DEBUG: Received chunk type: {chunk['type']}", file=sys.stderr)

    print(f"DEBUG: Captured {len(words)} words", file=sys.stderr)

    # Save word timings to JSON
    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(words, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    asyncio.run(main())
