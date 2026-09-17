const mongoose = require("mongoose");

const fieldSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true
    },

    label: {
      type: String,
      required: true
    },

    type: {
      type: String,
      enum: [
        "text",
        "textarea",
        "number",
        "date",
        "image",
        "audio",
        "color",
        "select"
      ],
      required: true
    },

    required: {
      type: Boolean,
      default: false
    },

    defaultValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },

    options: [
      {
        type: String
      }
    ]
  },
  {
    _id: false
  }
);

const elementSchema = new mongoose.Schema(
  {
    elementId: {
      type: String,
      required: true
    },

    type: {
      type: String,
      enum: ["text", "image", "shape", "video"],
      required: true
    },

    value: {
      type: String
    },

    source: {
      type: String
    },

    position: {
      x: Number,
      y: Number
    },

    size: {
      width: Number,
      height: Number
    },

    style: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },

    editable: {
      type: Boolean,
      default: false
    }
  },
  {
    _id: false
  }
);

const templateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    category: {
      type: String,
      required: true
    },

    type: {
      type: String,
      enum: ["dynamic", "image-card"],
      default: "dynamic"
    },

    thumbnail: {
      type: String
    },

    price: {
      type: Number,
      default: 0,
      min: 0
    },

    currency: {
      type: String,
      default: "USD"
    },

    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft"
    },

    dimensions: {
      width: {
        type: Number,
        default: 1080
      },

      height: {
        type: Number,
        default: 1920
      }
    },

    fields: [fieldSchema],

    elements: [elementSchema],

    settings: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Template", templateSchema);