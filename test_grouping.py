
import json
import re

def group_subtitles(subtitles, words_per_line):
    if not subtitles: return []
    current_group = []
    grouped = []
    for i in range(len(subtitles)):
        current_group.append(subtitles[i])
        if len(current_group) >= words_per_line or i == len(subtitles) - 1:
            grouped.append({
                "text": " ".join([s["text"] for s in current_group]),
                "start": current_group[0]["start"],
                "end": current_group[-1]["end"]
            })
            current_group = []
    
    final_grouped = []
    for group in grouped:
        is_punctuation_only = re.match(r'^[.,;!?¿¡:\-\s]+$', group["text"].strip())
        if is_punctuation_only and final_grouped:
            last = final_grouped[-1]
            last["text"] += group["text"]
            last["end"] = group["end"]
        else:
            final_grouped.append(group)
    return final_grouped

# Simulate edge-tts outputting orphan punctuation
# This matches the new logic in parseSRT (if it was implemented in JS, here in Python for local verification)
subs = [
    {"text": "Hola", "start": 0, "end": 0.5},
    {"text": ",", "start": 0.5, "end": 0.6},
    {"text": "mundo", "start": 0.6, "end": 1.1},
    {"text": ".", "start": 1.1, "end": 1.2},
]

print("Fixed grouping with words per line: 1")
print(json.dumps(group_subtitles(subs, 1), indent=2))

print("\nFixed grouping with words per line: 2")
print(json.dumps(group_subtitles(subs, 2), indent=2))
