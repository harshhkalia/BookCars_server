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

// Safe + Limited to 5 + Prevent duplicates
RecentlyVisitedShowroomSchema.methods.addShowroom = async function (ownerId) {
  try {
    // Re-fetch the latest version of the document to avoid version conflicts
    const latestDoc = await mongoose
      .model("RecentlyVisitedShowroom")
      .findById(this._id);

    if (!latestDoc) {
      throw new Error("RecentlyVisitedShowroom document not found.");
    }

    // Remove any existing visit to the same showroom (prevent duplicates)
    const filtered = latestDoc.visitedShowrooms.filter(
      (visit) => visit?.ownerId?.toString() !== ownerId.toString()
    );

    // Add the new showroom visit at the beginning
    filtered.unshift({ ownerId });

    // Limit to last 5 visits
    latestDoc.visitedShowrooms = filtered.slice(0, 5);

    // Save updated doc
    await latestDoc.save();

    return latestDoc;
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