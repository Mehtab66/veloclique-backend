import Route from "../models/route.model.js";
import cloudinary from "../config/cloudinary.js";
import mongoose from "mongoose";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/* ---------------- CREATE ROUTE ---------------- */
// POST /api/routes
export const createRoute = async (req, res) => {
  try {
    // Log the entire request body to see what we're receiving
    console.log('=== REQUEST BODY ===');
    console.log('req.body:', JSON.stringify(req.body, null, 2));
    console.log('req.body keys:', Object.keys(req.body));
    
    // Read values directly from req.body (multer parses FormData fields as strings)
    const title = req.body.title;
    const location = req.body.location;
    const routeLink = req.body.routeLink;
    const userId = req.body.userId;
    const isAdmin = req.body.isAdmin;
    const status = req.body.status;
    const isFeatured = req.body.isFeatured;
    const isPopular = req.body.isPopular;
    const distance = req.body.distance;
    const type = req.body.type;
    const elevationGain = req.body.elevationGain;
    const description = req.body.description;
    
    console.log('Raw values from req.body:');
    console.log('isAdmin:', isAdmin, 'type:', typeof isAdmin);
    console.log('isFeatured:', isFeatured, 'type:', typeof isFeatured);
    console.log('isPopular:', isPopular, 'type:', typeof isPopular);
    console.log('status:', status, 'type:', typeof status);

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

    // Determine route status: admin routes are auto-approved, regular routes are pending
    // PRIMARY CHECK: If user is admin (from req.user.role), ALWAYS approve
    // SECONDARY CHECK: If isAdmin flag is present OR status is explicitly 'approved', set to approved
    // Admin routes should NEVER be pending - they are created directly by admin
    const isUserAdmin = req.user?.role === 'admin';
    const isAdminRoute = isUserAdmin || (isAdmin === 'true' || isAdmin === true || isAdmin === 'True' || isAdmin === 'TRUE');
    const hasApprovedStatus = (status === 'approved' || status === 'Approved' || status === 'APPROVED');
    
    // FORCE approved status for admin routes - never pending
    // If user is admin OR isAdmin flag is set OR status is explicitly approved, set to approved
    const routeStatus = isAdminRoute ? 'approved' : (hasApprovedStatus ? 'approved' : 'pending');
    
    console.log('Route creation - Admin check:', {
      userRole: req.user?.role,
      isUserAdmin,
      isAdmin,
      isAdminType: typeof isAdmin,
      isAdminRoute,
      status,
      statusType: typeof status,
      hasApprovedStatus,
      routeStatus,
      'Will be approved?': routeStatus === 'approved'
    });

    // Build route data object
    const routeData = {
      title,
      location,
      routeLink,
      image: imageData,
      userId,
      status: routeStatus, // Admin routes are auto-approved
    };

    // Add optional fields
    if (distance) routeData.distance = distance;
    if (type) routeData.type = type;
    if (elevationGain) routeData.elevationGain = elevationGain;
    if (description) routeData.description = description;

    // Add isFeatured and isPopular flags - explicitly set to boolean based on user selection
    // Parse string 'true'/'false' or boolean true/false
    // If user selected 'featured', isFeatured=true, isPopular=false
    // If user selected 'popular', isFeatured=false, isPopular=true
    // Handle various string formats: 'true', 'True', 'TRUE', true (boolean), or any truthy value
    const parseBoolean = (value) => {
      // Handle undefined/null
      if (value === undefined || value === null || value === '') {
        console.log('parseBoolean: value is undefined/null/empty, returning false');
        return false;
      }
      
      // Handle boolean
      if (typeof value === 'boolean') {
        console.log('parseBoolean: boolean value', value);
        return value;
      }
      
      // Handle string - multer sends FormData fields as strings
      if (typeof value === 'string') {
        const lowerValue = value.toLowerCase().trim();
        const result = (lowerValue === 'true' || lowerValue === '1');
        console.log('parseBoolean: string value', value, '->', lowerValue, '->', result);
        return result;
      }
      
      // Default to false if unclear
      console.log('parseBoolean: unclear value', value, 'type:', typeof value, 'returning false');
      return false;
    };
    
    // Parse the boolean values - ensure they're explicitly set
    console.log('=== PARSING BOOLEAN VALUES ===');
    const parsedIsFeatured = parseBoolean(isFeatured);
    const parsedIsPopular = parseBoolean(isPopular);
    
    console.log('Parsed results:', {
      isFeaturedRaw: isFeatured,
      isFeaturedParsed: parsedIsFeatured,
      isPopularRaw: isPopular,
      isPopularParsed: parsedIsPopular
    });
    
    // ALWAYS set these values explicitly (don't rely on defaults)
    routeData.isFeatured = parsedIsFeatured;
    routeData.isPopular = parsedIsPopular;
    
    // Log for debugging
    console.log('Creating route with:', {
      isAdmin,
      isAdminRoute,
      status: routeStatus,
      isFeatured: routeData.isFeatured,
      isPopular: routeData.isPopular,
      isFeaturedRaw: isFeatured,
      isPopularRaw: isPopular,
      isFeaturedType: typeof isFeatured,
      isPopularType: typeof isPopular,
      parsedIsFeatured: parsedIsFeatured,
      parsedIsPopular: parsedIsPopular
    });
    
    console.log('=== FINAL ROUTE DATA BEFORE SAVE ===');
    console.log(JSON.stringify(routeData, null, 2));
    console.log('RouteData status:', routeData.status, '(should be "approved" for admin)');
    console.log('RouteData isFeatured:', routeData.isFeatured, typeof routeData.isFeatured, '(should be true if featured selected)');
    console.log('RouteData isPopular:', routeData.isPopular, typeof routeData.isPopular, '(should be true if popular selected)');

    // FINAL CHECK: Ensure admin routes are ALWAYS approved
    if (isAdminRoute && routeData.status !== 'approved') {
      console.warn('⚠️ WARNING: Admin route but status is not approved! Forcing to approved.');
      routeData.status = 'approved';
    }

    console.log('\n📤 === SAVING TO DATABASE ===');
    console.log('Route data being saved:', JSON.stringify(routeData, null, 2));
    console.log('Route data summary:', {
      title: routeData.title,
      location: routeData.location,
      status: routeData.status,
      isFeatured: routeData.isFeatured,
      isPopular: routeData.isPopular,
      userId: routeData.userId,
      hasImage: !!routeData.image?.url
    });

    const route = await Route.create(routeData);
    
    console.log('\n✅ === ROUTE SAVED TO DATABASE ===');
    console.log('Route ID:', route._id);
    console.log('Route status:', route.status, '(expected: approved for admin)');
    console.log('Route isFeatured:', route.isFeatured, typeof route.isFeatured);
    console.log('Route isPopular:', route.isPopular, typeof route.isPopular);
    console.log('Full route object:', JSON.stringify(route.toObject(), null, 2));
    
    // Verify the saved values match what we intended
    if (isAdminRoute && route.status !== 'approved') {
      console.error('❌ ERROR: Route was created with pending status despite being admin route!');
      console.error('Expected: approved, Got:', route.status);
    }
    if (parsedIsFeatured && !route.isFeatured) {
      console.error('❌ ERROR: isFeatured was true but saved as false!');
      console.error('Expected: true, Got:', route.isFeatured);
    }
    if (parsedIsPopular && !route.isPopular) {
      console.error('❌ ERROR: isPopular was true but saved as false!');
      console.error('Expected: true, Got:', route.isPopular);
    }

    // Populate userId to match the expected response format
    await route.populate("userId", "name email");

    console.log('\n📤 === SENDING RESPONSE TO CLIENT ===');
    console.log('Response data:', JSON.stringify({
      success: true,
      message: "Route uploaded successfully",
      data: {
        _id: route._id,
        title: route.title,
        status: route.status,
        isFeatured: route.isFeatured,
        isPopular: route.isPopular
      }
    }, null, 2));

    res.status(201).json({
      success: true,
      message: "Route uploaded successfully",
      data: route,
    });
  } catch (error) {
    console.error('\n❌ === CREATE ROUTE ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Request body that caused error:', JSON.stringify(req.body, null, 2));
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

/* ---------------- GET ROUTES (PUBLIC) ---------------- */
// GET /api/routes
export const getRoutes = async (req, res) => {
  try {
    console.log('\n📥 === FETCHING ROUTES FROM DATABASE ===');
    console.log('Request user:', req.user ? { id: req.user._id, role: req.user.role } : 'No user (public)');
    
    // If user is admin, return all routes; otherwise only approved
    const query = req.user?.role === "admin" ? {} : { status: "approved" };
    
    console.log('Database query:', JSON.stringify(query, null, 2));
    console.log('Query explanation:', req.user?.role === "admin" 
      ? "Admin user - fetching ALL routes (pending, approved, rejected)"
      : "Public/Non-admin - fetching only APPROVED routes");
    
    const routes = await Route.find(query)
      .sort({ createdAt: -1 })
      .populate("userId", "name email");

    console.log('✅ Routes fetched from database:', routes.length, 'routes');
    console.log('Routes summary:', routes.map(r => ({
      id: r._id,
      title: r.title,
      status: r.status,
      isFeatured: r.isFeatured,
      isPopular: r.isPopular,
      createdAt: r.createdAt
    })));
    
    console.log('\n📤 === SENDING ROUTES TO CLIENT ===');
    console.log('Total routes:', routes.length);
    console.log('Response success: true');

    res.json({
      success: true,
      data: routes,
    });
  } catch (error) {
    console.error('\n❌ === GET ROUTES ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

/* ---------------- GET POPULAR ROUTES ---------------- */
// GET /api/routes/popular
export const getPopularRoutes = async (req, res) => {
  try {
    console.log('\n📥 === FETCHING POPULAR ROUTES FROM DATABASE ===');
    const { region } = req.query;
    const query = { status: "approved", isPopular: true };

    if (region) {
      query.region = region;
      console.log('Filtering by region:', region);
    }

    console.log('Database query:', JSON.stringify(query, null, 2));
    
    const routes = await Route.find(query)
      .sort({ createdAt: -1 })
      .populate("userId", "name email");

    console.log('✅ Popular routes fetched:', routes.length, 'routes');
    console.log('Popular routes summary:', routes.map(r => ({
      id: r._id,
      title: r.title,
      isPopular: r.isPopular,
      region: r.region
    })));

    res.json({
      success: true,
      data: routes,
    });
  } catch (error) {
    console.error('\n❌ === GET POPULAR ROUTES ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

/* ---------------- ADMIN: UPDATE STATUS ---------------- */
// PUT /api/routes/:id/status
export const updateRouteStatus = async (req, res) => {
  try {
    console.log('\n📥 === UPDATING ROUTE STATUS ===');
    console.log('Route ID:', req.params.id);
    console.log('New status:', req.body.status);
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    const { status } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      console.error('❌ Invalid status:', status);
      return res.status(400).json({
        success: false,
        message: "Status must be approved or rejected",
      });
    }

    console.log('📤 === UPDATING IN DATABASE ===');
    console.log('Update query:', { _id: req.params.id, status });

    const route = await Route.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate("userId", "name email");

    if (!route) {
      console.error('❌ Route not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: "Route not found",
      });
    }

    console.log('✅ Route updated in database:');
    console.log('Route ID:', route._id);
    console.log('New status:', route.status);
    console.log('Updated route:', JSON.stringify({
      _id: route._id,
      title: route.title,
      status: route.status,
      isFeatured: route.isFeatured,
      isPopular: route.isPopular
    }, null, 2));

    res.json({
      success: true,
      message: `Route ${status}`,
      data: route,
    });
  } catch (error) {
    console.error('\n❌ === UPDATE ROUTE STATUS ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Route ID:', req.params.id);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

/* ---------------- ADMIN: UPLOAD IMAGE ---------------- */
// PUT /api/routes/:id/image
export const uploadRouteImage = async (req, res) => {
  try {
    console.log('\n📥 === UPLOADING ROUTE IMAGE ===');
    console.log('Route ID:', req.params.id);
    console.log('File received:', req.file ? {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    } : 'No file');

    if (!req.file) {
      console.error('❌ No image file provided');
      return res.status(400).json({
        success: false,
        message: "No image file provided",
      });
    }

    console.log('📥 === FETCHING ROUTE FROM DATABASE ===');
    const route = await Route.findById(req.params.id);

    if (!route) {
      console.error('❌ Route not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: "Route not found",
      });
    }

    console.log('Current route:', {
      id: route._id,
      title: route.title,
      hasImage: !!route.image?.url
    });

    console.log('📤 === UPLOADING TO CLOUDINARY ===');
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

    console.log('✅ Image uploaded to Cloudinary:', {
      publicId: imageData.publicId,
      url: imageData.url
    });

    // Update route image
    console.log('📤 === UPDATING ROUTE IMAGE IN DATABASE ===');
    route.image = imageData;
    await route.save();

    console.log('✅ Route image updated in database');

    // Populate userId to match the expected response format
    await route.populate("userId", "name email");

    res.json({
      success: true,
      message: "Route image uploaded successfully",
      data: route,
    });
  } catch (error) {
    console.error('\n❌ === UPLOAD ROUTE IMAGE ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Route ID:', req.params.id);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

/* ---------------- ADMIN: UPDATE ROUTE ---------------- */
// PUT /api/routes/:id
export const updateRoute = async (req, res) => {
  try {
    console.log('\n📥 === UPDATING ROUTE ===');
    console.log('Route ID:', req.params.id);
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    const { isFeatured, isPopular, distance, type, elevationGain, description } = req.body;

    console.log('📥 === FETCHING ROUTE FROM DATABASE ===');
    const route = await Route.findById(req.params.id);

    if (!route) {
      console.error('❌ Route not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: "Route not found",
      });
    }

    console.log('Current route data:', JSON.stringify({
      _id: route._id,
      title: route.title,
      status: route.status,
      isFeatured: route.isFeatured,
      isPopular: route.isPopular
    }, null, 2));

    // Update fields if provided
    const updates = {};
    if (isFeatured !== undefined) {
      const newIsFeatured = isFeatured === true || isFeatured === 'true';
      updates.isFeatured = newIsFeatured;
      console.log('Updating isFeatured:', route.isFeatured, '->', newIsFeatured);
    }
    if (isPopular !== undefined) {
      const newIsPopular = isPopular === true || isPopular === 'true';
      updates.isPopular = newIsPopular;
      console.log('Updating isPopular:', route.isPopular, '->', newIsPopular);
    }
    if (distance !== undefined) {
      updates.distance = distance;
      console.log('Updating distance:', route.distance, '->', distance);
    }
    if (type !== undefined) {
      updates.type = type;
      console.log('Updating type:', route.type, '->', type);
    }
    if (elevationGain !== undefined) {
      updates.elevationGain = elevationGain;
      console.log('Updating elevationGain:', route.elevationGain, '->', elevationGain);
    }
    if (description !== undefined) {
      updates.description = description;
      console.log('Updating description');
    }

    // Apply updates
    Object.assign(route, updates);

    console.log('\n📤 === SAVING UPDATES TO DATABASE ===');
    console.log('Updates being saved:', JSON.stringify(updates, null, 2));
    
    await route.save();

    // Populate userId to match the expected response format
    await route.populate("userId", "name email");

    console.log('✅ Route updated in database:');
    console.log('Updated route:', JSON.stringify({
      _id: route._id,
      title: route.title,
      status: route.status,
      isFeatured: route.isFeatured,
      isPopular: route.isPopular,
      distance: route.distance,
      type: route.type
    }, null, 2));

    res.json({
      success: true,
      message: "Route updated successfully",
      data: route,
    });
  } catch (error) {
    console.error('\n❌ === UPDATE ROUTE ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Route ID:', req.params.id);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};
