import {
  updateUserProfile,
  requestEmailChange,
  verifyAndUpdateEmail,
  updateUserPassword,
  toggleTwoFactorAuth,
  updateUserEmailPreferences,
  updateUserPrivacySettings,
  generateDataExport,
  deleteUserAccount,
  getUserSessions,
  endAllUserSessions,
  getUserProfile,
} from "../services/userService.js";

// Get user profile
export const getProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    console.log("!!! CAPTURED USER ID (FROM PROFILE) !!!:", userId);
    const user = await getUserProfile(userId);

    res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        displayName: user.displayName,
        email: user.email,
        city: user.city,
        state: user.state,
        twoFactorEnabled: user.twoFactorEnabled,
        emailPreferences: user.emailPreferences,
        isProfilePrivate: user.isProfilePrivate,
        profilePicture: user.profilePicture,
        role: user.role,
        shopId: user.shopId,
        passwordChangedAt: user.passwordChangedAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// Update profile (display name, city, state)
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { name, city, state } = req.body;

    const user = await updateUserProfile(userId, { name, city, state });

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        _id: user._id,
        name: user.name,
        displayName: user.displayName,
        email: user.email,
        city: user.city,
        state: user.state,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// Request email change (send OTP to new email)
export const changeEmailRequest = async (req, res) => {
  try {
    const userId = req.user._id;
    const { newEmail } = req.body;

    if (!newEmail) {
      return res.status(400).json({
        success: false,
        error: "New email is required",
      });
    }

    const result = await requestEmailChange(userId, newEmail);
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// Verify and update email with OTP
export const verifyEmailChange = async (req, res) => {
  try {
    const userId = req.user._id;
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({
        success: false,
        error: "OTP is required",
      });
    }

    const { user, token } = await verifyAndUpdateEmail(userId, otp);
    res.json({
      success: true,
      message: "Email updated successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
      token,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// Change password
export const changePassword = async (req, res) => {
  try {
    const userId = req.user._id;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        error: "All password fields are required",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: "New passwords do not match",
      });
    }

    const user = await updateUserPassword(userId, currentPassword, newPassword);
    res.json({
      success: true,
      message: "Password updated successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// Toggle two-factor authentication
export const toggleTwoFactor = async (req, res) => {
  try {
    const userId = req.user._id;
    const { enable } = req.body;

    if (typeof enable !== "boolean") {
      return res.status(400).json({
        success: false,
        error: "Enable flag is required (true/false)",
      });
    }

    const user = await toggleTwoFactorAuth(userId, enable);
    res.json({
      success: true,
      message: `Two-factor authentication ${enable ? "enabled" : "disabled"
        } successfully`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        twoFactorEnabled: user.twoFactorEnabled,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// Update email preferences
export const updateEmailPreferences = async (req, res) => {
  try {
    const userId = req.user._id;
    const { preferences } = req.body;

    if (!preferences || typeof preferences !== "object") {
      return res.status(400).json({
        success: false,
        error: "Preferences object is required",
      });
    }

    const user = await updateUserEmailPreferences(userId, preferences);
    res.json({
      success: true,
      message: "Email preferences updated successfully",
      preferences: user.emailPreferences,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// Update privacy settings
export const updatePrivacySettings = async (req, res) => {
  try {
    const userId = req.user._id;
    const { isProfilePrivate } = req.body;

    if (typeof isProfilePrivate !== "boolean") {
      return res.status(400).json({
        success: false,
        error: "isProfilePrivate flag is required (true/false)",
      });
    }

    const user = await updateUserPrivacySettings(userId, isProfilePrivate);
    res.json({
      success: true,
      message: "Privacy settings updated successfully",
      isProfilePrivate: user.isProfilePrivate,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// Request data export
export const requestDataExport = async (req, res) => {
  try {
    const userId = req.user._id;

    const result = await generateDataExport(userId);
    res.json({
      success: true,
      message: "Data export requested successfully",
      downloadLink: result.downloadLink,
      expiresAt: result.expiresAt,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// Delete account
export const deleteAccount = async (req, res) => {
  try {
    const userId = req.user._id;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        error: "Password is required for account deletion",
      });
    }

    await deleteUserAccount(userId, password);
    res.json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// Get active sessions
export const getActiveSessions = async (req, res) => {
  try {
    const userId = req.user._id;

    const sessions = await getUserSessions(userId);
    res.json({
      success: true,
      sessions,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

// End all sessions except current
export const endAllSessions = async (req, res) => {
  try {
    const userId = req.user._id;
    const currentToken = req.token;

    await endAllUserSessions(userId, currentToken);
    res.json({
      success: true,
      message: "All other sessions ended successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};
import cloudinary from "../config/cloudinary.js";

// ... existing code ...

// Upload profile picture
export const uploadProfilePicture = async (req, res) => {
  try {
    const userId = req.user._id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No file uploaded",
      });
    }

    // Upload to cloudinary using buffer
    const result = await cloudinary.uploader.upload(
      `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`,
      {
        folder: "veloclique/avatars",
        width: 150,
        height: 150,
        crop: "fill",
      }
    );

    const user = await updateUserProfile(userId, {
      profilePicture: result.secure_url,
    });

    res.json({
      success: true,
      message: "Profile picture uploaded successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};
