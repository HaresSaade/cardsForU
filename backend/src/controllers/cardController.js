const Card = require("../models/Card");
const Template = require("../models/Template");
const TemplateAccess = require("../models/TemplateAccess");
const User = require("../models/User");

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const normalizeSlug = (value) => {
  if (!value) return null;

  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const canManageCard = (user, card) => {
  if (!user || !card) return false;

  if (user.role === "admin") {
    return true;
  }

  return (
    card.owner.toString() ===
    user._id.toString()
  );
};

const isCardExpired = (card) => {
  if (!card.expiresAt) {
    return false;
  }

  return new Date(card.expiresAt) <= new Date();
};

/*
|--------------------------------------------------------------------------
| Create Card
|--------------------------------------------------------------------------
|
| Normal customer flow:
|
| TemplateAccess
|       ↓
| create Card using templateAccessId
|       ↓
| Card automatically attached to that exact access
|
| This is important because a customer can now own the same template
| multiple times for different events.
|
*/

const createCard = async (req, res) => {
  try {
    const {
      templateAccessId,
      templateId,
      ownerId,
      title,
      slug,
      data,
      customization,
      settings,
      expiresAt
    } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Card title is required"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Determine Owner
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
          message:
            "Cannot create a card for a disabled user"
        });
      }

      cardOwnerId = owner._id;
    }

    /*
    |--------------------------------------------------------------------------
    | Template Access Flow
    |--------------------------------------------------------------------------
    */

    let templateAccess = null;
    let finalTemplateId = templateId;

    if (templateAccessId) {
      templateAccess =
        await TemplateAccess.findById(
          templateAccessId
        );

      if (!templateAccess) {
        return res.status(404).json({
          success: false,
          message:
            "Template access not found"
        });
      }

      if (templateAccess.status !== "active") {
        return res.status(400).json({
          success: false,
          message:
            "This template access is disabled"
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Access Must Belong To Card Owner
      |--------------------------------------------------------------------------
      */

      if (
        templateAccess.user.toString() !==
        cardOwnerId.toString()
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Template access does not belong to the card owner"
        });
      }

      /*
      |--------------------------------------------------------------------------
      | One Card Per Access
      |--------------------------------------------------------------------------
      */

      if (templateAccess.card) {
        return res.status(400).json({
          success: false,
          message:
            "This template access already has a card"
        });
      }

      finalTemplateId =
        templateAccess.template;
    }

    /*
    |--------------------------------------------------------------------------
    | Customer Must Use TemplateAccess
    |--------------------------------------------------------------------------
    |
    | Customers cannot create cards directly from arbitrary templates.
    |
    */

    if (
      req.user.role !== "admin" &&
      !templateAccess
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Template access is required to create a card"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Admin Direct Creation
    |--------------------------------------------------------------------------
    |
    | Admin may still create a card directly using templateId.
    |
    */

    if (!finalTemplateId) {
      return res.status(400).json({
        success: false,
        message:
          "Template or template access is required"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Validate Template
    |--------------------------------------------------------------------------
    */

    const template =
      await Template.findById(
        finalTemplateId
      );

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Validate Optional Template ID Against Access
    |--------------------------------------------------------------------------
    */

    if (
      templateAccess &&
      templateId &&
      templateId.toString() !==
        templateAccess.template.toString()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Template does not match the selected template access"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Slug
    |--------------------------------------------------------------------------
    */

    let finalSlug = null;

    if (slug) {
      finalSlug = normalizeSlug(slug);

      if (!finalSlug) {
        return res.status(400).json({
          success: false,
          message: "Invalid card slug"
        });
      }

      const existingSlug =
        await Card.findOne({
          slug: finalSlug
        });

      if (existingSlug) {
        return res.status(400).json({
          success: false,
          message:
            "This card URL is already in use"
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Expiration
    |--------------------------------------------------------------------------
    */

    let finalExpiresAt = null;

    if (expiresAt) {
      const parsedExpiration =
        new Date(expiresAt);

      if (
        Number.isNaN(
          parsedExpiration.getTime()
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid expiration date"
        });
      }

      finalExpiresAt =
        parsedExpiration;
    }

    /*
    |--------------------------------------------------------------------------
    | Create Card
    |--------------------------------------------------------------------------
    */

    const card = await Card.create({
      owner: cardOwnerId,
      template: template._id,
      title: title.trim(),
      slug: finalSlug,
      data: data || {},
      customization:
        customization || {},
      settings: settings || {},
      expiresAt: finalExpiresAt
    });

    /*
    |--------------------------------------------------------------------------
    | Attach Card To Exact TemplateAccess
    |--------------------------------------------------------------------------
    */

    if (templateAccess) {
      try {
        templateAccess.card = card._id;

        await templateAccess.save();
      } catch (error) {
        /*
        | Avoid leaving an orphan Card if access attachment fails.
        */

        await Card.findByIdAndDelete(
          card._id
        );

        throw error;
      }
    }

    const populatedCard =
      await Card.findById(card._id)
        .populate(
          "owner",
          "firstName lastName email"
        )
        .populate("template");

    res.status(201).json({
      success: true,
      message:
        "Card created successfully",
      card: populatedCard,
      templateAccessId:
        templateAccess
          ? templateAccess._id
          : null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        "Failed to create card",
      error: error.message
    });
  }
};

/*
|--------------------------------------------------------------------------
| Get My Cards
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
      message:
        "Failed to fetch cards",
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
    const {
      status,
      ownerId,
      templateId
    } = req.query;

    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (ownerId) {
      filter.owner = ownerId;
    }

    if (templateId) {
      filter.template = templateId;
    }

    const cards = await Card.find(filter)
      .populate(
        "owner",
        "firstName lastName email role isActive"
      )
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
      message:
        "Failed to fetch cards",
      error: error.message
    });
  }
};

/*
|--------------------------------------------------------------------------
| Admin - Get User Cards
|--------------------------------------------------------------------------
*/

const getUserCards = async (req, res) => {
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

    const cards = await Card.find({
      owner: user._id
    })
      .populate("template")
      .sort({
        createdAt: -1
      });

    res.status(200).json({
      success: true,
      user,
      count: cards.length,
      cards
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        "Failed to fetch user cards",
      error: error.message
    });
  }
};

/*
|--------------------------------------------------------------------------
| Get Card By ID
|--------------------------------------------------------------------------
*/

const getCardById = async (req, res) => {
  try {
    const card = await Card.findById(
      req.params.id
    )
      .populate(
        "owner",
        "firstName lastName email"
      )
      .populate("template");

    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found"
      });
    }

    if (!canManageCard(req.user, card)) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to access this card"
      });
    }

    const templateAccess =
      await TemplateAccess.findOne({
        card: card._id
      }).select(
        "_id status eventLabel pricePaid currency"
      );

    res.status(200).json({
      success: true,
      card,
      templateAccess
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        "Failed to fetch card",
      error: error.message
    });
  }
};

/*
|--------------------------------------------------------------------------
| Update Card
|--------------------------------------------------------------------------
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

    const card = await Card.findById(
      req.params.id
    );

    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found"
      });
    }

    if (!canManageCard(req.user, card)) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to update this card"
      });
    }

    if (title !== undefined) {
      const normalizedTitle =
        title.toString().trim();

      if (!normalizedTitle) {
        return res.status(400).json({
          success: false,
          message:
            "Card title cannot be empty"
        });
      }

      card.title = normalizedTitle;
    }

    /*
    |--------------------------------------------------------------------------
    | Update Slug
    |--------------------------------------------------------------------------
    */

    if (slug !== undefined) {
      if (!slug) {
        card.slug = null;
      } else {
        const normalizedSlug =
          normalizeSlug(slug);

        if (!normalizedSlug) {
          return res.status(400).json({
            success: false,
            message: "Invalid card slug"
          });
        }

        const existingSlug =
          await Card.findOne({
            slug: normalizedSlug,
            _id: {
              $ne: card._id
            }
          });

        if (existingSlug) {
          return res.status(400).json({
            success: false,
            message:
              "This card URL is already in use"
          });
        }

        card.slug =
          normalizedSlug;
      }
    }

    if (data !== undefined) {
      card.data = data;
    }

    if (customization !== undefined) {
      card.customization =
        customization;
    }

    /*
    |--------------------------------------------------------------------------
    | Merge Settings
    |--------------------------------------------------------------------------
    */

    if (settings !== undefined) {
      const currentSettings =
        card.settings &&
        typeof card.settings.toObject ===
          "function"
          ? card.settings.toObject()
          : card.settings || {};

      card.settings = {
        ...currentSettings,
        ...settings
      };
    }

    /*
    |--------------------------------------------------------------------------
    | Expiration
    |--------------------------------------------------------------------------
    */

    if (expiresAt !== undefined) {
      if (!expiresAt) {
        card.expiresAt = null;
      } else {
        const parsedExpiration =
          new Date(expiresAt);

        if (
          Number.isNaN(
            parsedExpiration.getTime()
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid expiration date"
          });
        }

        card.expiresAt =
          parsedExpiration;
      }
    }

    await card.save();

    const populatedCard =
      await Card.findById(card._id)
        .populate(
          "owner",
          "firstName lastName email"
        )
        .populate("template");

    res.status(200).json({
      success: true,
      message:
        "Card updated successfully",
      card: populatedCard
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        "Failed to update card",
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
    const card = await Card.findById(
      req.params.id
    );

    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found"
      });
    }

    if (!canManageCard(req.user, card)) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to publish this card"
      });
    }

    if (isCardExpired(card)) {
      return res.status(400).json({
        success: false,
        message:
          "An expired card cannot be published"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Generate Slug If Missing
    |--------------------------------------------------------------------------
    */

    if (!card.slug) {
      const baseSlug =
        normalizeSlug(card.title) ||
        "card";

      let candidate =
        `${baseSlug}-${card._id
          .toString()
          .slice(-6)}`;

      let counter = 1;

      while (
        await Card.exists({
          slug: candidate,
          _id: {
            $ne: card._id
          }
        })
      ) {
        candidate =
          `${baseSlug}-${card._id
            .toString()
            .slice(-6)}-${counter}`;

        counter++;
      }

      card.slug = candidate;
    }

    card.status = "published";
    card.publishedAt = new Date();

    await card.save();

    res.status(200).json({
      success: true,
      message:
        "Card published successfully",
      card,
      sharePath:
        card.settings?.shareEnabled !==
        false
          ? `/card/${card.slug}`
          : null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        "Failed to publish card",
      error: error.message
    });
  }
};

/*
|--------------------------------------------------------------------------
| Unpublish Card
|--------------------------------------------------------------------------
*/

const unpublishCard = async (
  req,
  res
) => {
  try {
    const card = await Card.findById(
      req.params.id
    );

    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found"
      });
    }

    if (!canManageCard(req.user, card)) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to unpublish this card"
      });
    }

    card.status = "draft";
    card.publishedAt = null;

    await card.save();

    res.status(200).json({
      success: true,
      message:
        "Card unpublished successfully",
      card
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        "Failed to unpublish card",
      error: error.message
    });
  }
};

/*
|--------------------------------------------------------------------------
| Delete Card
|--------------------------------------------------------------------------
*/

const deleteCard = async (req, res) => {
  try {
    const card = await Card.findById(
      req.params.id
    );

    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found"
      });
    }

    if (!canManageCard(req.user, card)) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to delete this card"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Detach From TemplateAccess
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
      message:
        "Card deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        "Failed to delete card",
      error: error.message
    });
  }
};

/*
|--------------------------------------------------------------------------
| Public Card
|--------------------------------------------------------------------------
|
| No authentication required.
|
*/

const getPublicCardBySlug = async (
  req,
  res
) => {
  try {
    const normalizedSlug =
      normalizeSlug(req.params.slug);

    const card = await Card.findOne({
      slug: normalizedSlug,
      status: "published"
    })
      .populate(
        "owner",
        "firstName lastName"
      )
      .populate("template");

    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found"
      });
    }

    if (
      card.settings?.shareEnabled ===
      false
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Card sharing is disabled"
      });
    }

    if (isCardExpired(card)) {
      return res.status(410).json({
        success: false,
        message:
          "This card has expired"
      });
    }

    res.status(200).json({
      success: true,
      card
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        "Failed to load card",
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
