
const mongoose = require("mongoose");

const User = require("../models/User");
const Template = require("../models/Template");
const Card = require("../models/Card");
const TemplateAccess = require("../models/TemplateAccess");
const RSVP = require("../models/RSVP");
const InvitationRecipient = require("../models/InvitationRecipient");

/*
|--------------------------------------------------------------------------
| Admin Dashboard Overview
|--------------------------------------------------------------------------
*/

const getAdminDashboard = async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalCustomers,
      totalDesigners,
      totalTemplates,
      publishedTemplates,
      totalCards,
      publishedCards,
      draftCards,
      totalDesignGrants,
      activeDesignGrants,
      totalRSVPs,
      totalRecipients,
      recentUsers,
      recentCards,
      recentGrants,
      revenueStats,
      rsvpStats
    ] = await Promise.all([
      User.countDocuments(),

      User.countDocuments({
        isActive: true
      }),

      User.countDocuments({
        role: "customer"
      }),

      User.countDocuments({
        role: "designer"
      }),

      Template.countDocuments(),

      Template.countDocuments({
        status: "published"
      }),

      Card.countDocuments(),

      Card.countDocuments({
        status: "published"
      }),

      Card.countDocuments({
        status: "draft"
      }),

      TemplateAccess.countDocuments(),

      TemplateAccess.countDocuments({
        status: "active"
      }),

      RSVP.countDocuments(),

      InvitationRecipient.countDocuments({
        isActive: true
      }),

      User.find()
        .select("firstName lastName email role isActive createdAt")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),

      Card.find()
        .select("title slug status owner template createdAt")
        .populate("owner", "firstName lastName email")
        .populate("template", "name category")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),

      TemplateAccess.find()
        .populate("user", "firstName lastName email")
        .populate("template", "name category")
        .select("user template pricePaid currency status grantedAt")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),

      TemplateAccess.aggregate([
        {
          $match: {
            pricePaid: { $gt: 0 }
          }
        },
        {
          $group: {
            _id: "$currency",
            totalRevenue: {
              $sum: "$pricePaid"
            },
            paidGrants: {
              $sum: 1
            }
          }
        },
        {
          $sort: {
            totalRevenue: -1
          }
        }
      ]),

      RSVP.aggregate([
        {
          $group: {
            _id: "$status",
            count: {
              $sum: 1
            },
            guests: {
              $sum: {
                $cond: [
                  { $eq: ["$status", "attending"] },
                  "$guestsCount",
                  0
                ]
              }
            }
          }
        }
      ])
    ]);

    const rsvpSummary = {
      attending: 0,
      notAttending: 0,
      maybe: 0,
      totalAttendingGuests: 0
    };

    for (const stat of rsvpStats) {
      if (stat._id === "attending") {
        rsvpSummary.attending = stat.count;
        rsvpSummary.totalAttendingGuests = stat.guests;
      }

      if (stat._id === "not-attending") {
        rsvpSummary.notAttending = stat.count;
      }

      if (stat._id === "maybe") {
        rsvpSummary.maybe = stat.count;
      }
    }

    return res.status(200).json({
      success: true,
      dashboard: {
        users: {
          total: totalUsers,
          active: activeUsers,
          customers: totalCustomers,
          designers: totalDesigners
        },

        templates: {
          total: totalTemplates,
          published: publishedTemplates
        },

        cards: {
          total: totalCards,
          published: publishedCards,
          draft: draftCards
        },

        designGrants: {
          total: totalDesignGrants,
          active: activeDesignGrants
        },

        invitations: {
          totalRecipients
        },

        rsvps: {
          total: totalRSVPs,
          ...rsvpSummary
        },

        sales: {
          revenueByCurrency: revenueStats
        },

        recentActivity: {
          users: recentUsers,
          cards: recentCards,
          designGrants: recentGrants
        }
      }
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve admin dashboard"
    });
  }
};

/*
|--------------------------------------------------------------------------
| Monthly Platform Statistics
|--------------------------------------------------------------------------
|
| Returns the last 12 calendar months.
| Useful for future dashboard charts.
|--------------------------------------------------------------------------
*/

const getMonthlyStatistics = async (req, res) => {
  try {
    const startDate = new Date();
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);
    startDate.setMonth(startDate.getMonth() - 11);

    const monthlyGroup = {
      year: { $year: "$createdAt" },
      month: { $month: "$createdAt" }
    };

    const aggregateMonthly = (Model) =>
      Model.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: monthlyGroup,
            count: { $sum: 1 }
          }
        },
        {
          $sort: {
            "_id.year": 1,
            "_id.month": 1
          }
        }
      ]);

    const [users, cards, grants, rsvps] = await Promise.all([
      aggregateMonthly(User),
      aggregateMonthly(Card),
      aggregateMonthly(TemplateAccess),
      aggregateMonthly(RSVP)
    ]);

    const months = [];

    for (let i = 0; i < 12; i++) {
      const date = new Date(startDate);
      date.setMonth(startDate.getMonth() + i);

      const year = date.getFullYear();
      const month = date.getMonth() + 1;

      const findCount = (data) =>
        data.find(
          (item) =>
            item._id.year === year &&
            item._id.month === month
        )?.count || 0;

      months.push({
        month: `${year}-${String(month).padStart(2, "0")}`,
        users: findCount(users),
        cards: findCount(cards),
        designGrants: findCount(grants),
        rsvps: findCount(rsvps)
      });
    }

    return res.status(200).json({
      success: true,
      months
    });
  } catch (error) {
    console.error("Monthly statistics error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve monthly statistics"
    });
  }
};

/*
|--------------------------------------------------------------------------
| Admin Customer Statistics
|--------------------------------------------------------------------------
*/

const getCustomerStatistics = async (req, res) => {
  try {
    const customers = await User.aggregate([
      {
        $match: {
          role: "customer"
        }
      },
      {
        $lookup: {
          from: Card.collection.name,
          localField: "_id",
          foreignField: "owner",
          as: "cards"
        }
      },
      {
        $lookup: {
          from: TemplateAccess.collection.name,
          localField: "_id",
          foreignField: "user",
          as: "designGrants"
        }
      },
      {
        $project: {
          firstName: 1,
          lastName: 1,
          email: 1,
          isActive: 1,
          createdAt: 1,
          totalCards: {
            $size: "$cards"
          },
          totalDesignGrants: {
            $size: "$designGrants"
          },
          recordedSpend: {
            $sum: "$designGrants.pricePaid"
          }
        }
      },
      {
        $sort: {
          createdAt: -1
        }
      }
    ]);

    return res.status(200).json({
      success: true,
      count: customers.length,
      customers
    });
  } catch (error) {
    console.error("Customer statistics error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve customer statistics"
    });
  }
};

module.exports = {
  getAdminDashboard,
  getMonthlyStatistics,
  getCustomerStatistics
};
