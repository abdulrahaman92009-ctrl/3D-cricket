# Real Cricket 3D — Colab + Render starter

## What this starter is
A browser-playable 3D cricket prototype with a small two-player room backend. It uses Three.js from a public CDN (no paid API key) and FastAPI.

## Included
- 3D field, pitch, boundary, basic stands and simple procedural players
- Bat, ball, stumps and local ball movement
- Batter swing control (Space, Enter, click or tap)
- Create/join room with five-character code
- Shared score and room state through HTTP polling
- FastAPI backend and Render Blueprint file

## Honest limitations of this prototype
- Human players are simple procedural 3D placeholders, not photorealistic scanned humans.
- The multiplayer is a first demonstration: room state is held in server memory, and only the batter's practice score is authoritative. It is not yet a competitive, synchronized real-time cricket simulation.
- Render free services can sleep, restart, and lose in-memory rooms. Free hosting is for testing, not guaranteed always-on public production.
- Browser loads Three.js from jsDelivr; this is a library CDN, not a paid AI API.
- Do not use real players' likenesses or copyrighted game assets without permission.

## Run locally in Colab (for development preview)
1. Upload/extract the ZIP in Colab or run the notebook that creates this project.
2. In a Colab cell:
   `!pip install -r requirements.txt`
3. Start:
   `!uvicorn main:app --host 0.0.0.0 --port 8000`
4. Colab does not automatically make port 8000 public. Use Colab's supported port preview if available. Do not treat a temporary preview as public hosting.

## Deploy to Render
1. Push all files to a GitHub repository.
2. In Render choose New > Blueprint and connect the repository, or create a Python Web Service.
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Choose Free for a prototype if available in your account.
6. Open the generated `onrender.com` URL.

## Test multiplayer
1. Open the public URL in browser A.
2. Enter a name and click CREATE ROOM.
3. Copy the room code.
4. Open the same URL in browser B or another device.
5. Enter a different name and JOIN using the code.
6. Click ENTER MATCH in both browsers. Player 1 is the batter in this first prototype.
7. Player 1 swings using the SWING button, Space, Enter, click or tap.
8. Both clients should see shared score updates.

## Suggested next milestones
1. Improve timing, delivery types, shot direction, runs and dismissals.
2. Replace procedural players with properly licensed rigged 3D characters and animations.
3. Make ball and match simulation authoritative on the server.
4. Add secure room membership, reconnect handling, rate limits and server-side validation.
5. Add proper innings, teams, fielders, bowling controls and mobile UI.
6. Export Android and Windows builds after browser gameplay is stable.
