const User = require("../models/User");

/*
|--------------------------------------------------------------------------
| Get All Users
|--------------------------------------------------------------------------
| Admin only.
|
| Optional filters:
| ?role=customer
| ?role=admin
| ?role=designer
| ?isActive=true
| ?search=hares
|--------------------------------------------------------------------------
*/

const getUsers = async (req, res) => {
  try {
    const {
      role,
      isActive,
      search
    } = req.query;

    const filter = {};

    if (role) {
      filter.role = role;
    }

    if (isActive !== undefined) {
      if (
        isActive !== "true" &&
        isActive !== "false"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "isActive must be true or false"
        });
      }

      filter.isActive =
        isActive === "true";
    }

    /*
    |--------------------------------------------------------------------------
    | Search
    |--------------------------------------------------------------------------
    */

    if (search) {
      const safeSearch = search
        .toString()
        .trim()
        .replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );

      filter.$or = [
        {
          firstName: {
            $regex: safeSearch,
            $options: "i"
          }
        },
        {
          lastName: {
            $regex: safeSearch,
            $options: "i"
          }
        },
        {
          email: {
            $regex: safeSearch,
            $options: "i"
          }
        }
      ];
    }

    const users = await User.find(filter)
      .select("-password")
      .sort({
        createdAt: -1
      });

    res.status(200).json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        "Failed to fetch users",
      error: error.message
    });
  }
};

/*
|--------------------------------------------------------------------------
| Get User By ID
|--------------------------------------------------------------------------
*/

const getUserById = async (req, res) => {
  try {
    const user = await User.findById(
      req.params.id
    ).select("-password");

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
      message:
        "Failed to fetch user",
      error: error.message
    });
  }
};

/*
|--------------------------------------------------------------------------
| Update User
|--------------------------------------------------------------------------
|
| Admin can update:
|
| - firstName
| - lastName
| - email
| - role
|
| isActive is intentionally NOT handled here.
| Dedicated enable/disable endpoints handle that.
|--------------------------------------------------------------------------
*/

const updateUser = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      role
    } = req.body;

    const user = await User.findById(
      req.params.id
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | First Name
    |--------------------------------------------------------------------------
    */

    if (firstName !== undefined) {
      const normalizedFirstName =
        firstName
          .toString()
          .trim();

      if (!normalizedFirstName) {
        return res.status(400).json({
          success: false,
          message:
            "First name cannot be empty"
        });
      }

      user.firstName =
        normalizedFirstName;
    }

    /*
    |--------------------------------------------------------------------------
    | Last Name
    |--------------------------------------------------------------------------
    */

    if (lastName !== undefined) {
      const normalizedLastName =
        lastName
          .toString()
          .trim();

      if (!normalizedLastName) {
        return res.status(400).json({
          success: false,
          message:
            "Last name cannot be empty"
        });
      }

      user.lastName =
        normalizedLastName;
    }

    /*
    |--------------------------------------------------------------------------
    | Email
    |--------------------------------------------------------------------------
    */

    if (email !== undefined) {
      const normalizedEmail =
        email
          .toString()
          .trim()
          .toLowerCase();

      if (!normalizedEmail) {
        return res.status(400).json({
          success: false,
          message:
            "Email cannot be empty"
        });
      }

      const existingUser =
        await User.findOne({
          email: normalizedEmail,
          _id: {
            $ne: user._id
          }
        });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message:
            "Email is already in use"
        });
      }

      user.email =
        normalizedEmail;
    }

    /*
    |--------------------------------------------------------------------------
    | Role
    |--------------------------------------------------------------------------
    */

    if (role !== undefined) {
      const allowedRoles = [
        "customer",
        "admin",
        "designer"
      ];

      if (
        !allowedRoles.includes(role)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid user role"
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Prevent Admin From Removing Their Own Admin Role
      |--------------------------------------------------------------------------
      */

      if (
        req.user._id.toString() ===
          user._id.toString() &&
        role !== "admin"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "You cannot remove your own admin role"
        });
      }

      user.role = role;
    }

    await user.save();

    const updatedUser =
      await User.findById(
        user._id
      ).select("-password");

    res.status(200).json({
      success: true,
      message:
        "User updated successfully",
      user: updatedUser
    });
  } catch (error) {
    /*
    |--------------------------------------------------------------------------
    | Duplicate Email
    |--------------------------------------------------------------------------
    */

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message:
          "Email is already in use"
      });
    }

    res.status(500).json({
      success: false,
      message:
        "Failed to update user",
      error: error.message
    });
  }
};

/*
|--------------------------------------------------------------------------
| Disable User
|--------------------------------------------------------------------------
|
| Soft-disable account.
|
| Existing JWTs stop working because authMiddleware checks isActive.
|--------------------------------------------------------------------------
*/

const disableUser = async (
  req,
  res
) => {
  try {
    const user = await User.findById(
      req.params.id
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Prevent Self Disable
    |--------------------------------------------------------------------------
    */

    if (
      req.user._id.toString() ===
      user._id.toString()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "You cannot disable your own account"
      });
    }

    if (!user.isActive) {
      return res.status(400).json({
        success: false,
        message:
          "User is already disabled"
      });
    }

    user.isActive = false;

    await user.save();

    res.status(200).json({
      success: true,
      message:
        "User disabled successfully",
      user: {
        id: user._id,
        firstName:
          user.firstName,
        lastName:
          user.lastName,
        email:
          user.email,
        role:
          user.role,
        isActive:
          user.isActive
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        "Failed to disable user",
      error: error.message
    });
  }
};

/*
|--------------------------------------------------------------------------
| Enable User
|--------------------------------------------------------------------------
*/

const enableUser = async (
  req,
  res
) => {
  try {
    const user = await User.findById(
      req.params.id
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (user.isActive) {
      return res.status(400).json({
        success: false,
        message:
          "User is already active"
      });
    }

    user.isActive = true;

    await user.save();

    res.status(200).json({
      success: true,
      message:
        "User enabled successfully",
      user: {
        id: user._id,
        firstName:
          user.firstName,
        lastName:
          user.lastName,
        email:
          user.email,
        role:
          user.role,
        isActive:
          user.isActive
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        "Failed to enable user",
      error: error.message
    });
  }
};

/*
|--------------------------------------------------------------------------
| Delete User
|--------------------------------------------------------------------------
|
| Hard deletion should only be used intentionally.
|
| Normal account removal should generally use disableUser instead.
|--------------------------------------------------------------------------
*/

const deleteUser = async (
  req,
  res
) => {
  try {
    const user = await User.findById(
      req.params.id
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Prevent Self Deletion
    |--------------------------------------------------------------------------
    */

    if (
      req.user._id.toString() ===
      user._id.toString()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "You cannot delete your own account"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Prevent Deleting Active Accounts
    |--------------------------------------------------------------------------
    |
    | Admin must disable the account first.
    |
    | This reduces accidental destructive actions.
    |--------------------------------------------------------------------------
    */

    if (user.isActive) {
      return res.status(400).json({
        success: false,
        message:
          "Disable the user before permanently deleting the account"
      });
    }

    await user.deleteOne();

    res.status(200).json({
      success: true,
      message:
        "User deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        "Failed to delete user",
      error: error.message
    });
  }
};

module.exports = {
  getUsers,
  getUserById,
  updateUser,
  disableUser,
  enableUser,
  deleteUser
};
