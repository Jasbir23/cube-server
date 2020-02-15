const express = require("express"); // using expre)s
const socketIO = require("socket.io");
const http = require("http");
const Matter = require("matter-js");
const {
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
} = require("./ constants");
const generateMap = require("./utils/mapUtil");

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
const wallLeft = Bodies.rectangle(
  0,
  defaultHeight / 2,
  wallThickness,
  defaultHeight,
  {
    isStatic: true
  }
);
const wallRight = Bodies.rectangle(
  defaultWidth,
  defaultHeight / 2,
  wallThickness,
  defaultHeight,
  {
    isStatic: true
  }
);

World.add(engine.world, [wallLeft, wallRight]);
engine.world.gravity.y = 0;

io.on("connection", socket => {
  addToWorld(socket);
  socket.on("playerControl", newControls => {
    playerMap[socket.id] && updateControls(socket.id, newControls);
  });
  socket.on("disconnect", () => {
    removeFromWorld(socket.id);
  });
});

function addToWorld(socket) {
  const playerBody = Bodies.rectangle(
    Math.random() * defaultWidth,
    Math.random() * defaultHeight,
    20,
    20
  );

  playerMap[socket.id] = {
    body: playerBody,
    socketEmitter: socket,
    playerControl: { x: 0, y: 0 }
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
    if (playerControl.x || playerControl.y) {
      Body.applyForce(playerBody, playerBody.position, {
        x: playerControl.x * playerXForce,
        y: playerControl.y * playerXForce
      });
    }
    return {
      velocity: playerBody.velocity,
      position: playerBody.position,
      force: playerBody.force,
      id: playerId
    };
  });
  io.sockets.emit("newWorld", sendBodies);
  Engine.update(engine);
}, 33);

server.listen(port, () => console.log(`Listening on port ${port}`));
