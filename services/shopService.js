import Shop from "../models/shop.model.js";

/**
 * Get shop profile for a specific owner
 * @param {string} ownerId - The ID of the user who owns the shop
 * @returns {Promise<Object>} The shop object
 */
export const getShopByOwner = async (ownerId) => {
    console.log("Service getShopByOwner called with:", ownerId);
    // Determine strictness or assume schema might miss ownerId
    // We use $or to find it if it exists under either field
    let shop = await Shop.findOne({
        $or: [{ owner: ownerId }, { ownerId: ownerId }]
    }).populate("owner", "name email");

    if (!shop) {
        console.log("No shop found for ownerId:", ownerId);
        throw new Error("Shop not found for this owner");
    }

    // Lazy migration: If we found it but 'owner' is not set (meaning it was found via ownerId legacy field)
    if (!shop.owner) {
        console.log("Lazy Migration: Checking for legacy ownerId on shop:", shop._id);
        // Since ownerId is not in schema, use get() or direct assignment if strict is false-ish
        // Better: Just blindly set 'owner' to the ownerId we searched for
        shop.owner = ownerId;
        // We can attempts to un-set ownerId too if we want, but might require schema change to really delete it if strict.
        // For now, just ensuring 'owner' is set is enough.
        await shop.save();
        console.log("Lazy Migration: Updated shop owner field.");
    }

    console.log("Shop found:", shop._id);
    return shop;
};

/**
 * Update shop profile data
 * @param {string} shopId - The ID of the shop to update
 * @param {Object} updateData - The data to update
 * @returns {Promise<Object>} The updated shop object
 */
export const updateShop = async (shopId, updateData) => {
    const shop = await Shop.findById(shopId);
    if (!shop) throw new Error("Shop not found");

    // Update allowed fields
    const allowedFields = [
        "name",
        "fullAddress",
        "streetAddress",
        "city",
        "state",
        "zip",
        "phone",
        "website",
        "email",
        "firstCategory",
        "secondCategory",
        "hours",
        "hoursByDay",
        "socialMedia",
        "imageUrl",
        "description",
    ];

    allowedFields.forEach((field) => {
        if (updateData[field] !== undefined) {
            shop[field] = updateData[field];
        }
    });

    await shop.save();
    return shop;
};

/**
 * Update shop operating hours
 * @param {string} shopId 
 * @param {Object} hoursByDay 
 */
export const updateShopHours = async (shopId, hoursByDay) => {
    const shop = await Shop.findById(shopId);
    if (!shop) throw new Error("Shop not found");

    if (hoursByDay) {
        shop.hoursByDay = { ...shop.hoursByDay, ...hoursByDay };
    }

    await shop.save();
    return shop;
};

/**
 * Update shop social media links
 * @param {string} shopId 
 * @param {Object} socialMedia 
 */
export const updateShopSocialMedia = async (shopId, socialMedia) => {
    const shop = await Shop.findById(shopId);
    if (!shop) throw new Error("Shop not found");

    if (socialMedia) {
        shop.socialMedia = { ...shop.socialMedia, ...socialMedia };
    }

    await shop.save();
    return shop;
};

/**
 * Request email change for a shop (Generate OTP)
 * @param {string} shopId 
 * @param {string} newEmail 
 */
export const requestEmailChange = async (shopId, newEmail) => {
    const shop = await Shop.findById(shopId);
    if (!shop) throw new Error("Shop not found");

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    shop.emailChangeOTP = otp;
    shop.emailChangeOTPExpires = expiresAt;
    shop.newEmailPending = newEmail;

    await shop.save();

    return otp;
};

/**
 * Verify OTP and update shop email
 * @param {string} shopId 
 * @param {string} otp 
 */
export const verifyEmailChange = async (shopId, otp) => {
    const shop = await Shop.findById(shopId);
    if (!shop) throw new Error("Shop not found");

    if (
        shop.emailChangeOTP !== otp ||
        shop.emailChangeOTPExpires < Date.now()
    ) {
        throw new Error("Invalid or expired OTP");
    }

    // Update email and clear OTP fields
    const oldEmail = shop.email;
    shop.email = shop.newEmailPending;
    shop.emailChangeOTP = undefined;
    shop.emailChangeOTPExpires = undefined;
    shop.newEmailPending = undefined;

    await shop.save();

    return { shop, oldEmail, newEmail: shop.email };
};

/**
 * Request 2FA OTP for a shop
 * @param {string} shopId 
 */
export const requestShopTwoFactorOTP = async (shopId) => {
    const shop = await Shop.findById(shopId);
    if (!shop) throw new Error("Shop not found");

    if (shop.twoFactorEnabled) {
        throw new Error("Two-factor authentication is already enabled");
    }

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    shop.twoFactorOTP = otp;
    shop.twoFactorOTPExpires = expiresAt;

    await shop.save();

    return { otp, email: shop.email };
};

/**
 * Verify 2FA OTP and Enable for Shop
 * @param {string} shopId 
 * @param {string} otp 
 */
export const verifyShopTwoFactorOTP = async (shopId, otp) => {
    const shop = await Shop.findById(shopId);
    if (!shop) throw new Error("Shop not found");

    if (
        !shop.twoFactorOTP ||
        shop.twoFactorOTP !== otp ||
        !shop.twoFactorOTPExpires ||
        shop.twoFactorOTPExpires < Date.now()
    ) {
        throw new Error("Invalid or expired OTP");
    }

    // Enable 2FA
    shop.twoFactorEnabled = true;
    shop.twoFactorOTP = undefined;
    shop.twoFactorOTPExpires = undefined;

    await shop.save();
    return shop;
};

/**
 * Toggle 2FA (mainly for disabling)
 * @param {string} shopId 
 * @param {boolean} enable 
 */
export const toggleShopTwoFactor = async (shopId, enable) => {
    const shop = await Shop.findById(shopId);
    if (!shop) throw new Error("Shop not found");

    if (enable) {
        shop.twoFactorEnabled = true;
    } else {
        shop.twoFactorEnabled = false;
        shop.twoFactorOTP = undefined;
        shop.twoFactorOTPExpires = undefined;
    }

    await shop.save();
    return shop;
};

/**
 * Get shop email preferences
 * @param {string} shopId - The ID of the shop
 * @returns {Promise<Object>} Email preferences object
 */
export const getShopEmailPreferences = async (shopId) => {
    const shop = await Shop.findById(shopId).select('emailPreferences');
    if (!shop) throw new Error('Shop not found');
    return shop.emailPreferences;
};

/**
 * Update shop email preferences
 * @param {string} shopId - The ID of the shop
 * @param {Object} preferences - Email preferences to update
 * @returns {Promise<Object>} Updated email preferences
 */
export const updateShopEmailPreferences = async (shopId, preferences) => {
    const shop = await Shop.findByIdAndUpdate(
        shopId,
        { emailPreferences: preferences },
        { new: true, runValidators: true }
    ).select('emailPreferences');

    if (!shop) throw new Error('Shop not found');
    return shop.emailPreferences;
};

/**
 * Update shop privacy settings
 * @param {string} shopId - The ID of the shop
 * @param {boolean} isPrivate - Whether the profile should be private
 * @returns {Promise<Object>} Updated shop object
 */
export const updateShopPrivacy = async (shopId, isPrivate) => {
    const shop = await Shop.findById(shopId);
    if (!shop) throw new Error('Shop not found');

    shop.isProfilePrivate = isPrivate;
    await shop.save();

    return shop;
};

/**
 * Request shop data export
 * @param {string} shopId - The ID of the shop
 * @returns {Promise<Object>} Shop data for export
 */
export const requestShopDataExport = async (shopId) => {
    const shop = await Shop.findById(shopId).populate('owner', 'name email');
    if (!shop) throw new Error('Shop not found');

    // Return shop data for export
    return {
        shop: {
            name: shop.name,
            email: shop.email,
            phone: shop.phone,
            website: shop.website,
            fullAddress: shop.fullAddress,
            streetAddress: shop.streetAddress,
            city: shop.city,
            state: shop.state,
            zip: shop.zip,
            country: shop.country,
            description: shop.description,
            hours: shop.hours,
            hoursByDay: shop.hoursByDay,
            socialMedia: shop.socialMedia,
            emailPreferences: shop.emailPreferences,
            subscription: shop.subscription,
            createdAt: shop.createdAt,
            updatedAt: shop.updatedAt,
        },
        owner: shop.owner ? {
            name: shop.owner.name,
            email: shop.owner.email,
        } : null,
        exportedAt: new Date().toISOString(),
    };
};

/**
 * Request shop deletion (Generate OTP)
 * @param {string} shopId - The ID of the shop
 * @returns {Promise<Object>} OTP and email for sending
 */
export const requestShopDelete = async (shopId) => {
    const shop = await Shop.findById(shopId);
    if (!shop) throw new Error('Shop not found');

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    shop.deleteOTP = otp;
    shop.deleteOTPExpires = expiresAt;

    await shop.save();

    return { otp, email: shop.email, shopName: shop.name };
};

/**
 * Verify OTP and delete shop
 * @param {string} shopId - The ID of the shop
 * @param {string} otp - The OTP to verify
 * @returns {Promise<Object>} Deleted shop info
 */
export const verifyShopDelete = async (shopId, otp) => {
    const shop = await Shop.findById(shopId);
    if (!shop) throw new Error('Shop not found');

    if (
        !shop.deleteOTP ||
        shop.deleteOTP !== otp ||
        !shop.deleteOTPExpires ||
        shop.deleteOTPExpires < Date.now()
    ) {
        throw new Error('Invalid or expired OTP');
    }

    const shopName = shop.name;
    const shopEmail = shop.email;

    // Delete the shop
    await Shop.findByIdAndDelete(shopId);

    return { shopName, shopEmail, deletedAt: new Date().toISOString() };
};
