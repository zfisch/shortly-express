var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');

var User = db.Model.extend({
  tableName: 'users',

  links: function() {
    return this.hasMany(Link);
  },
  setPassword: function( password, callback ){
    var that=this;
    bcrypt.genSalt(10, function(err, salt) {
      bcrypt.hash(password, salt, function(){}, function(err, hash) {
        that.set('password', hash);
        that.set('salt', salt);
        that.save();
        callback();
      });
    });
  },
  ifIsPassword: function( password, callback ){
    console.log("checking password on: ", this);
    var salt=this.attributes['salt'];

    var that=this;
    bcrypt.hash(password, salt, function(){}, function(err, hash) {
      callback( that.attributes['password'] === hash );
    });
  },
  onSaving: function(model, attrs, options){
    //TODO: set salt seed to something random. Time works.
    //new Date().getTime()
  },
  onSaved: function(model, attrs, options){
    console.log("SAVED! ", model);
  },

  initialize: function(){
    this.on('saving', this.onSaving, this);
  },
});

module.exports = User;
