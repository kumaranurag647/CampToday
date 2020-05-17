var mongoose=require("mongoose");
var campgroundsSchema=new mongoose.Schema({
	name:String,
	price:String,
	image:String,
	description:String,
	createdAt: {type: Date, default: Date.now},
	author:{
		id:{
			type:mongoose.Schema.Types.ObjectId,
			ref:"User"
		},
		username:String
	},
	comments:[
		{
			type:mongoose.Schema.Types.ObjectId,
			ref:"Comment"
		}
	],
	likes: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    ],
	reviews: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Review"
        }
    ],
    rating: {
        type: Number,
        default: 0
    }
});

module.exports=mongoose.model("campgrounds",campgroundsSchema);