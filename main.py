import os
import secrets
import string
import time
import threading
from typing import Dict, Any

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

app = FastAPI(title="Real Cricket 3D")
app.mount("/static", StaticFiles(directory="static"), name="static")

# Demo room storage is in memory. Rooms reset when the service restarts.
rooms: Dict[str, Dict[str, Any]] = {}
lock = threading.Lock()
ROOM_TTL = 60 * 60 * 4

class CreateRoom(BaseModel):
    name: str = "Player 1"

class JoinRoom(BaseModel):
    name: str = "Player 2"

class Action(BaseModel):
    player_id: str
    action: str
    value: int | None = None

def clean_name(name: str) -> str:
    return (name.strip()[:18] or "Player")

def new_code() -> str:
    alphabet = string.ascii_uppercase + string.digits
    while True:
        code = "".join(secrets.choice(alphabet) for _ in range(5))
        if code not in rooms:
            return code

def public_state(room):
    return {
        "code": room["code"],
        "players": [
            {"name": p["name"], "role": p["role"], "connected": p["connected"]}
            for p in room["players"].values()
        ],
        "score": room["score"],
        "wickets": room["wickets"],
        "balls": room["balls"],
        "status": room["status"],
        "last_event": room["last_event"],
        "last_event_id": room["last_event_id"],
        "batting_player": room["batting_player"],
        "message": room["message"],
        "updated_at": room["updated_at"],
    }

@app.get("/")
def home():
    return FileResponse("static/index.html")

@app.get("/health")
def health():
    return {"ok": True, "service": "Real Cricket 3D"}

@app.post("/api/rooms")
def create_room(data: CreateRoom):
    with lock:
        code = new_code()
        player_id = secrets.token_urlsafe(12)
        now = time.time()
        rooms[code] = {
            "code": code,
            "players": {
                player_id: {"name": clean_name(data.name), "role": "batter", "connected": True}
            },
            "score": 0,
            "wickets": 0,
            "balls": 0,
            "status": "waiting",
            "last_event": "Room created. Waiting for a second player.",
            "last_event_id": 1,
            "batting_player": player_id,
            "message": "Waiting for another player to join.",
            "updated_at": now,
            "created_at": now,
        }
        return {"room_code": code, "player_id": player_id, "role": "batter", "state": public_state(rooms[code])}

@app.post("/api/rooms/{code}/join")
def join_room(code: str, data: JoinRoom):
    code = code.upper()
    with lock:
        room = rooms.get(code)
        if not room:
            raise HTTPException(404, "Room not found. Check the room code.")
        if len(room["players"]) >= 2:
            raise HTTPException(409, "This room already has two players.")
        player_id = secrets.token_urlsafe(12)
        room["players"][player_id] = {"name": clean_name(data.name), "role": "bowler", "connected": True}
        room["status"] = "ready"
        room["message"] = "Both players connected. Batter: swing when the ball reaches you!"
        room["last_event"] = "Second player joined. Match ready."
        room["last_event_id"] += 1
        room["updated_at"] = time.time()
        return {"room_code": code, "player_id": player_id, "role": "bowler", "state": public_state(room)}

@app.get("/api/rooms/{code}")
def get_room(code: str, player_id: str):
    code = code.upper()
    with lock:
        room = rooms.get(code)
        if not room:
            raise HTTPException(404, "Room not found. It may have expired.")
        if player_id not in room["players"]:
            raise HTTPException(403, "This player is not a member of the room.")
        room["players"][player_id]["connected"] = True
        room["updated_at"] = time.time()
        return public_state(room)

@app.post("/api/rooms/{code}/action")
def room_action(code: str, data: Action):
    code = code.upper()
    with lock:
        room = rooms.get(code)
        if not room:
            raise HTTPException(404, "Room not found.")
        player = room["players"].get(data.player_id)
        if not player:
            raise HTTPException(403, "Player is not in this room.")
        if room["status"] != "ready":
            raise HTTPException(409, "Wait until both players have joined.")
        if data.action == "score":
            # Demo match event. The browser submits the result of its local ball simulation.
            if player["role"] != "batter":
                raise HTTPException(403, "Only the batter can submit a shot.")
            runs = data.value if data.value in (0, 1, 2, 3, 4, 6) else 0
            room["score"] += runs
            room["balls"] += 1
            if runs == 0:
                room["wickets"] += 1
                room["message"] = "Dot ball / wicket event."
            else:
                room["message"] = f"{runs} run(s) scored!"
            room["last_event"] = room["message"]
            room["last_event_id"] += 1
            if room["wickets"] >= 3 or room["balls"] >= 12:
                room["status"] = "finished"
                room["message"] += " Practice match finished."
        elif data.action == "reset":
            if player["role"] != "batter":
                raise HTTPException(403, "Only the batter can restart this practice match.")
            room["score"] = 0
            room["wickets"] = 0
            room["balls"] = 0
            room["status"] = "ready"
            room["message"] = "New practice innings started."
            room["last_event"] = room["message"]
            room["last_event_id"] += 1
        else:
            raise HTTPException(400, "Unknown action.")
        room["updated_at"] = time.time()
        return public_state(room)

@app.on_event("startup")
def remove_expired_rooms():
    def cleanup():
        while True:
            time.sleep(300)
            cutoff = time.time() - ROOM_TTL
            with lock:
                expired = [code for code, room in rooms.items() if room["updated_at"] < cutoff]
                for code in expired:
                    rooms.pop(code, None)
    threading.Thread(target=cleanup, daemon=True).start()
