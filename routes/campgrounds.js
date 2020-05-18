var express=require("express");
var router =express.Router();
var campgrounds=require("../models/campground.js");
var Review = require("../models/review");

const {checkCGOwnership, isLoggedIn, isPaid}=require("../middleware");
router.use(isLoggedIn,isPaid);

//Index - Show all campgrounds 
router.get("/",function(req,res){
	if(req.query.search){
		const regex = new RegExp(escapeRegex(req.query.search), 'gi');
	    campgrounds.find({name: regex},function(err,allCampgrounds){
		 if(err){
			 console.log("error");
		 }
		 else{
			 res.render("campgrounds/campgrounds.ejs",{campgrounds: allCampgrounds, currentUser: req.user});
		 }
	 });	
	} 
	else{
	   if(req.query.paid)  res.locals.success = 'Payment succeeded, welcome to YelpCamp!';
	    campgrounds.find({},function(err,allCampgrounds){
		 if(err){
			 console.log("error");
		 }
		 else{
			 res.render("campgrounds/campgrounds.ejs",{campgrounds:allCampgrounds,currentUser:req.user});
		 }
	 });	
	}
});


//Create new campground route
router.post("/", function(req,res){
	var name=req.body.name;
	var price=req.body.price;
	var image=req.body.image;
	var description=req.body.description;
	var author={
		username:req.user.username,
		id:req.user._id
	}
	var newCampground={name:name,price:price,image:image,description:description,author:author}
	
	campgrounds.create(newCampground,function(err,newlyCreated){
		
		 if(err){
	        	console.log("error");
		 }
		 else{
			 console.log(newlyCreated);
				res.redirect("/campgrounds");
		 }

	});
	
});


//New - show form to create new campground
router.get("/new",function(req,res){
	res.render("campgrounds/new.ejs");
});


// SHOW - shows more info about one campground
router.get("/:id",function(req,res){
		campgrounds.findById(req.params.id).populate("comments likes").populate({
		     path: "reviews",
             options: {sort: {createdAt: -1}}	
		}).exec(function(err,foundCampground){
		// || ! foundCampground is imp to prevent breaking down of aur app if obj id is chnaged
		if(err || !foundCampground){
			req.flash("error","Campground Not Found");
			res.redirect("back");
		 }
		
		else{
			console.log(foundCampground);
			 res.render("campgrounds/show.ejs",{campgrounds:foundCampground});
		 }	
		
     });
});


//edit
router.get("/:id/edit", checkCGOwnership,function(req,res){
	   campgrounds.findById(req.params.id,function(err,foundCampground){
			res.render("campgrounds/edit.ejs",{campgrounds:foundCampground});
		   });
});


// UPDATE CAMPGROUND ROUTE
router.put("/:id", checkCGOwnership, function (req, res) {
	delete req.body.campground.rating;
    // find and update the correct campground
    Campground.findById(req.params.id, function (err, campground) {
        if (err) {
            console.log(err);
            res.redirect("/campgrounds");
        } else {
            campground.name = req.body.campground.name;
            campground.description = req.body.campground.description;
            campground.image = req.body.campground.image;
            campground.save(function (err) {
                if (err) {
                    console.log(err);
                    res.redirect("/campgrounds");
                } else {
                    res.redirect("/campgrounds/" + campground._id);
                }
            });
        }
    });
});



//DELETE ROUTE
router.delete("/:id", checkCGOwnership, function (req, res) {
    campgrounds.findById(req.params.id, function (err, campground) {
        if (err) {
            res.redirect("/campgrounds");
        } else {
            // deletes all comments associated with the campground
            Comment.remove({"_id": {$in: campground.comments}}, function (err) {
                if (err) {
                    console.log(err);
                    return res.redirect("/campgrounds");
                }
                // deletes all reviews associated with the campground
                Review.remove({"_id": {$in: campground.reviews}}, function (err) {
                    if (err) {
                        console.log(err);
                        return res.redirect("/campgrounds");
                    }
                    //  delete the campground
                    campground.remove();
                    req.flash("success", "Campground deleted successfully!");
                    res.redirect("/campgrounds");
                });
            });
        }
    });
});


// Campground Like Route
router.post("/:id/like", isLoggedIn, function (req, res) {
    campgrounds.findById(req.params.id, function (err, foundCampground) {
        if (err) {
            console.log(err);
            return res.redirect("/campgrounds");
        }

        // check if req.user._id exists in foundCampground.likes
        var foundUserLike = foundCampground.likes.some(function (like) {
            return like.equals(req.user._id);
        });

        if (foundUserLike) {
            // user already liked, removing like
            foundCampground.likes.pull(req.user._id);
        } else {
            // adding the new user like
            foundCampground.likes.push(req.user);
        }

        foundCampground.save(function (err) {
            if (err) {
                console.log(err);
                return res.redirect("/campgrounds");
            }
            return res.redirect("/campgrounds/" + foundCampground._id);
        });
    });
});

function escapeRegex(text){
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};


module.exports=router;