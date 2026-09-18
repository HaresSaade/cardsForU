const Card = require("../models/Card");
const Template = require("../models/Template");
const TemplateAccess = require("../models/TemplateAccess");
const User = require("../models/User");

/*
|--------------------------------------------------------------------------
| Helper Functions
|--------------------------------------------------------------------------
*/

const normalizeSlug = (slug) => {
  if (!slug) {
    return undefined;
  }

  return slug
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};

const canManageCard = (user, card) => {
  if (user.role === "admin") {
    return true;
  }

  return card.owner.toString() === user._id.toString();
};

/*
|--------------------------------------------------------------------------
| Create Card
|--------------------------------------------------------------------------
|
| Customer:
| - Can only create cards for themselves.
| - Must have active TemplateAccess.
|
| Admin:
| - Can create a card for any customer.
| - Can optionally pass ownerId.
|
*/

const createCard = async (req, res) => {
  try {
    const {
      ownerId,
      templateId,
      title,
      slug,
      data,
      customization,
      settings,
      expiresAt
    } = req.body;

    if (!templateId || !title) {
      return res.status(400).json({
        success: false,
        message: "Template and title are required"
      });
    }

    const template = await Template.findById(templateId);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Determine Card Owner
    |--------------------------------------------------------------------------
    */

    let cardOwnerId = req.user._id;

    if (req.user.role === "admin" && ownerId) {
      const owner = await User.findById(ownerId);

      if (!owner) {
        return res.status(404).json({
          success: false,
          message: "Card owner not found"
        });
      }

      if (!owner.isActive) {
        return res.status(400).json({
          success: false,
          message: "Cannot create a card for a disabled user"
        });
      }

      cardOwnerId = owner._id;
    }

    /*
    |--------------------------------------------------------------------------
    | Verify Template Access
    |--------------------------------------------------------------------------
    |
    | Admin can manage cards directly.
    |
    | Customers/designers must have active access to the template.
    |
    */

    if (req.user.role !== "admin") {
      const templateAccess = await TemplateAccess.findOne({
        user: req.user._id,
        template: templateId,
        status: "active"
      });

      if (!templateAccess) {
        return res.status(403).json({
          success: false,
          message: "You do not have access to this template"
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Validate Slug
    |--------------------------------------------------------------------------
    */

    let normalizedSlug;

    if (slug) {
      normalizedSlug = normalizeSlug(slug);

      if (!normalizedSlug) {
        return res.status(400).json({
          success: false,
          message: "Invalid card slug"
        });
      }

      const existingCard = await Card.findOne({
        slug: normalizedSlug
      });

      if (existingCard) {
        return res.status(400).json({
          success: false,
          message: "A card with this slug already exists"
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Create Card
    |--------------------------------------------------------------------------
    */

    const card = await Card.create({
      owner: cardOwnerId,
      template: templateId,
      title,
      slug: normalizedSlug,
      data: data || {},
      customization: customization || {},
      settings: settings || {},
      expiresAt: expiresAt || null
    });

    /*
    |--------------------------------------------------------------------------
    | Attach Card to TemplateAccess
    |--------------------------------------------------------------------------
    |
    | If an access record exists for this customer/template combination,
    | attach the newly created card automatically.
    |
    */

    const templateAccess = await TemplateAccess.findOne({
      user: cardOwnerId,
      template: templateId,
      status: "active"
    });

    if (templateAccess && !templateAccess.card) {
      templateAccess.card = card._id;
      await templateAccess.save();
    }

    const populatedCard = await Card.findById(card._id)
      .populate("template")
      .populate(
        "owner",
        "firstName lastName email role isActive"
      );

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

/*
|--------------------------------------------------------------------------
| Get Current User's Cards
|--------------------------------------------------------------------------
*/

const getMyCards = async (req, res) => {
  try {
    const cards = await Card.find({
      owner: req.user._id
    })
      .populate("template")
      .sort({
        createdAt: -1
      });

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

/*
|--------------------------------------------------------------------------
| Admin - Get All Cards
|--------------------------------------------------------------------------
*/

const getAllCards = async (req, res) => {
  try {
    const cards = await Card.find()
      .populate("template")
      .populate(
        "owner",
        "firstName lastName email role isActive"
      )
      .sort({
        createdAt: -1
      });

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

/*
|--------------------------------------------------------------------------
| Admin - Get Cards For Specific User
|--------------------------------------------------------------------------
*/

const getUserCards = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const cards = await Card.find({
      owner: req.params.userId
    })
      .populate("template")
      .sort({
        createdAt: -1
      });

    res.status(200).json({
      success: true,
      count: cards.length,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      },
      cards
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch user cards",
      error: error.message
    });
  }
};

/*
|--------------------------------------------------------------------------
| Get Card By ID
|--------------------------------------------------------------------------
|
| Owner or admin only.
|
*/

const getCardById = async (req, res) => {
  try {
    const card = await Card.findById(req.params.id)
      .populate("template")
      .populate(
        "owner",
        "firstName lastName email role isActive"
      );

    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found"
      });
    }

    const ownerId =
      card.owner && card.owner._id
        ? card.owner._id
        : card.owner;

    if (
      req.user.role !== "admin" &&
      ownerId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this card"
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

/*
|--------------------------------------------------------------------------
| Update Card
|--------------------------------------------------------------------------
|
| Owner or admin.
|
| Template cannot be changed through this endpoint.
|
*/

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

    const card = await Card.findById(req.params.id);

    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found"
      });
    }

    if (!canManageCard(req.user, card)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to update this card"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Update Slug
    |--------------------------------------------------------------------------
    */

    if (slug !== undefined) {
      if (slug === null || slug === "") {
        card.slug = undefined;
      } else {
        const normalizedSlug = normalizeSlug(slug);

        if (!normalizedSlug) {
          return res.status(400).json({
            success: false,
            message: "Invalid card slug"
          });
        }

        if (normalizedSlug !== card.slug) {
          const existingCard = await Card.findOne({
            slug: normalizedSlug,
            _id: {
              $ne: card._id
            }
          });

          if (existingCard) {
            return res.status(400).json({
              success: false,
              message: "A card with this slug already exists"
            });
          }
        }

        card.slug = normalizedSlug;
      }
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
      card.settings = {
        ...card.settings.toObject(),
        ...settings
      };
    }

    if (expiresAt !== undefined) {
      card.expiresAt = expiresAt || null;
    }

    await card.save();

    const populatedCard = await Card.findById(card._id)
      .populate("template")
      .populate(
        "owner",
        "firstName lastName email role isActive"
      );

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

/*
|--------------------------------------------------------------------------
| Delete Card
|--------------------------------------------------------------------------
|
| Owner or admin.
|
*/

const deleteCard = async (req, res) => {
  try {
    const card = await Card.findById(req.params.id);

    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found"
      });
    }

    if (!canManageCard(req.user, card)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to delete this card"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Detach Card From TemplateAccess
    |--------------------------------------------------------------------------
    */

    await TemplateAccess.updateMany(
      {
        card: card._id
      },
      {
        $set: {
          card: null
        }
      }
    );

    await card.deleteOne();

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

/*
|--------------------------------------------------------------------------
| Publish Card
|--------------------------------------------------------------------------
*/

const publishCard = async (req, res) => {
  try {
    const card = await Card.findById(req.params.id);

    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found"
      });
    }

    if (!canManageCard(req.user, card)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to publish this card"
      });
    }

    if (!card.slug) {
      return res.status(400).json({
        success: false,
        message: "Card must have a slug before publishing"
      });
    }

    card.status = "published";
    card.publishedAt = new Date();

    await card.save();

    const populatedCard = await Card.findById(card._id)
      .populate("template")
      .populate(
        "owner",
        "firstName lastName email role isActive"
      );

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

/*
|--------------------------------------------------------------------------
| Unpublish Card
|--------------------------------------------------------------------------
*/

const unpublishCard = async (req, res) => {
  try {
    const card = await Card.findById(req.params.id);

    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found"
      });
    }

    if (!canManageCard(req.user, card)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to unpublish this card"
      });
    }

    card.status = "draft";
    card.publishedAt = null;

    await card.save();

    const populatedCard = await Card.findById(card._id)
      .populate("template")
      .populate(
        "owner",
        "firstName lastName email role isActive"
      );

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

/*
|--------------------------------------------------------------------------
| Public Card By Slug
|--------------------------------------------------------------------------
|
| No authentication required.
|
| Card must:
| - be published
| - have sharing enabled
| - not be expired
|
*/

const getPublicCardBySlug = async (req, res) => {
  try {
    const normalizedSlug = normalizeSlug(req.params.slug);

    const card = await Card.findOne({
      slug: normalizedSlug,
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

    if (
      card.settings &&
      card.settings.shareEnabled === false
    ) {
      return res.status(403).json({
        success: false,
        message: "Sharing is disabled for this card"
      });
    }

    if (
      card.expiresAt &&
      new Date(card.expiresAt) < new Date()
    ) {
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

module.exports = {
  createCard,
  getMyCards,
  getAllCards,
  getUserCards,
  getCardById,
  updateCard,
  deleteCard,
  publishCard,
  unpublishCard,
  getPublicCardBySlug
};
