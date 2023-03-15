const express = require("express");
const http = require("http");
const PORT = 5000 || process.env.PORT;
const app = express();
const cors = require("cors");
const { Server } = require("socket.io");
const ACTIONS = require("./Actions,js");

app.use(cors());
app.use(express.static("build"));

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "https://code-com-d53c3.web.app",
    methods: ["GET", "POST"],
  },
});

const userSocketMap = {};
function getAllConnectedClients(roomid) {
  // Map
  return Array.from(io.sockets.adapter.rooms.get(roomid) || []).map(
    (socketId) => {
      return {
        socketId,
        username: userSocketMap[socketId],
      };
    }
  );
}

io.on("connection", (socket) => {
  console.log("socket connected", socket.id);

  socket.on(ACTIONS.JOIN, ({ roomid, username }) => {
    userSocketMap[socket.id] = username;
    socket.join(roomid);
    const clients = getAllConnectedClients(roomid);
    console.log(clients);

    clients.forEach(({ socketId }) => {
      io.to(socketId).emit(ACTIONS.JOINED, {
        clients,
        username,
        socketId: socket.id,
      });
    });
  });

  socket.on(ACTIONS.CODE_CHANGE, ({ roomid, code }) => {
    socket.in(roomid).emit(ACTIONS.CODE_CHANGE, { code });
  });

  socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
    io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  socket.on("disconnecting", () => {
    const rooms = [...socket.rooms];
    rooms.forEach((roomid) => {
      socket.in(roomid).emit(ACTIONS.DISCONNECTED, {
        socketId: socket.id,
        username: userSocketMap[socket.id],
      });
    });
    delete userSocketMap[socket.id];
    socket.leave();
  });
});

app.get("/", (req, res) => {
  res.send("Codecom is running...");
});

httpServer.listen(PORT, () => console.log(`Server is running at ${PORT}`));
