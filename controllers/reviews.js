const Campground = require("../models/campground");
const Review = require("../models/review");

module.exports.createReview = async (req, res) => {
  const campground = await Campground.findById(req.params.id);
  const review = new Review(req.body.review);
  campground.rating.push(review.rating);
    let average = 0; 
  for (let i = 0; i < campground.rating.length; i++) {
    average+=campground.rating[i];
                     }
                    if(campground.rating.length){
                    
                      average = average / campground.rating.length;
                    }
  campground.avgRating = average;
  review.author = req.user._id;
  campground.reviews.push(review);
  await review.save();
  await campground.save();
  req.flash("success", "Created new review!");
  res.redirect(`/campgrounds/${campground._id}`);
};

module.exports.deleteReview = async (req, res) => {
  const { id, reviewId } = req.params;
  const rating = (await Review.findById(reviewId)).rating;
  await Campground.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
  await Campground.findByIdAndUpdate(id, { $pull: { rating: rating } });
  await Review.findByIdAndDelete(reviewId);
  req.flash("success", "Successfully deleted review");
  res.redirect(`/campgrounds/${id}`);
};
