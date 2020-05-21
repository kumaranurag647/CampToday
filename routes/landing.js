var express = require("express"),
     router = express.Router(),
     passport = require("passport"),
	 campgrounds = require("../models/campground.js")
     User = require("../models/user.js"),
	 async = require("async"),
     crypto = require("crypto"), 		 
	 nodemailer = require("nodemailer");	
let {isLoggedIn} =require("../middleware");


// Set your secret key. Remember to switch to your live secret key in production!
// See your keys here: https://dashboard.stripe.com/account/apikeys
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);


router.get("/",function(req,res){
	res.render("landing.ejs");
});

router.get("/register",function(req,res){
	res.render("register.ejs");
});

router.post("/register",function(req,res){
	var newUser=new User({
		username: req.body.username, 
		firstName: req.body.firstName,
		lastName: req.body.lastName,
		avatar: req.body.avatar,
		email: req.body.email});
	if(req.body.adminCode === 'secretcode123'){
		newUser.isAdmin = true;
	} 
	User.register(newUser,req.body.password,function(err,user){
		if(err){
			req.flash("error",err.message);
			res.redirect("/register");
		}
		else{
			passport.authenticate("local")(req,res,function(){
				req.flash("success","Please lighten your wallet a little bit "+ user.username);
				res.redirect("/checkout");
			});
		}
	});
});

router.get("/login",function(req,res){
	res.render("login.ejs");
});

router.post("/login",passport.authenticate("local",{ 
	failureFlash: 'Invalid credentials, please try again.',
	failureRedirect:"/login"
}), function(req,res){
       req.flash("success", "Successfully logged in! Nice to meet you " + req.user.username + ".")
	   res.redirect("/campgrounds");
});

router.get("/logout",function(req,res){
	req.logout();
	req.flash("success","You logged out successfully! Have a nice day.");
	res.redirect("/login");
});


//checkout
router.get('/checkout', isLoggedIn, (req, res) => {
    if(req.user.isPaid){
		req.flash('success','You have already been registered.');
		return res.redirect('/campgrounds');
	}    
	res.render('checkout', {amount: 20});
 }); 

router.post('/pay', isLoggedIn, async (req, res) => {
  
	const { paymentMethodId, items, currency } = req.body;
    const amount = 2000;

  try {
    // Create new PaymentIntent with a PaymentMethod ID from the client.
    const intent = await stripe.paymentIntents.create({
      amount,
      currency,
      payment_method: paymentMethodId,
      error_on_requires_action: true,
      confirm: true
    });
	  
    console.log("💰 Payment received!");
	
	  req.user.isPaid = true;
	  await req.user.save(); 
    // The payment is complete and the money has been moved
    // You can add any post-payment code here (e.g. shipping, fulfillment, etc)

    // Send the client secret to the client to use in the demo
    res.send({ clientSecret: intent.client_secret });
  } catch (e) {
    // Handle "hard declines" e.g. insufficient funds, expired card, card authentication etc
    // See https://stripe.com/docs/declines/codes for more
    if (e.code === "authentication_required") {
      res.send({
        error:
          "This card requires authentication in order to proceeded. Please use a different card."
      });
    } else {
      return res.send({ error: e.message });
    }
   }
});

// forgot password
router.get('/forgot', function(req, res) {
  res.render('forgot');
});

router.post('/forgot', function(req, res, next) {
  async.waterfall([
    function(done) {
      crypto.randomBytes(20, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function(token, done) {
      User.findOne({ email: req.body.email }, function(err, user) {
        if (!user) {
          req.flash('error', 'No account with that email address exists.');
          return res.redirect('/forgot');
        }

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        user.save(function(err) {
          done(err, token, user);
        });
      });
    },
    function(token, user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'Gmail', 
        auth: {
          user: 'kumaranurag647@gmail.com',
          pass: process.env.GMAILPW
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'kumaranurag647@gmail.com',
        subject: 'Node.js Password Reset',
        text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
          'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
          'http://' + req.headers.host + '/reset/' + token + '\n\n' +
          'If you did not request this, please ignore this email and your password will remain unchanged.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        console.log('mail sent');
        req.flash('success', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
        done(err, 'done');
      });
    }
  ], function(err) {
    if (err) return next(err);
    res.redirect('/forgot');
  });
});

router.get('/reset/:token', function(req, res) {
  User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
    if (!user) {
      req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/forgot');
    }
    res.render('reset', {token: req.params.token});
  });
});

router.post('/reset/:token', function(req, res) {
  async.waterfall([
    function(done) {
      User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
        if (!user) {
          req.flash('error', 'Password reset token is invalid or has expired.');
          return res.redirect('back');
        }
        if(req.body.password === req.body.confirm) {
          user.setPassword(req.body.password, function(err) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;

            user.save(function(err) {
              req.logIn(user, function(err) {
                done(err, user);
              });
            });
          })
        } else {
            req.flash("error", "Passwords do not match.");
            return res.redirect('back');
        }
      });
    },
    function(user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'Gmail', 
        auth: {
          user: 'kumaranurag647@gmail.com',
          pass: process.env.GMAILPW
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'kumaranurag647@mail.com',
        subject: 'Your password has been changed',
        text: 'Hello,\n\n' +
          'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        req.flash('success', 'Success! Your password has been changed.');
        done(err);
      });
    }
  ], function(err) {
    res.redirect('/campgrounds');
  });
});

//User profile
router.get("/users/:id", isLoggedIn, function(req, res){
	User.findById(req.params.id, function(err, foundUser){
		if(err){
			req.flash("error", "Something went wrong");
			res.redirect("/");
		}
		 campgrounds.find().where('author.id').equals(foundUser._id).exec(function(err, campgrounds) {
      if(err) {
        req.flash("error", "Something went wrong.");
        return res.redirect("/");
      }
		  res.render("users/show", {user: foundUser, campgrounds: campgrounds});
	});	   
  });
});

//edit-profile get request
router.get("/editprofile/:id", isLoggedIn, function(req, res){
    User.findById(req.params.id, function(err, foundUser){
		if(err){
			req.flash("error", "Something went wrong");
			res.redirect("/");
		}
		else{
			res.render("users/profiledit", {user: foundUser});
		}
	});		
});	

//edit-profile post request.
router.put("/editprofile/:id", isLoggedIn, function(req, res){
	var newUser = req.body.user;
	if(req.body.adminCode === "secretcode123") newUser.isAdmin = true;
    User.findByIdAndUpdate(req.params.id, {$set: newUser}, function(err, foundUser){
		if(err){
			req.flash("error", "Something went wrong");
			res.redirect("/");
		}
		else{
			req.flash("success","Your profile has been updated successfully.");
            res.redirect("/users/" + foundUser._id);
		}
	});		
});	

router.get("/aboutus", isLoggedIn, function(req, res){
	res.redirect("https://drive.google.com/open?id=1g4LrLx9ReS0MTB3jXLOh1OEvTQ26jtty");	
});

module.exports=router;

