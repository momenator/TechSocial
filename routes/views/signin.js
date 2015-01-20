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
  view.on('post', {action: 'signin'}, function(next){
      async.series([
      function(cb){
        if(!req.body.email||!req.body.password){
          req.flash("error",{title:"Please enter an email and password"});
          return cb(true);
        }
        return cb();
      }
      ],
      function(err){
        if(err) {
          return next();
        }
        var onSuccess = function() {
          res.redirect('/');
        };
              
        var onFail = function(e) {
          req.flash('error', {title:"There was a problem signing you in"});
          return next();
        };
        keystone.session.signin({ email: req.body.email, password: req.body.password }, req, res, onSuccess, onFail);
      });
  });

  view.render('signin');
};

