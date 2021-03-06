var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var session = require('express-session')


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

app.use(session({ secret: 'keyboard cat', cookie: { maxAge: 600000 }}))

app.get('/',
function(req, res) {
  if(!req.session.user)
    return res.redirect('/login');
  res.render('index');
});

app.get('/create',
function(req, res) {
  if(!req.session.user)
    return res.redirect('/login');
  res.render('index');
});

app.get('/login',
function(req, res) {
  if(req.session.user)
    return res.redirect('/');
  res.render('login');
});

app.get('/signup',
function(req, res) {
  if(req.session.user)
    return res.redirect('/');
  res.render('signup');
});

app.get('/omg',
function(req, res) {
  req.session.views = req.session.views || 0;
  req.session.views++;
  res.send('"' + req.session.views + '"');
});


app.get('/signout',
function(req, res) {
  if(req.session.user)
    req.session.destroy();
  res.redirect('/login');
});

app.get('/links',
function(req, res) {
  if(!req.session.user)
    return res.redirect('/login');
  Links.reset()
    .query('where', 'user_id', '=', req.session.user.id)
    .fetch()
    .then(function(links) {
    res.send(200, links.models);
  });
});


app.post('/login',
function(req, res){
  var username = req.body.username;
  var password = req.body.password;

  var user = new User({username: username});
  console.log('query user: ', user);
  user.fetch().then(function(found){
    if(found){
      console.log('found user: ', user);
      user.ifIsPassword( password, function( valid ){
        if(valid){
          req.session.user=user;
          res.redirect('/');
        } else {
          res.render('shame');
        }
      });
    } else {
      res.render('shame');
    }
  });
});

app.post('/signup',
function(req, res){
  var username = req.body.username;
  var password = req.body.password;
  //TODO: Check if username and password are valid
  var user = new User({ username: username });
  user.fetch().then(function(found) {
    if (found) {
      res.render('shame');
    } else {
      user.setPassword(password, function(newUser) {
        Users.add(newUser);
        res.redirect('/');
      });
    }
  });
});

app.post('/links',
function(req, res) {
  if(!req.session.user)
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
          base_url: req.headers.origin,
          user_id: req.session.user.id
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
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*',
function(req, res) {
  if(!req.session.user)
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
