import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import connectDB from "./config/db.js";
import User from "./models/user.model.js";
import Route from "./models/route.model.js";
import GearPick from "./models/gearpick.model.js";

const seedData = async () => {
    try {
        await connectDB();
        console.log("Connected to MongoDB for seeding...");

        // Find an admin user or create a temporary one
        let adminUser = await User.findOne({ role: "admin" });
        if (!adminUser) {
            // Fallback to first user if no admin, or create one? 
            // Better to list users and pick one, but for automation let's pick the first one.
            console.log("No admin found, picking first user as author...");
            adminUser = await User.findOne({});
        }

        if (!adminUser) {
            console.error("No users found in DB. Please register a user first.");
            process.exit(1);
        }

        console.log(`Using user: ${adminUser.username} (${adminUser._id})`);
        const userId = adminUser._id;

        // --- SEED ROUTES ---
        const routesData = [
            { title: "Hawk Hill", location: "Marin County, CA", distance: "1.2 mi", difficulty: "Moderate", highlights: "500K+ Strava attempts", routeLink: "#" },
            { title: "Hudson River Greenway", location: "New Jersey", distance: "10+ mi", difficulty: "Easy", highlights: "Riverside; city views", routeLink: "#" },
            { title: "Lookout Mountain", location: "Golden, CO", distance: "4.3 mi", difficulty: "Challenging", highlights: "Tough climb; views", routeLink: "#" },
            { title: "Mercer Island Loop", location: "Seattle, WA", distance: "13.5 mi", difficulty: "Easy", highlights: "Beach finish", routeLink: "#" },
            { title: "Mt. Tamalpais", location: "Marin County, CA", distance: "40 mi", difficulty: "Challenging", highlights: "MTB birthplace", routeLink: "#" },
            { title: "Phil's Trail", location: "Bend, OR", distance: "5 mi", difficulty: "Intermediate", highlights: "Flowy singletrack", routeLink: "#" },
            { title: "Paris Mountain", location: "Greenville, SC", distance: "3.5 mi", difficulty: "Intermediate", highlights: "World-class singletrack", routeLink: "#" },
            { title: "Sidewinder Trail", location: "Golden, CO", distance: "2.5 mi", difficulty: "Intermediate", highlights: "USA Cycling Nationals", routeLink: "#" },
            { title: "Death Valley to Whitney", location: "California", distance: "100 mi", difficulty: "Expert", highlights: "Lowest to highest", routeLink: "#" },
            { title: "Crater Lake Loop", location: "Oregon", distance: "100 mi", difficulty: "Advanced", highlights: "Stunning blue water", routeLink: "#" }
        ];

        console.log("Seeding Routes...");
        await Route.deleteMany({ userId: userId }); // Clean up old seeds for this user? Optional.

        const routeDocs = routesData.map(r => ({
            ...r,
            userId,
            status: "approved",
            image: { url: "https://placehold.co/600x400?text=Route" } // Placeholder
        }));
        await Route.insertMany(routeDocs);
        console.log(`Inserted ${routeDocs.length} routes.`);


        // --- SEED GEAR PICKS ---
        // Helper to generate dates/votes based on 'type' (Most Voted, Newest, Trending)
        const getMeta = (type) => {
            const now = new Date();
            if (type === 'Most Voted') {
                return { votes: Math.floor(Math.random() * 200) + 100, createdAt: new Date(now.setDate(now.getDate() - Math.floor(Math.random() * 30))) };
            }
            if (type === 'Newest') {
                return { votes: Math.floor(Math.random() * 50) + 10, createdAt: new Date() }; // Today
            }
            if (type === 'Trending') {
                return { votes: Math.floor(Math.random() * 100) + 50, createdAt: new Date(now.setDate(now.getDate() - 1)) }; // Yesterday
            }
            return { votes: 0, createdAt: new Date() };
        };

        const gearCategories = [
            {
                category: "Helmets",
                items: [
                    { name: "Specialized S-Works Prevail 3", price: 275, link: "https://www.competitivecyclist.com/specialized-s-works-prevail-3-mips-helmet", type: "Most Voted" },
                    { name: "Trek Velocis MIPS", price: 150, link: "https://www.trekbikes.com/us/en_US/equipment/cycling-accessories/bike-helmets/road-bike-helmets/bontrager-velocis-mips-road-helmet/p/21728/", type: "Most Voted" },
                    { name: "Giro Aries Spherical", price: 250, link: "https://www.competitivecyclist.com/giro-aries-spherical-helmet", type: "Most Voted" },
                    { name: "POC Ventral Tempus", price: 250, link: "https://www.competitivecyclist.com/poc-ventral-tempus-spin-helmet", type: "Newest" },
                    { name: "Van Rysel RCR MIPS", price: 130, link: "https://www.decathlon.com/products/van-rysel-rcr-mips-helmet", type: "Newest" },
                    { name: "MET Manta MIPS", price: 220, link: "https://www.competitivecyclist.com/met-manta-mips-helmet", type: "Newest" },
                    { name: "Kask Protone Icon", price: 270, link: "https://www.competitivecyclist.com/kask-protone-icon-helmet", type: "Trending" },
                    { name: "Fox Speedframe Pro", price: 150, link: "https://www.rei.com/product/177156/fox-racing-speedframe-pro-mips-bike-helmet", type: "Trending" },
                    { name: "Bell XR Spherical", price: 200, link: "https://www.rei.com/product/199515/bell-xr-spherical-bike-helmet", type: "Trending" }
                ]
            },
            {
                category: "Electronics", // BIKE LIGHTS & COMPUTERS mapped here
                items: [
                    // Lights
                    { name: "Garmin Varia RTL515", price: 150, link: "https://www.amazon.com/Garmin-Cycling-Rearview-Vehicles-010-02376-00/dp/B086TVFX1D", type: "Most Voted" },
                    { name: "Light & Motion Urban 1000", price: 130, link: "https://www.rei.com/product/127817/light-motion-urban-1000-front-bike-light", type: "Most Voted" },
                    { name: "Bontrager Ion Pro RT", price: 130, link: "https://www.trekbikes.com/us/en_US/equipment/cycling-accessories/bike-lights/bontrager-ion-pro-rt-front-bike-light/p/23842/", type: "Most Voted" },
                    { name: "Garmin Varia RCT715", price: 350, link: "https://www.rei.com/product/197447/garmin-varia-rct715-rearview-radar-with-camera-and-taillight", type: "Newest" },
                    { name: "Lezyne Mega Drive 2400", price: 180, link: "https://www.competitivecyclist.com/lezyne-mega-drive-2400-headlight", type: "Newest" },
                    { name: "Cateye AMPP 1100", price: 80, link: "https://www.amazon.com/CAT-EYE-AMPP1100-Rechargeable-Headlight/dp/B08LDH5TZP", type: "Newest" },
                    { name: "Brightz WheelBrightz LED", price: 13, link: "https://www.amazon.com/Brightz-WheelBrightz-LED-Bike-Wheel/dp/B004S6E1HK", type: "Trending" },
                    { name: "Ascher USB Set", price: 14, link: "https://www.amazon.com/Ascher-Ultra-Bright-Rechargeable-Headlight/dp/B01M3P74KC", type: "Trending" },
                    { name: "NiteRider Lumina 1200", price: 110, link: "https://www.rei.com/product/136116/niterider-lumina-1200-boost-front-bike-light", type: "Trending" },

                    // Computers
                    { name: "Garmin Edge 540", price: 250, link: "https://www.rei.com/product/226088/garmin-edge-540-bike-computer", type: "Most Voted" },
                    { name: "Wahoo ELEMNT ROAM V2", price: 350, link: "https://www.rei.com/product/220047/wahoo-fitness-elemnt-roam-v2-gps-cycling-computer", type: "Most Voted" },
                    { name: "Garmin Edge 1040", price: 550, link: "https://www.competitivecyclist.com/garmin-edge-1040-solar", type: "Most Voted" },
                    { name: "Hammerhead Karoo 3", price: 450, link: "https://www.hammerhead.io/products/karoo-3", type: "Newest" },
                    { name: "Wahoo ELEMNT BOLT V2", price: 280, link: "https://www.rei.com/product/185622/wahoo-fitness-elemnt-bolt-v2-gps-cycling-computer", type: "Newest" },
                    { name: "Garmin Edge 840", price: 350, link: "https://www.rei.com/product/220156/garmin-edge-840-bike-computer", type: "Newest" },
                    { name: "CYCPLUS GPS Computer", price: 45, link: "https://www.amazon.com/CYCPLUS-Computer-Waterproof-Speedometer-Automatic/dp/B08DFMLSYF", type: "Trending" },
                    { name: "Bryton S800", price: 350, link: "https://www.amazon.com/Bryton-S800E-Navigation-Cycling-Computer/dp/B0B5N7KM97", type: "Trending" },
                    { name: "Sigma ROX 12.1 Evo", price: 350, link: "https://www.amazon.com/SIGMA-SPORT-Computer-Loaded-Functions/dp/B09NRYWV59", type: "Trending" }
                ]
            },
            {
                category: "Accessories", // LOCKS, HYDRATION, STORAGE, TRAINERS
                items: [
                    // Locks
                    { name: "Kryptonite NY Fahgettaboudit", price: 119, link: "https://www.amazon.com/Kryptonite-York-Fahgettaboudit-Bicycle-U-Lock/dp/B074KLVF6G", type: "Most Voted" },
                    { name: "Abus Granit X-Plus 540", price: 100, link: "https://www.rei.com/product/886005/abus-granit-x-plus-540-u-lock", type: "Most Voted" },
                    { name: "Kryptonite Evolution Mini-7", price: 70, link: "https://www.amazon.com/Kryptonite-Evolution-Mini-7-Bicycle-FlexFrame/dp/B06XCD5VXP", type: "Most Voted" },
                    { name: "Hiplok D1000", price: 250, link: "https://www.rei.com/product/215879/hiplok-d1000-u-lock", type: "Newest" },
                    { name: "Litelok X1", price: 130, link: "https://www.amazon.com/LITELOK-X1-Wearable-Bike-Lock/dp/B09CKPVPPJ", type: "Newest" },
                    { name: "Ottolock Cinch Pro", price: 80, link: "https://www.rei.com/product/176413/otto-design-works-ottolock-cinch-lock-pro", type: "Newest" },
                    { name: "Sportneer Combination", price: 18, link: "https://www.amazon.com/Sportneer-Combination-Security-Anti-Theft-Mountain/dp/B01M19OKWB", type: "Trending" },
                    { name: "Titanker Cable Lock", price: 13, link: "https://www.amazon.com/Titanker-Bike-Lock-Combination-Resettable/dp/B07CNQDB6D", type: "Trending" },
                    { name: "OnGuard Brute STD", price: 60, link: "https://www.amazon.com/OnGuard-Brute-STD-U-Lock/dp/B001KLZLHY", type: "Trending" },

                    // Hydration
                    { name: "Bivo Trio Insulated", price: 50, link: "https://www.rei.com/product/215424/bivo-trio-insulated-water-bottle-21-fl-oz", type: "Most Voted" },
                    { name: "CamelBak Podium Chill", price: 16, link: "https://www.rei.com/product/127442/camelbak-podium-chill-insulated-water-bottle-21-fl-oz", type: "Most Voted" },
                    { name: "CamelBak Rogue Light", price: 60, link: "https://www.rei.com/product/185095/camelbak-rogue-light-70-oz-hydration-pack", type: "Most Voted" },
                    { name: "Fidlock Twist Bottle", price: 35, link: "https://www.competitivecyclist.com/fidlock-twist-bottle-600", type: "Newest" },
                    { name: "Elite Fly Tex", price: 10, link: "https://www.competitivecyclist.com/elite-fly-tex-water-bottle", type: "Newest" },
                    { name: "Osprey Katari 7", price: 85, link: "https://www.rei.com/product/177012/osprey-katari-7-hydration-pack-mens", type: "Newest" },
                    { name: "SaltStick Drink Mix", price: 25, link: "https://www.amazon.com/SaltStick-DrinkMix-Electrolyte-Powder-Lemon-Lime/dp/B08T7S4JXM", type: "Trending" },
                    { name: "Skratch Labs Hydration", price: 20, link: "https://www.rei.com/product/895115/skratch-labs-sport-hydration-drink-mix", type: "Trending" },
                    { name: "Nuun Sport Tablets", price: 7, link: "https://www.amazon.com/Nuun-Hydration-Electrolyte-Citrus-Tablets/dp/B019GU4ILQ", type: "Trending" },

                    // Storage
                    { name: "Topeak Aero Wedge Pack", price: 30, link: "https://www.rei.com/product/798297/topeak-aero-wedge-pack-saddle-bag-medium", type: "Most Voted" },
                    { name: "Ortlieb Back-Roller Classic", price: 160, link: "https://www.rei.com/product/885299/ortlieb-back-roller-classic-panniers-pair", type: "Most Voted" },
                    { name: "Revelate Tangle Frame Bag", price: 65, link: "https://www.rei.com/product/119200/revelate-designs-tangle-frame-bag", type: "Most Voted" },
                    { name: "Outershell Handlebar Bag", price: 85, link: "https://outershell.com/shop/drawcord-handlebar-bag", type: "Newest" },
                    { name: "Apidura Racing Saddle", price: 90, link: "https://www.competitivecyclist.com/apidura-racing-saddle-pack", type: "Newest" },
                    { name: "Restrap Race Aero Bar", price: 60, link: "https://www.amazon.com/Restrap-Race-Aero-Bar-Bag/dp/B07Y9TNKXP", type: "Newest" },
                    { name: "REI Big Haul 60", price: 90, link: "https://www.rei.com/product/168485/rei-co-op-big-haul-60-recycled-duffel", type: "Trending" },
                    { name: "Chrome Industries Citizen", price: 160, link: "https://www.chromeindustries.com/product/citizen-messenger-bag/BG-002.html", type: "Trending" },
                    { name: "ILE Default Backpack", price: 200, link: "https://ilequipment.com/collections/bags/products/default-backpack", type: "Trending" },

                    // Trainers
                    { name: "Wahoo KICKR V6", price: 999, link: "https://www.rei.com/product/220045/wahoo-fitness-kickr-smart-bike-trainer-v6", type: "Most Voted" },
                    { name: "Tacx Neo 2T", price: 1200, link: "https://www.competitivecyclist.com/garmin-tacx-neo-2t-smart-trainer", type: "Most Voted" },
                    { name: "Elite Justo 2", price: 750, link: "https://www.competitivecyclist.com/elite-justo-2-interactive-trainer", type: "Most Voted" }
                ]
            },
            {
                category: "Tools",
                items: [
                    { name: "Topeak JoeBlow Sport III", price: 50, link: "https://www.rei.com/product/114730/topeak-joeblow-sport-iii-floor-pump", type: "Most Voted" },
                    { name: "Silca Pista Plus", price: 160, link: "https://www.competitivecyclist.com/silca-pista-plus-floor-pump", type: "Most Voted" },
                    { name: "Crankbrothers F19", price: 45, link: "https://www.rei.com/product/210117/crankbrothers-f19-multi-tool", type: "Most Voted" },
                    { name: "Silca Tattico Mini", price: 55, link: "https://www.competitivecyclist.com/silca-tattico-mini-pump", type: "Newest" },
                    { name: "Fanttik X9 Ace Electric", price: 70, link: "https://www.amazon.com/Fanttik-Inflate-Electric-Portable-Presta/dp/B0CZDFRNTL", type: "Newest" },
                    { name: "HOTO Mini Bike Pump", price: 60, link: "https://www.amazon.com/HOTO-Portable-Electric-Automatic-Presta/dp/B0CN5V6Q7C", type: "Newest" },
                    { name: "Topeak Pocketshock DXG", price: 50, link: "https://www.rei.com/product/770689/topeak-pocketshock-dxg-shock-pump", type: "Trending" },
                    { name: "Park Tool IB-3", price: 30, link: "https://www.amazon.com/Park-Tool-IB-3-Beam-Multi-Tool/dp/B000OZBY44", type: "Trending" },
                    { name: "Lezyne Pressure Drive CFH", price: 35, link: "https://www.rei.com/product/178456/lezyne-pressure-drive-cfh-hand-pump", type: "Trending" }
                ]
            },
            {
                category: "Components", // SADDLES mapped here
                items: [
                    { name: "Specialized Power Comp", price: 90, link: "https://www.competitivecyclist.com/specialized-power-comp-saddle", type: "Most Voted" },
                    { name: "Fizik Argo Vento R3", price: 130, link: "https://www.competitivecyclist.com/fizik-argo-vento-r3-saddle", type: "Most Voted" },
                    { name: "WTB Volt", price: 45, link: "https://www.rei.com/product/888451/wtb-volt-saddle", type: "Most Voted" },
                    { name: "Prologo Dimension NDR", price: 180, link: "https://www.competitivecyclist.com/prologo-dimension-ndr-saddle", type: "Newest" },
                    { name: "SQLab 612 Ergowave", price: 160, link: "https://www.amazon.com/SQlab-612-Ergowave-Active-Saddle/dp/B07VQX92S4", type: "Newest" },
                    { name: "Ergon SR Pro Carbon", price: 220, link: "https://www.competitivecyclist.com/ergon-sr-pro-carbon-saddle", type: "Newest" },
                    { name: "Happy Nuts Anti-Chafe", price: 13, link: "https://www.amazon.com/Happy-Nuts-Anti-Chafe-Comfort-Stick/dp/B07BWMFD6M", type: "Trending" },
                    { name: "Chamois Butt'r Original", price: 10, link: "https://www.amazon.com/Chamois-Buttr-Original-Anti-Chafe-Cream/dp/B000HZGTUS", type: "Trending" },
                    { name: "Brooks Cambium C17", price: 150, link: "https://www.rei.com/product/878453/brooks-england-cambium-c17-carved-all-weather-saddle", type: "Trending" }
                ]
            },
            {
                category: "Apparel",
                items: [
                    { name: "Castelli Free Aero RC Bibs", price: 127, link: "https://www.tradeinn.com/bikeinn/en/castelli-free-aero-rc-bib-shorts/138442004/p", type: "Most Voted" },
                    { name: "Pearl Izumi Attack Jersey", price: 80, link: "https://www.rei.com/product/177044/pearl-izumi-attack-bike-jersey-mens", type: "Most Voted" },
                    { name: "Giro DND Gloves", price: 28, link: "https://www.rei.com/product/111398/giro-dnd-bike-gloves", type: "Most Voted" },
                    { name: "Assos Mille GT Ultraz", price: 330, link: "https://www.competitivecyclist.com/assos-mille-gt-ultraz-evo-winter-jacket-mens", type: "Newest" },
                    { name: "Rapha Pro Team Thermal", price: 230, link: "https://www.rapha.cc/us/en_US/shop/pro-team-thermal-jersey/product/PTH01XXBLK", type: "Newest" },
                    { name: "Velocio Foundation Jersey", price: 130, link: "https://www.velocio.cc/products/foundation-jersey-mens", type: "Newest" },
                    { name: "Smith Bobcat Sunglasses", price: 180, link: "https://www.rei.com/product/197447/smith-bobcat-sunglasses", type: "Trending" },
                    { name: "Showers Pass Crosspoint", price: 45, link: "https://www.rei.com/product/137129/showers-pass-crosspoint-waterproof-knit-wool-gloves", type: "Trending" },
                    { name: "Defeet Aireator Socks", price: 13, link: "https://www.amazon.com/DeFeet-Aireator-Cycling-Running-Socks/dp/B000WNP50G", type: "Trending" }
                ]
            }
        ];

        console.log("Seeding Gear Picks...");
        const gearDocs = [];

        for (const cat of gearCategories) {
            for (const item of cat.items) {
                const { votes, createdAt } = getMeta(item.type);
                gearDocs.push({
                    gearName: item.name,
                    category: cat.category,
                    productLink: item.link,
                    recommendation: `Top pick in ${cat.category}: ${item.name}. Available for around $${item.price}. Recommended because it is a ${item.type} item.`,
                    userId: userId,
                    status: 'approved',
                    votes: votes,
                    createdAt: createdAt,
                    updatedAt: createdAt, // consistent dates
                    image: { url: "https://placehold.co/600x400?text=" + encodeURIComponent(item.name) }
                });
            }
        }

        await GearPick.insertMany(gearDocs);
        console.log(`Inserted ${gearDocs.length} gear picks.`);

        console.log("Seed complete!");
        process.exit(0);

    } catch (error) {
        console.error("Seed failed:", error);
        process.exit(1);
    }
};

seedData();
