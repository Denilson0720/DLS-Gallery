const mongoose = require('mongoose');
const Schema = mongoose.Schema;
// virtual property called thumbnail, available upon request

// pass this to allow mongoose to pass on virtual properties, by default is false
const opts = {toJSON:{virtuals:true}};

const imgArraySchema = new Schema({
    // url from cloudinary
    url:String,
    filename:String
})
imgArraySchema.virtual('thumbnail').get(function(){
    // using a virtual, replace with image manipulation
    return this.url.replace('/upload','/upload/w_200')
})
const ImageSchema  = new Schema({
    id:Schema.Types.ObjectId,
    images:[imgArraySchema]
},opts)
module.exports = mongoose.model('imageSchema',ImageSchema);
