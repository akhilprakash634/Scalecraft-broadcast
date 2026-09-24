import os
import re
import ast

def patch_tts_tool():
    tts_path = "/home/ubuntu/.hermes/hermes-agent/venv/lib/python3.10/site-packages/tools/tts_tool.py"
    if not os.path.exists(tts_path):
        print(f"Error: {tts_path} does not exist.")
        # Fallback to hermes/tools
        tts_path = "/home/ubuntu/.hermes/hermes-agent/venv/lib/python3.10/site-packages/hermes/tools/tts_tool.py"
        if not os.path.exists(tts_path):
            print(f"Error: {tts_path} also does not exist.")
            return

    with open(tts_path, "r") as f:
        content = f.read()

    # 1. Import langdetect safely in case Whisper language is unavailable in TTS tool
    if "import langdetect" not in content:
        content = "import langdetect\n" + content

    # 2. Add Voice Mapping
    mapping_code = """
EDGE_VOICE_MAPPING = {
    "en": "en-US-AriaNeural",
    "ml": "ml-IN-MidhunNeural",
    "ta": "ta-IN-PallaviNeural",
    "hi": "hi-IN-MadhurNeural",
    "te": "te-IN-MohanNeural",
    "ar": "ar-SA-HamedNeural"
}
"""
    if "EDGE_VOICE_MAPPING" not in content:
        # insert after imports
        match = re.search(r'(import .*?\n|from .*? import .*?\n)+', content)
        if match:
            content = content[:match.end()] + mapping_code + content[match.end():]
        else:
            content = mapping_code + content

    # 3. Patch _generate_edge_tts or similar
    # We will use regex to find where edge-tts voice is selected, usually `voice = self.config.get("voice", ...)`
    
    # We want to replace the standard voice assignment with our dynamic logic
    dynamic_voice_logic = """
        detected_lang = kwargs.get("detected_language")
        if not detected_lang:
            try:
                # Fallback to langdetect if Whisper language wasn't propagated
                detected_lang = langdetect.detect(text)
            except:
                pass
        
        if detected_lang and detected_lang in EDGE_VOICE_MAPPING:
            voice = EDGE_VOICE_MAPPING[detected_lang]
            logger.info(f"TTS language={detected_lang} voice={voice} (Dynamic Multilingual)")
        else:
            voice = self.config.get("voice", "en-US-AriaNeural")
            logger.info(f"TTS language={detected_lang} voice={voice} (Fallback/Default)")
"""
    
    # Find definition of _generate_edge_tts
    if "def _generate_edge_tts" in content:
        # Very rough patch for the voice variable
        content = re.sub(
            r'(voice\s*=\s*self\.config\.get\("voice",.*?\))', 
            dynamic_voice_logic.strip(),
            content
        )
        print("Patched _generate_edge_tts in tts_tool.py")

    with open(tts_path, "w") as f:
        f.write(content)
        
    print(f"Successfully patched {tts_path}")

def patch_base_py():
    base_path = "/home/ubuntu/.hermes/hermes-agent/venv/lib/python3.10/site-packages/gateway/platforms/base.py"
    if not os.path.exists(base_path):
        base_path = "/home/ubuntu/.hermes/hermes-agent/venv/lib/python3.10/site-packages/hermes/gateway/platforms/base.py"
        if not os.path.exists(base_path):
            print(f"Error: base.py not found.")
            return

    with open(base_path, "r") as f:
        content = f.read()
        
    # We need to pass detected_language to text_to_speech_tool
    # Find: tts_result_str = await asyncio.to_thread(text_to_speech_tool, text=speech_text)
    # Replace with: tts_result_str = await asyncio.to_thread(text_to_speech_tool, text=speech_text, detected_language=getattr(event, 'detected_language', None))
    
    target = "tts_result_str = await asyncio.to_thread(\n                                text_to_speech_tool, text=speech_text\n                            )"
    replacement = "tts_result_str = await asyncio.to_thread(\n                                text_to_speech_tool, text=speech_text, detected_language=getattr(event, 'detected_language', getattr(event.metadata, 'get', lambda x: None)('detected_language') if hasattr(event, 'metadata') else None)\n                            )"
    
    if target in content:
        content = content.replace(target, replacement)
        print("Patched Auto-TTS call in base.py")
    else:
        # Try a more flexible regex
        content = re.sub(
            r'(tts_result_str\s*=\s*await\s*asyncio\.to_thread\(\s*text_to_speech_tool,\s*text=speech_text)(\s*\))',
            r"\1, detected_language=getattr(event, 'detected_language', getattr(event.metadata, 'get', lambda x: None)('detected_language') if hasattr(event, 'metadata') else None)\2",
            content
        )
        print("Patched Auto-TTS call in base.py using regex")
        
    with open(base_path, "w") as f:
        f.write(content)
        
    print(f"Successfully patched {base_path}")

if __name__ == "__main__":
    try:
        import langdetect
    except ImportError:
        os.system("pip install langdetect")
        
    patch_tts_tool()
    patch_base_py()
    print("Restarting hermes-gateway service...")
    os.system("sudo systemctl restart hermes-gateway")
    print("Done! You can now test Malayalam voice messages.")
