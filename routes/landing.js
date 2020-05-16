var express=require("express");
var router =express.Router();
var passport=require("passport");
var User=require("../models/user.js");
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
	var newUser=new User({username:req.body.username});
	User.register(newUser,req.body.password,function(err,user){
		if(err){
			req.flash("error",err.message);
			res.redirect("/register");
		}
		else{
			passport.authenticate("local")(req,res,function(){
				req.flash("success","Welcome to YelpCamp "+ user.username);
				res.redirect("/checkout");
			});
		}
	});
});

router.get("/login",function(req,res){
	res.render("login.ejs");
});

router.post("/login",passport.authenticate("local",								   {
	successRedirect:"/campgrounds",
	failureRedirect:"/login"
}
),function(req,res){

});

router.get("/logout",function(req,res){
	req.logout();
	req.flash("success","Logged you out!");
	res.redirect("/campgrounds");
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

module.exports=router;

