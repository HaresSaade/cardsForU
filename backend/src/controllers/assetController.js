const Asset = require("../models/Asset");


// ======================================================
// CREATE ASSET RECORD
// ======================================================

const createAsset = async (req, res) => {
  try {
    const {
      type,
      url,
      publicId,
      filename,
      mimeType,
      size
    } = req.body;

    const asset = await Asset.create({
      owner: req.user._id,
      type,
      url,
      publicId,
      filename,
      mimeType,
      size
    });

    res.status(201).json({
      success: true,
      message: "Asset created successfully",
      asset
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create asset",
      error: error.message
    });
  }
};


// ======================================================
// GET LOGGED-IN USER ASSETS
// ======================================================

const getMyAssets = async (req, res) => {
  try {
    const assets = await Asset.find({
      owner: req.user._id
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: assets.length,
      assets
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch assets",
      error: error.message
    });
  }
};


// ======================================================
// GET ONE ASSET
// ======================================================

const getAssetById = async (req, res) => {
  try {
    const asset = await Asset.findOne({
      _id: req.params.id,
      owner: req.user._id
    });

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: "Asset not found"
      });
    }

    res.status(200).json({
      success: true,
      asset
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch asset",
      error: error.message
    });
  }
};


// ======================================================
// UPDATE ASSET METADATA
// ======================================================

const updateAsset = async (req, res) => {
  try {
    const {
      type,
      url,
      publicId,
      filename,
      mimeType,
      size
    } = req.body;

    const asset = await Asset.findOne({
      _id: req.params.id,
      owner: req.user._id
    });

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: "Asset not found"
      });
    }

    if (type !== undefined) asset.type = type;
    if (url !== undefined) asset.url = url;
    if (publicId !== undefined) asset.publicId = publicId;
    if (filename !== undefined) asset.filename = filename;
    if (mimeType !== undefined) asset.mimeType = mimeType;
    if (size !== undefined) asset.size = size;

    await asset.save();

    res.status(200).json({
      success: true,
      message: "Asset updated successfully",
      asset
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update asset",
      error: error.message
    });
  }
};


// ======================================================
// DELETE ASSET RECORD
// ======================================================

const deleteAsset = async (req, res) => {
  try {
    const asset = await Asset.findOneAndDelete({
      _id: req.params.id,
      owner: req.user._id
    });

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: "Asset not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Asset deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete asset",
      error: error.message
    });
  }
};


// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  createAsset,
  getMyAssets,
  getAssetById,
  updateAsset,
  deleteAsset
};