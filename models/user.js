const mongoose = require('mongoose');
const Schema = mongoose.Schema;
// 
const passportLocalMongoose = require('passport-local-mongoose');

const UserSchema = new Schema({
    email:{
        type:String,
        required:true,
        // sets up index
        unique:true
    },
    // testing
    accessToken: {
        type: String,
        enum: [process.env.ACCESS_TOKEN1, process.env.ACCESS_TOKEN2],

    }

});


// add to the schema: usernmae,password, sets up validators to mkae sure username are not duplicates within db
UserSchema.plugin(passportLocalMongoose);
module.exports = mongoose.model('User',UserSchema);