module.exports = {
  defaultWidth: 600,
  defaultHeight: 600,

  treeStartFactor: 0.3,
  treeEndFactor: 33,
  treeFreqFactor: 0.05, // wrt height

  playerRadiusFactor: 0.03, // wrt width
  obstacleRadiusFactor: 0.05, // wrt width

  worldGravity: 0.5,
  playerXForce: 17 / 100000,
  playerYDrag: -2 / 100000,

  wallThickness: 50,

  initYPos: 0.3 // wrt width
};
