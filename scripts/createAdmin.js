import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User from "../models/user.model.js";
import connectDB from "../config/db.js";

const createAdmin = async () => {
    try {
        await connectDB();

        const email = "admin@gmail.com";
        const password = "admin@123";
        const name = "Admin User";

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            console.log("Admin user already exists. Updating role to admin...");
            existingUser.role = "admin";
            await existingUser.save();
            console.log("Admin user updated successfully.");
            process.exit(0);
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const admin = await User.create({
            name,
            displayName: name,
            email,
            password: hashedPassword,
            role: "admin",
            emailPreferences: {
                newShops: true,
                routeHighlights: true,
                monthlyUpdates: true,
                specialOffers: false,
            },
            isProfilePrivate: false,
        });

        console.log("✅ Admin user created successfully:", admin.email);
        process.exit(0);
    } catch (err) {
        console.error("❌ Error creating admin user:", err.message);
        process.exit(1);
    }
};

createAdmin();
