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
    );

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
