var keystone = require('keystone'),
  async = require('async'),
  User = keystone.list('User');

exports = module.exports = function(req, res) {
  var view = new keystone.View(req, res),
    locals = res.locals;
  
  locals.validationErrors = {};
  if(req.user){
    res.redirect('/');
  }
  //console.log(req.body);
  view.on('post', {action: 'signup'}, function(next){
      async.series([
      function(cb){
        if(!req.body.firstname||!req.body.lastname||!req.body.email||!req.body.password){
          req.flash("error",{title:"Please enter a name, email and password"});
          return cb(true);
        }
        return cb();
      },
      function(cb){
        if(req.body.password!==req.body.confirm_password){
          req.flash("error",{title:"Password and confirmation must match"});
          return cb(true);
        }
        return cb();
      },
      function(cb){
        User.model.findOne({email: req.body.email}, function(err, user){
          if(err||user){
            req.flash("error", {title:"That email address is already in use"});
            return cb(true);
          }
          return cb();
        });
      },
      function(cb){
        var userData = {
          name: {
            first: req.body.firstname,
            last: req.body.lastname,
          },
          email: req.body.email,
          password: req.body.password,
        };
        var newUser = new User.model(userData);
        newUser.save(function(err){
            return cb(err);
        });
      }],
      function(err){

        if (err) {
          return next();
        }
        else{
          locals.userCreated = true;
        }
        var onSuccess = function() {
          res.redirect('/');
        };
      
        var onFail = function(e) {
          req.flash('error', {info:'There was a problem signing you in, please try again.'});
          return next();
        };
      
        keystone.session.signin({ email: req.body.email, password: req.body.password }, req, res, onSuccess, onFail);
      });
    
  });
  view.render('signup');
};

