'use strict';
require('dotenv').config();
const passport = require('passport'); 
const bcrypt = require('bcrypt'); 

module.exports = function (app, myDataBase) {
  // authentication middleware 
  function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      next(); 
    } else {
      res.redirect('/'); 
    }
  }
   // Be sure to change the title
  app.route('/').get((req, res) => {
    //Change the response to render the Pug template
    res.render('pug', {
      showLogin: true, 
      title: 'Connected to Database',
      message: 'Please login',
      showRegistration: true, 
      showSocialAuth: true
    });
  });

  // chat stuff
  app.route('/chat').get(ensureAuthenticated, (req, res) => {
    res.render('pug/chat', { user: req.user }); 
  })

  // github auth stuff 
  app.route('/auth/github').get(passport.authenticate('github'))
  app.route('/auth/github/callback').get(passport.authenticate('github', {failureRedirect: '/'}), (req, res) => {
    req.session.user_id = req.user.id,
    res.redirect('/chat'); 
  })

  // login route
  app.post('/login', passport.authenticate('local', { failureRedirect: '/'}), function(req, res) {
    res.redirect('/profile'); 
  })

  // registration route
  app.route('/register')
    .post((req, res, next) => {
    // register the new user
    myDataBase.findOne({ username: req.body.username }, function(err, user) {
      if (err) {
        next(err); 
      } else if (user) {
        res.redirect('/');
      } else {
        const hash = bcrypt.hashSync(req.body.password, 12); 
        myDataBase.insertOne({
          username: req.body.username,
          password: hash
        },
          (err, doc) => {
            if (err) {
              res.redirect('/');
            } else {
              next(null, doc.ops[0]); 
            }
          }
        )
      }
    }) 
  },
    passport.authenticate('local', {failureRedirect: '/'}),
    (req, res, next) => {
      res.redirect('/profile'); 
    }
  ); 

  // profile 
  app
   .route('/profile')
   .get(ensureAuthenticated, (req,res) => {
    res.render(process.cwd() + '/views/pug/profile', {username: req.user.username});
  });

  // log user out 
  app.route('/logout')
    .get((req, res) => {
      req.logout(); 
      res.redirect('/'); 
    }); 

  // handle missing pages
  app.use((req, res, next) => {
    res.status(404)
      .type('text')
      .send('Not Found');
  });
}