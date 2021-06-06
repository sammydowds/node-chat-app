'use strict';
require('dotenv').config();
const routes = require('./routes.js');
const auth = require('./auth.js'); 
const express = require('express');
const myDB = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');
const passport = require('passport'); 
const session = require('express-session'); 

const app = express();

const http = require('http').createServer(app); 
const io = require('socket.io')(http); 
const passportSocketIo = require('passport.socketio');
const cookieParser = require('cookie-parser');  
const MongoStore = require('connect-mongo')(session);
const URI = process.env.MONGO_URI;
const store = new MongoStore({ url: URI}); 

app.set('view engine', 'pug'); 

// socket io connection callbacks
function onAuthorizeSuccess(data, accept) {
  console.log('successful connection to socket.io');
  accept(null, true); 
}
function onAuthorizeFail(data, message, error, accept) {
  if (error) throw new Error(message);
  console.log('failed connection to socket.io:', message);
  accept(null, false); 
}

fccTesting(app); //For FCC testing purposes
app.use('/public', express.static(process.cwd() + '/public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET, 
  resave: true, 
  saveUnitialized: true, 
  cookie: {secure: false},
  key: 'express.sid',
  store: store
})); 

app.use(passport.initialize()); 
app.use(passport.session()); 

// wiring up socket io to get user data
io.use(
  passportSocketIo.authorize({
    cookieParser: cookieParser,
    key: 'express.sid',
    secret: process.env.SESSION_SECRET,
    store: store,
    success: onAuthorizeSuccess,
    fail: onAuthorizeFail
  })
)

myDB(async client => {
  const myDataBase = await client.db('database').collection('users');

  routes(app, myDataBase);
  auth(app, myDataBase); 

  // chat 
  let currentUsers = 0; 
  io.on('connection', socket => {
    ++currentUsers
    // push out event for all users with who connected, number of connected
    io.emit('user', {
      name: socket.request.user.name,
      currentUsers,
      connected: true
    });
    // track disconnection and update connected 
    socket.on('disconnect', () => {
      --currentUsers
      io.emit('user', {
        name: socket.request.user.name,
        currentUsers,
        connected: false
      });
    })
    // track chat message from browser
    socket.on('chat message', (data) => {
      io.emit('chat message', {
        name: socket.request.user.name, 
        message: data.message
      }); 
    })
    console.log('user ' + socket.request.user.name + ' connected'); 
  });

}).catch(e => {
  app.route('/').get((req, res) => {
    res.render('pug', { title: e, message: 'Unable to login' });
  });
});
// app.listen out here...
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log('Listening on port ' + PORT);
});
