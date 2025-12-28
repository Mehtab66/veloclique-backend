import Shop from "../models/shop.model.js";

/**
 * Get shop profile for a specific owner
 * @param {string} ownerId - The ID of the user who owns the shop
 * @returns {Promise<Object>} The shop object
 */
export const getShopByOwner = async (ownerId) => {
    console.log("Service getShopByOwner called with:", ownerId);
    const shop = await Shop.findOne({ ownerId }).populate("ownerId", "name email");
    if (!shop) {
        console.log("No shop found for ownerId:", ownerId);
        throw new Error("Shop not found for this owner");
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
