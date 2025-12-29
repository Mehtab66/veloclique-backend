import mongoose from "mongoose";
import dotenv from "dotenv";
import Route from "../models/route.model.js";
import User from "../models/user.model.js";

dotenv.config();

const featuredRoutes = [
    { title: "Hawk Hill", location: "Marin, CA", distance: "12.5 mi", type: "Road", elevationGain: "1,150 ft", description: "Most attempted Strava segment in SF Bay (500K+)", region: "West" },
    { title: "Hudson River Greenway", location: "New York, NY", distance: "11.2 mi", type: "Urban Trail", elevationGain: "150 ft", description: "NYC's most popular path; 100K+ monthly riders", region: "Northeast" },
    { title: "Lookout Mountain", location: "Golden, CO", distance: "4.3 mi", type: "Road Climb", elevationGain: "1,280 ft", description: "Colorado icon; USA Pro Challenge venue", region: "West" },
    { title: "Mercer Island Loop", location: "Seattle, WA", distance: "13.5 mi", type: "Road", elevationGain: "420 ft", description: "4.9 stars from 2,500+ riders", region: "Northwest" },
    { title: "Mt. Tamalpais", location: "Mill Valley, CA", distance: "22.8 mi", type: "Road/MTB", elevationGain: "2,580 ft", description: "Birthplace of mountain biking", region: "West" },
    { title: "Phil's Trail Complex", location: "Bend, OR", distance: "8.2 mi", type: "MTB", elevationGain: "650 ft", description: "#1 MTB trail system in Oregon", region: "Northwest" },
    { title: "Paris Mountain", location: "Greenville, SC", distance: "3.8 mi", type: "Road Climb", elevationGain: "1,100 ft", description: "USA Cycling Nationals course", region: "Southeast" },
    { title: "Sidewinder Trail", location: "Golden, CO", distance: "2.5 mi", type: "MTB", elevationGain: "380 ft", description: "Most popular MTB in Front Range", region: "West" },
    { title: "Death Valley to Whitney", location: "California", distance: "135 mi", type: "Epic Road", elevationGain: "14,500 ft", description: "Lowest to highest point in US", region: "West" },
    { title: "Crater Lake Rim Drive", location: "Oregon", distance: "33 mi", type: "Scenic", elevationGain: "3,800 ft", description: "Deepest lake; National Scenic Byway", region: "Northwest" }
];

const westRoutes = [
    { title: "Pacific Coast Highway", location: "Big Sur, CA", distance: "90 mi", type: "Road", elevationGain: "6,200 ft", description: "World's most scenic coastal route", region: "West" },
    { title: "Mt. Baldy via Glendora", location: "Angeles NF, CA", distance: "22.4 mi", type: "Road Climb", elevationGain: "4,850 ft", description: "Tour of California stage finish", region: "West" },
    { title: "Mulholland Drive", location: "Los Angeles, CA", distance: "21 mi", type: "Road", elevationGain: "2,100 ft", description: "Hollywood's famous cycling route", region: "West" },
    { title: "Marin Headlands Loop", location: "Sausalito, CA", distance: "18 mi", type: "Road", elevationGain: "2,060 ft", description: "Golden Gate Bridge crossing", region: "West" },
    { title: "Moab White Rim Trail", location: "Moab, UT", distance: "100 mi", type: "Gravel", elevationGain: "5,500 ft", description: "Bucket-list desert ride", region: "West" },
    { title: "Mauna Kea Summit", location: "Big Island, HI", distance: "42 mi", type: "Epic Climb", elevationGain: "11,200 ft", description: "Highest paved road in Pacific", region: "West" },
    { title: "Angeles Crest Highway", location: "La Cañada, CA", distance: "66 mi", type: "Road Climb", elevationGain: "9,400 ft", description: "LA mountain escape; 7,900 ft", region: "West" },
    { title: "Coronado Island Loop", location: "San Diego, CA", distance: "24 mi", type: "Road", elevationGain: "280 ft", description: "Flat beachside; beginner-friendly", region: "West" }
];

const northwestRoutes = [
    { title: "San Juan Islands Loop", location: "WA", distance: "32 mi", type: "Road", elevationGain: "1,850 ft", description: "Pacific NW gem; whale watching", region: "Northwest" },
    { title: "Cascade Lakes Byway", location: "Bend, OR", distance: "66 mi", type: "Road", elevationGain: "3,400 ft", description: "Volcanic lakes; Century classic", region: "Northwest" },
    { title: "Mercer Island Loop", location: "Seattle, WA", distance: "13.5 mi", type: "Road", elevationGain: "420 ft", description: "4.9 stars from 2,500+ riders", region: "Northwest" },
    { title: "Phil's Trail Complex", location: "Bend, OR", distance: "8.2 mi", type: "MTB", elevationGain: "650 ft", description: "#1 MTB trail system in Oregon", region: "Northwest" },
    { title: "Crater Lake Rim Drive", location: "Oregon", distance: "33 mi", type: "Scenic", elevationGain: "3,800 ft", description: "Deepest lake; National Scenic Byway", region: "Northwest" }
];

const southwestRoutes = [
    { title: "Griffith Park + LA River", location: "Los Angeles, CA", distance: "22.4 mi", type: "Road", elevationGain: "1,720 ft", description: "Most saved Strava route in SoCal this month", region: "Southwest" },
    { title: "South Mountain Summit", location: "Phoenix, AZ", distance: "10.2 mi", type: "Road Climb", elevationGain: "1,650 ft", description: "Phoenix's premier climb; KOM hotspot", region: "Southwest" },
    { title: "Sandia Crest", location: "Albuquerque, NM", distance: "13.5 mi", type: "Road Climb", elevationGain: "4,200 ft", description: "NM signature climb; 10,678 ft summit", region: "Southwest" },
    { title: "Texas Hill Country Loop", location: "Fredericksburg, TX", distance: "55 mi", type: "Road", elevationGain: "2,800 ft", description: "Wildflower paradise; winery stops", region: "Southwest" },
    { title: "Sedona Red Rock Loop", location: "Sedona, AZ", distance: "28 mi", type: "Road/Gravel", elevationGain: "2,100 ft", description: "Bucket-list red rock scenery", region: "Southwest" },
    { title: "Mt. Lemmon", location: "Tucson, AZ", distance: "27 mi", type: "Road Climb", elevationGain: "6,500 ft", description: "Desert to pine epic climb", region: "Southwest" },
    { title: "Enchanted Circle", location: "Taos, NM", distance: "84 mi", type: "Road", elevationGain: "4,800 ft", description: "Classic NM Century; Wheeler Peak", region: "Southwest" },
    { title: "Camelback Mountain Loop", location: "Phoenix, AZ", distance: "15 mi", type: "Road", elevationGain: "980 ft", description: "Urban classic; Phoenix skyline", region: "Southwest" },
    { title: "Davis Mountains Loop", location: "Fort Davis, TX", distance: "75 mi", type: "Road", elevationGain: "5,200 ft", description: "West TX gem; McDonald Observatory", region: "Southwest" },
    { title: "Zion National Park", location: "Springdale, UT", distance: "12 mi", type: "Road", elevationGain: "1,100 ft", description: "Scenic canyon; car-free option", region: "Southwest" }
];

const southeastRoutes = [
    { title: "Natchez Trace Parkway", location: "MS to TN", distance: "444 mi", type: "Road", elevationGain: "8,500 ft", description: "America's premier bike parkway", region: "Southeast" },
    { title: "Miami to Key West", location: "Florida", distance: "160 mi", type: "Road", elevationGain: "180 ft", description: "Overseas Highway; 42 bridges", region: "Southeast" },
    { title: "Silver Comet Trail", location: "GA to AL", distance: "61.5 mi", type: "Rail Trail", elevationGain: "1,850 ft", description: "Connects to 95-mile route", region: "Southeast" },
    { title: "Blue Ridge Parkway", location: "NC/VA", distance: "469 mi", type: "Road", elevationGain: "47,000 ft", description: "America's favorite scenic drive", region: "Southeast" },
    { title: "Pinellas Trail", location: "St. Petersburg, FL", distance: "38 mi", type: "Rail Trail", elevationGain: "120 ft", description: "Florida's most popular trail", region: "Southeast" },
    { title: "Skyline Drive", location: "Virginia", distance: "105 mi", type: "Road", elevationGain: "12,500 ft", description: "Shenandoah NP; mountain vistas", region: "Southeast" },
    { title: "Swamp Rabbit Trail", location: "Greenville, SC", distance: "22 mi", type: "Paved Trail", elevationGain: "380 ft", description: "Urban to nature; brewery stops", region: "Southeast" },
    { title: "Virginia Creeper Trail", location: "Abingdon, VA", distance: "34 mi", type: "Rail Trail", elevationGain: "1,600 ft", description: "Downhill from Whitetop; shuttle", region: "Southeast" },
    { title: "Shark Valley Loop", location: "Everglades, FL", distance: "15 mi", type: "Paved Trail", elevationGain: "15 ft", description: "Wildlife viewing; gators guaranteed", region: "Southeast" },
    { title: "Tanglefoot Trail", location: "Mississippi", distance: "43.6 mi", type: "Rail Trail", elevationGain: "680 ft", description: "Connects to Natchez Trace", region: "Southeast" }
];

const midwestRoutes = [
    { title: "Elroy-Sparta State Trail", location: "Wisconsin", distance: "32 mi", type: "Rail Trail", elevationGain: "680 ft", description: "America's first rail-trail; 3 tunnels", region: "Midwest" },
    { title: "Root River State Trail", location: "SE Minnesota", distance: "42 mi", type: "Paved Trail", elevationGain: "520 ft", description: "Top 10 US bike trails; limestone bluffs", region: "Midwest" },
    { title: "RAGBRAI Route Sample", location: "Iowa", distance: "68 mi", type: "Road", elevationGain: "2,400 ft", description: "World's largest bike tour; 10K+ riders", region: "Midwest" },
    { title: "Chicago Lakefront Trail", location: "Chicago, IL", distance: "18.5 mi", type: "Urban Trail", elevationGain: "95 ft", description: "Lake Michigan views; 100K daily users", region: "Midwest" },
    { title: "Great River Trail", location: "Illinois", distance: "62 mi", type: "Rail Trail", elevationGain: "380 ft", description: "Mississippi River views", region: "Midwest" },
    { title: "Katy Trail", location: "Missouri", distance: "240 mi", type: "Crushed Stone", elevationGain: "1,200 ft", description: "Longest rail-trail in US", region: "Midwest" },
    { title: "Hilly Hundred Course", location: "Bloomington, IN", distance: "50 mi", type: "Road", elevationGain: "3,800 ft", description: "Classic fall ride; challenging hills", region: "Midwest" },
    { title: "Pere Marquette Trail", location: "Michigan", distance: "30 mi", type: "Paved Trail", elevationGain: "180 ft", description: "Flat and scenic; family-friendly", region: "Midwest" },
    { title: "Door County Peninsula", location: "Wisconsin", distance: "45 mi", type: "Road", elevationGain: "1,100 ft", description: "Cherry orchards; lakeside views", region: "Midwest" },
    { title: "Nicollet Island Loop", location: "Minneapolis, MN", distance: "22 mi", type: "Urban Trail", elevationGain: "350 ft", description: "Chain of Lakes; top urban cycling", region: "Midwest" }
];

const northeastRoutes = [
    { title: "Erie Canalway Trail", location: "New York", distance: "360 mi", type: "Multi-Use", elevationGain: "1,850 ft", description: "Buffalo to Albany; historic", region: "Northeast" },
    { title: "Cape Cod Rail Trail", location: "Massachusetts", distance: "25 mi", type: "Rail Trail", elevationGain: "280 ft", description: "Seaside cycling; family-friendly", region: "Northeast" },
    { title: "Vermont Gap Roads", location: "Central VT", distance: "100+ mi", type: "Road", elevationGain: "12,000 ft", description: "Four gaps; fall foliage", region: "Northeast" },
    { title: "Island Line Trail", location: "Burlington, VT", distance: "14 mi", type: "Rail Trail", elevationGain: "120 ft", description: "Lake Champlain causeway", region: "Northeast" },
    { title: "Central Park Loop", location: "New York, NY", distance: "6.1 mi", type: "Road", elevationGain: "280 ft", description: "NYC icon; 15M annual cyclists", region: "Northeast" },
    { title: "Acadia NP Loop", location: "Maine", distance: "27 mi", type: "Road", elevationGain: "2,100 ft", description: "Carriage roads; ocean views", region: "Northeast" },
    { title: "D&L Trail", location: "Pennsylvania", distance: "165 mi", type: "Rail Trail", elevationGain: "890 ft", description: "Delaware & Lehigh canal history", region: "Northeast" },
    { title: "Mt. Washington Auto Road", location: "New Hampshire", distance: "7.6 mi", type: "Road Climb", elevationGain: "4,618 ft", description: "Northeast's ultimate; 12% grade", region: "Northeast" },
    { title: "East Bay Bike Path", location: "Rhode Island", distance: "14.5 mi", type: "Paved Trail", elevationGain: "85 ft", description: "Narragansett Bay views", region: "Northeast" },
    { title: "Minuteman Bikeway", location: "Massachusetts", distance: "11 mi", type: "Rail Trail", elevationGain: "180 ft", description: "Revolutionary War history", region: "Northeast" }
];

const seedFullRoutes = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB...");

        // Find a user to assign these routes to
        const user = await User.findOne();
        if (!user) {
            console.error("No user found. Please create a user first.");
            process.exit(1);
        }
        console.log(`Assigning routes to user: ${user.name} (${user._id})`);

        // Clear existing routes
        console.log("Clearing existing routes...");
        await Route.deleteMany({});

        // Helper to process a list
        const processList = (list, isFeatured = false, isPopular = false) => {
            return list.map(route => ({
                ...route,
                userId: user._id,
                routeLink: "https://www.strava.com", // Placeholder
                highlights: route.description, // Mapping description to highlights schema field
                status: "pending",
                isFeatured,
                isPopular
            }));
        };

        const allRoutes = [
            ...processList(featuredRoutes, true, false), // Featured Rides
            ...processList(westRoutes, false, true),
            ...processList(northwestRoutes, false, true),
            ...processList(southwestRoutes, false, true),
            ...processList(midwestRoutes, false, true),
            ...processList(southeastRoutes, false, true),
            ...processList(northeastRoutes, false, true)
        ];

        console.log(`Seeding ${allRoutes.length} routes...`);

        // Insert all
        await Route.insertMany(allRoutes);

        console.log("Routes seeded successfully!");
        process.exit(0);
    } catch (error) {
        console.error("Error seeding routes:", error);
        process.exit(1);
    }
};

seedFullRoutes();
