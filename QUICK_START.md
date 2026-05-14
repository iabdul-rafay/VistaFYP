# Voice Control - Quick Start Guide

## 🚀 5-Minute Setup

### Step 1: Get OpenAI API Key (2 min)
```
1. Go to https://platform.openai.com/account/api-keys
2. Click "Create new secret key"
3. Copy the key (starts with sk-)
4. Keep it secure!
```

### Step 2: Prepare Your App (2 min)
```bash
# In project root directory:

# 1. Create .env.local file
echo EXPO_PUBLIC_OPENAI_API_KEY=sk-your-key-here > .env.local

# 2. Install new dependencies
npm install

# 3. Clear and rebuild
expo start -c
```

### Step 3: Upload to ESP32 (1 min)
```
1. Open Arduino IDE
2. Sketch → Include Library → Manage Libraries
3. Search: "ArduinoJson"
4. Click Install by Benoit Blanchon
5. Open: esp32-code-refactored.ino
6. Update WiFi (lines 15-16):
   - const char* ssid = "Estuff";
   - const char* password = "@Rajput786";
7. Click Upload button
8. Monitor serial for: "HTTP Server started"
```

### ✅ Done! Now test:
1. Tap microphone button in app
2. Say: "Turn on bulb one"
3. Hear: "Okay, doing this"
4. See: Bulb 1 turns on!

---

## 📱 Usage Quick Reference

### Voice Commands (English)
```
Lights:
✓ "Turn on bulb 1"
✓ "Turn off bulb 1"
✓ "Light 1 on"

Fans:
✓ "Turn on fan"
✓ "Fan maximum"
✓ "Fan medium"

Door:
✓ "Open gate"
✓ "Close gate"
```

### Voice Commands (Urdu - اردو)
```
روشنی:
✓ "بلب چالو کریں"
✓ "روشنی بند کریں"

فین:
✓ "فین چالو کریں"
✓ "فین بند کریں"

دروازہ:
✓ "گیٹ کھولیں"
✓ "گیٹ بند کریں"
```

### How to Use
```
1. Tap microphone icon (top right)
2. Select language: English 🇺🇸 or Urdu 🇵🇰
3. Tap "Record" and speak
4. See transcription appear
5. Tap "Execute" when matched
6. Device speaks confirmation
7. Device state updates instantly!
```

---

## 🔧 Troubleshooting (Key Issues)

### "App can't find device"
```
✓ Check: Both ESP32 and phone on same WiFi
✓ Check: Serial monitor shows "HTTP Server started"
✓ Try: Wait 10 seconds for mDNS discovery
✓ If still fails: Enter IP manually (check Serial output)
```

### "API Key errors"
```
✓ Check: .env.local file exists
✓ Check: Key starts with "sk-"
✓ Check: Rebuild app: expo start -c
✓ Check: API key is valid (test on openai.com)
```

### "Microphone not recording"
```
✓ Check: Microphone permission granted
✓ Check: Device not in silent mode
✓ Check: No other app using microphone
✓ Try: Restart app
```

### "Voice not recognized"
```
✓ Speak louder and clearer
✓ Reduce background noise
✓ Try alternative phrasing
✓ Tap list icon to see all commands
✓ Check language is set correctly
```

---

## 🎚️ Performance Expectations

| Operation | Time |
|-----------|------|
| Record voice | ~5 seconds |
| Transcribe (Whisper) | 1-3 seconds |
| Match command | <1 second |
| Execute on ESP32 | <1 second |
| Voice feedback | 2-3 seconds |
| **Total** | **~4-10 seconds** |

✅ End-to-end voice control in under 10 seconds!
✅ Direct button commands: <500ms

---

## ⚠️ Important Reminders

1. **OpenAI API Key**
   - Costs money (~$0.006/min audio)
   - Keep it private, don't share
   - Check usage: https://platform.openai.com/account

2. **Network**
   - App and ESP32 must be on same WiFi
   - mDNS may not work on enterprise WiFi
   - Internet required for Whisper API

3. **Permissions**
   - Grant microphone permission on first launch
   - TTS may need language installation

4. **Limitations**
   - Max recording: 30 seconds
   - Fuzzy matching works at 70%+ similarity
   - Audio deleted after transcription

---

## 📚 Documentation

- **VOICE_CONTROL_DOCS.md** - Full feature guide
- **VOICE_TESTING_GUIDE.md** - Detailed testing steps
- **VOICE_SETUP.md** - Advanced setup instructions
- **IMPLEMENTATION_SUMMARY.md** - Complete technical reference

---

## ✨ What Changed

### Before
```
User: Tap button → Firebase write → ESP32 polls → Wait 30-50s → See result
```

### After - Direct Control
```
User: Tap button → HTTP POST → ESP32 executes → 500ms → See result ⚡ 60x faster!
```

### After - Voice Control
```
User: Say "Turn on bulb" → Whisper → Match → Execute → "Okay, doing this" ✨ New!
```

---

## 🎯 Common Workflows

### Workflow 1: Turn on Light with Voice
```
1. Tap microphone (🎤)
2. Say: "Turn on bulb 1"
3. See transcription
4. Tap Execute
5. Bulb turns on + hear feedback
⏱️ Total time: ~5-10 seconds
```

### Workflow 2: Control Fan Speed
```
1. Method A (Button): Tap fan slider
   ⏱️ ~500ms faster response

2. Method B (Voice): "Fan maximum"
   ⏱️ ~10 seconds with transcription
```

### Workflow 3: Browse Available Commands
```
1. Tap microphone (🎤)
2. Tap list icon (📜)
3. See all 24 commands
4. Choose language (🇺🇸/🇵🇰)
5. Learn aliases and variations
```

---

## 🆘 Quick Help

**Something not working?**

1. Check `.env.local` has your API key
2. Check Serial monitor: "HTTP Server started" message
3. Check WiFi: App and ESP32 on same network
4. Restart app: `expo start -c` (clears cache)
5. Check permissions: Microphone allowed?
6. Review **VOICE_TESTING_GUIDE.md** for detailed debugging

**Want more features?**

See **IMPLEMENTATION_SUMMARY.md** for:
- Adding custom commands
- Custom voice profiles
- Scene/shortcut commands
- Offline support
- Performance logging

**Need help?**

Files created for you:
- ✅ VOICE_SETUP.md → Installation guide
- ✅ VOICE_CONTROL_DOCS.md → Feature reference
- ✅ VOICE_TESTING_GUIDE.md → Testing & debugging
- ✅ IMPLEMENTATION_SUMMARY.md → Technical details

---

## 🎓 Learning Outcomes

After setup, you'll have learned:
- ✓ Direct device communication (HTTP REST)
- ✓ WiFi auto-discovery (mDNS)
- ✓ Speech recognition (OpenAI Whisper)
- ✓ Voice feedback (TTS)
- ✓ Fuzzy string matching
- ✓ React Native hooks & state management
- ✓ IoT device integration

---

**Ready to test your voice control? 🚀**

Follow the 5 steps above and you'll have voice commands working in minutes!
