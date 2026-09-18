const TemplateAccess = require("../models/TemplateAccess");
const Template = require("../models/Template");
const User = require("../models/User");
const Card = require("../models/Card");

/*
|--------------------------------------------------------------------------
| Grant Template Access
|--------------------------------------------------------------------------
|
| Admin grants one use/event of a template to a customer.
|
| IMPORTANT:
| The same customer may receive the same template multiple times.
| Each grant creates a separate TemplateAccess record.
|
*/

const grantTemplateAccess = async (req, res) => {
  try {
    const {
      userId,
      templateId,
      pricePaid,
      currency,
      notes,
      eventLabel
    } = req.body;

    if (!userId || !templateId) {
      return res.status(400).json({
        success: false,
        message: "User and template are required"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Validate User
    |--------------------------------------------------------------------------
    */

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (!user.isActive) {
      return res.status(400).json({
        success: false,
        message: "Cannot grant access to a disabled user"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Validate Template
    |--------------------------------------------------------------------------
    */

    const template = await Template.findById(templateId);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Validate Price
    |--------------------------------------------------------------------------
    */

    let finalPricePaid = 0;

    if (pricePaid !== undefined) {
      const parsedPrice = Number(pricePaid);

      if (
        Number.isNaN(parsedPrice) ||
        parsedPrice < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Price paid must be a valid non-negative number"
        });
      }

      finalPricePaid = parsedPrice;
    }

    /*
    |--------------------------------------------------------------------------
    | Validate Currency
    |--------------------------------------------------------------------------
    */

    let finalCurrency = "USD";

    if (currency) {
      finalCurrency = currency
        .toString()
        .trim()
        .toUpperCase();

      if (finalCurrency.length !== 3) {
        return res.status(400).json({
          success: false,
          message:
            "Currency must be a valid 3-letter currency code"
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Create New Access
    |--------------------------------------------------------------------------
    |
    | We deliberately DO NOT check whether the user already has this
    | template.
    |
    | Example:
    |
    | Wedding Template A
    |   ├── John's Wedding
    |   └── John's Anniversary
    |
    | These are two separate access records.
    |
    */

    const access = await TemplateAccess.create({
      user: user._id,
      template: template._id,
      grantedBy: req.user._id,
      pricePaid: finalPricePaid,
      currency: finalCurrency,
      notes: notes || "",
      eventLabel: eventLabel || ""
    });

    const populatedAccess =
      await TemplateAccess.findById(access._id)
        .populate(
          "user",
          "firstName lastName email role isActive"
        )
        .populate("template")
        .populate("card")
        .populate(
          "grantedBy",
          "firstName lastName email"
        );

    res.status(201).json({
      success: true,
      message: "Template access granted successfully",
      access: populatedAccess
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to grant template access",
      error: error.message
    });
  }
};

/*
|--------------------------------------------------------------------------
| Customer - Get My Template Access
|--------------------------------------------------------------------------
*/

const getMyTemplateAccess = async (req, res) => {
  try {
    const access = await TemplateAccess.find({
      user: req.user._id,
      status: "active"
    })
      .populate("template")
      .populate("card")
      .sort({
        grantedAt: -1
      });

    res.status(200).json({
      success: true,
      count: access.length,
      access
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch template access",
      error: error.message
    });
  }
};

/*
|--------------------------------------------------------------------------
| Admin - Get All Template Access
|--------------------------------------------------------------------------
|
| Optional filters:
|
| ?status=active
| ?status=disabled
| ?userId=...
| ?templateId=...
|
*/

const getAllTemplateAccess = async (req, res) => {
  try {
    const {
      status,
      userId,
      templateId
    } = req.query;

    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (userId) {
      filter.user = userId;
    }

    if (templateId) {
      filter.template = templateId;
    }

    const access = await TemplateAccess.find(filter)
      .populate(
        "user",
        "firstName lastName email role isActive"
      )
      .populate("template")
      .populate("card")
      .populate(
        "grantedBy",
        "firstName lastName email"
      )
      .sort({
        createdAt: -1
      });

    res.status(200).json({
      success: true,
      count: access.length,
      access
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch template access",
      error: error.message
    });
  }
};

/*
|--------------------------------------------------------------------------
| Admin - Get Access For Specific User
|--------------------------------------------------------------------------
*/

const getUserTemplateAccess = async (req, res) => {
  try {
    const user = await User.findById(
      req.params.userId
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const access = await TemplateAccess.find({
      user: user._id
    })
      .populate("template")
      .populate("card")
      .populate(
        "grantedBy",
        "firstName lastName email"
      )
      .sort({
        createdAt: -1
      });

    res.status(200).json({
      success: true,
      user,
      count: access.length,
      access
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        "Failed to fetch user template access",
      error: error.message
    });
  }
};

/*
|--------------------------------------------------------------------------
| Admin - Get Template Access By ID
|--------------------------------------------------------------------------
*/

const getTemplateAccessById = async (req, res) => {
  try {
    const access = await TemplateAccess.findById(
      req.params.id
    )
      .populate(
        "user",
        "firstName lastName email role isActive"
      )
      .populate("template")
      .populate("card")
      .populate(
        "grantedBy",
        "firstName lastName email"
      );

    if (!access) {
      return res.status(404).json({
        success: false,
        message: "Template access not found"
      });
    }

    res.status(200).json({
      success: true,
      access
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch template access",
      error: error.message
    });
  }
};

/*
|--------------------------------------------------------------------------
| Admin - Attach Card
|--------------------------------------------------------------------------
|
| The card must:
|
| - belong to the same customer
| - use the same template
| - not already belong to another TemplateAccess
|
*/

const attachCard = async (req, res) => {
  try {
    const {
      cardId
    } = req.body;

    if (!cardId) {
      return res.status(400).json({
        success: false,
        message: "Card is required"
      });
    }

    const access = await TemplateAccess.findById(
      req.params.id
    );

    if (!access) {
      return res.status(404).json({
        success: false,
        message: "Template access not found"
      });
    }

    if (access.status !== "active") {
      return res.status(400).json({
        success: false,
        message:
          "Cannot attach a card to disabled template access"
      });
    }

    const card = await Card.findById(cardId);

    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Verify Owner
    |--------------------------------------------------------------------------
    */

    if (
      card.owner.toString() !==
      access.user.toString()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Card does not belong to this template access user"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Verify Template
    |--------------------------------------------------------------------------
    */

    if (
      card.template.toString() !==
      access.template.toString()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Card does not use the template associated with this access"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Check Existing Card Assignment
    |--------------------------------------------------------------------------
    */

    const existingCardAccess =
      await TemplateAccess.findOne({
        card: card._id,
        _id: {
          $ne: access._id
        }
      });

    if (existingCardAccess) {
      return res.status(400).json({
        success: false,
        message:
          "This card is already attached to another template access"
      });
    }

    access.card = card._id;

    await access.save();

    const populatedAccess =
      await TemplateAccess.findById(access._id)
        .populate(
          "user",
          "firstName lastName email role isActive"
        )
        .populate("template")
        .populate("card")
        .populate(
          "grantedBy",
          "firstName lastName email"
        );

    res.status(200).json({
      success: true,
      message: "Card attached successfully",
      access: populatedAccess
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to attach card",
      error: error.message
    });
  }
};

/*
|--------------------------------------------------------------------------
| Admin - Detach Card
|--------------------------------------------------------------------------
*/

const detachCard = async (req, res) => {
  try {
    const access = await TemplateAccess.findById(
      req.params.id
    );

    if (!access) {
      return res.status(404).json({
        success: false,
        message: "Template access not found"
      });
    }

    if (!access.card) {
      return res.status(400).json({
        success: false,
        message:
          "No card is attached to this template access"
      });
    }

    access.card = null;

    await access.save();

    res.status(200).json({
      success: true,
      message: "Card detached successfully",
      access
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to detach card",
      error: error.message
    });
  }
};

/*
|--------------------------------------------------------------------------
| Admin - Update Template Access
|--------------------------------------------------------------------------
*/

const updateTemplateAccess = async (req, res) => {
  try {
    const {
      pricePaid,
      currency,
      notes,
      eventLabel
    } = req.body;

    const access = await TemplateAccess.findById(
      req.params.id
    );

    if (!access) {
      return res.status(404).json({
        success: false,
        message: "Template access not found"
      });
    }

    if (pricePaid !== undefined) {
      const parsedPrice = Number(pricePaid);

      if (
        Number.isNaN(parsedPrice) ||
        parsedPrice < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Price paid must be a valid non-negative number"
        });
      }

      access.pricePaid = parsedPrice;
    }

    if (currency !== undefined) {
      const normalizedCurrency = currency
        .toString()
        .trim()
        .toUpperCase();

      if (normalizedCurrency.length !== 3) {
        return res.status(400).json({
          success: false,
          message:
            "Currency must be a valid 3-letter currency code"
        });
      }

      access.currency = normalizedCurrency;
    }

    if (notes !== undefined) {
      access.notes = notes;
    }

    if (eventLabel !== undefined) {
      access.eventLabel = eventLabel;
    }

    await access.save();

    const populatedAccess =
      await TemplateAccess.findById(access._id)
        .populate(
          "user",
          "firstName lastName email role isActive"
        )
        .populate("template")
        .populate("card")
        .populate(
          "grantedBy",
          "firstName lastName email"
        );

    res.status(200).json({
      success: true,
      message: "Template access updated successfully",
      access: populatedAccess
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update template access",
      error: error.message
    });
  }
};

/*
|--------------------------------------------------------------------------
| Admin - Revoke Access
|--------------------------------------------------------------------------
|
| Soft revoke.
|
| Card and RSVP information are preserved.
|
*/

const revokeTemplateAccess = async (req, res) => {
  try {
    const access = await TemplateAccess.findById(
      req.params.id
    );

    if (!access) {
      return res.status(404).json({
        success: false,
        message: "Template access not found"
      });
    }

    if (access.status === "disabled") {
      return res.status(400).json({
        success: false,
        message:
          "Template access is already disabled"
      });
    }

    access.status = "disabled";

    await access.save();

    res.status(200).json({
      success: true,
      message: "Template access revoked successfully",
      access
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to revoke template access",
      error: error.message
    });
  }
};

/*
|--------------------------------------------------------------------------
| Admin - Restore Access
|--------------------------------------------------------------------------
*/

const restoreTemplateAccess = async (req, res) => {
  try {
    const access = await TemplateAccess.findById(
      req.params.id
    );

    if (!access) {
      return res.status(404).json({
        success: false,
        message: "Template access not found"
      });
    }

    if (access.status === "active") {
      return res.status(400).json({
        success: false,
        message:
          "Template access is already active"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Verify Customer Still Exists
    |--------------------------------------------------------------------------
    */

    const user = await User.findById(
      access.user
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "Associated user no longer exists"
      });
    }

    if (!user.isActive) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot restore access for a disabled user"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Verify Template Still Exists
    |--------------------------------------------------------------------------
    */

    const template = await Template.findById(
      access.template
    );

    if (!template) {
      return res.status(404).json({
        success: false,
        message:
          "Associated template no longer exists"
      });
    }

    access.status = "active";
    access.grantedBy = req.user._id;
    access.grantedAt = new Date();

    await access.save();

    const populatedAccess =
      await TemplateAccess.findById(access._id)
        .populate(
          "user",
          "firstName lastName email role isActive"
        )
        .populate("template")
        .populate("card")
        .populate(
          "grantedBy",
          "firstName lastName email"
        );

    res.status(200).json({
      success: true,
      message: "Template access restored successfully",
      access: populatedAccess
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to restore template access",
      error: error.message
    });
  }
};

/*
|--------------------------------------------------------------------------
| Admin - Delete Template Access
|--------------------------------------------------------------------------
|
| Hard deletion of the access record.
|
| The associated card is NOT deleted.
|
*/

const deleteTemplateAccess = async (req, res) => {
  try {
    const access = await TemplateAccess.findById(
      req.params.id
    );

    if (!access) {
      return res.status(404).json({
        success: false,
        message: "Template access not found"
      });
    }

    await access.deleteOne();

    res.status(200).json({
      success: true,
      message: "Template access deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete template access",
      error: error.message
    });
  }
};

module.exports = {
  grantTemplateAccess,
  getMyTemplateAccess,
  getAllTemplateAccess,
  getUserTemplateAccess,
  getTemplateAccessById,
  attachCard,
  detachCard,
  updateTemplateAccess,
  revokeTemplateAccess,
  restoreTemplateAccess,
  deleteTemplateAccess
};
