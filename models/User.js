var keystone = require('keystone'),
	async = require('async'),
	crypto = require('crypto'),
	Types = keystone.Field.Types;

/**
 * Users Model
 * ===========
 */

var User = new keystone.List('User', {
	autokey: { path: 'key', from: 'name', unique: true }
});

User.add({
	name: { type: Types.Name, required: true, index: true },
	email: { type: Types.Email, initial: true, index: true },
	password: { type: Types.Password, initial: true },
	resetPasswordKey: { type: String, hidden: true }
}, 'Profile', {
	isPublic: { type: Boolean, default: true },
	isOrganiser: Boolean,
	photo: { type: Types.CloudinaryImage },
	github: { type: String, width: 'short' },
	twitter: { type: String, width: 'short' },
	website: { type: Types.Url },
	bio: { type: Types.Markdown },
	gravatar: { type: String, noedit: true }
}, 'Notifications', {
	notifications: {
		posts: { type: Boolean },
		meetups: { type: Boolean, default: true }
	}
}, 'Permissions', {
	isAdmin: { type: Boolean, label: 'Can Admin SydJS' },
	isVerified: { type: Boolean, label: 'Has a verified email address' }
},  'Meta', {
	talkCount: { type: Number, default: 0, noedit: true },
	lastRSVP: { type: Date, noedit: true }
});


/** 
	Pre-save
	=============
*/

User.schema.pre('save', function(next) {

	var member = this;
	
	async.parallel([
		
		function(done) {
			
			if (!member.email) return done();
			
			member.gravatar = crypto.createHash('md5').update(member.email.toLowerCase().trim()).digest('hex');
			
			return done();
			
		},
		
		function(done) {
		
			keystone.list('Talk').model.count({ who: member.id }).exec(function(err, count) {
				
				if (err) {
					console.error('===== Error counting user talks =====');
					console.error(err);
					return done();
				}
				
				member.talkCount = count;
				
				return done();
				
			});
		
		},
		
		function(done) {
		
			keystone.list('RSVP').model.findOne({ who: member.id }).sort('changedAt').exec(function(err, rsvp) {
				
				if (err) {
					console.error("===== Error setting user last RSVP date =====");
					console.error(err);
					return done();
				}
				
				if (!rsvp) return done();
				
				member.lastRSVP = rsvp.changedAt;
				
				return done();
			
			});
		
		}
		
	], next);

});


/** 
	Relationships
	=============
*/

User.relationship({ ref: 'Post', refPath: 'author', path: 'posts' });
User.relationship({ ref: 'Talk', refPath: 'who', path: 'talks' });
User.relationship({ ref: 'RSVP', refPath: 'who', path: 'rsvps' });


/**
 * Virtuals
 * ========
 */

// Link to member
User.schema.virtual('url').get(function() {
	return '/member/' + this.key;
});

// Provide access to Keystone
User.schema.virtual('canAccessKeystone').get(function() {
	return this.isAdmin;
});

// Pull out avatar image
User.schema.virtual('avatarUrl').get(function() {
	
	if (this.photo.exists) return this._.photo.thumbnail(120,120);
	
	if (this.services.github.isConfigured && this.services.github.avatar) return this.services.github.avatar;
	if (this.services.facebook.isConfigured && this.services.facebook.avatar) return this.services.facebook.avatar;
	if (this.services.google.isConfigured && this.services.google.avatar) return this.services.google.avatar;
	if (this.services.twitter.isConfigured && this.services.twitter.avatar) return this.services.twitter.avatar;
	
	if (this.gravatar) return 'http://www.gravatar.com/avatar/' + this.gravatar + '?d=http%3A%2F%2Fsydjs.com%2Fimages%2Favatar.png&r=pg';
	
});


/**
 * Methods
 * =======
*/

User.schema.methods.resetPassword = function(callback) {
	
	var user = this;
	
	user.resetPasswordKey = keystone.utils.randomString([16,24]);
	
	user.save(function(err) {
		
		if (err) return callback(err);
		
		new keystone.Email('forgotten-password').send({
			user: user,
			link: '/reset-password/' + user.resetPasswordKey,
			subject: 'Reset your SydJS Password',
			to: user.email,
			from: {
				name: 'SydJS',
				email: 'contact@sydjs.com'
			}
		}, callback);
		
	});
	
}


/**
 * Registration
 * ============
*/

User.addPattern('standard meta');
User.defaultColumns = 'name, email, isAdmin';
User.register();
