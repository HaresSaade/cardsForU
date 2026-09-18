const jwt = require("jsonwebtoken");
const User = require("../models/User");

/*
|--------------------------------------------------------------------------
| Protect Middleware
|--------------------------------------------------------------------------
|
| Verifies:
| - Authorization header exists
| - Bearer token exists
| - JWT is valid
| - User still exists
| - User account is active
|
| If successful:
| req.user contains the authenticated user.
|
*/

const protect = async (req, res, next) => {
  try {
    let token;

    /*
    |--------------------------------------------------------------------------
    | Get Bearer Token
    |--------------------------------------------------------------------------
    */

    const authorizationHeader =
      req.headers.authorization;

    if (
      authorizationHeader &&
      authorizationHeader.startsWith("Bearer ")
    ) {
      token = authorizationHeader.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, token missing"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Verify JWT
    |--------------------------------------------------------------------------
    */

    let decoded;

    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      );
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, invalid or expired token"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Validate Token Payload
    |--------------------------------------------------------------------------
    */

    if (!decoded.userId) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, invalid token"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Find Current User
    |--------------------------------------------------------------------------
    |
    | We deliberately query MongoDB on every protected request.
    |
    | This means if an admin disables/deletes an account, an old JWT
    | cannot continue accessing protected CardsForU endpoints.
    |
    */

    const user = await User.findById(
      decoded.userId
    ).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, user no longer exists"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Check Account Status
    |--------------------------------------------------------------------------
    */

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "This account is disabled"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Attach User To Request
    |--------------------------------------------------------------------------
    */

    req.user = user;

    next();
  } catch (error) {
    console.error(
      "Authentication middleware error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Authentication failed"
    });
  }
};

module.exports = {
  protect
};
