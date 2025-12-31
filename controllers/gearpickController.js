import GearPick from "../models/gearpick.model.js";
import cloudinary from "../config/cloudinary.js";

// Helper function to parse boolean values from form data
const parseBoolean = (value) => {
  if (value === undefined || value === null) return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lowerCaseValue = value.toLowerCase();
    return lowerCaseValue === 'true';
  }
  return false;
};

// @desc    Submit a new gear pick
// @route   POST /api/gear-picks
// @access  Private
export const submitGearPick = async (req, res) => {
  try {
    console.log('\n📥 === CREATING GEAR PICK ===');
    console.log('Request body exists:', !!req.body);
    console.log('Request body:', req.body ? JSON.stringify(req.body, null, 2) : 'req.body is undefined');
    // Handle both req.file (single) and req.files (any)
    const imageFile = req.file || (req.files && req.files.find(f => f.fieldname === 'image'));
    console.log('Request file:', imageFile ? {
      originalname: imageFile.originalname,
      mimetype: imageFile.mimetype,
      size: imageFile.size,
      fieldname: imageFile.fieldname
    } : 'No file');
    console.log('All files:', req.files ? req.files.map(f => ({ fieldname: f.fieldname, originalname: f.originalname })) : 'No files array');
    console.log('Content-Type:', req.headers['content-type']);

    // Safety check: if req.body is undefined, return error
    if (!req.body || typeof req.body !== 'object') {
      console.error('❌ ERROR: req.body is undefined or not an object.');
      console.error('req.body type:', typeof req.body);
      console.error('req.body value:', req.body);
      return res.status(400).json({
        success: false,
        message: "Request body is missing. Please ensure the request is sent as multipart/form-data.",
      });
    }

    // Safely extract values with defaults
    const gearName = req.body.gearName || '';
    const category = req.body.category || '';
    const productLink = req.body.productLink || '';
    const recommendation = req.body.recommendation || '';
    const isAdmin = req.body.isAdmin;
    const status = req.body.status;
    const userId = req.body.userId;

    // Validate required fields
    if (!gearName || !category || !recommendation) {
      console.error('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        message: "Gear name, category, and recommendation are required",
      });
    }

    // Determine if this is an admin-created gear pick
    // PRIMARY CHECK: If user is admin (from req.user.role), ALWAYS approve
    // SECONDARY CHECK: If isAdmin flag is present OR status is explicitly 'approved', set to approved
    const isUserAdmin = req.user?.role === 'admin';
    const isAdminGearPick = isUserAdmin || parseBoolean(isAdmin);
    const hasApprovedStatus = parseBoolean(status);
    const gearPickStatus = (isAdminGearPick || hasApprovedStatus) ? 'approved' : 'pending';

    console.log('Gear pick creation - Admin check:', {
      userRole: req.user?.role,
      isUserAdmin,
      isAdmin,
      isAdminGearPick,
      status,
      gearPickStatus,
      userId: userId || req.user?._id
    });

    // Handle image upload if provided
    let imageData = null;
    if (imageFile) {
      console.log('📤 === UPLOADING IMAGE TO CLOUDINARY ===');
      try {
        const uploadResult = await cloudinary.uploader.upload(
          `data:${imageFile.mimetype};base64,${imageFile.buffer.toString("base64")}`,
          {
            folder: "veloclique/gearpicks",
            resource_type: "image",
          }
        );
        imageData = {
          publicId: uploadResult.public_id,
          url: uploadResult.secure_url,
        };
        console.log('✅ Image uploaded:', {
          publicId: imageData.publicId,
          url: imageData.url
        });
      } catch (imageError) {
        console.error('❌ Image upload error:', imageError);
        // Continue without image if upload fails
      }
    }

    // Use userId from body (for admin) or from authenticated user
    const finalUserId = userId || req.user._id;

    const gearPickData = {
      gearName,
      category,
      productLink: productLink || "",
      recommendation,
      userId: finalUserId,
      status: gearPickStatus,
      image: imageData,
    };

    console.log('\n📤 === SAVING TO DATABASE ===');
    console.log('Gear pick data being saved:', JSON.stringify(gearPickData, null, 2));
    console.log('Gear pick data summary:', {
      gearName: gearPickData.gearName,
      category: gearPickData.category,
      status: gearPickData.status,
      userId: gearPickData.userId,
      hasImage: !!gearPickData.image?.url
    });

    // FINAL CHECK: Ensure admin gear picks are ALWAYS approved
    if (isAdminGearPick && gearPickData.status !== 'approved') {
      console.warn('⚠️ WARNING: Admin gear pick but status is not approved! Forcing to approved.');
      gearPickData.status = 'approved';
    }

    const gearPick = new GearPick(gearPickData);
    const createdGearPick = await gearPick.save();

    console.log('\n✅ === GEAR PICK SAVED TO DATABASE ===');
    console.log('Gear pick ID:', createdGearPick._id);
    console.log('Gear pick status:', createdGearPick.status, '(expected: approved for admin)');
    console.log('Full gear pick object:', JSON.stringify(createdGearPick.toObject(), null, 2));

    // Verify the saved values match what we intended
    if (isAdminGearPick && createdGearPick.status !== 'approved') {
      console.error('❌ ERROR: Gear pick was created with pending status despite being admin gear pick!');
      console.error('Expected: approved, Got:', createdGearPick.status);
    }

    // Populate userId to match the expected response format
    await createdGearPick.populate("userId", "username email");

    console.log('\n📤 === SENDING RESPONSE TO CLIENT ===');
    console.log('Response data:', JSON.stringify({
      success: true,
      message: "Gear pick submitted successfully",
      data: {
        _id: createdGearPick._id,
        gearName: createdGearPick.gearName,
        status: createdGearPick.status
      }
    }, null, 2));

    res.status(201).json({
      success: true,
      message: "Gear pick submitted successfully",
      data: createdGearPick,
    });
  } catch (error) {
    console.error('\n❌ === SUBMIT GEAR PICK ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Request body that caused error:', JSON.stringify(req.body, null, 2));
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Get all gear picks with filtering and sorting
// @route   GET /api/gear-picks
// @access  Public
export const getGearPicks = async (req, res) => {
  try {
    console.log('\n📥 === FETCHING GEAR PICKS FROM DATABASE ===');
    console.log('Request user:', req.user ? { id: req.user._id, role: req.user.role } : 'No user (public)');
    
    const {
      category = "All",
      sort = "Most Voted",
      page = 1,
      limit = 20,
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

    console.log('Database query:', JSON.stringify(query, null, 2));
    console.log('Query explanation:', req.user?.role === "admin" 
      ? "Admin user - can see pending/rejected if specified, otherwise approved"
      : "Public/Non-admin - fetching only APPROVED gear picks");

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
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Execute query
    const gearPicks = await GearPick.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .populate("userId", "username");

    const total = await GearPick.countDocuments(query);

    console.log('✅ Gear picks fetched from database:', gearPicks.length, 'gear picks');
    console.log('Gear picks summary:', gearPicks.map(gp => ({
      id: gp._id,
      gearName: gp.gearName,
      category: gp.category,
      status: gp.status,
      votes: gp.votes,
      createdAt: gp.createdAt
    })));

    console.log('\n📤 === SENDING GEAR PICKS TO CLIENT ===');
    console.log('Total gear picks:', total);
    console.log('Current page:', pageNum);
    console.log('Total pages:', Math.ceil(total / limitNum));

    res.json({
      success: true,
      count: gearPicks.length,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      data: gearPicks,
    });
  } catch (error) {
    console.error('\n❌ === GET GEAR PICKS ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Get gear picks for admin (all statuses)
// @route   GET /api/gear-picks/admin/all
// @access  Admin
export const getGearPicksForAdmin = async (req, res) => {
  try {
    console.log('\n📥 === FETCHING GEAR PICKS FOR ADMIN ===');
    console.log('Request user:', req.user ? { id: req.user._id, role: req.user.role } : 'No user');
    
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

    console.log('Database query:', JSON.stringify(query, null, 2));

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
      .populate("voteHistory.userId", "username");

    const total = await GearPick.countDocuments(query);

    console.log('✅ Gear picks fetched for admin:', gearPicks.length, 'gear picks');
    console.log('Gear picks summary:', gearPicks.map(gp => ({
      id: gp._id,
      gearName: gp.gearName,
      category: gp.category,
      status: gp.status,
      votes: gp.votes,
      createdAt: gp.createdAt
    })));

    console.log('\n📤 === SENDING GEAR PICKS TO ADMIN CLIENT ===');
    console.log('Total gear picks:', total);
    console.log('Current page:', pageNum);
    console.log('Total pages:', Math.ceil(total / limitNum));

    res.json({
      success: true,
      count: gearPicks.length,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      data: gearPicks,
    });
  } catch (error) {
    console.error('\n❌ === ADMIN GET GEAR PICKS ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Approve or reject gear pick
// @route   PUT /api/gear-picks/:id/status
// @access  Admin
export const updateGearPickStatus = async (req, res) => {
  try {
    console.log('\n📥 === UPDATING GEAR PICK STATUS ===');
    console.log('Gear pick ID:', req.params.id);
    console.log('New status:', req.body.status);
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    const { status } = req.body;

    // Validate status
    if (!["approved", "rejected"].includes(status)) {
      console.error('❌ Invalid status:', status);
      return res.status(400).json({
        success: false,
        message: 'Status must be either "approved" or "rejected"',
      });
    }

    console.log('📥 === FETCHING GEAR PICK FROM DATABASE ===');
    const gearPick = await GearPick.findById(req.params.id);

    if (!gearPick) {
      console.error('❌ Gear pick not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: "Gear pick not found",
      });
    }

    console.log('Current gear pick:', {
      id: gearPick._id,
      gearName: gearPick.gearName,
      status: gearPick.status
    });

    // Update status
    console.log('📤 === UPDATING STATUS IN DATABASE ===');
    console.log('Update query:', { _id: req.params.id, status });
    
    gearPick.status = status;
    const updatedGearPick = await gearPick.save();

    console.log('✅ Gear pick updated in database:');
    console.log('Gear pick ID:', updatedGearPick._id);
    console.log('New status:', updatedGearPick.status);
    console.log('Updated gear pick:', JSON.stringify({
      _id: updatedGearPick._id,
      gearName: updatedGearPick.gearName,
      status: updatedGearPick.status,
      votes: updatedGearPick.votes
    }, null, 2));

    res.json({
      success: true,
      message: `Gear pick ${status} successfully`,
      data: updatedGearPick,
    });
  } catch (error) {
    console.error('\n❌ === UPDATE GEAR PICK STATUS ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Gear pick ID:', req.params.id);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
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
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload an image",
      });
    }

    const gearPick = await GearPick.findById(req.params.id);

    if (!gearPick) {
      return res.status(404).json({
        success: false,
        message: "Gear pick not found",
      });
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(
      `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`,
      {
        folder: "veloclique/gearpicks",
        resource_type: "image",
      }
    );

    // Save image data
    gearPick.image = {
      publicId: result.public_id,
      url: result.secure_url,
    };

    await gearPick.save();

    res.json({
      success: true,
      message: "Image uploaded successfully",
      data: gearPick.image,
    });
  } catch (error) {
    console.error("Upload gear pick image error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
