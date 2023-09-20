const { randomInt } = require("crypto");
const Campground = require("../models/campground");
const Review = require("../models/review");
const review = require("../models/review");

module.exports.createReview = async (req, res) => {
  // const campground = await Campground.findById(req.params.id);
  const campground = await Campground.findById(req.params.id).populate(
    "reviews"
  );
  const review = new Review(req.body.review);
  const ratings = campground.reviews.map((review) => review.rating);
  campground.rating.push(review.rating);
    let average = 0; 
  
  review.author = req.user._id;
  campground.reviews.push(review);
  let x = ratings.length;

  for (let i = 0; i < x ; i++)
    average += ratings[i];
  average += review.rating;
  average /= (x + 1);
  console.log(average);
  campground.avgRating = average;
  await review.save();
  await campground.save();
  req.flash("success", "Created new review!");
  res.redirect(`/campgrounds/${campground._id}`);
};

module.exports.deleteReview = async (req, res) => {
  const { id, reviewId } = req.params;
  // const campgroundd = await Campground.findById(req.params.id);
   const campground = await Campground.findById(req.params.id).populate(
     "reviews"
   );
  const review = new Review(req.body.review);
  
  const ratings = campground.reviews.map((review) => review.rating);
  
  const rating = (await Review.findById(reviewId)).rating;
  let average = 0;
  let x = ratings.length;

  for (let i = 0; i < x; i++) average += ratings[i];
  average -= rating;
  console.log(average);
  average /= (x - 1);
  console.log(average);
  campground.avgRating = average;
  
 
console.log(campground);
  await Campground.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
  await Campground.findByIdAndUpdate(id, { $pull: { rating: rating } });
  req.flash("success", "Successfully deleted review");
  console.log(campground);
   await campground.save();
   await review.save();
  res.redirect(`/campgrounds/${id}`);
};
