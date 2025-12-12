import mongoose from "mongoose";
import Shop from "../models/shop.model.js";

const escapeForRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const toCaseInsensitiveRegex = (value = "") => {
  const decoded = decodeURIComponent(value)?.trim();
  if (!decoded) return null;
  return new RegExp(`^${escapeForRegex(decoded)}$`, "i");
};

const buildCategoryFilter = (category) => {
  if (!category) return null;
  const regex = new RegExp(escapeForRegex(category.trim()), "i");
  return {
    $or: [{ firstCategory: regex }, { secondCategory: regex }],
  };
};

export const getShopStates = async (req, res) => {
  try {
    const { category } = req.query;
    const matchStage = {};
    const categoryFilter = buildCategoryFilter(category);
    if (categoryFilter) {
      Object.assign(matchStage, categoryFilter);
    }

    const pipeline = [];
    if (Object.keys(matchStage).length) {
      pipeline.push({ $match: matchStage });
    }

    pipeline.push(
      { $group: { _id: "$state", cities: { $addToSet: "$city" }, shops: { $sum: 1 } } },
      {
        $project: {
          _id: 0,
          state: "$_id",
          cityCount: { $size: "$cities" },
          shops: "$shops",
        },
      },
      { $sort: { state: 1 } }
    );

    const states = await Shop.aggregate(pipeline);
    res.json({ states });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch states", error: error.message });
  }
};

export const getCitiesByState = async (req, res) => {
  try {
    const { state } = req.params;
    const { category } = req.query;
    const matchState = toCaseInsensitiveRegex(state);

    if (!matchState) {
      return res.status(400).json({ message: "State parameter is required" });
    }

    const matchStage = { state: matchState };
    const categoryFilter = buildCategoryFilter(category);
    if (categoryFilter) {
      Object.assign(matchStage, categoryFilter);
    }

    const cities = await Shop.aggregate([
      { $match: matchStage },
      { $group: { _id: "$city", shops: { $sum: 1 } } },
      {
        $project: {
          _id: 0,
          city: "$_id",
          shops: "$shops",
        },
      },
      { $sort: { city: 1 } },
    ]);

    res.json({
      state: decodeURIComponent(state).trim(),
      cities,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch cities", error: error.message });
  }
};

export const listShops = async (req, res) => {
  try {
    const {
      state,
      city,
      status,
      category,
      search,
      minRating,
      page = 1,
      limit = 20,
    } = req.query;

    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

    const filters = {};

    const matchState = toCaseInsensitiveRegex(state);
    if (matchState) filters.state = matchState;

    const matchCity = toCaseInsensitiveRegex(city);
    if (matchCity) filters.city = matchCity;

    const matchStatus = toCaseInsensitiveRegex(status);
    if (matchStatus) filters.businessStatus = matchStatus;

    const categoryFilter = buildCategoryFilter(category);
    if (categoryFilter) Object.assign(filters, categoryFilter);

    if (search?.trim()) {
      filters.name = new RegExp(escapeForRegex(search.trim()), "i");
    }

    if (minRating) {
      const parsedRating = Math.max(Number(minRating), 0);
      if (!Number.isNaN(parsedRating)) {
        filters.averageRating = { $gte: parsedRating };
      }
    }

    const skip = (parsedPage - 1) * parsedLimit;

    const [shops, total] = await Promise.all([
      Shop.find(filters)
        .sort({ reviewsCount: -1, averageRating: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .select([
          "name",
          "fullAddress",
          "streetAddress",
          "city",
          "state",
          "zip",
          "country",
          "phone",
          "website",
          "firstCategory",
          "secondCategory",
          "reviewsCount",
          "averageRating",
          "businessStatus",
          "imageUrl",
          "hours",
          "location",
        ]),
      Shop.countDocuments(filters),
    ]);

    res.json({
      page: parsedPage,
      limit: parsedLimit,
      total,
      totalPages: Math.ceil(total / parsedLimit) || 1,
      shops,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch shops", error: error.message });
  }
};

export const getNearbyShops = async (req, res) => {
  try {
    const { lat, lng, radiusMiles = 25, limit = 12 } = req.query;

    const latitude = Number(lat);
    const longitude = Number(lng);
    const maxResults = Math.min(Math.max(Number(limit) || 12, 1), 50);
    const radiusInMeters = Math.max(Number(radiusMiles) || 25, 1) * 1609.34;

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return res.status(400).json({ message: "lat and lng are required numbers" });
    }

    const shops = await Shop.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [longitude, latitude],
          },
          $maxDistance: radiusInMeters,
        },
      },
    })
      .limit(maxResults)
      .select([
        "name",
        "fullAddress",
        "streetAddress",
        "city",
        "state",
        "zip",
        "phone",
        "website",
        "firstCategory",
        "secondCategory",
        "reviewsCount",
        "averageRating",
        "businessStatus",
        "imageUrl",
        "location",
      ]);

    res.json({
      total: shops.length,
      shops,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch nearby shops", error: error.message });
  }
};

export const getShopById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid shop id" });
    }

    const shop = await Shop.findById(id);
    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    res.json(shop);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch shop", error: error.message });
  }
};

