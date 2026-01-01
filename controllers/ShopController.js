import Shop from "../models/shop.model.js";
import ClaimRequest from "../models/claimRequest.model.js";
import mongoose from "mongoose";
import * as shopService from "../services/shopService.js";
import {
  updateUserPassword,
  getUserSessions,
  endAllUserSessions,
} from "../services/userService.js";
import cloudinary from "../config/cloudinary.js";

const escapeForRegex = (value = "") =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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
    console.log("getShopStates: req.query", req.query);
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
      {
        $group: {
          _id: "$state",
          cities: { $addToSet: "$city" },
          shops: { $sum: 1 },
        },
      },
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
    res
      .status(500)
      .json({ message: "Failed to fetch states", error: error.message });
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
    res
      .status(500)
      .json({ message: "Failed to fetch cities", error: error.message });
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
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 10000); // Increased max limit for admin

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
        .lean()
        .select("name fullAddress streetAddress city state zip country phone website firstCategory secondCategory reviewsCount averageRating businessStatus imageUrl hours location subscription description"),
      Shop.countDocuments(filters),
    ]);

    // Debug: Log subscription data
    console.log(`[listShops] Total shops returned: ${shops.length}`);
    const sampleShop = shops[0];
    if (sampleShop) {
      console.log(`[listShops] Sample shop subscription field:`, sampleShop.subscription);
      console.log(`[listShops] Sample shop has subscription:`, !!sampleShop.subscription);
      if (sampleShop.subscription) {
        console.log(`[listShops] Sample shop subscription.status:`, sampleShop.subscription.status);
      }
    }
    
    const shopsWithActiveSubscription = shops.filter(
      (shop) => shop.subscription?.status === "active"
    );
    console.log(
      `[listShops] Shops with active subscription: ${shopsWithActiveSubscription.length}`
    );
    if (shopsWithActiveSubscription.length > 0) {
      console.log(
        "[listShops] Active subscription shops:",
        shopsWithActiveSubscription.map((s) => ({
          name: s.name,
          subscriptionStatus: s.subscription?.status,
        }))
      );
    }

    res.json({
      page: parsedPage,
      limit: parsedLimit,
      total,
      totalPages: Math.ceil(total / parsedLimit) || 1,
      shops,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch shops", error: error.message });
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
      return res
        .status(400)
        .json({ message: "lat and lng are required numbers" });
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
    res
      .status(500)
      .json({ message: "Failed to fetch nearby shops", error: error.message });
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
    res
      .status(500)
      .json({ message: "Failed to fetch shop", error: error.message });
  }
};

export const claimShop = async (req, res) => {
  try {
    const { shopName, businessEmail, phone, message, shopId } = req.body;
    const userId = req.user._id;

    if (!shopName || !businessEmail || !message) {
      return res.status(400).json({
        success: false,
        message: "Shop name, business email and message are required",
      });
    }

    let documentUrl = null;

    // Handle file upload if provided
    if (req.file) {
      try {
        const result = await cloudinary.uploader.upload(
          `data:${req.file.mimetype};base64,${req.file.buffer.toString(
            "base64"
          )}`,
          {
            folder: "veloclique/shop-claims",
            resource_type: "auto",
          }
        );
        documentUrl = result.secure_url;
      } catch (uploadError) {
        console.error("Cloudinary upload error:", uploadError);
        return res.status(400).json({
          success: false,
          message: "Failed to upload document",
          error: uploadError.message,
        });
      }
    }

    const claimRequest = await ClaimRequest.create({
      shopName,
      businessEmail,
      phone,
      message,
      userId,
      shopId,
      documentUrl,
      status: "pending",
    });

    res.status(201).json({
      success: true,
      message: "Claim request submitted successfully",
      data: claimRequest,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to submit claim request",
      error: error.message,
    });
  }
};

// Shop Owner Profile Management

/**
 * Get the shop profile for the authenticated owner
 */
export const getMyShopProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    console.log("!!! CAPTURED USER ID !!!:", userId);
    console.log("getMyShopProfile: req.user", {
      _id: req.user._id,
      role: req.user.role,
      shopId: req.user.shopId,
    });
    const shop = await shopService.getShopByOwner(
      new mongoose.Types.ObjectId(userId)
    );
    console.log(
      "Found shop for result:",
      shop ? { id: shop._id, name: shop.name } : "none"
    );

    res.json({
      success: true,
      shop,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Update the shop profile for the authenticated owner
 */
export const updateMyShopProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const shop = await shopService.getShopByOwner(userId);

    const updatedShop = await shopService.updateShop(shop._id, req.body);

    res.json({
      success: true,
      message: "Shop profile updated successfully",
      shop: updatedShop,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Upload shop profile image
 */
export const uploadShopImage = async (req, res) => {
  try {
    const userId = req.user._id;
    const shop = await shopService.getShopByOwner(userId);

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No file uploaded",
      });
    }

    // Upload to cloudinary using buffer
    const result = await cloudinary.uploader.upload(
      `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`,
      {
        folder: "veloclique/shops",
        width: 400,
        height: 300,
        crop: "fill",
      }
    );

    const updatedShop = await shopService.updateShop(shop._id, {
      imageUrl: result.secure_url,
    });

    res.json({
      success: true,
      message: "Shop image uploaded successfully",
      shop: updatedShop,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Get listing health/completeness
 */
export const getListingHealth = async (req, res) => {
  try {
    const userId = req.user._id;
    const shop = await shopService.getShopByOwner(
      new mongoose.Types.ObjectId(userId)
    );

    if (!shop) {
      return res.json({ success: true, completeness: 0, checks: {} });
    }

    const checks = {
      shopName: !!(shop.name && shop.city && shop.state),
      contactInfo: !!(shop.phone || shop.email || shop.website),
      operatingHours: !!(
        shop.hours ||
        (shop.hoursByDay && Object.values(shop.hoursByDay).some((h) => h))
      ),
      shopDescription: !!shop.description,
      photos: !!shop.imageUrl,
      reviews: shop.reviewsCount > 0,
    };

    const totalChecks = 6;
    const passedChecks = Object.values(checks).filter(Boolean).length;
    const completeness = Math.round((passedChecks / totalChecks) * 100);

    res.json({
      success: true,
      completeness,
      checks,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Request email change OTP
 */
export const requestEmailChange = async (req, res) => {
  try {
    const userId = req.user._id;
    const { newEmail } = req.body;

    if (!newEmail) {
      return res
        .status(400)
        .json({ success: false, error: "New email is required" });
    }

    const shop = await shopService.getShopByOwner(userId);
    const otp = await shopService.requestEmailChange(shop._id, newEmail);

    // Send OTP via email
    // Dynamic import to avoid circular dependency issues if any, or just import at top if fine
    const { sendEmailChangeOTP } = await import("../services/emailService.js");
    await sendEmailChangeOTP(newEmail, otp);

    res.json({
      success: true,
      message: `Verification code sent to ${newEmail}`,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Verify OTP and update email
 */
export const verifyEmailChange = async (req, res) => {
  try {
    const userId = req.user._id;
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({ success: false, error: "OTP is required" });
    }

    const shop = await shopService.getShopByOwner(userId);
    const result = await shopService.verifyEmailChange(shop._id, otp);

    // Send notification to old email (optional but good practice)
    // const { sendEmailChangeNotification } = await import("../services/emailService.js");
    // await sendEmailChangeNotification(result.oldEmail, result.newEmail);

    res.json({
      success: true,
      message: "Shop email updated successfully",
      shop: result.shop,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Request 2FA OTP for Shop
 */
export const requestTwoFactorOTP = async (req, res) => {
  try {
    const userId = req.user._id;
    const shop = await shopService.getShopByOwner(userId);

    // Request OTP from service (generates and saves it)
    const { otp, email } = await shopService.requestShopTwoFactorOTP(shop._id);

    // Send OTP via email
    const { sendTwoFactorOTP } = await import("../services/emailService.js");
    await sendTwoFactorOTP(email, otp);

    res.json({
      success: true,
      message: `Verification code sent to ${email}`,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Verify 2FA OTP for Shop
 */
export const verifyTwoFactorOTP = async (req, res) => {
  try {
    const userId = req.user._id;
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({ success: false, error: "OTP is required" });
    }

    const shop = await shopService.getShopByOwner(userId);
    const updatedShop = await shopService.verifyShopTwoFactorOTP(shop._id, otp);

    res.json({
      success: true,
      message: "Two-step verification enabled successfully",
      shop: updatedShop,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Toggle 2FA for Shop (Disable only mostly)
 */
export const toggleTwoFactor = async (req, res) => {
  try {
    const userId = req.user._id;
    const { enable } = req.body; // boolean

    const shop = await shopService.getShopByOwner(userId);
    const updatedShop = await shopService.toggleShopTwoFactor(shop._id, enable);

    res.json({
      success: true,
      message: `Two-step verification ${enable ? "enabled" : "disabled"}`,
      shop: updatedShop,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Change Password (Wrapper for User Password)
 */
export const changePassword = async (req, res) => {
  try {
    const userId = req.user._id;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        error: "All password fields are required",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: "New passwords do not match",
      });
    }

    await updateUserPassword(userId, currentPassword, newPassword);
    res.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Get Active Sessions (Wrapper for User Sessions)
 */
export const getActiveSessions = async (req, res) => {
  try {
    const userId = req.user._id;
    const sessions = await getUserSessions(userId);
    res.json({
      success: true,
      sessions,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * End All Sessions (Wrapper for User Sessions)
 */
export const endAllSessions = async (req, res) => {
  try {
    const userId = req.user._id;
    await endAllUserSessions(userId);
    res.json({
      success: true,
      message: "All other sessions ended successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// Email Preferences
export const getEmailPreferences = async (req, res) => {
  try {
    const userId = req.user._id;
    const shop = await shopService.getShopByOwner(
      new mongoose.Types.ObjectId(userId)
    );
    const preferences = await shopService.getShopEmailPreferences(shop._id);
    res.json({ success: true, preferences });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateEmailPreferences = async (req, res) => {
  try {
    const userId = req.user._id;
    const shop = await shopService.getShopByOwner(
      new mongoose.Types.ObjectId(userId)
    );
    const preferences = await shopService.updateShopEmailPreferences(
      shop._id,
      req.body
    );
    res.json({ success: true, preferences });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Privacy Settings
export const updatePrivacySettings = async (req, res) => {
  try {
    const userId = req.user._id;
    const { isProfilePrivate } = req.body;

    if (typeof isProfilePrivate !== "boolean") {
      return res
        .status(400)
        .json({ success: false, error: "isProfilePrivate must be a boolean" });
    }

    const shop = await shopService.getShopByOwner(
      new mongoose.Types.ObjectId(userId)
    );
    const updatedShop = await shopService.updateShopPrivacy(
      shop._id,
      isProfilePrivate
    );

    res.json({
      success: true,
      message: `Shop profile is now ${isProfilePrivate ? "private" : "public"}`,
      shop: updatedShop,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// Data Export
export const requestDataExport = async (req, res) => {
  try {
    const userId = req.user._id;
    const shop = await shopService.getShopByOwner(
      new mongoose.Types.ObjectId(userId)
    );
    const exportData = await shopService.requestShopDataExport(shop._id);

    res.json({
      success: true,
      message: "Data export prepared successfully",
      data: exportData,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// Shop Deletion
export const requestShopDeletion = async (req, res) => {
  try {
    const userId = req.user._id;
    const shop = await shopService.getShopByOwner(
      new mongoose.Types.ObjectId(userId)
    );
    const { otp, email, shopName } = await shopService.requestShopDelete(
      shop._id
    );

    // Send OTP via email
    const { sendShopDeletionOTP } = await import("../services/emailService.js");
    await sendShopDeletionOTP(email, otp, shopName);

    res.json({
      success: true,
      message: `Verification code sent to ${email}`,
      shopName,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const verifyShopDeletion = async (req, res) => {
  try {
    const userId = req.user._id;
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({ success: false, error: "OTP is required" });
    }

    const shop = await shopService.getShopByOwner(
      new mongoose.Types.ObjectId(userId)
    );
    const result = await shopService.verifyShopDelete(shop._id, otp);

    res.json({
      success: true,
      message: "Shop deleted successfully",
      ...result,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};
