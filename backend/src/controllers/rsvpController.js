const RSVP = require("../models/RSVP");
const Card = require("../models/Card");


// ======================================================
// CREATE RSVP
// ======================================================

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

    const card = await Card.findById(cardId);

    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found"
      });
    }

    if (!card.settings?.rsvpEnabled) {
      return res.status(400).json({
        success: false,
        message: "RSVP is not enabled for this card"
      });
    }

    const rsvp = await RSVP.create({
      card: cardId,
      name,
      email,
      phone,
      status,
      guestsCount,
      answers
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


// ======================================================
// GET RSVPS FOR A CARD
// ======================================================

const getCardRSVPs = async (req, res) => {
  try {
    const card = await Card.findOne({
      _id: req.params.cardId,
      owner: req.user._id
    });

    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found"
      });
    }

    const rsvps = await RSVP.find({
      card: req.params.cardId
    }).sort({ createdAt: -1 });

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


// ======================================================
// GET ONE RSVP
// ======================================================

const getRSVPById = async (req, res) => {
  try {
    const rsvp = await RSVP.findById(req.params.id).populate("card");

    if (!rsvp) {
      return res.status(404).json({
        success: false,
        message: "RSVP not found"
      });
    }

    if (rsvp.card.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access this RSVP"
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


// ======================================================
// UPDATE RSVP
// ======================================================

const updateRSVP = async (req, res) => {
  try {
    const rsvp = await RSVP.findById(req.params.id).populate("card");

    if (!rsvp) {
      return res.status(404).json({
        success: false,
        message: "RSVP not found"
      });
    }

    if (rsvp.card.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this RSVP"
      });
    }

    const {
      name,
      email,
      phone,
      status,
      guestsCount,
      answers
    } = req.body;

    if (name !== undefined) rsvp.name = name;
    if (email !== undefined) rsvp.email = email;
    if (phone !== undefined) rsvp.phone = phone;
    if (status !== undefined) rsvp.status = status;
    if (guestsCount !== undefined) rsvp.guestsCount = guestsCount;
    if (answers !== undefined) rsvp.answers = answers;

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


// ======================================================
// DELETE RSVP
// ======================================================

const deleteRSVP = async (req, res) => {
  try {
    const rsvp = await RSVP.findById(req.params.id).populate("card");

    if (!rsvp) {
      return res.status(404).json({
        success: false,
        message: "RSVP not found"
      });
    }

    if (rsvp.card.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this RSVP"
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


// ======================================================
// GET RSVP SUMMARY
// ======================================================

const getRSVPSummary = async (req, res) => {
  try {
    const card = await Card.findOne({
      _id: req.params.cardId,
      owner: req.user._id
    });

    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found"
      });
    }

    const rsvps = await RSVP.find({
      card: req.params.cardId
    });

    const attending = rsvps.filter(
      rsvp => rsvp.status === "attending"
    );

    const notAttending = rsvps.filter(
      rsvp => rsvp.status === "not-attending"
    );

    const maybe = rsvps.filter(
      rsvp => rsvp.status === "maybe"
    );

    const totalGuests = attending.reduce(
      (total, rsvp) => total + (rsvp.guestsCount || 0),
      0
    );

    res.status(200).json({
      success: true,
      summary: {
        totalResponses: rsvps.length,
        attending: attending.length,
        notAttending: notAttending.length,
        maybe: maybe.length,
        totalGuests
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


// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  createRSVP,
  getCardRSVPs,
  getRSVPById,
  updateRSVP,
  deleteRSVP,
  getRSVPSummary
};