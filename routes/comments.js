var express=require("express");
var router =express.Router({mergeParams:true});
var campgrounds=require("../models/campground.js");
var Comment=require("../models/comment.js");

const {checkCommentOwnership, isLoggedIn, isPaid}=require("../middleware");
router.use(isLoggedIn,isPaid);

router.get("/new", function(req,res){
	campgrounds.findById(req.params.id, function(err,campground){
		
		if(err || !campground){
			 req.flash("error","Campground not found");
			res.redirect("back");
		 }
		
		else{
			res.render("comments/new.ejs",{campgrounds:campground});
		 }	
	});
});


router.post("/", function(req,res){
	campgrounds.findById(req.params.id,function(err,campground){
		
		if(err){
			 console.log("error");
			 res.redirect("/campgrounds");
		 }
		
		else{
			Comment.create(req.body.comment,function(err,comment){
				if(err){
					req.flash("error","Something Went Wrong")
					console.log(err);
				}
				else{
					// add username and id to comments
					comment.author.id=req.user._id;
					comment.author.username=req.user.username;
					//save comments
					comment.save();
					
					campground.comments.push(comment);
					campground.save();
					req.flash("success","The comment was added successfully")
					res.redirect("/campgrounds/" + campground._id);
					
				}
			});
		 }	
	});
});

// COMMENT EDIT ROUTE
router.get("/:comment_id/edit", checkCommentOwnership, function(req, res){
	campgrounds.findById(req.params.id,function(err,foundCampground){
		if(err || !foundCampground){
			req.flash("error","campground not found");
			return res.redirect("back");
		}
	});
   Comment.findById(req.params.comment_id, function(err, foundComment){
      if(err){
          res.redirect("back");
      } else {
        res.render("comments/edit.ejs", {campgrounds_id: req.params.id, comment: foundComment});
      }
   });
});

// COMMENT UPDATE
router.put("/:comment_id", checkCommentOwnership, function(req, res){
   Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment, function(err, updatedComment){
      if(err){
          res.redirect("back");
      } else {
		  req.flash("success","The comment was edited successfully")
          res.redirect("/campgrounds/" + req.params.id );
      }
   });
});


//delete
router.delete("/:comment_id", checkCommentOwnership,function(req,res){
	Comment.findByIdAndRemove(req.params.comment_id,function(err){
	if(err){
		res.redirect("back");
	}
	else{
		req.flash("success","The comment was deleted successfully")
		res.redirect("/campgrounds/"+ req.params.id);
	}
});

});

module.exports=router;