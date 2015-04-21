var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');

var User = db.Model.extend({
  tableName: 'users',

  links: function() {
    return this.hasMany(Link);
  },
  ifIsPassword: function( password, callback ){
    console.log(this);
    var salt=this.attributes['salt'];

    var that=this;
    bcrypt.hash(password, salt, function(){}, function(err, hash) {
      callback( that.attributes['password'] === hash );
    });
  },
  on_saving: function(model, attrs, options){
    //TODO: set salt seed to something random. Time works.
    bcrypt.genSalt(new Date().getTime(), function(err, salt) {
      bcrypt.hash(model.get('password'), salt, function(){}, function(err, hash) {
        model.set('password', hash);
        model.set('salt', salt);
        console.log(model.get('password'));
      });
    });
  },

  initialize: function(){
    this.on('saving', this.on_saving, this);
  },
});

module.exports = User;
