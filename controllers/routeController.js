import Route from "../models/route.model.js";
import cloudinary from "../config/cloudinary.js";
import mongoose from "mongoose";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/* ---------------- CREATE ROUTE ---------------- */
// POST /api/routes
export const createRoute = async (req, res) => {
  try {
    const { title, location, routeLink, userId } = req.body;

    if (!title || !location || !routeLink || !userId) {
      return res.status(400).json({
        success: false,
        message: "title, location, routeLink and userId are required",
      });
    }

    if (!isValidObjectId(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid userId",
      });
    }

    let imageData = {};

    if (req.file) {
      const uploadResult = await cloudinary.uploader.upload(
        `data:${req.file.mimetype};base64,${req.file.buffer.toString(
          "base64"
        )}`,
        {
          folder: "veloclique/routes",
        }
      );

      imageData = {
        publicId: uploadResult.public_id,
        url: uploadResult.secure_url,
      };
    }

    const route = await Route.create({
      title,
      location,
      routeLink,
      image: imageData,
      userId,
      status: "pending",
    });

    // Populate userId to match the expected response format
    await route.populate("userId", "name email");

    res.status(201).json({
      success: true,
      message: "Route uploaded successfully",
      data: route,
    });
  } catch (error) {
    console.error("Create route error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ---------------- GET ROUTES (PUBLIC) ---------------- */
// GET /api/routes
export const getRoutes = async (req, res) => {
  try {
    const routes = await Route.find({ status: "approved" })
      .sort({ createdAt: -1 })
      .populate("userId", "name email");

    res.json({
      success: true,
      data: routes,
    });
  } catch (error) {
    console.error("Get routes error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ---------------- GET POPULAR ROUTES ---------------- */
// GET /api/routes/popular
export const getPopularRoutes = async (req, res) => {
  try {
    const { region } = req.query;
    const query = { status: "approved", isPopular: true };

    if (region) {
      query.region = region;
    }

    const routes = await Route.find(query)
      .sort({ createdAt: -1 })
      .populate("userId", "name email");

    res.json({
      success: true,
      data: routes,
    });
  } catch (error) {
    console.error("Get popular routes error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ---------------- ADMIN: UPDATE STATUS ---------------- */
// PUT /api/routes/:id/status
export const updateRouteStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be approved or rejected",
      });
    }

    const route = await Route.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate("userId", "name email");

    if (!route) {
      return res.status(404).json({
        success: false,
        message: "Route not found",
      });
    }

    res.json({
      success: true,
      message: `Route ${status}`,
      data: route,
    });
  } catch (error) {
    console.error("Update route status error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ---------------- ADMIN: UPLOAD IMAGE ---------------- */
// PUT /api/routes/:id/image
export const uploadRouteImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file provided",
      });
    }

    const route = await Route.findById(req.params.id);

    if (!route) {
      return res.status(404).json({
        success: false,
        message: "Route not found",
      });
    }

    // Upload to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(
      `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`,
      {
        folder: "veloclique/routes",
      }
    );

    const imageData = {
      publicId: uploadResult.public_id,
      url: uploadResult.secure_url,
    };

    // Update route image
    route.image = imageData;
    await route.save();

    // Populate userId to match the expected response format
    await route.populate("userId", "name email");

    res.json({
      success: true,
      message: "Route image uploaded successfully",
      data: route,
    });
  } catch (error) {
    console.error("Upload route image error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ---------------- ADMIN: UPDATE ROUTE FEATURED/POPULAR ---------------- */
// PUT /api/routes/:id/feature
export const updateRouteFeature = async (req, res) => {
  try {
    const { isFeatured, isPopular } = req.body;

    const updateData = {};
    if (isFeatured !== undefined) updateData.isFeatured = isFeatured === "true" || isFeatured === true;
    if (isPopular !== undefined) updateData.isPopular = isPopular === "true" || isPopular === true;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "isFeatured or isPopular must be provided",
      });
    }

    const route = await Route.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate("userId", "name email");

    if (!route) {
      return res.status(404).json({
        success: false,
        message: "Route not found",
      });
    }

    res.json({
      success: true,
      message: "Route updated successfully",
      data: route,
    });
  } catch (error) {
    console.error("Update route feature error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ---------------- ADMIN: CREATE ROUTE ---------------- */
// POST /api/routes/admin/create
export const createRouteAsAdmin = async (req, res) => {
  try {
    const { title, location, routeLink, distance, difficulty, description, isFeatured, isPopular } = req.body;

    // Validate required fields
    if (!title || !location || !routeLink) {
      return res.status(400).json({
        success: false,
        message: "title, location, and routeLink are required",
      });
    }

    // Create route data with approved status
    const routeData = {
      title,
      location,
      routeLink,
      userId: req.user._id,
      status: "approved", // Admin-created routes are automatically approved
      isFeatured: isFeatured === "true" || isFeatured === true,
      isPopular: isPopular === "true" || isPopular === true,
    };

    // Add optional fields if provided
    if (distance) routeData.distance = distance;
    if (difficulty) {
      routeData.difficulty = difficulty;
      routeData.type = difficulty; // Also save to type field for frontend compatibility
    }
    if (description) routeData.description = description;

    // If image is provided, upload to Cloudinary
    if (req.file) {
      const uploadResult = await cloudinary.uploader.upload(
        `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`,
        {
          folder: "veloclique/routes",
        }
      );

      routeData.image = {
        publicId: uploadResult.public_id,
        url: uploadResult.secure_url,
      };
    }

    const route = await Route.create(routeData);

    // Populate userId field
    await route.populate("userId", "name email");

    res.status(201).json({
      success: true,
      message: "Route created successfully with approved status",
      data: route,
    });
  } catch (error) {
    console.error("Create route as admin error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};