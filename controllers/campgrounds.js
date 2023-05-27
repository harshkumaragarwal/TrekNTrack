const Campground = require("../models/campground");
const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");
const axios = require('axios') 
const mapBoxToken = process.env.MAPBOX_TOKEN;
const geocoder = mbxGeocoding({ accessToken: mapBoxToken });
const { cloudinary } = require("../cloudinary");
const Review = require("../models/review");

module.exports.index = async (req, res) => {
  const campgrounds = await Campground.find({}).populate("popupText");
  res.render("campgrounds/index", { campgrounds });
};

module.exports.renderNewForm = (req, res) => {
  res.render("campgrounds/new");
};

module.exports.createCampground = async (req, res, next) => {
  const geoData = await geocoder
    .forwardGeocode({
      query: req.body.campground.location,
      limit: 1,
    })
    .send();
  const campground = new Campground(req.body.campground);
  campground.geometry = geoData.body.features[0].geometry;
  campground.images = req.files.map((f) => ({
    url: f.path,
    filename: f.filename,
  }));
  campground.impressionCount = 0;
  console.log(campground.impressionCount);
  campground.author = req.user._id;
  await campground.save();
  req.flash("success", "Successfully made a new campground!");
  res.redirect(`/campgrounds/${campground._id}`);
};

module.exports.showCampground = async (req, res) => {
  const campground = await Campground.findById(req.params.id)
    .populate({
      path: "reviews",
      populate: {
        path: "author",
      },
    })
    .populate("author");
  const { id } = req.params;
  const campgrounds = await Campground.findByIdAndUpdate(id, {
    impressionCount : campground.impressionCount + 1
  });
  await campgrounds.save();
  const place = campground.location;
  const response = await axios(
 
  `https://api.weatherapi.com/v1/current.json?q=${place}&aqi=no&key=1b8676ab83734bf88d592311210410`
  );
  
  
  const temp_c = response.data.current.temp_c;
  const temp_f = response.data.current.temp_f;
  const i = response.data.current.condition.icon;
  

  if (!campground) {
    req.flash("error", "Cannot find that campground!");
    return res.redirect("/campgrounds");
  }
  
  res.render("campgrounds/show", { campground,temp_c,temp_f,i});
};
//
module.exports.renderEditForm = async (req, res) => {
  const { id } = req.params;
  const campground = await Campground.findById(id);
  if (!campground) {
    req.flash("error", "Cannot find that campground!");
    return res.redirect("/campgrounds");
  }
  res.render("campgrounds/edit", { campground });
};

module.exports.updateCampground = async (req, res) => {
  const { id } = req.params;
  console.log(req.body);
  const campground = await Campground.findByIdAndUpdate(id, {
    ...req.body.campground,
  });
  const imgs = req.files.map((f) => ({ url: f.path, filename: f.filename }));
  campground.images.push(...imgs);
  await campground.save();
  if (req.body.deleteImages) {
    for (let filename of req.body.deleteImages) {
      await cloudinary.uploader.destroy(filename);
    }
    await campground.updateOne({
      $pull: { images: { filename: { $in: req.body.deleteImages } } },
    });
  }
  req.flash("success", "Successfully updated campground!");
  res.redirect(`/campgrounds/${campground._id}`);
};

module.exports.deleteCampground = async (req, res) => {
  const { id } = req.params;
  await Campground.findByIdAndDelete(id);
  req.flash("success", "Successfully deleted campground");
  res.redirect("/campgrounds");
};

module.exports.search = async (req, res) => {
  const { search } = req.body;
  const campgrounds = await Campground.find({
     "$or": [
    {title: {
      $regex: search,
      $options: "i",
    }},
    {location: {
      $regex: search,
      $options: "i",}
    }]
  });
  res.render("campgrounds/index", { campgrounds });
};
