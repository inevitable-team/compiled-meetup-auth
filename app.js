const express = require('express'), 
      passport = require('passport'), 
      morgan = require('morgan'),
      cookieParser = require('cookie-parser'),
      bodyParser = require('body-parser'),
      methodOverride = require('method-override'),
      session = require('express-session'),
      util = require('util'), 
      MeetupStrategy = require('./meetupStrategy'),
      mongoose = require('mongoose'),
      Schema = mongoose.Schema,
      UserSchema = new Schema({ any: Object }),
      UserModel = mongoose.model('Users', UserSchema);

require('dotenv').config();
let MEETUP_KEY = process.env.MEETUP_KEY;
let MEETUP_SECRET = process.env.MEETUP_SECRET;

let app = express();

// configure Express
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
// app.use(express.logger()); // Morgan
app.use(cookieParser());
app.use(bodyParser.json());
app.use(methodOverride('X-HTTP-Method-Override'));
app.use(session({ secret: 'keyboard cat', cookie: { secure: true }, resave: true, saveUninitialized: true }));
// Initialize Passport!  Also use passport.session() middleware, to support
// persistent login sessions (recommended).
app.use(passport.initialize());
app.use(passport.session());
// app.use(app.router);
app.use(express.static(__dirname + '/public'));
// Initiate MongoDB
mongoose.connect(process.env.MONGODB_CONNECTION);

// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.  However, since this example does not
//   have a database of user records, the complete Meetup profile is
//   serialized and deserialized.
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

// Use the MeetupStrategy within Passport.
//   Strategies in passport require a `verify` function, which accept
//   credentials (in this case, a token, tokenSecret, and Meetup profile), and
//   invoke a callback with a user object.
passport.use(new MeetupStrategy({
    clientID: MEETUP_KEY,
    clientSecret: MEETUP_SECRET,
    // callbackURL: "https://meetup.compiledmcr.com/auth/meetup/callback"
    callbackURL: "https://compiledmcr-meetup-auth.herokuapp.com/auth/meetup/callback"
  },
  function(req, token, tokenSecret, profile, done) {
    // asynchronous verification, for effect...
    process.nextTick(function () {
      console.log({ req });
      console.log("Verification Log: ", { token, tokenSecret, profile });
      let user = new UserModel;
      user.token = token;
      user.tokenSecret = tokenSecret;
      user.profile = profile;
      user.save();
      // To keep the example simple, the user's Meetup profile is returned to
      // represent the logged-in user.  In a typical application, you would want
      // to associate the Meetup account with a user record in your database,
      // and return that user instead.
      return done(null, profile);
    });
  }
));

app.get('/', function(req, res){
  res.render('index', { user: req.user });
});

app.get('/account', ensureAuthenticated, function(req, res){
  res.render('account', { user: req.user });
});

app.get('/login', function(req, res){
  res.render('login', { user: req.user });
});

// GET /auth/meetup
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in Meetup authentication will involve redirecting
//   the user to meetup.com.  After authorization, Meetup will redirect the user
//   back to this application at /auth/meetup/callback
app.get('/auth/meetup',
  passport.authenticate('meetup'),
  function(req, res){
    // The request will be redirected to Meetup for authentication, so this
    // function will not be called.
  });

// GET /auth/meetup/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/auth/meetup/callback', 
  passport.authenticate('meetup', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/');
  });

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

app.listen(process.env.PORT || 3000);


// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login')
}