const TemplateAccess = require("../models/TemplateAccess");
const Template = require("../models/Template");
const User = require("../models/User");
const Card = require("../models/Card");


// ======================================================
// GRANT TEMPLATE ACCESS TO USER
// ======================================================

const grantTemplateAccess = async (req, res) => {
  try {
    const {
      userId,
      templateId,
      pricePaid,
      notes
    } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const template = await Template.findById(templateId);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found"
      });
    }

    const existingAccess = await TemplateAccess.findOne({
      user: userId,
      template: templateId
    });

    if (existingAccess) {
      return res.status(400).json({
        success: false,
        message: "User already has access to this template"
      });
    }

    const access = await TemplateAccess.create({
      user: userId,
      template: templateId,
      grantedBy: req.user._id,
      pricePaid,
      notes
    });

    const populatedAccess = await access.populate([
      {
        path: "user",
        select: "firstName lastName email"
      },
      {
        path: "template"
      },
      {
        path: "grantedBy",
        select: "firstName lastName email"
      }
    ]);

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


// ======================================================
// GET LOGGED-IN USER'S DESIGNS
// ======================================================

const getMyTemplateAccess = async (req, res) => {
  try {
    const accesses = await TemplateAccess.find({
      user: req.user._id,
      status: "active"
    })
      .populate("template")
      .populate("card")
      .sort({ grantedAt: -1 });

    res.status(200).json({
      success: true,
      count: accesses.length,
      designs: accesses
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch your designs",
      error: error.message
    });
  }
};


// ======================================================
// GET ALL TEMPLATE ACCESS RECORDS
// ADMIN DASHBOARD
// ======================================================

const getAllTemplateAccess = async (req, res) => {
  try {
    const accesses = await TemplateAccess.find()
      .populate("user", "firstName lastName email")
      .populate("template")
      .populate("card")
      .populate("grantedBy", "firstName lastName email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: accesses.length,
      accesses
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch template access records",
      error: error.message
    });
  }
};


// ======================================================
// GET TEMPLATE ACCESS FOR ONE USER
// ADMIN DASHBOARD
// ======================================================

const getUserTemplateAccess = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const accesses = await TemplateAccess.find({
      user: req.params.userId
    })
      .populate("template")
      .populate("card")
      .sort({ grantedAt: -1 });

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      },
      count: accesses.length,
      designs: accesses
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch user's designs",
      error: error.message
    });
  }
};


// ======================================================
// ATTACH CARD TO TEMPLATE ACCESS
// ======================================================

const attachCard = async (req, res) => {
  try {
    const { cardId } = req.body;

    const access = await TemplateAccess.findById(req.params.id);

    if (!access) {
      return res.status(404).json({
        success: false,
        message: "Template access not found"
      });
    }

    const card = await Card.findById(cardId);

    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found"
      });
    }

    // Make sure the card belongs to the same user
    if (card.owner.toString() !== access.user.toString()) {
      return res.status(400).json({
        success: false,
        message: "Card does not belong to this user"
      });
    }

    // Make sure the card uses the purchased/granted template
    if (card.template.toString() !== access.template.toString()) {
      return res.status(400).json({
        success: false,
        message: "Card does not use this template"
      });
    }

    access.card = card._id;

    await access.save();

    const populatedAccess = await access.populate([
      {
        path: "user",
        select: "firstName lastName email"
      },
      {
        path: "template"
      },
      {
        path: "card"
      }
    ]);

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


// ======================================================
// UPDATE TEMPLATE ACCESS
// ======================================================

const updateTemplateAccess = async (req, res) => {
  try {
    const {
      status,
      pricePaid,
      notes
    } = req.body;

    const access = await TemplateAccess.findById(req.params.id);

    if (!access) {
      return res.status(404).json({
        success: false,
        message: "Template access not found"
      });
    }

    if (status !== undefined) {
      access.status = status;
    }

    if (pricePaid !== undefined) {
      access.pricePaid = pricePaid;
    }

    if (notes !== undefined) {
      access.notes = notes;
    }

    await access.save();

    const populatedAccess = await access.populate([
      {
        path: "user",
        select: "firstName lastName email"
      },
      {
        path: "template"
      },
      {
        path: "card"
      }
    ]);

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


// ======================================================
// REVOKE / DISABLE TEMPLATE ACCESS
// ======================================================

const revokeTemplateAccess = async (req, res) => {
  try {
    const access = await TemplateAccess.findById(req.params.id);

    if (!access) {
      return res.status(404).json({
        success: false,
        message: "Template access not found"
      });
    }

    access.status = "disabled";

    await access.save();

    res.status(200).json({
      success: true,
      message: "Template access disabled successfully",
      access
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to disable template access",
      error: error.message
    });
  }
};


// ======================================================
// RESTORE TEMPLATE ACCESS
// ======================================================

const restoreTemplateAccess = async (req, res) => {
  try {
    const access = await TemplateAccess.findById(req.params.id);

    if (!access) {
      return res.status(404).json({
        success: false,
        message: "Template access not found"
      });
    }

    access.status = "active";

    await access.save();

    res.status(200).json({
      success: true,
      message: "Template access restored successfully",
      access
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to restore template access",
      error: error.message
    });
  }
};


// ======================================================
// DELETE TEMPLATE ACCESS
// ======================================================

const deleteTemplateAccess = async (req, res) => {
  try {
    const access = await TemplateAccess.findByIdAndDelete(
      req.params.id
    );

    if (!access) {
      return res.status(404).json({
        success: false,
        message: "Template access not found"
      });
    }

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


// ======================================================
// EXPORTS
// ======================================================

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