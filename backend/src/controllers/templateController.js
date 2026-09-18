const Template = require("../models/Template");
const Card = require("../models/Card");
const TemplateAccess = require("../models/TemplateAccess");

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

/*
|--------------------------------------------------------------------------
| Create Template
|--------------------------------------------------------------------------
|
| Admin / Designer
|
*/

const createTemplate = async (req, res) => {
  try {
    const {
      name,
      slug,
      category,
      type,
      thumbnail,
      price,
      currency,
      status,
      dimensions,
      fields,
      elements,
      settings
    } = req.body;

    if (!name || !slug || !category) {
      return res.status(400).json({
        success: false,
        message: "Name, slug and category are required"
      });
    }

    const normalizedSlug = normalizeSlug(slug);

    if (!normalizedSlug) {
      return res.status(400).json({
        success: false,
        message: "Invalid template slug"
      });
    }

    const existingTemplate = await Template.findOne({
      slug: normalizedSlug
    });

    if (existingTemplate) {
      return res.status(400).json({
        success: false,
        message: "A template with this slug already exists"
      });
    }

    const template = await Template.create({
      name,
      slug: normalizedSlug,
      category,
      type,
      thumbnail,
      price,
      currency,
      status,
      dimensions,
      fields: fields || [],
      elements: elements || [],
      settings: settings || {},
      createdBy: req.user._id
    });

    const populatedTemplate = await Template.findById(
      template._id
    ).populate(
      "createdBy",
      "firstName lastName email role"
    );

    res.status(201).json({
      success: true,
      message: "Template created successfully",
      template: populatedTemplate
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create template",
      error: error.message
    });
  }
};

/*
|--------------------------------------------------------------------------
| Public - Get Published Templates
|--------------------------------------------------------------------------
|
| This is the public template catalog.
|
| Draft and archived templates are NOT exposed.
|
| Optional filters:
|
| ?category=wedding
| ?type=dynamic
|
*/

const getTemplates = async (req, res) => {
  try {
    const {
      category,
      type
    } = req.query;

    const filter = {
      status: "published"
    };

    if (category) {
      filter.category = category;
    }

    if (type) {
      filter.type = type;
    }

    const templates = await Template.find(filter)
      .select("-createdBy")
      .sort({
        createdAt: -1
      });

    res.status(200).json({
      success: true,
      count: templates.length,
      templates
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch templates",
      error: error.message
    });
  }
};

/*
|--------------------------------------------------------------------------
| Public - Get Published Template By Slug
|--------------------------------------------------------------------------
*/

const getTemplateBySlug = async (req, res) => {
  try {
    const normalizedSlug = normalizeSlug(
      req.params.slug
    );

    const template = await Template.findOne({
      slug: normalizedSlug,
      status: "published"
    }).select("-createdBy");

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found"
      });
    }

    res.status(200).json({
      success: true,
      template
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch template",
      error: error.message
    });
  }
};

/*
|--------------------------------------------------------------------------
| Admin / Designer - Get All Templates
|--------------------------------------------------------------------------
|
| Includes:
| - draft
| - published
| - archived
|
*/

const getAllTemplates = async (req, res) => {
  try {
    const {
      status,
      category,
      type
    } = req.query;

    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (category) {
      filter.category = category;
    }

    if (type) {
      filter.type = type;
    }

    const templates = await Template.find(filter)
      .populate(
        "createdBy",
        "firstName lastName email role"
      )
      .sort({
        createdAt: -1
      });

    res.status(200).json({
      success: true,
      count: templates.length,
      templates
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch templates",
      error: error.message
    });
  }
};

/*
|--------------------------------------------------------------------------
| Admin / Designer - Get Template By ID
|--------------------------------------------------------------------------
*/

const getTemplateById = async (req, res) => {
  try {
    const template = await Template.findById(
      req.params.id
    ).populate(
      "createdBy",
      "firstName lastName email role"
    );

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found"
      });
    }

    res.status(200).json({
      success: true,
      template
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch template",
      error: error.message
    });
  }
};

/*
|--------------------------------------------------------------------------
| Update Template
|--------------------------------------------------------------------------
|
| Admin / Designer
|
*/

const updateTemplate = async (req, res) => {
  try {
    const {
      name,
      slug,
      category,
      type,
      thumbnail,
      price,
      currency,
      dimensions,
      fields,
      elements,
      settings
    } = req.body;

    const template = await Template.findById(
      req.params.id
    );

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Update Slug
    |--------------------------------------------------------------------------
    */

    if (slug !== undefined) {
      const normalizedSlug = normalizeSlug(slug);

      if (!normalizedSlug) {
        return res.status(400).json({
          success: false,
          message: "Invalid template slug"
        });
      }

      if (normalizedSlug !== template.slug) {
        const existingTemplate = await Template.findOne({
          slug: normalizedSlug,
          _id: {
            $ne: template._id
          }
        });

        if (existingTemplate) {
          return res.status(400).json({
            success: false,
            message: "A template with this slug already exists"
          });
        }
      }

      template.slug = normalizedSlug;
    }

    if (name !== undefined) {
      template.name = name;
    }

    if (category !== undefined) {
      template.category = category;
    }

    if (type !== undefined) {
      template.type = type;
    }

    if (thumbnail !== undefined) {
      template.thumbnail = thumbnail;
    }

    if (price !== undefined) {
      template.price = price;
    }

    if (currency !== undefined) {
      template.currency = currency;
    }

    if (dimensions !== undefined) {
      template.dimensions = dimensions;
    }

    if (fields !== undefined) {
      template.fields = fields;
    }

    if (elements !== undefined) {
      template.elements = elements;
    }

    if (settings !== undefined) {
      template.settings = settings;
    }

    await template.save();

    const populatedTemplate = await Template.findById(
      template._id
    ).populate(
      "createdBy",
      "firstName lastName email role"
    );

    res.status(200).json({
      success: true,
      message: "Template updated successfully",
      template: populatedTemplate
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update template",
      error: error.message
    });
  }
};

/*
|--------------------------------------------------------------------------
| Publish Template
|--------------------------------------------------------------------------
*/

const publishTemplate = async (req, res) => {
  try {
    const template = await Template.findById(
      req.params.id
    );

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found"
      });
    }

    template.status = "published";

    await template.save();

    res.status(200).json({
      success: true,
      message: "Template published successfully",
      template
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to publish template",
      error: error.message
    });
  }
};

/*
|--------------------------------------------------------------------------
| Archive Template
|--------------------------------------------------------------------------
|
| Existing cards continue referencing the template.
| The template simply disappears from the public catalog.
|
*/

const archiveTemplate = async (req, res) => {
  try {
    const template = await Template.findById(
      req.params.id
    );

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found"
      });
    }

    template.status = "archived";

    await template.save();

    res.status(200).json({
      success: true,
      message: "Template archived successfully",
      template
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to archive template",
      error: error.message
    });
  }
};

/*
|--------------------------------------------------------------------------
| Move Template Back To Draft
|--------------------------------------------------------------------------
*/

const moveTemplateToDraft = async (req, res) => {
  try {
    const template = await Template.findById(
      req.params.id
    );

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found"
      });
    }

    template.status = "draft";

    await template.save();

    res.status(200).json({
      success: true,
      message: "Template moved to draft successfully",
      template
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to move template to draft",
      error: error.message
    });
  }
};

/*
|--------------------------------------------------------------------------
| Delete Template
|--------------------------------------------------------------------------
|
| Admin only.
|
| We DO NOT allow deleting a template if:
|
| - a Card uses it
| - a customer has TemplateAccess to it
|
| In those cases the admin should archive it instead.
|
*/

const deleteTemplate = async (req, res) => {
  try {
    const template = await Template.findById(
      req.params.id
    );

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found"
      });
    }

    const cardExists = await Card.exists({
      template: template._id
    });

    if (cardExists) {
      return res.status(400).json({
        success: false,
        message:
          "Template cannot be deleted because cards are using it. Archive it instead."
      });
    }

    const accessExists = await TemplateAccess.exists({
      template: template._id
    });

    if (accessExists) {
      return res.status(400).json({
        success: false,
        message:
          "Template cannot be deleted because customers have access to it. Archive it instead."
      });
    }

    await template.deleteOne();

    res.status(200).json({
      success: true,
      message: "Template deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete template",
      error: error.message
    });
  }
};

module.exports = {
  createTemplate,
  getTemplates,
  getTemplateBySlug,
  getAllTemplates,
  getTemplateById,
  updateTemplate,
  publishTemplate,
  archiveTemplate,
  moveTemplateToDraft,
  deleteTemplate
};
