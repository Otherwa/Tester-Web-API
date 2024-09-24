const mongoose = require('mongoose')

const familyMemberSchema = new mongoose.Schema({
    name: { type: String, required: true },
    relation: { type: String, required: true },
    contact: { type: String, required: true },
});

const userSchema = new mongoose.Schema({
    name: { type: String },
    email: { type: String, unique: true },
    password: { type: String, required: true },
    phone: { type: String },
    role: { type: String },
    familyDetails: [familyMemberSchema], // Array of family member details
});

const User = mongoose.model('User', userSchema);
module.exports = User;
