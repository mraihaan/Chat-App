const express = require("express");
const socket = require("socket.io");
const http = require("http");

const { addUser, removeUser, getUser, getUsersInRoom } = require("./users.js");

const PORT = process.env.PORT || 5000;
const router = require("./router");

const app = express();
const server = http.createServer(app);
const io = socket(server, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  console.log("We have a new connection");

  //if a user joined
  socket.on("join", ({ name: name, room: room }, callback) => {
    const { error, user } = addUser({ id: socket.id, name, room });

    if (error) {
      return callback(error);
    }

    socket.emit("message", {
      user: "admin",
      text: `Hey ${user.name}, welcome to the ${user.room} room.`,
    });

    socket.broadcast
      .to(user.room)
      .emit("message", { user: "admin", text: `${user.name} has joined.` });

    socket.join(user.room);

    io.to(user.name).emit("roomData", {
      room: user.room,
      users: getUsersInRoom(user.room),
    });

    callback();
  });

  //if a message is sent
  socket.on("sendMessage", (message, callback) => {
    const user = getUser(socket.id);

    io.to(user.room).emit("message", { user: user.name, text: message });
    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUsersInRoom(user.room),
    });

    callback();
  });

  //if user disconnects
  socket.on("disconnect", () => {
    const user = removeUser(socket.id);
    if (user) {
      io.to(user.room).emit("message", {
        user: "admin",
        text: `${user.name} has left.`,
      });
    }
  });
});

app.use(router);

server.listen(PORT, () => {
  console.log("Server has started...");
});
