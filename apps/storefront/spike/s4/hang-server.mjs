// THROWAWAY spike tooling (plan M1 §6, S4): a stand-in for a Medusa that has gone silent. It
// accepts every connection and then never writes or closes, which is the case a refused
// connection does not cover (O8's "Medusa hanging"). Usage: node hang-server.mjs <port>
import net from "node:net";

const port = Number(process.argv[2] ?? 9000);
if (!Number.isInteger(port) || port <= 0 || port > 65535) {
  console.error(`hang-server: "${process.argv[2]}" is not a port`);
  process.exit(2);
}

// Every open connection. Only `shutdown` closes them: while the server runs, it never hangs up.
const sockets = new Set();

const server = net.createServer((socket) => {
  sockets.add(socket);
  socket.on("close", () => sockets.delete(socket));
  // A client that gives up resets the connection; that is its business, not a crash.
  socket.on("error", () => {});
  // Read and drop what arrives (the HTTP request), so that a client that hangs up is noticed.
  socket.resume();
});

server.on("error", (error) => {
  console.error(`hang-server: ${error.message}`);
  process.exit(1);
});

server.listen(port, () => {
  console.log(`hang-server: accepting on :${port} and never answering (pid ${process.pid})`);
});

function shutdown() {
  for (const socket of sockets) socket.destroy();
  server.close(() => process.exit(0));
  // The sockets are gone, but do not wait on a close that could still be pending.
  setTimeout(() => process.exit(0), 1000).unref();
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
