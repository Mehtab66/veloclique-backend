import GearPick from "../models/gearpick.model.js";
import cloudinary from "../config/cloudinary.js";

// @desc    Submit a new gear pick
// @route   POST /api/gear-picks
// @access  Private
export const submitGearPick = async (req, res) => {
  try {
    const { gearName, subtitle, category, productLink, recommendation, description } = req.body;

    // Validate required fields
    if (!gearName || !category || !recommendation) {
      return res.status(400).json({
        success: false,
        message: "Gear name, category, and recommendation are required",
      });
    }

    const gearPickData = {
      gearName,
      subtitle: subtitle || "",
      category,
      productLink: productLink || "",
      recommendation,
      description: description || "",
      userId: req.user._id,
      status: "pending",
      images: [],
    };

    // If images are provided, upload to Cloudinary
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map((file) =>
        cloudinary.uploader.upload(
          `data:${file.mimetype};base64,${file.buffer.toString("base64")}`,
          {
            folder: "veloclique/gearpicks",
            resource_type: "image",
          }
        )
      );

      const uploadResults = await Promise.all(uploadPromises);

      gearPickData.images = uploadResults.map((result) => ({
        publicId: result.public_id,
        url: result.secure_url,
      }));

      // For backward compatibility
      if (gearPickData.images.length > 0) {
        gearPickData.image = gearPickData.images[0];
      }
    }

    const gearPick = new GearPick(gearPickData);
    const createdGearPick = await gearPick.save();

    res.status(201).json({
      success: true,
      message: "Gear pick submitted successfully",
      data: createdGearPick,
    });
  } catch (error) {
    console.error("Submit gear pick error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Get all gear picks with filtering and sorting
// @route   GET /api/gear-picks
// @access  Public
export const getGearPicks = async (req, res) => {
  try {
    const {
      category = "All",
      sort = "Most Voted",
      page = 1,
      limit = 1000,
      status = "approved", // Non-admins only see approved by default
    } = req.query;

    // Build query
    const query = {};

    // Filter by status - only admins can see pending/rejected
    if (req.user?.role === "admin") {
      if (status === "pending" || status === "rejected") {
        query.status = status;
      } else {
        // Show all approved to everyone, pending/rejected only to admins in admin panel
        query.status = "approved";
      }
    } else {
      // Non-admins only see approved gear picks
      query.status = "approved";
    }

    // Filter by category
    if (category && category !== "All") {
      query.category = category;
    }

    // Build sort object based on frontend sort options
    let sortObj = {};
    switch (sort) {
      case "Most Voted":
        sortObj = { votes: -1, createdAt: -1 };
        break;
      case "Newest":
        sortObj = { createdAt: -1 };
        break;
      case "Trending":
        // You can define trending as recently voted + high votes
        sortObj = { "voteHistory.votedAt": -1, votes: -1 };
        break;
      default:
        sortObj = { createdAt: -1 };
    }

    // Pagination
    const pageNum = parseInt(page);
    let limitNum = parseInt(limit);

    // If fetching for public view, allow a very high limit to get everything
    if (!req.user || req.user.role !== "admin") {
      if (limitNum === 1000) limitNum = 10000; // Allow fetching up to 10k for public
    }
    const skip = (pageNum - 1) * limitNum;

    // Execute query
    const gearPicks = await GearPick.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .populate("userId", "username")
      .lean();

    // Ensure images array is populated for frontend, migrating from single image if necessary
    const processedGearPicks = gearPicks.map(gp => {
      if ((!gp.images || gp.images.length === 0) && gp.image && gp.image.url) {
        gp.images = [gp.image];
      }
      return gp;
    });

    const total = await GearPick.countDocuments(query);

    res.json({
      success: true,
      count: processedGearPicks.length,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      data: processedGearPicks,
    });
  } catch (error) {
    console.error("Get gear picks error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Get gear picks for admin (all statuses)
// @route   GET /api/gear-picks/admin/all
// @access  Admin
export const getGearPicksForAdmin = async (req, res) => {
  try {
    const { status, category = "All", page = 1, limit = 20 } = req.query;

    const query = {};

    // Filter by status if provided
    if (status && status !== "all") {
      query.status = status;
    }

    // Filter by category
    if (category && category !== "All") {
      query.category = category;
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get gear picks with user info
    const gearPicks = await GearPick.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate("userId", "username email")
      .populate("voteHistory.userId", "username")
      .lean();

    // Ensure images array is populated
    const processedGearPicks = gearPicks.map(gp => {
      if ((!gp.images || gp.images.length === 0) && gp.image && gp.image.url) {
        gp.images = [gp.image];
      }
      return gp;
    });

    const total = await GearPick.countDocuments(query);

    res.json({
      success: true,
      count: processedGearPicks.length,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      data: processedGearPicks,
    });
  } catch (error) {
    console.error("Admin get gear picks error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Approve or reject gear pick
// @route   PUT /api/gear-picks/:id/status
// @access  Admin
export const updateGearPickStatus = async (req, res) => {
  try {
    const { status } = req.body;

    // Validate status
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either "approved" or "rejected"',
      });
    }

    const gearPick = await GearPick.findById(req.params.id);

    if (!gearPick) {
      return res.status(404).json({
        success: false,
        message: "Gear pick not found",
      });
    }

    // Update status
    gearPick.status = status;
    const updatedGearPick = await gearPick.save();

    res.json({
      success: true,
      message: `Gear pick ${status} successfully`,
      data: updatedGearPick,
    });
  } catch (error) {
    console.error("Update status error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Vote on a gear pick
// @route   POST /api/gear-picks/:id/vote
// @access  Private
export const voteOnGearPick = async (req, res) => {
  try {
    const { vote } = req.body;

    // Validate vote value
    if (![1, -1].includes(vote)) {
      return res.status(400).json({
        success: false,
        message: "Vote must be either 1 (upvote) or -1 (downvote)",
      });
    }

    const gearPick = await GearPick.findById(req.params.id);

    if (!gearPick) {
      return res.status(404).json({
        success: false,
        message: "Gear pick not found",
      });
    }

    // Only allow voting on approved gear picks
    if (gearPick.status !== "approved") {
      return res.status(400).json({
        success: false,
        message: "Only approved gear picks can be voted on",
      });
    }

    // Check if user has already voted
    const existingVoteIndex = gearPick.voteHistory.findIndex(
      (v) => v.userId.toString() === req.user._id.toString()
    );

    if (existingVoteIndex > -1) {
      // User already voted - update their vote
      const oldVote = gearPick.voteHistory[existingVoteIndex].vote;
      gearPick.voteHistory[existingVoteIndex].vote = vote;
      gearPick.voteHistory[existingVoteIndex].votedAt = new Date();
      gearPick.votes = gearPick.votes - oldVote + vote;
    } else {
      // New vote
      gearPick.voteHistory.push({
        userId: req.user._id,
        vote,
        votedAt: new Date(),
      });
      gearPick.votes += vote;
    }

    const updatedGearPick = await gearPick.save();

    res.json({
      success: true,
      message: "Vote recorded successfully",
      data: {
        votes: updatedGearPick.votes,
        userVote: vote,
      },
    });
  } catch (error) {
    console.error("Vote error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


export const uploadGearPickImage = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please upload at least one image",
      });
    }

    const gearPick = await GearPick.findById(req.params.id);

    if (!gearPick) {
      return res.status(404).json({
        success: false,
        message: "Gear pick not found",
      });
    }

    const uploadPromises = req.files.map((file) =>
      cloudinary.uploader.upload(
        `data:${file.mimetype};base64,${file.buffer.toString("base64")}`,
        {
          folder: "veloclique/gearpicks",
          resource_type: "image",
        }
      )
    );

    const uploadResults = await Promise.all(uploadPromises);

    const newImages = uploadResults.map((result) => ({
      publicId: result.public_id,
      url: result.secure_url,
    }));

    // Add new images to existing array
    gearPick.images = [...(gearPick.images || []), ...newImages];

    // For backward compatibility, set the first image as the primary 'image' field
    if (gearPick.images.length > 0) {
      gearPick.image = gearPick.images[0];
    }

    await gearPick.save();

    res.json({
      success: true,
      message: "Images uploaded successfully",
      data: gearPick.images,
    });
  } catch (error) {
    console.error("Upload gear pick image error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const deleteGearPickImage = async (req, res) => {
  try {
    const { id } = req.params;
    const publicId = req.params[0]; // Capture from wildcard route

    const gearPick = await GearPick.findById(id);

    if (!gearPick) {
      return res.status(404).json({
        success: false,
        message: "Gear pick not found",
      });
    }

    // Delete from Cloudinary
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (cloudinaryError) {
      console.error("Cloudinary deletion error:", cloudinaryError);
      // Continue even if Cloudinary fails, to keep DB in sync
    }

    // Update database
    gearPick.images = gearPick.images.filter((img) => img.publicId !== publicId);

    // Update primary image if the deleted one was the primary
    if (gearPick.image && gearPick.image.publicId === publicId) {
      gearPick.image = gearPick.images.length > 0 ? gearPick.images[0] : null;
    }

    await gearPick.save();

    res.json({
      success: true,
      message: "Image deleted successfully",
      data: gearPick.images,
    });
  } catch (error) {
    console.error("Delete gear pick image error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Create gear pick as admin (with approved status)
// @route   POST /api/gear-picks/admin/create
// @access  Admin
export const createGearPickAsAdmin = async (req, res) => {
  try {
    const { gearName, subtitle, category, productLink, recommendation, description } = req.body;

    // Validate required fields
    if (!gearName || !category || !recommendation) {
      return res.status(400).json({
        success: false,
        message: "Gear name, category, and recommendation are required",
      });
    }

    // Create gear pick with approved status
    const gearPickData = {
      gearName,
      subtitle: subtitle || "",
      category,
      productLink: productLink || "",
      recommendation,
      description: description || "",
      userId: req.user._id,
      status: "approved", // Admin-created picks are automatically approved
      images: [],
    };

    // If images are provided, upload to Cloudinary
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map((file) =>
        cloudinary.uploader.upload(
          `data:${file.mimetype};base64,${file.buffer.toString("base64")}`,
          {
            folder: "veloclique/gearpicks",
            resource_type: "image",
          }
        )
      );

      const uploadResults = await Promise.all(uploadPromises);

      gearPickData.images = uploadResults.map((result) => ({
        publicId: result.public_id,
        url: result.secure_url,
      }));

      // For backward compatibility
      if (gearPickData.images.length > 0) {
        gearPickData.image = gearPickData.images[0];
      }
    }

    const gearPick = new GearPick(gearPickData);
    const createdGearPick = await gearPick.save();

    // Populate userId field
    await createdGearPick.populate("userId", "username email");

    res.status(201).json({
      success: true,
      message: "Gear pick created successfully with approved status",
      data: createdGearPick,
    });
  } catch (error) {
    console.error("Create gear pick as admin error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Update gear pick details (Admin)
// @route   PUT /api/gear-picks/:id/details
// @access  Admin
export const updateGearPickDetails = async (req, res) => {
  try {
    const { gearName, subtitle, category, productLink, recommendation, description } = req.body;

    if (!gearName || !category || !recommendation) {
      return res.status(400).json({
        success: false,
        message: "Gear name, category, and recommendation are required",
      });
    }

    const gearPick = await GearPick.findById(req.params.id);

    if (!gearPick) {
      return res.status(404).json({
        success: false,
        message: "Gear pick not found",
      });
    }

    gearPick.gearName = gearName;
    gearPick.subtitle = subtitle || "";
    gearPick.category = category;
    gearPick.productLink = productLink || "";
    gearPick.recommendation = recommendation;
    gearPick.description = description || "";

    const updatedGearPick = await gearPick.save();

    // Populate user info for frontend consistency
    await updatedGearPick.populate("userId", "username email");

    res.json({
      success: true,
      message: "Gear pick updated successfully",
      data: updatedGearPick,
    });
  } catch (error) {
    console.error("Update gear pick details error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Delete gear pick (Admin)
// @route   DELETE /api/gear-picks/:id
// @access  Admin
export const deleteGearPick = async (req, res) => {
  try {
    const gearPick = await GearPick.findById(req.params.id);

    if (!gearPick) {
      return res.status(404).json({
        success: false,
        message: "Gear pick not found",
      });
    }

    // Delete image from Cloudinary if exists
    if (gearPick.image?.publicId) {
      try {
        await cloudinary.uploader.destroy(gearPick.image.publicId);
      } catch (cloudinaryError) {
        console.error("Cloudinary deletion error:", cloudinaryError);
        // Continue with database deletion even if Cloudinary fails
      }
    }

    // Delete from database
    await GearPick.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Gear pick deleted successfully",
      data: { _id: req.params.id },
    });
  } catch (error) {
    console.error("Delete gear pick error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Get single gear pick by ID
// @route   GET /api/gear-picks/:id
// @access  Public
export const getGearPickById = async (req, res) => {
  try {
    const gearPick = await GearPick.findById(req.params.id)
      .populate("userId", "username email")
      .populate("voteHistory.userId", "username")
      .lean();

    if (!gearPick) {
      return res.status(404).json({
        success: false,
        message: "Gear pick not found",
      });
    }

    // Ensure images array is populated
    if ((!gearPick.images || gearPick.images.length === 0) && gearPick.image && gearPick.image.url) {
      gearPick.images = [gearPick.image];
    }

    res.json({
      success: true,
      data: gearPick,
    });
  } catch (error) {
    console.error("Get gear pick by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
