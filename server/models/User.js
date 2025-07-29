import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      min: 2,
      max: 100,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      max: 50,
    },
    password: {
      type: String,
      required: true,
      min: 5,
    },
    phoneNumber: {
      type: String,
    },
    role: {
      type: String,
      enum: ["user", "admin", "superadmin"],
      default: "admin",
    },
  },
  {
    timestamps: true,
  }
);
const User = mongoose.model("User", UserSchema);
export default User;
// This code defines a Mongoose schema for a User model in a Node.js application.
// The schema includes fields for name, email, password, and phone number, with validation rules
// such as required fields, minimum and maximum lengths, and unique email addresses.
// The timestamps option automatically adds createdAt and updatedAt fields to the schema.
// The User model is then exported for use in other parts of the application, such as controllers or routes.
// This schema can be used to create, read, update, and delete user records in a MongoDB database.
// The User model can be used in various parts of the application, such as controllers or routes,
// to interact with the user data in the MongoDB database.
