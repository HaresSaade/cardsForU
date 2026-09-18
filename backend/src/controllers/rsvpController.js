const RSVP = require("../models/RSVP");
const Card = require("../models/Card");

/*
|--------------------------------------------------------------------------
| Helper Functions
|--------------------------------------------------------------------------
*/

const canManageCard = (user, card) => {
  if (user.role === "admin") {
    return true;
  }

  return card.owner.toString() === user._id.toString();
};

const isCardExpired = (card) => {
  return (
    card.expiresAt &&
    new Date(card.expiresAt) < new Date()
  );
};

/*
|--------------------------------------------------------------------------
| Public - Create RSVP
|--------------------------------------------------------------------------
|
| No login required.
|
| RSVP is accepted only when:
| - card exists
| - card is published
| - card is not expired
| - RSVP is enabled
|
*/

const createRSVP = async (req, res) => {
  try {
    const {
      cardId,
      name,
      email,
      phone,
      status,
      guestsCount,
      answers
    } = req.body;

    if (!cardId || !name || !status) {
      return res.status(400).json({
        success: false,
        message: "Card, name and RSVP status are required"
      });
    }

    const allowedStatuses = [
      "attending",
      "not-attending",
      "maybe"
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid RSVP status"
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
    | Card Must Be Published
    |--------------------------------------------------------------------------
    */

    if (card.status !== "published") {
      return res.status(403).json({
        success: false,
        message: "RSVP is not available for this card"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Card Must Not Be Expired
    |--------------------------------------------------------------------------
    */

    if (isCardExpired(card)) {
      return res.status(410).json({
        success: false,
        message: "This card has expired"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | RSVP Must Be Enabled
    |--------------------------------------------------------------------------
    */

    if (
      !card.settings ||
      card.settings.rsvpEnabled !== true
    ) {
      return res.status(403).json({
        success: false,
        message: "RSVP is disabled for this card"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Validate Guest Count
    |--------------------------------------------------------------------------
    */

    let finalGuestsCount = 1;

    if (status === "not-attending") {
      finalGuestsCount = 0;
    } else if (guestsCount !== undefined) {
      const parsedGuestsCount = Number(guestsCount);

      if (
        !Number.isInteger(parsedGuestsCount) ||
        parsedGuestsCount < 1
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Guests count must be a whole number greater than or equal to 1"
        });
      }

      finalGuestsCount = parsedGuestsCount;
    }

    /*
    |--------------------------------------------------------------------------
    | Create RSVP
    |--------------------------------------------------------------------------
    */

    const rsvp = await RSVP.create({
      card: card._id,
      name: name.trim(),
      email: email
        ? email.toLowerCase().trim()
        : undefined,
      phone: phone
        ? phone.trim()
        : undefined,
      status,
      guestsCount: finalGuestsCount,
      answers: answers || {}
    });

    res.status(201).json({
      success: true,
      message: "RSVP submitted successfully",
      rsvp
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to submit RSVP",
      error: error.message
    });
  }
};

/*
|--------------------------------------------------------------------------
| Owner / Admin - Get Card RSVPs
|--------------------------------------------------------------------------
*/

const getCardRSVPs = async (req, res) => {
  try {
    const card = await Card.findById(
      req.params.cardId
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
          "You do not have permission to view RSVPs for this card"
      });
    }

    const rsvps = await RSVP.find({
      card: card._id
    }).sort({
      createdAt: -1
    });

    res.status(200).json({
      success: true,
      count: rsvps.length,
      rsvps
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch RSVPs",
      error: error.message
    });
  }
};

/*
|--------------------------------------------------------------------------
| Owner / Admin - Get RSVP Summary
|--------------------------------------------------------------------------
*/

const getRSVPSummary = async (req, res) => {
  try {
    const card = await Card.findById(
      req.params.cardId
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
          "You do not have permission to view this RSVP summary"
      });
    }

    const rsvps = await RSVP.find({
      card: card._id
    });

    let attendingResponses = 0;
    let notAttendingResponses = 0;
    let maybeResponses = 0;
    let totalGuestsAttending = 0;

    for (const rsvp of rsvps) {
      if (rsvp.status === "attending") {
        attendingResponses += 1;
        totalGuestsAttending += rsvp.guestsCount || 1;
      }

      if (rsvp.status === "not-attending") {
        notAttendingResponses += 1;
      }

      if (rsvp.status === "maybe") {
        maybeResponses += 1;
      }
    }

    res.status(200).json({
      success: true,
      summary: {
        totalResponses: rsvps.length,
        attendingResponses,
        notAttendingResponses,
        maybeResponses,
        totalGuestsAttending
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch RSVP summary",
      error: error.message
    });
  }
};

/*
|--------------------------------------------------------------------------
| Owner / Admin - Get RSVP By ID
|--------------------------------------------------------------------------
*/

const getRSVPById = async (req, res) => {
  try {
    const rsvp = await RSVP.findById(
      req.params.id
    ).populate("card");

    if (!rsvp) {
      return res.status(404).json({
        success: false,
        message: "RSVP not found"
      });
    }

    if (!rsvp.card) {
      return res.status(404).json({
        success: false,
        message: "Associated card not found"
      });
    }

    if (!canManageCard(req.user, rsvp.card)) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to access this RSVP"
      });
    }

    res.status(200).json({
      success: true,
      rsvp
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch RSVP",
      error: error.message
    });
  }
};

/*
|--------------------------------------------------------------------------
| Owner / Admin - Update RSVP
|--------------------------------------------------------------------------
|
| Useful when:
| - customer corrects a guest entry
| - admin manually adjusts an RSVP
|
*/

const updateRSVP = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      status,
      guestsCount,
      answers
    } = req.body;

    const rsvp = await RSVP.findById(
      req.params.id
    ).populate("card");

    if (!rsvp) {
      return res.status(404).json({
        success: false,
        message: "RSVP not found"
      });
    }

    if (!rsvp.card) {
      return res.status(404).json({
        success: false,
        message: "Associated card not found"
      });
    }

    if (!canManageCard(req.user, rsvp.card)) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to update this RSVP"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Validate Status
    |--------------------------------------------------------------------------
    */

    if (status !== undefined) {
      const allowedStatuses = [
        "attending",
        "not-attending",
        "maybe"
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid RSVP status"
        });
      }

      rsvp.status = status;

      if (status === "not-attending") {
        rsvp.guestsCount = 0;
      } else if (
        rsvp.guestsCount === 0 &&
        guestsCount === undefined
      ) {
        rsvp.guestsCount = 1;
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Update Guest Count
    |--------------------------------------------------------------------------
    */

    if (guestsCount !== undefined) {
      if (rsvp.status === "not-attending") {
        rsvp.guestsCount = 0;
      } else {
        const parsedGuestsCount = Number(guestsCount);

        if (
          !Number.isInteger(parsedGuestsCount) ||
          parsedGuestsCount < 1
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Guests count must be a whole number greater than or equal to 1"
          });
        }

        rsvp.guestsCount = parsedGuestsCount;
      }
    }

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Name cannot be empty"
        });
      }

      rsvp.name = name.trim();
    }

    if (email !== undefined) {
      rsvp.email = email
        ? email.toLowerCase().trim()
        : undefined;
    }

    if (phone !== undefined) {
      rsvp.phone = phone
        ? phone.trim()
        : undefined;
    }

    if (answers !== undefined) {
      rsvp.answers = answers;
    }

    await rsvp.save();

    res.status(200).json({
      success: true,
      message: "RSVP updated successfully",
      rsvp
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update RSVP",
      error: error.message
    });
  }
};

/*
|--------------------------------------------------------------------------
| Owner / Admin - Delete RSVP
|--------------------------------------------------------------------------
*/

const deleteRSVP = async (req, res) => {
  try {
    const rsvp = await RSVP.findById(
      req.params.id
    ).populate("card");

    if (!rsvp) {
      return res.status(404).json({
        success: false,
        message: "RSVP not found"
      });
    }

    if (!rsvp.card) {
      return res.status(404).json({
        success: false,
        message: "Associated card not found"
      });
    }

    if (!canManageCard(req.user, rsvp.card)) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to delete this RSVP"
      });
    }

    await rsvp.deleteOne();

    res.status(200).json({
      success: true,
      message: "RSVP deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete RSVP",
      error: error.message
    });
  }
};

module.exports = {
  createRSVP,
  getCardRSVPs,
  getRSVPSummary,
  getRSVPById,
  updateRSVP,
  deleteRSVP
};
