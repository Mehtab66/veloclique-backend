import Location from "../models/location.model.js";
import Shop from "../models/shop.model.js";

const escapeForRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const toCaseInsensitiveRegex = (value = "") => {
  const decoded = decodeURIComponent(value)?.trim();
  if (!decoded) return null;
  return new RegExp(`^${escapeForRegex(decoded)}$`, "i");
};
//hello 
export const getStates = async (req, res) => {
  try {
    const states = await Location.aggregate([
      { $group: { _id: "$state", locations: { $sum: 1 } } },
      {
        $project: {
          _id: 0,
          state: "$_id",
          locations: "$locations",
        },
      },
      { $sort: { state: 1 } },
    ]);

    res.json({ states });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch states", error: error.message });
  }
};

export const getCountiesByState = async (req, res) => {
  try {
    const { state } = req.params;
    const matchState = toCaseInsensitiveRegex(state);

    if (!matchState) {
      return res.status(400).json({ message: "State parameter is required" });
    }

    const counties = await Location.aggregate([
      { $match: { state: matchState } },
      { $group: { _id: "$county", cities: { $addToSet: "$city" }, locations: { $sum: 1 } } },
      {
        $project: {
          _id: 0,
          county: "$_id",
          cityCount: { $size: "$cities" },
          locations: "$locations",
        },
      },
      { $sort: { county: 1 } },
    ]);

    res.json({ state: decodeURIComponent(state).trim(), counties });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch counties", error: error.message });
  }
};

export const getCitiesByStateAndCounty = async (req, res) => {
  try {
    const { state, county } = req.params;
    
    // Normalize state name - extract just the state name if it contains "County" or "City"
    // e.g., "Alaska County City" -> "Alaska"
    let normalizedState = decodeURIComponent(state).trim();
    if (normalizedState.includes('County') || normalizedState.includes('City')) {
      // Extract the first word (the actual state name)
      normalizedState = normalizedState.split(/\s+/)[0];
    }
    
    const matchState = toCaseInsensitiveRegex(normalizedState);
    const matchCounty = toCaseInsensitiveRegex(county);

    if (!matchState || !matchCounty) {
      return res.status(400).json({ message: "State and county parameters are required" });
    }

    // Get cities from Location model
    // Try to match with normalized state first, but also check if Location has original state name
    const originalStateRegex = toCaseInsensitiveRegex(decodeURIComponent(state).trim());
    const cities = await Location.aggregate([
      { 
        $match: { 
          $or: [
            { state: matchState },
            { state: originalStateRegex }
          ],
          county: matchCounty 
        } 
      },
      {
        $group: {
          _id: "$city",
          zipCodes: { $addToSet: "$zipCode" },
          types: { $addToSet: "$cityType" },
        },
      },
      {
        $project: {
          _id: 0,
          city: "$_id",
          zipCodes: 1,
          cityTypes: {
            $filter: {
              input: "$types",
              as: "type",
              cond: { $ne: ["$$type", ""] },
            },
          },
        },
      },
      { $sort: { city: 1 } },
    ]);

    // Get shop counts for each city from Shop model
    const shopCounts = await Shop.aggregate([
      { $match: { state: matchState } },
      { $group: { _id: "$city", shops: { $sum: 1 } } },
      {
        $project: {
          _id: 0,
          city: "$_id",
          shops: 1,
        },
      },
    ]);

    // Create a case-insensitive map of city to shop count
    const shopCountMap = {};
    shopCounts.forEach((item) => {
      if (item.city) {
        // Use lowercase key for case-insensitive matching, normalize spaces
        const cityKey = item.city.toLowerCase().trim().replace(/\s+/g, ' ');
        shopCountMap[cityKey] = (shopCountMap[cityKey] || 0) + item.shops;
      }
    });

    // Add shop counts to cities (case-insensitive matching with normalized spaces)
    const citiesWithShops = cities.map((city) => {
      if (!city.city) {
        return { ...city, shops: 0 };
      }
      
      // Normalize city name for matching: lowercase, trim, normalize spaces
      const cityKey = city.city.toLowerCase().trim().replace(/\s+/g, ' ');
      const shopCount = shopCountMap[cityKey] || 0;
      
      return {
        ...city,
        shops: shopCount,
      };
    });

    res.json({
      state: normalizedState,
      county: decodeURIComponent(county).trim(),
      cities: citiesWithShops,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch cities", error: error.message });
  }
};

