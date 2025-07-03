import mongoose from "mongoose";

const RecentlyVisitedShowroomSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  visitedShowrooms: [
    {
      ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      visitedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
});

// ✅ Safe + Limited to 5 + Prevent duplicates
RecentlyVisitedShowroomSchema.methods.addShowroom = async function (ownerId) {
  try {
    // ✅ Filter out the showroom if already visited (null-safe)
    const updatedShowrooms = this.visitedShowrooms.filter(
      (visit) =>
        visit?.ownerId?.toString() !== ownerId.toString()
    );

    // ✅ Add to top
    updatedShowrooms.unshift({ ownerId });

    // ✅ Keep only latest 5
    const latestFive = updatedShowrooms.slice(0, 5);

    // ✅ Update and save in DB
    this.visitedShowrooms = latestFive;
    await this.save();

    return this;
  } catch (error) {
    console.error("Error in addShowroom method:", error);
    throw error;
  }
};

const RecentlyVisitedShowroom = mongoose.model(
  "RecentlyVisitedShowroom",
  RecentlyVisitedShowroomSchema
);

export default RecentlyVisitedShowroom;