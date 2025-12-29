import mongoose from "mongoose";
import dotenv from "dotenv";
import Route from "../models/route.model.js";
import User from "../models/user.model.js";

dotenv.config();

const routes = [
    {
        title: "Griffith Park + LA River",
        location: "Los Angeles, CA",
        distance: "22.4 mi",
        type: "Road",
        elevationGain: "1,720 ft",
        description: "Most saved Strava route in SoCal this month",
        routeLink: "https://www.strava.com/segments/966059",
        region: "West",
        isPopular: true,
    },
    {
        title: "Pacific Coast Highway",
        location: "Big Sur, CA",
        distance: "69.56 mi",
        type: "Road",
        elevationGain: "5,984 ft",
        description: "World's most scenic coastal route",
        routeLink: "https://www.strava.com/routes/3184819",
        region: "West",
        isPopular: true,
    },
    {
        title: "Sedona Red Rock Loop",
        location: "Sedona, AZ",
        distance: "28 mi",
        type: "Road/Gravel",
        elevationGain: "2,100 ft",
        description: "Bucket-list red rock scenery",
        routeLink: "https://www.google.com/maps/search/sedona+red+rock+loop", // Placeholder link
        region: "West",
        isPopular: true,
    },
    {
        title: "Enchanted Circle",
        location: "Taos, NM",
        distance: "84 mi",
        type: "Road",
        elevationGain: "4,800 ft",
        description: "Classic NM Century; Wheeler Peak",
        routeLink: "https://www.google.com/maps/search/enchanted+circle+taos", // Placeholder
        region: "West",
        isPopular: true,
    },
    {
        title: "Zion National Park",
        location: "Springdale, UT",
        distance: "12 mi",
        type: "Road",
        elevationGain: "1,200 ft",
        description: "Scenic canyon; car-free option",
        routeLink: "https://www.google.com/maps/search/zion+national+park+bike", // Placeholder
        region: "West",
        isPopular: true,
    },
    {
        title: "Mauna Kea Summit",
        location: "Big Island, HI",
        distance: "42 mi",
        type: "Road/Gravel/Epic climb",
        elevationGain: "11,200 ft",
        description: "The highest paved road in the Pacific",
        routeLink: "https://www.google.com/maps/search/mauna+kea+summit", // Placeholder
        region: "West",
        isPopular: true,
    },
    {
        title: "San Juan Islands Loop",
        location: "Anacortes, WA",
        distance: "32 mi",
        type: "Road",
        elevationGain: "1,850 ft",
        description: "Pacific NW gem; whale watching",
        routeLink: "https://www.google.com/maps/search/san+juan+islands+loop", // Placeholder
        region: "West",
        isPopular: true,
    },
    {
        title: "Angeles Crest Highway",
        location: "La Cañada, CA",
        distance: "66 mi",
        type: "Road/Epic climb",
        elevationGain: "9,400 ft",
        description: "LA mountain escape; 7,900 ft",
        routeLink: "https://www.google.com/maps/search/angeles+crest+highway", // Placeholder
        region: "West",
        isPopular: true,
    },
    {
        title: "Moab White Rim Trail",
        location: "Moab, UT",
        distance: "100 mi",
        type: "Gravel",
        elevationGain: "5,500 ft",
        description: "Bucket-list desert ride",
        routeLink: "https://www.google.com/maps/search/moab+white+rim+trail", // Placeholder
        region: "West",
        isPopular: true,
    },
    {
        title: "Coronado Island Loop",
        location: "San Diego, CA",
        distance: "24 mi",
        type: "Road",
        elevationGain: "280 ft",
        description: "Flat beachside; beginner-friendly",
        routeLink: "https://www.google.com/maps/search/coronado+island+loop", // Placeholder
        region: "West",
        isPopular: true,
    },
];

const seedRoutes = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB...");

        // Find an admin user or any user to assign these routes to
        // Ideally, there should be an 'admin' user. We'll pick the first user found or create a dummy one if needed.
        // For safety, let's try to find a user with "admin" in email, or just the first user.
        let user = await User.findOne({ email: { $regex: /admin/i } });
        if (!user) {
            user = await User.findOne({});
        }

        if (!user) {
            console.log("No user found to assign routes to. Please create a user first.");
            process.exit(1);
        }

        console.log(`Assigning routes to user: ${user.email} (${user._id})`);

        const routesWithUser = routes.map(route => ({
            ...route,
            userId: user._id,
            status: "pending", // Set to pending so they show up in approval queue
            // We can add a placeholder image if needed, or leave it blank
            image: {
                url: "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg", // Generic placeholder
                publicId: "sample"
            }
        }));

        await Route.insertMany(routesWithUser);
        console.log("Routes seeded successfully!");

        process.exit(0);
    } catch (error) {
        console.error("Error seeding routes:", error);
        process.exit(1);
    }
};

seedRoutes();
