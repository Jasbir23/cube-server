import express from "express"; // using expres
import socketIO from "socket.io";
import http from "http";
import Matter from "matter-js";
import {
  defaultWidth,
  defaultHeight,
  treeStartFactor,
  treeEndFactor,
  treeFreqFactor,
  obstacleRadiusFactor,
  worldGravity,
  initYPos,
  playerXForce,
  playerYDrag,
  playerRadiusFactor,
  wallThickness
} from "./ constants";
import { generateMap } from "./utils/mapUtil";

const port = process.env.PORT || 3001; // setting the port
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.get("/", (req, res) => {
  res.send({
    running: true
  });
});

let playerMap = {};

const Engine = Matter.Engine,
  World = Matter.World,
  Bodies = Matter.Bodies,
  Body = Matter.Body;

// create an engine
const engine = Engine.create();
engine.world.gravity.y = worldGravity;

const objectMap = generateMap(
  [treeStartFactor * defaultHeight, treeEndFactor * defaultHeight],
  treeFreqFactor * defaultHeight
);

// generate bodies for obstacles
const worldObstacles = objectMap.map(obj =>
  Bodies.rectangle(
    defaultWidth * obj.x,
    obj.y,
    defaultWidth * obstacleRadiusFactor,
    defaultWidth * obstacleRadiusFactor,
    {
      isStatic: true
    }
  )
);

// add all of the bodies to the world
World.add(engine.world, worldObstacles);

// add walls

const wallLeft = Bodies.rectangle(
  0 - wallThickness / 2,
  (treeEndFactor * defaultHeight) / 2,
  wallThickness,
  treeEndFactor * defaultHeight,
  {
    isStatic: true
  }
);
const wallRight = Bodies.rectangle(
  defaultWidth + wallThickness / 2,
  (treeEndFactor * defaultHeight) / 2,
  wallThickness,
  treeEndFactor * defaultHeight,
  {
    isStatic: true
  }
);

const bottomWall = Bodies.rectangle(
  defaultWidth / 2,
  treeEndFactor * defaultHeight,
  defaultWidth,
  wallThickness,
  {
    isStatic: true
  }
);

World.add(engine.world, [wallLeft, wallRight, bottomWall]);

io.on("connection", socket => {
  addToWorld(socket);
  socket.emit("readyToGame", objectMap);
  socket.on("newControls", newControls => {
    playerMap[socket.id] && updateControls(socket.id, newControls);
  });
  socket.on("disconnect", () => {
    removeFromWorld(socket.id);
  });
});

function addToWorld(socket) {
  const playerBody = Bodies.rectangle(
    Math.random() * defaultWidth,
    initYPos * defaultWidth,
    playerRadiusFactor * defaultWidth,
    playerRadiusFactor * defaultWidth
  );
  playerMap[socket.id] = {
    body: playerBody,
    socketEmitter: socket,
    playerControl: 0
  };
  World.add(engine.world, [playerBody]);
}

function updateControls(id, newControl) {
  playerMap[id].playerControl = newControl;
}

function removeFromWorld(id) {
  World.remove(engine.world, playerMap[id].body);
  delete playerMap[id];
}

setInterval(() => {
  const sendBodies = Object.keys(playerMap).map(playerId => {
    const playerControl = playerMap[playerId].playerControl;
    const playerBody = playerMap[playerId].body;
    if (playerControl) {
      Body.applyForce(playerBody, playerBody.position, {
        x: playerControl * playerXForce,
        y: playerYDrag
      });
    }
    return {
      velocities: playerBody.velocity,
      position: playerBody.position,
      id: playerId
    };
  });
  io.sockets.emit("newWorld", sendBodies);
  Engine.update(engine);
}, 33);

server.listen(port, () => console.log(`Listening on port ${port}`));
