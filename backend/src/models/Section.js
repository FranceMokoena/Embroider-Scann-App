"use strict";

const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema(
  {
    section: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    manager: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('Section', sectionSchema);
