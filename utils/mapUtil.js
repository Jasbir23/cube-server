export function generateMap(limits, frequency) {
  let treeMap = [];
  for (let i = limits[0]; i < limits[1]; i += frequency) {
    treeMap.push({
      x: Math.random(),
      y: i
    });
  }
  return treeMap;
}
