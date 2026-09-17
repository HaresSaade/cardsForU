const Template = require("../models/Template");


// ======================================================
// CREATE TEMPLATE
// ======================================================

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

    const existingTemplate = await Template.findOne({ slug });

    if (existingTemplate) {
      return res.status(400).json({
        success: false,
        message: "A template with this slug already exists"
      });
    }

    const template = await Template.create({
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
      settings,
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: "Template created successfully",
      template
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create template",
      error: error.message
    });
  }
};


// ======================================================
// GET ALL TEMPLATES
// ======================================================

const getTemplates = async (req, res) => {
  try {
    const templates = await Template.find()
      .populate("createdBy", "firstName lastName email")
      .sort({ createdAt: -1 });

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


// ======================================================
// GET TEMPLATE BY SLUG
// ======================================================

const getTemplateBySlug = async (req, res) => {
  try {
    const template = await Template.findOne({
      slug: req.params.slug
    }).populate("createdBy", "firstName lastName email");

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


// ======================================================
// GET TEMPLATE BY ID
// ======================================================

const getTemplateById = async (req, res) => {
  try {
    const template = await Template.findById(
      req.params.id
    ).populate("createdBy", "firstName lastName email");

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


// ======================================================
// UPDATE TEMPLATE
// ======================================================

const updateTemplate = async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found"
      });
    }

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

    if (slug && slug !== template.slug) {
      const existingTemplate = await Template.findOne({ slug });

      if (existingTemplate) {
        return res.status(400).json({
          success: false,
          message: "A template with this slug already exists"
        });
      }

      template.slug = slug;
    }

    if (name !== undefined) template.name = name;
    if (category !== undefined) template.category = category;
    if (type !== undefined) template.type = type;
    if (thumbnail !== undefined) template.thumbnail = thumbnail;
    if (price !== undefined) template.price = price;
    if (currency !== undefined) template.currency = currency;
    if (status !== undefined) template.status = status;
    if (dimensions !== undefined) template.dimensions = dimensions;
    if (fields !== undefined) template.fields = fields;
    if (elements !== undefined) template.elements = elements;
    if (settings !== undefined) template.settings = settings;

    await template.save();

    res.status(200).json({
      success: true,
      message: "Template updated successfully",
      template
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update template",
      error: error.message
    });
  }
};


// ======================================================
// DELETE TEMPLATE
// ======================================================

const deleteTemplate = async (req, res) => {
  try {
    const template = await Template.findByIdAndDelete(req.params.id);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found"
      });
    }

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


// ======================================================
// PUBLISH TEMPLATE
// ======================================================

const publishTemplate = async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);

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


// ======================================================
// ARCHIVE TEMPLATE
// ======================================================

const archiveTemplate = async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);

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


// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  createTemplate,
  getTemplates,
  getTemplateBySlug,
  getTemplateById,
  updateTemplate,
  deleteTemplate,
  publishTemplate,
  archiveTemplate
};