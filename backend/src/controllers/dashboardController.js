const Card = require("../models/Card");
const TemplateAccess = require("../models/TemplateAccess");
const RSVP = require("../models/RSVP");

/*
|--------------------------------------------------------------------------
| Customer Dashboard
|--------------------------------------------------------------------------
|
| Returns everything needed for the customer's main dashboard:
|
| - Account information
| - Purchased/granted designs
| - Event labels
| - Cards
| - Share links
| - RSVP statistics
| - Dashboard totals
|
*/

const getMyDashboard = async (req, res) => {
  try {
    const userId = req.user._id;

    /*
    |--------------------------------------------------------------------------
    | Get Active Template Access
    |--------------------------------------------------------------------------
    */

    const templateAccess =
      await TemplateAccess.find({
        user: userId,
        status: "active"
      })
        .populate("template")
        .populate("card")
        .sort({
          grantedAt: -1
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
    | RSVP Statistics
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

      if (
        stat._id.status === "attending"
      ) {
        rsvpMap[
          cardId
        ].attendingResponses +=
          stat.responses;

        rsvpMap[
          cardId
        ].totalGuestsAttending +=
          stat.guests;
      }

      if (
        stat._id.status ===
        "not-attending"
      ) {
        rsvpMap[
          cardId
        ].notAttendingResponses +=
          stat.responses;
      }

      if (
        stat._id.status === "maybe"
      ) {
        rsvpMap[
          cardId
        ].maybeResponses +=
          stat.responses;
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Format Cards
    |--------------------------------------------------------------------------
    */

    const dashboardCards = cards.map(
      (card) => {
        const cardId =
          card._id.toString();

        const rsvp =
          rsvpMap[cardId] || {
            totalResponses: 0,
            attendingResponses: 0,
            notAttendingResponses: 0,
            maybeResponses: 0,
            totalGuestsAttending: 0
          };

        const expired =
          card.expiresAt &&
          new Date(card.expiresAt) <=
            new Date();

        const shareAvailable =
          card.status === "published" &&
          !expired &&
          card.slug &&
          card.settings?.shareEnabled !==
            false;

        return {
          id: card._id,

          title: card.title,

          slug: card.slug,

          status: card.status,

          template: card.template,

          data: card.data,

          customization:
            card.customization,

          settings: card.settings,

          publishedAt:
            card.publishedAt,

          expiresAt:
            card.expiresAt,

          isExpired: Boolean(expired),

          sharePath: shareAvailable
            ? `/card/${card.slug}`
            : null,

          rsvp,

          createdAt:
            card.createdAt,

          updatedAt:
            card.updatedAt
        };
      }
    );

    /*
    |--------------------------------------------------------------------------
    | Create Quick Card Lookup
    |--------------------------------------------------------------------------
    */

    const cardMap = {};

    for (const card of dashboardCards) {
      cardMap[card.id.toString()] =
        card;
    }

    /*
    |--------------------------------------------------------------------------
    | Format Purchased / Granted Designs
    |--------------------------------------------------------------------------
    |
    | Every TemplateAccess represents one event/use.
    |
    | Example:
    |
    | Elegant Wedding Template
    |
    | Access #1
    | → John & Maria Wedding
    | → Card A
    |
    | Access #2
    | → Anniversary
    | → Card B
    |
    */

    const designs = templateAccess.map(
      (access) => {
        let attachedCard = null;

        if (access.card) {
          const cardId =
            access.card._id
              ? access.card._id.toString()
              : access.card.toString();

          attachedCard =
            cardMap[cardId] || null;
        }

        return {
          accessId: access._id,

          eventLabel:
            access.eventLabel || "",

          template:
            access.template,

          status:
            access.status,

          card:
            attachedCard,

          hasCard:
            Boolean(access.card),

          pricePaid:
            access.pricePaid,

          currency:
            access.currency || "USD",

          notes:
            access.notes || "",

          grantedAt:
            access.grantedAt,

          createdAt:
            access.createdAt
        };
      }
    );

    /*
    |--------------------------------------------------------------------------
    | Dashboard Totals
    |--------------------------------------------------------------------------
    */

    const publishedCards =
      dashboardCards.filter(
        (card) =>
          card.status === "published" &&
          !card.isExpired
      ).length;

    const draftCards =
      dashboardCards.filter(
        (card) =>
          card.status === "draft"
      ).length;

    const expiredCards =
      dashboardCards.filter(
        (card) => card.isExpired
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
          card.rsvp
            .totalGuestsAttending,
        0
      );

    const unusedDesigns =
      designs.filter(
        (design) =>
          !design.hasCard
      ).length;

    /*
    |--------------------------------------------------------------------------
    | Response
    |--------------------------------------------------------------------------
    */

    res.status(200).json({
      success: true,

      user: {
        id: req.user._id,
        firstName:
          req.user.firstName,
        lastName:
          req.user.lastName,
        email:
          req.user.email,
        role:
          req.user.role
      },

      overview: {
        totalDesigns:
          designs.length,

        unusedDesigns,

        totalCards:
          dashboardCards.length,

        publishedCards,

        draftCards,

        expiredCards,

        totalRSVPResponses,

        totalGuestsAttending
      },

      designs,

      cards:
        dashboardCards
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        "Failed to load dashboard",
      error:
        error.message
    });
  }
};

module.exports = {
  getMyDashboard
};
