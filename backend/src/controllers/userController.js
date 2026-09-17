const User = require("../models/User");


// ======================================================
// GET ALL USERS
// ADMIN ONLY
// ======================================================

const getUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("-password")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: error.message
    });
  }
};


// ======================================================
// GET ONE USER BY ID
// ADMIN ONLY
// ======================================================

const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch user",
      error: error.message
    });
  }
};


// ======================================================
// UPDATE USER
// ADMIN ONLY
// ======================================================

const updateUser = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      role,
      isActive
    } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Email is already in use"
        });
      }
    }

    if (firstName !== undefined) {
      user.firstName = firstName;
    }

    if (lastName !== undefined) {
      user.lastName = lastName;
    }

    if (email !== undefined) {
      user.email = email;
    }

    if (role !== undefined) {
      user.role = role;
    }

    if (isActive !== undefined) {
      user.isActive = isActive;
    }

    await user.save();

    const safeUser = await User.findById(user._id)
      .select("-password");

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      user: safeUser
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update user",
      error: error.message
    });
  }
};


// ======================================================
// DISABLE USER
// ADMIN ONLY
// ======================================================

const disableUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    user.isActive = false;

    await user.save();

    res.status(200).json({
      success: true,
      message: "User disabled successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to disable user",
      error: error.message
    });
  }
};


// ======================================================
// ENABLE USER
// ADMIN ONLY
// ======================================================

const enableUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    user.isActive = true;

    await user.save();

    res.status(200).json({
      success: true,
      message: "User enabled successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to enable user",
      error: error.message
    });
  }
};


// ======================================================
// DELETE USER
// ADMIN ONLY
// ======================================================

const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "User deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete user",
      error: error.message
    });
  }
};


// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  getUsers,
  getUserById,
  updateUser,
  disableUser,
  enableUser,
  deleteUser
};