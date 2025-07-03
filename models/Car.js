import mongoose from "mongoose";

const arrayLimit = (val) => {
  return val.length >= 1 && val.length <= 4;
};

const CarsSchema = new mongoose.Schema(
  {
    modelName: {
      type: String,
      required: true,
      trim: true,
    },
    engineType: {
      type: String,
      required: true,
      enum: ["Petrol", "Diesel", "Electric", "Hybrid"],
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    color: {
      type: String,
      required: true,
      enum: ["Red", "Blue", "White", "Black"],
    },
    seatingCapacity: {
      type: Number,
      required: true,
      min: 2,
      max: 6,
    },
    mileage: {
      type: Number,
      required: true,
      min: 0,
    },
    transmissionType: {
      type: String,
      required: true,
      enum: ["Automatic", "Manual"],
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    carImages: {
      type: [String],
      required: true,
      validate: [arrayLimit, `{PATH} exceeds the limit of 4 images`],
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    emiPerMonth: {
      type: Number,
      required: false,
      min: 0,
    },
    carsCount: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  {
    timestamps: true,
  }
);

const Car = mongoose.model("Car", CarsSchema);
export default Car;
