import * as THREE from "three";

const mount = document.getElementById("game");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8fc5df);
scene.fog = new THREE.Fog(0x8fc5df, 35, 95);
const camera = new THREE.PerspectiveCamera(55, innerWidth/innerHeight, 0.1, 150);
camera.position.set(0, 8.5, 17.5);
camera.lookAt(0, 1, -3);
const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
mount.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xe5f5ff, 0x45613a, 2.0));
const sun = new THREE.DirectionalLight(0xfff0d4, 2.3);
sun.position.set(-12, 22, 10); sun.castShadow = true; sun.shadow.mapSize.set(1024,1024);
scene.add(sun);

const mat=(color,roughness=.85)=>new THREE.MeshStandardMaterial({color,roughness});
const grass=mat(0x28743b), pitchMat=mat(0xb9956c), lineMat=mat(0xf5e8c8), skin=mat(0x9a684b), hair=mat(0x21170f), blue=mat(0x174caa), red=mat(0x9d2426), pants=mat(0x17202a), wood=mat(0xc18a45), ballMat=mat(0xb20e1b,.45);
function box(parent,name,pos,size,material){const m=new THREE.Mesh(new THREE.BoxGeometry(...size),material);m.name=name;m.position.set(...pos);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function sphere(parent,pos,r,material){const m=new THREE.Mesh(new THREE.SphereGeometry(r,20,16),material);m.position.set(...pos);m.castShadow=true;parent.add(m);return m;}
function capsule(parent,pos,r,h,material){const m=new THREE.Mesh(new THREE.CapsuleGeometry(r,h,5,10),material);m.position.set(...pos);m.castShadow=true;parent.add(m);return m;}

box(scene,"outfield",[0,-.35,-3],[48,.7,52],grass);
box(scene,"pitch",[0,.02,-2],[3.4,.08,22],pitchMat);
for(const z of [-8.5,3.4]) box(scene,"crease",[0,.08,z],[3.5,.025,.12],lineMat);
const boundary = new THREE.Mesh(new THREE.RingGeometry(18.7,19,.100),lineMat); // decorative outer ring
boundary.rotation.x=-Math.PI/2; boundary.position.set(0,.02,-3); scene.add(boundary);
const standMat=mat(0x34465a);
box(scene,"stand north",[0,1.2,-24],[48,3.5,2],standMat);
box(scene,"stand west",[-23,1.2,-3],[2,3.5,42],standMat);
box(scene,"stand east",[23,1.2,-3],[2,3.5,42],standMat);
// Crowd dots create stadium atmosphere without external assets.
const crowdMat=[mat(0xe7d2a2),mat(0x5d9ab4),mat(0xe8eeee),mat(0x9d5d54)];
for(let i=0;i<180;i++){let a=Math.random()*Math.PI*2,rad=21+Math.random()*1.2; sphere(scene,[Math.cos(a)*rad,2.2+Math.random()*1.0,-3+Math.sin(a)*rad],.09,crowdMat[i%4]);}

function human(name,x,z,shirt){
 const g=new THREE.Group();g.name=name;g.position.set(x,0,z);scene.add(g);
 capsule(g,[0,1.35,0],.32,.62,shirt);
 sphere(g,[0,2.08,0],.255,skin);
 sphere(g,[0,2.27,-.025],.24,hair);
 // face features oriented toward the camera (+Z)
 sphere(g,[-.085,2.10,.222],.025,mat(0xffffff));
 sphere(g,[.085,2.10,.222],.025,mat(0xffffff));
 sphere(g,[-.085,2.10,.244],.012,mat(0x151515));
 sphere(g,[.085,2.10,.244],.012,mat(0x151515));
 box(g,"nose",[0,2.02,.255],[.055,.09,.05],skin);
 capsule(g,[-.15,.48,0],.12,.62,pants);
 capsule(g,[.15,.48,0],.12,.62,pants);
 box(g,"left shoe",[-.15,.08,.09],[.25,.14,.36],mat(0x101318));
 box(g,"right shoe",[.15,.08,.09],[.25,.14,.36],mat(0x101318));
 const arm1=capsule(g,[-.39,1.39,0],.095,.58,shirt);arm1.rotation.z=-.35;
 const arm2=capsule(g,[.39,1.39,0],.095,.58,shirt);arm2.rotation.z=.35;
 sphere(g,[-.48,1.05,.04],.11,skin);sphere(g,[.48,1.05,.04],.11,skin);
 return g;
}
const batter=human("Batter",0,3.0,blue); batter.rotation.y=Math.PI;
const bowler=human("Bowler",0,-10.5,red);
const stumpsMat=mat(0xf3e4c4);
for(const z of [-8.8,4.0])for(const x of [-.22,0,.22]){const s=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,1.05,12),stumpsMat);s.position.set(x,.53,z);scene.add(s);}
const batGroup=new THREE.Group();batGroup.position.set(.62,1.0,2.45);scene.add(batGroup);
box(batGroup,"bat blade",[0,0,0],[.2,1,.10],wood);box(batGroup,"bat handle",[0,.68,0],[.11,.38,.11],mat(0x333333));
const ball=sphere(scene,[0,1,-12],.12,ballMat);
let ballVel=new THREE.Vector3(0,1.2,10), ballActive=false, hit=false, swingAt=0, lastEventId=0;
let score=0,wickets=0,balls=0, role=null, roomCode=null, playerId=null, pollTimer=0, deliveryWait=1.4;
let localMatchStarted=false, actionBusy=false;
const $=id=>document.getElementById(id);
function toast(t){$("toast").textContent=t;setTimeout(()=>{if($("toast").textContent===t)$("toast").textContent="";},1400);}
function startBall(){ball.position.set((Math.random()-.5)*.6,1.0,-12);ballVel.set((Math.random()-.5)*.35,1.0,10.0);ball.visible=true;ballActive=true;hit=false;deliveryWait=1.4;}
function updateScore(s){score=s.score;wickets=s.wickets;balls=s.balls;$("score").textContent=`${score}/${wickets}`;$("overs").textContent=`${Math.floor(balls/6)}.${balls%6} overs`;}
function swing(){
 if(role!=="batter"||!localMatchStarted||!ballActive||hit)return;
 swingAt=performance.now();batGroup.rotation.x=-.85;
 setTimeout(()=>batGroup.rotation.x=0,250);
 const close=Math.abs(ball.position.z-2.1)<1.55;
 const aligned=Math.abs(ball.position.x-.5)<1.3;
 const height=ball.position.y>.3&&ball.position.y<2.5;
 if(close&&aligned&&height){
   hit=true;ballVel.set((Math.random()-.5)*9,7+Math.random()*2,-17-Math.random()*3);toast("TIMED SHOT!");
 } else {toast("MISSED THE TIMING");}
}
$("swingBtn").addEventListener("click",swing);
addEventListener("keydown",e=>{if(e.code==="Space"||e.code==="Enter"){e.preventDefault();swing();}});
async function api(path,opts={}){const r=await fetch(path,{headers:{"Content-Type":"application/json"},...opts});let d={};try{d=await r.json()}catch{}if(!r.ok)throw new Error(d.detail||"Network error");return d;}
function setRoom(data){
 roomCode=data.room_code;playerId=data.player_id;role=data.role;
 $("roomCode").textContent=roomCode;$("roleText").textContent=`You are the ${role}.`;
 $("roomInfo").hidden=false;$("lobbyMessage").textContent="Share this code with your friend.";
 $("hint").textContent=role==="batter"?"BATTER: tap SWING when the ball reaches you":"BOWLER: watch the batter's shots";
 pollRoom();
}
$("createBtn").onclick=async()=>{try{const d=await api("/api/rooms",{method:"POST",body:JSON.stringify({name:$("playerName").value})});setRoom(d);}catch(e){$("lobbyMessage").textContent=e.message;}};
$("joinBtn").onclick=async()=>{try{const code=$("roomInput").value.trim().toUpperCase();const d=await api(`/api/rooms/${code}/join`,{method:"POST",body:JSON.stringify({name:$("playerName").value})});setRoom(d);}catch(e){$("lobbyMessage").textContent=e.message;}};
$("startBtn").onclick=()=>{if(role==="batter"){$("lobby").hidden=true;$("hud").hidden=false;localMatchStarted=true;startBall();}else{$("lobby").hidden=true;$("hud").hidden=false;localMatchStarted=true;}};
$("resetBtn").onclick=async()=>{if(role!=="batter")return;try{await api(`/api/rooms/${roomCode}/action`,{method:"POST",body:JSON.stringify({player_id:playerId,action:"reset"})});}catch(e){toast(e.message);}};
async function sendScore(runs){if(actionBusy)return;actionBusy=true;try{const s=await api(`/api/rooms/${roomCode}/action`,{method:"POST",body:JSON.stringify({player_id:playerId,action:"score",value:runs})});updateScore(s);lastEventId=s.last_event_id;toast(s.message);}catch(e){toast(e.message);}finally{actionBusy=false;}}
async function pollRoom(){if(!roomCode)return;try{
 const s=await api(`/api/rooms/${roomCode}?player_id=${encodeURIComponent(playerId)}`);
 updateScore(s);
 const names=s.players.map(p=>`${p.name} (${p.role})`).join(" • ");
 $("playersText").textContent=names;
 if(s.status==="ready"){$("lobbyMessage").textContent="Both players connected. Ready to play!";}
 if(s.last_event_id!==lastEventId&&s.last_event_id>1){lastEventId=s.last_event_id;toast(s.last_event);}
 if(s.status==="finished"){$("hint").textContent="Practice match finished. Batter can reset.";}
 }catch(e){$("lobbyMessage").textContent=e.message;}}
function animate(){
 requestAnimationFrame(animate);
 const dt=Math.min(clock.getDelta(),.04);
 if(localMatchStarted&&role==="batter"&&ballActive){
   ballVel.y-=9.8*dt;ball.position.addScaledVector(ballVel,dt);
   if(hit){
     if(ball.position.y<=.16){ball.position.y=.16;ballVel.y=Math.abs(ballVel.y)*.42;ballVel.x*=.82;ballVel.z*=.82;}
     if(ball.position.z< -20||Math.abs(ball.position.x)>9){
       const runs=ball.position.y>2?6:4;ballActive=false;ball.visible=false;sendScore(runs);deliveryWait=1.8;
     }else if(ball.position.z>6){ballActive=false;ball.visible=false;sendScore(0);deliveryWait=1.8;}
   }else{
     if(ball.position.y<=.2){ball.position.y=.2;ballVel.y=Math.abs(ballVel.y)*.45;}
     if(ball.position.z>4.6){ballActive=false;ball.visible=false;sendScore(0);deliveryWait=1.8;}
   }
 }else if(localMatchStarted&&role==="batter"&&!ballActive&&wickets<3&&balls<12){
   deliveryWait-=dt;if(deliveryWait<=0)startBall();
 }
 renderer.render(scene,camera);
}
const clock=new THREE.Clock();animate();
addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
