const Campground = require("../models/campground");
const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");
const axios = require("axios");
const mapBoxToken = process.env.MAPBOX_TOKEN;
const geocoder = mbxGeocoding({ accessToken: mapBoxToken });
const { cloudinary } = require("../cloudinary");
const Review = require("../models/review");


module.exports.index = async (req, res) => {
  const campgrounds = await Campground.find({}).populate("");
  res.render("campgrounds/index", { campgrounds });
};

module.exports.indexSorted = async (req, res) => {
  const sortedArr = await Campground.find({}).populate("");
  const campgrounds = sortedArr.sort((a, b) => b.avgRating - a.avgRating);
  res.render("campgrounds/index", { campgrounds });
};

module.exports.impressionSorted = async (req, res) => {
  const sortedArr = await Campground.find({}).populate("");
  const campgrounds = sortedArr.sort(
    (a, b) => b.impressionCount - a.impressionCount
  );
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
  const protocol = req.protocol;
  const host = req.hostname;
  const url = req.originalUrl;
  const port = process.env.PORT || PORT;
  const fullUrl = `${protocol}://${host}${url}`;
  const wa =
    "whatsapp://send?text=Come and check " +
    campground.title +
    " 🤗, a beautiful place😌. " +
    "Do comment and rate my camps😉.%0a" +
    fullUrl;
  const te =
    "Come and check " +
    campground.title +
    " 🤗, a beautiful place😌. " +
    "Do comment and rate my camps😉.%0a" +
    fullUrl;

  const { id } = req.params;
  const campgrounds = await Campground.findByIdAndUpdate(id, {
    impressionCount: campground.impressionCount + 1,
  });
  await campgrounds.save();
  const place = campground.location;

  const apiKey = "378da041b4f297aa7ab609ee83355815";
  const cityName = place; 

  let temperatureCelsius;
  let weatherIconUrl;
  let x = 0;
  const response = await axios
    .get(
      `https://api.openweathermap.org/data/2.5/weather?q=${cityName}&appid=${apiKey}`
    )
    .catch(function (error) {
      if (error.response) {
        x = 1;
      }
    });
  if (x == 0) {
    const temperatureKelvin = response.data.main.temp;

    temperatureCelsius = (temperatureKelvin - 273.15).toFixed(2);

    const weatherIconCode = response.data.weather[0].icon;

    weatherIconUrl = `https://openweathermap.org/img/w/${weatherIconCode}.png`;
  }

  if (!campground) {
    req.flash("error", "Cannot find that campground!");
    return res.redirect("/campgrounds");
  }
  res.render("campgrounds/show", {
    campground,
    wa,
    weatherIconUrl,
    temperatureCelsius,
    te,
    x,
    fullUrl,
  });
};
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
    $or: [
      {
        title: {
          $regex: search,
          $options: "i",
        },
      },
      {
        location: {
          $regex: search,
          $options: "i",
        },
      },
    ],
  });
  res.render("campgrounds/index", { campgrounds });
};
