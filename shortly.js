var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');


var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

var isSignedIn = function(){
  return false;
}

app.get('/',
function(req, res) {
  if(!isSignedIn())
    return res.redirect('/login');
  res.render('index');
});

app.get('/create',
function(req, res) {
  if(!isSignedIn())
    return res.redirect('/login');
  res.render('index');
});

app.get('/login',
function(req, res) {
  if(isSignedIn())
    return res.redirect('/');
  res.render('login');
});

app.get('/signup',
function(req, res) {
  if(isSignedIn())
    return res.redirect('/');
  res.render('signup');
});

app.get('/omg',
function(req, res) {
  if(!isSignedIn())
    return res.redirect('/login');
  res.send('<img src="something.gif">');
});


app.get('/signout',
function(req, res) {
  if(!isSignedIn())
    return res.redirect('/login');
  res.send('nothing to see here');
  //TODO: Signout
});

app.get('/links',
function(req, res) {
  if(!isSignedIn())
    return res.redirect('/login');
  Links.reset().fetch().then(function(links) {
    res.send(200, links.models);
  });
});

app.post('/login', function(req, res){
  //
});


var bcrypt = require('bcrypt-nodejs');

app.post('/signup', function(req, res){
  console.log(req.body);
  var username = req.body.username;
  var password = req.body.password;

  //TODO: double check syntax for isvalid
  if (false){//!util.isValidUsername(username)) {
    console.log('Not a valid username: ', username);
    return res.send(404);
  }
  if (false){//(!util.isValidPassword(password)) {
    console.log('Not a valid password: ', password);
    return res.send(404);
  }

  new User({ username: username }).fetch().then(function(found) {
    if (found) {
      //TODO: send to signup, add some sorta way to tell user they are dumb
      res.send(400, "user already exists");
    } else {
      console.log('pre salt and hash gen');
      bcrypt.genSalt(10, function(err, salt) {
      console.log('mmm... salt...');
        bcrypt.hash(password, salt, function(){}, function(err, hash) {
          console.log('created hash: ', hash);
          var user = new User({
            username: username,
            password: hash,
            salt: salt
          });
          user.save().then(function(newUser) {
            Users.add(newUser);
            console.log('saved and added user: ', newUser);
            res.redirect('/');
          });
        });
      });
    }
  });


});

app.post('/links',
function(req, res) {
  if(!isSignedIn())
    return res.redirect('/login');
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        var link = new Link({
          url: uri,
          title: title,
          base_url: req.headers.origin
        });

        link.save().then(function(newLink) {
          Links.add(newLink);
          res.send(200, newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/



/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  if(!isSignedIn())
    return res.redirect('/login');
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        db.knex('urls')
          .where('code', '=', link.get('code'))
          .update({
            visits: link.get('visits') + 1,
          }).then(function() {
            return res.redirect(link.get('url'));
          });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
