const Card = require("../models/Card");
const TemplateAccess = require("../models/TemplateAccess");
const RSVP = require("../models/RSVP");

/*
|--------------------------------------------------------------------------
| Customer Dashboard
|--------------------------------------------------------------------------
|
| Returns everything the logged-in customer needs for their dashboard:
|
| - Template/design access
| - Cards
| - Card status
| - Public slug
| - RSVP statistics
|
*/

const getMyDashboard = async (req, res) => {
  try {
    const userId = req.user._id;

    /*
    |--------------------------------------------------------------------------
    | Get Template Access
    |--------------------------------------------------------------------------
    */

    const templateAccess = await TemplateAccess.find({
      user: userId,
      status: "active"
    })
      .populate("template")
      .populate("card")
      .sort({
        createdAt: -1
      });

    /*
    |--------------------------------------------------------------------------
    | Get Customer Cards
    |--------------------------------------------------------------------------
    */

    const cards = await Card.find({
      owner: userId
    })
      .populate("template")
      .sort({
        createdAt: -1
      });

    /*
    |--------------------------------------------------------------------------
    | Get RSVP Statistics
    |--------------------------------------------------------------------------
    */

    const cardIds = cards.map(
      (card) => card._id
    );

    let rsvpStats = [];

    if (cardIds.length > 0) {
      rsvpStats = await RSVP.aggregate([
        {
          $match: {
            card: {
              $in: cardIds
            }
          }
        },
        {
          $group: {
            _id: {
              card: "$card",
              status: "$status"
            },

            responses: {
              $sum: 1
            },

            guests: {
              $sum: "$guestsCount"
            }
          }
        }
      ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Build RSVP Map
    |--------------------------------------------------------------------------
    */

    const rsvpMap = {};

    for (const stat of rsvpStats) {
      const cardId =
        stat._id.card.toString();

      if (!rsvpMap[cardId]) {
        rsvpMap[cardId] = {
          totalResponses: 0,
          attendingResponses: 0,
          notAttendingResponses: 0,
          maybeResponses: 0,
          totalGuestsAttending: 0
        };
      }

      rsvpMap[cardId].totalResponses +=
        stat.responses;

      if (stat._id.status === "attending") {
        rsvpMap[cardId].attendingResponses +=
          stat.responses;

        rsvpMap[cardId].totalGuestsAttending +=
          stat.guests;
      }

      if (
        stat._id.status === "not-attending"
      ) {
        rsvpMap[
          cardId
        ].notAttendingResponses +=
          stat.responses;
      }

      if (stat._id.status === "maybe") {
        rsvpMap[cardId].maybeResponses +=
          stat.responses;
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Prepare Cards For Dashboard
    |--------------------------------------------------------------------------
    */

    const dashboardCards = cards.map(
      (card) => {
        const cardId =
          card._id.toString();

        const statistics =
          rsvpMap[cardId] || {
            totalResponses: 0,
            attendingResponses: 0,
            notAttendingResponses: 0,
            maybeResponses: 0,
            totalGuestsAttending: 0
          };

        return {
          id: card._id,

          title: card.title,

          slug: card.slug,

          status: card.status,

          template: card.template,

          settings: card.settings,

          publishedAt: card.publishedAt,

          expiresAt: card.expiresAt,

          createdAt: card.createdAt,

          updatedAt: card.updatedAt,

          sharePath:
            card.status === "published" &&
            card.slug &&
            card.settings?.shareEnabled !== false
              ? `/card/${card.slug}`
              : null,

          rsvp: statistics
        };
      }
    );

    /*
    |--------------------------------------------------------------------------
    | Prepare Template Access
    |--------------------------------------------------------------------------
    */

    const designs = templateAccess.map(
      (access) => {
        return {
          accessId: access._id,

          template: access.template,

          card: access.card,

          status: access.status,

          pricePaid: access.pricePaid,

          notes: access.notes,

          grantedAt: access.grantedAt
        };
      }
    );

    /*
    |--------------------------------------------------------------------------
    | Dashboard Totals
    |--------------------------------------------------------------------------
    */

    const totalPublishedCards =
      dashboardCards.filter(
        (card) =>
          card.status === "published"
      ).length;

    const totalDraftCards =
      dashboardCards.filter(
        (card) =>
          card.status === "draft"
      ).length;

    const totalRSVPResponses =
      dashboardCards.reduce(
        (total, card) =>
          total +
          card.rsvp.totalResponses,
        0
      );

    const totalGuestsAttending =
      dashboardCards.reduce(
        (total, card) =>
          total +
          card.rsvp.totalGuestsAttending,
        0
      );

    /*
    |--------------------------------------------------------------------------
    | Response
    |--------------------------------------------------------------------------
    */

    res.status(200).json({
      success: true,

      user: {
        id: req.user._id,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        email: req.user.email,
        role: req.user.role
      },

      overview: {
        totalDesigns: designs.length,
        totalCards: dashboardCards.length,
        publishedCards: totalPublishedCards,
        draftCards: totalDraftCards,
        totalRSVPResponses,
        totalGuestsAttending
      },

      designs,

      cards: dashboardCards
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        "Failed to load dashboard",
      error: error.message
    });
  }
};

module.exports = {
  getMyDashboard
};
