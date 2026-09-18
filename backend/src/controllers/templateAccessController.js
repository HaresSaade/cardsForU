const TemplateAccess = require("../models/TemplateAccess");
const Template = require("../models/Template");
const User = require("../models/User");
const Card = require("../models/Card");

/*
|--------------------------------------------------------------------------
| Grant Template Access
|--------------------------------------------------------------------------
|
| Admin grants a design/template to a customer.
|
*/

const grantTemplateAccess = async (req, res) => {
  try {
    const {
      userId,
      templateId,
      pricePaid,
      notes
    } = req.body;

    if (!userId || !templateId) {
      return res.status(400).json({
        success: false,
        message: "User and template are required"
      });
    }

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

    const template = await Template.findById(
      templateId
    );

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Check Existing Access
    |--------------------------------------------------------------------------
    */

    const existingAccess =
      await TemplateAccess.findOne({
        user: userId,
        template: templateId
      });

    if (existingAccess) {
      if (existingAccess.status === "active") {
        return res.status(400).json({
          success: false,
          message:
            "This user already has access to this template"
        });
      }

      /*
      | If access existed but was disabled,
      | restore it instead of creating a duplicate.
      */

      existingAccess.status = "active";
      existingAccess.grantedBy =
        req.user._id;
      existingAccess.grantedAt =
        new Date();

      if (pricePaid !== undefined) {
        existingAccess.pricePaid =
          pricePaid;
      }

      if (notes !== undefined) {
        existingAccess.notes = notes;
      }

      await existingAccess.save();

      const restoredAccess =
        await TemplateAccess.findById(
          existingAccess._id
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

      return res.status(200).json({
        success: true,
        message:
          "Template access restored successfully",
        access: restoredAccess
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Validate Price
    |--------------------------------------------------------------------------
    */

    let finalPricePaid = 0;

    if (pricePaid !== undefined) {
      const parsedPrice =
        Number(pricePaid);

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
    | Create Access
    |--------------------------------------------------------------------------
    */

    const access =
      await TemplateAccess.create({
        user: userId,
        template: templateId,
        grantedBy: req.user._id,
        pricePaid: finalPricePaid,
        notes: notes || ""
      });

    const populatedAccess =
      await TemplateAccess.findById(
        access._id
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

    res.status(201).json({
      success: true,
      message:
        "Template access granted successfully",
      access: populatedAccess
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        "Failed to grant template access",
      error: error.message
    });
  }
};

/*
|--------------------------------------------------------------------------
| Customer - Get My Template Access
|--------------------------------------------------------------------------
*/

const getMyTemplateAccess = async (
  req,
  res
) => {
  try {
    const access =
      await TemplateAccess.find({
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
      message:
        "Failed to fetch template access",
      error: error.message
    });
  }
};

/*
|--------------------------------------------------------------------------
| Admin - Get All Template Access
|--------------------------------------------------------------------------
*/

const getAllTemplateAccess = async (
  req,
  res
) => {
  try {
    const {
      status
    } = req.query;

    const filter = {};

    if (status) {
      filter.status = status;
    }

    const access =
      await TemplateAccess.find(filter)
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
      message:
        "Failed to fetch template access",
      error: error.message
    });
  }
};

/*
|--------------------------------------------------------------------------
| Admin - Get Template Access For Specific User
|--------------------------------------------------------------------------
*/

const getUserTemplateAccess = async (
  req,
  res
) => {
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

    const access =
      await TemplateAccess.find({
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
| Admin - Attach Card To Template Access
|--------------------------------------------------------------------------
|
| Card must:
| - exist
| - belong to the same user
| - use the same template
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

    const access =
      await TemplateAccess.findById(
        req.params.id
      );

    if (!access) {
      return res.status(404).json({
        success: false,
        message:
          "Template access not found"
      });
    }

    if (access.status !== "active") {
      return res.status(400).json({
        success: false,
        message:
          "Cannot attach a card to disabled template access"
      });
    }

    const card = await Card.findById(
      cardId
    );

    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Validate Card Owner
    |--------------------------------------------------------------------------
    */

    if (
      card.owner.toString() !==
      access.user.toString()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Card does not belong to the user who owns this template access"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Validate Template
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
    | Prevent Card Being Attached Elsewhere
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
          "This card is already attached to another template access record"
      });
    }

    access.card = card._id;

    await access.save();

    const populatedAccess =
      await TemplateAccess.findById(
        access._id
      )
        .populate(
          "user",
          "firstName lastName email role isActive"
        )
        .populate("template")
        .populate("card");

    res.status(200).json({
      success: true,
      message:
        "Card attached successfully",
      access: populatedAccess
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        "Failed to attach card",
      error: error.message
    });
  }
};

/*
|--------------------------------------------------------------------------
| Admin - Update Template Access
|--------------------------------------------------------------------------
|
| Editable:
| - pricePaid
| - notes
|
*/

const updateTemplateAccess = async (
  req,
  res
) => {
  try {
    const {
      pricePaid,
      notes
    } = req.body;

    const access =
      await TemplateAccess.findById(
        req.params.id
      );

    if (!access) {
      return res.status(404).json({
        success: false,
        message:
          "Template access not found"
      });
    }

    if (pricePaid !== undefined) {
      const parsedPrice =
        Number(pricePaid);

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

    if (notes !== undefined) {
      access.notes = notes;
    }

    await access.save();

    const populatedAccess =
      await TemplateAccess.findById(
        access._id
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

    res.status(200).json({
      success: true,
      message:
        "Template access updated successfully",
      access: populatedAccess
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        "Failed to update template access",
      error: error.message
    });
  }
};

/*
|--------------------------------------------------------------------------
| Admin - Revoke Template Access
|--------------------------------------------------------------------------
|
| Soft revoke.
| Existing Card is NOT deleted.
|
*/

const revokeTemplateAccess = async (
  req,
  res
) => {
  try {
    const access =
      await TemplateAccess.findById(
        req.params.id
      );

    if (!access) {
      return res.status(404).json({
        success: false,
        message:
          "Template access not found"
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
      message:
        "Template access revoked successfully",
      access
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        "Failed to revoke template access",
      error: error.message
    });
  }
};

/*
|--------------------------------------------------------------------------
| Admin - Restore Template Access
|--------------------------------------------------------------------------
*/

const restoreTemplateAccess = async (
  req,
  res
) => {
  try {
    const access =
      await TemplateAccess.findById(
        req.params.id
      );

    if (!access) {
      return res.status(404).json({
        success: false,
        message:
          "Template access not found"
      });
    }

    if (access.status === "active") {
      return res.status(400).json({
        success: false,
        message:
          "Template access is already active"
      });
    }

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

    const template =
      await Template.findById(
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
    access.grantedBy =
      req.user._id;
    access.grantedAt =
      new Date();

    await access.save();

    const populatedAccess =
      await TemplateAccess.findById(
        access._id
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

    res.status(200).json({
      success: true,
      message:
        "Template access restored successfully",
      access: populatedAccess
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        "Failed to restore template access",
      error: error.message
    });
  }
};

/*
|--------------------------------------------------------------------------
| Admin - Delete Template Access
|--------------------------------------------------------------------------
|
| Hard deletion.
|
| Card itself is NOT deleted.
|
*/

const deleteTemplateAccess = async (
  req,
  res
) => {
  try {
    const access =
      await TemplateAccess.findById(
        req.params.id
      );

    if (!access) {
      return res.status(404).json({
        success: false,
        message:
          "Template access not found"
      });
    }

    await access.deleteOne();

    res.status(200).json({
      success: true,
      message:
        "Template access deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        "Failed to delete template access",
      error: error.message
    });
  }
};

module.exports = {
  grantTemplateAccess,
  getMyTemplateAccess,
  getAllTemplateAccess,
  getUserTemplateAccess,
  attachCard,
  updateTemplateAccess,
  revokeTemplateAccess,
  restoreTemplateAccess,
  deleteTemplateAccess
};
