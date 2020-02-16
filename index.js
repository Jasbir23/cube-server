const express = require("express"); // using expre)s
const socketIO = require("socket.io");
const http = require("http");
const Matter = require("matter-js");
const {
  defaultWidth,
  defaultHeight,
  obstacleRadiusFactor,
  raceLength,
  treeFrequency,
  defaultAspectRation,
  playerXForce,
  playerYDrag,
  playerRadiusFactor,
  wallThicknessFactor,
  worldGravity,
  initYPos
} = require("./ constants");

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
engine.world.bounds.max.x = defaultWidth * 2;
engine.world.bounds.max.y = raceLength;
const wallLeft = Bodies.rectangle(
  0,
  raceLength / 2,
  wallThicknessFactor * defaultWidth,
  raceLength,
  {
    isStatic: true
  }
);
const wallRight = Bodies.rectangle(
  defaultWidth,
  raceLength / 2,
  wallThicknessFactor * defaultWidth,
  raceLength,
  {
    isStatic: true
  }
);

const bottomWall = Bodies.rectangle(
  defaultWidth / 2,
  raceLength,
  defaultWidth,
  wallThicknessFactor * defaultWidth,
  {
    isStatic: true
  }
);

World.add(engine.world, [wallLeft, wallRight, bottomWall]);
engine.world.gravity.y = worldGravity;

let treemap = [];

let treeBodies = [];

for (let i = 0; i < raceLength; i += treeFrequency) {
  const treePosX = Math.random();
  treemap.push({
    x: treePosX,
    y: i
  });

  treeBodies.push(
    Bodies.rectangle(
      treePosX * defaultWidth,
      i,
      obstacleRadiusFactor * defaultWidth,
      obstacleRadiusFactor * defaultWidth,
      {
        isStatic: true
      }
    )
  );
}

World.add(engine.world, treeBodies);

// function addTree(i) {
//   const treeBody =
//       Bodies.circle(
//       Math.random() * defaultWidth,
//       i,
//       obstacleRadiusFactor * defaultWidth
//     );
// }

io.on("connection", socket => {
  addToWorld(socket);
  socket.emit("passConfigs", {
    raceLength,
    treeFrequency,
    defaultWidth,
    defaultHeight,
    defaultAspectRation,
    playerXForce,
    playerYDrag,
    wallThicknessFactor,
    playerRadiusFactor,
    obstacleRadiusFactor,
    treemap,
    worldGravity
  });
  socket.on("playerControl", newControls => {
    playerMap[socket.id] && updateControls(socket.id, newControls);
  });
  socket.on("disconnect", () => {
    socket.broadcast.emit("removePlayer", socket.id);
    removeFromWorld(socket.id);
  });
});

function addToWorld(socket) {
  const playerBody = Bodies.rectangle(
    defaultWidth / 2,
    initYPos * defaultWidth,
    playerRadiusFactor * defaultWidth,
    playerRadiusFactor * defaultWidth
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
      angle: playerBody.angle,
      angularVelocity: playerBody.angularVelocity,
      id: playerId,
      currentSampleDate: new Date()
    };
  });
  io.sockets.emit("newWorld", sendBodies);
  Engine.update(engine);
}, 50);

server.listen(port, () => console.log(`Listening on port ${port}`));
