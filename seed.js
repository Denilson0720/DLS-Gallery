require('dotenv').config();
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

// Connect to MongoDB
mongoose.connect(process.env.DB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define the schema for the imageschemas collection
const imageSchema = new mongoose.Schema(
  {
    images: [
      {
        url: String,
        filename: String,
      },
    ],
  },
  { collection: 'imageschemas' } // 👈 explicitly use the correct collection
);

// Model
const ImageSchemaModel = mongoose.model('ImageSchema', imageSchema);

// Main function
async function uploadAndSaveImage(localImagePath) {
  try {
    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(localImagePath, {
      folder: 'DemoTesting',
    });

    const imageData = {
      url: result.secure_url,
      filename: result.public_id,
    };

    // Save to MongoDB in the first (or new) document
    let doc = await ImageSchemaModel.findOne();
    if (doc) {
      doc.images.push(imageData);
      await doc.save();
    } else {
      await ImageSchemaModel.create({ images: [imageData] });
    }

    console.log('✅ Image uploaded and saved to imageschemas collection.');
    console.log(imageData);
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    mongoose.disconnect();
  }
}

// === Run it ===
const filePath = path.join(__dirname, './demo_sample_images/mustangs.JPG'); // Change this to your image file
uploadAndSaveImage(filePath);
