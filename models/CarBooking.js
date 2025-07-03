import mongoose from "mongoose";

const CarBookingSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    carId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Car",
      required: true,
      index: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    bookingText: {
      type: String,
      required: true,
      minlength: 10,
      maxlength: 500,
    },
    ownerReplyToBooking: {
      type: String,
      validate: {
        validator: function () {
          return (
            this.bookingStatus === "Accepted" ||
            this.bookingStatus === "Rejected"
          );
        },
        message:
          "Owner reply is only allowed for Accepted or Rejected bookings.",
      },
    },
    bookingStatus: {
      type: String,
      enum: ["Pending", "Accepted", "Rejected"],
      default: "Pending",
    },
    bookingDate: {
      type: Date,
      default: Date.now,
    },
    expiryDate: {
      type: Date,
    },
    ownerReplyToBookingDate: {
      type: Date,
    },
    whyRejected: {
      type: String,
    },
  },
  { timestamps: true }
);

CarBookingSchema.pre("save", function (next) {
  if (!this.expiryDate) {
    this.expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }
  if (this.isModified("ownerReplyToBooking") && !this.ownerReplyToBookingDate) {
    this.ownerReplyToBookingDate = new Date();
  }
  next();
});

CarBookingSchema.virtual("customerName").get(function () {
  return `${
    this.customerId?.firstName || ""
  } ${this.customerId?.lastName || ""}`;
});

CarBookingSchema.virtual("ownerName").get(function () {
  return `${this.ownerId?.firstName || ""} ${this.ownerId?.lastName || ""}`;
});

CarBookingSchema.set("toObject", { virtuals: true });
CarBookingSchema.set("toJSON", { virtuals: true });

CarBookingSchema.index({ customerId: 1, carId: 1 }, { unique: true });

const CarBookings = mongoose.model("CarBookings", CarBookingSchema);
export default CarBookings;
