const net = require('node:net');

const ports = [8080, 9099];

Promise.all(ports.map((port) => new Promise((resolve, reject) => {
  const socket = net.connect(port, '127.0.0.1', () => {
    socket.end();
    resolve();
  });
  socket.setTimeout(1000, () => socket.destroy(new Error(`Port ${port} timed out`)));
  socket.once('error', reject);
}))).catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
