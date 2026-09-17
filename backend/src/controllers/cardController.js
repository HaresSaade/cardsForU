const Card = require("../models/Card");
const Template = require("../models/Template");


// ======================================================
// CREATE CARD
// ======================================================

const createCard = async (req, res) => {
  try {
    const {
      templateId,
      title,
      slug,
      data,
      customization,
      settings,
      expiresAt
    } = req.body;

    // Make sure template exists
    const template = await Template.findById(templateId);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found"
      });
    }

    // Check slug uniqueness
    if (slug) {
      const existingCard = await Card.findOne({ slug });

      if (existingCard) {
        return res.status(400).json({
          success: false,
          message: "A card with this slug already exists"
        });
      }
    }

    const card = await Card.create({
      owner: req.user._id,
      template: templateId,
      title,
      slug,
      data,
      customization,
      settings,
      expiresAt
    });

    const populatedCard = await card.populate("template");

    res.status(201).json({
      success: true,
      message: "Card created successfully",
      card: populatedCard
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create card",
      error: error.message
    });
  }
};


// ======================================================
// GET LOGGED-IN USER'S CARDS
// ======================================================

const getMyCards = async (req, res) => {
  try {
    const cards = await Card.find({
      owner: req.user._id
    })
      .populate("template")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: cards.length,
      cards
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch cards",
      error: error.message
    });
  }
};


// ======================================================
// GET ONE CARD BY ID
// ======================================================

const getCardById = async (req, res) => {
  try {
    const card = await Card.findOne({
      _id: req.params.id,
      owner: req.user._id
    }).populate("template");

    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found"
      });
    }

    res.status(200).json({
      success: true,
      card
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch card",
      error: error.message
    });
  }
};


// ======================================================
// UPDATE CARD
// ======================================================

const updateCard = async (req, res) => {
  try {
    const {
      title,
      slug,
      data,
      customization,
      settings,
      expiresAt
    } = req.body;

    const card = await Card.findOne({
      _id: req.params.id,
      owner: req.user._id
    });

    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found"
      });
    }

    // Check slug uniqueness if changed
    if (slug && slug !== card.slug) {
      const existingCard = await Card.findOne({ slug });

      if (existingCard) {
        return res.status(400).json({
          success: false,
          message: "A card with this slug already exists"
        });
      }

      card.slug = slug;
    }

    if (title !== undefined) {
      card.title = title;
    }

    if (data !== undefined) {
      card.data = data;
    }

    if (customization !== undefined) {
      card.customization = customization;
    }

    if (settings !== undefined) {
      card.settings = settings;
    }

    if (expiresAt !== undefined) {
      card.expiresAt = expiresAt;
    }

    await card.save();

    const populatedCard = await card.populate("template");

    res.status(200).json({
      success: true,
      message: "Card updated successfully",
      card: populatedCard
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update card",
      error: error.message
    });
  }
};


// ======================================================
// DELETE CARD
// ======================================================

const deleteCard = async (req, res) => {
  try {
    const card = await Card.findOneAndDelete({
      _id: req.params.id,
      owner: req.user._id
    });

    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Card deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete card",
      error: error.message
    });
  }
};


// ======================================================
// PUBLISH CARD
// ======================================================

const publishCard = async (req, res) => {
  try {
    const card = await Card.findOne({
      _id: req.params.id,
      owner: req.user._id
    });

    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found"
      });
    }

    // Public cards need a slug
    if (!card.slug) {
      return res.status(400).json({
        success: false,
        message: "Card must have a slug before publishing"
      });
    }

    card.status = "published";
    card.publishedAt = new Date();

    await card.save();

    const populatedCard = await card.populate("template");

    res.status(200).json({
      success: true,
      message: "Card published successfully",
      card: populatedCard
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to publish card",
      error: error.message
    });
  }
};


// ======================================================
// UNPUBLISH CARD
// ======================================================

const unpublishCard = async (req, res) => {
  try {
    const card = await Card.findOne({
      _id: req.params.id,
      owner: req.user._id
    });

    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found"
      });
    }

    card.status = "draft";
    card.publishedAt = null;

    await card.save();

    const populatedCard = await card.populate("template");

    res.status(200).json({
      success: true,
      message: "Card unpublished successfully",
      card: populatedCard
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to unpublish card",
      error: error.message
    });
  }
};


// ======================================================
// GET PUBLIC CARD BY SLUG
// ======================================================

const getPublicCardBySlug = async (req, res) => {
  try {
    const card = await Card.findOne({
      slug: req.params.slug,
      status: "published"
    })
      .populate("template")
      .select("-owner");

    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found"
      });
    }

    // Check expiration
    if (card.expiresAt && card.expiresAt < new Date()) {
      return res.status(410).json({
        success: false,
        message: "This card has expired"
      });
    }

    res.status(200).json({
      success: true,
      card
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch public card",
      error: error.message
    });
  }
};


// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  createCard,
  getMyCards,
  getCardById,
  updateCard,
  deleteCard,
  publishCard,
  unpublishCard,
  getPublicCardBySlug
};