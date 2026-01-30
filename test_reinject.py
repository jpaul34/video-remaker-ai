
import json

def reinject_punctuation(script, words_data):
    original_words = script.strip().split()
    
    # Simple alignment
    res = []
    o_idx = 0
    
    for w_data in words_data:
        timed_text = w_data["text"]
        
        # Try to find a match in original_words starting from o_idx
        found = False
        for i in range(o_idx, min(o_idx + 5, len(original_words))):
            orig = original_words[i]
            # Clean both to compare
            clean_orig = "".join(c for c in orig.lower() if c.isalnum())
            clean_timed = "".join(c for c in timed_text.lower() if c.isalnum())
            
            # If they match or one is a subset of the other (for partial splits)
            if clean_orig and clean_timed and (clean_orig in clean_timed or clean_timed in clean_orig):
                # Use original word's punctuation but keep sequence
                # Mapping: "¿Te" (orig) vs "Te" (timed)
                # If we just replace, we might loose what edge-tts actually said
                # but since we want the script exactly, replacing is usually fine.
                w_data["text"] = orig
                o_idx = i + 1
                found = True
                break
        res.append(w_data)
    return res

script = "¿Te sientes sin energía? ¡Toma agua!"
words_data = [
    {"text": "Te", "start": 0, "end": 0.5},
    {"text": "sientes", "start": 0.5, "end": 1.0},
    {"text": "sin", "start": 1.0, "end": 1.5},
    {"text": "energía?", "start": 1.5, "end": 2.0},
    {"text": "Toma", "start": 2.0, "end": 2.5},
    {"text": "agua!", "start": 2.5, "end": 3.0},
]

fixed = reinject_punctuation(script, words_data)
print(json.dumps(fixed, indent=2))
