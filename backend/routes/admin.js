import express from "express";
import Pool from "../models/pool.js";
import Pick from "../models/pick.js";
import User from "../models/User.js";
import requireAuth from "../middleware/requireAuth.js";
import requireAdmin from "../middleware/requireAdmin.js";

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get("/overview", async (req, res) => {
  try {
    const [users, pools, picks, userList, poolList] = await Promise.all([
      User.countDocuments(),
      Pool.countDocuments(),
      Pick.countDocuments(),
      User.find().select("name email role favoriteTeams createdAt").sort({ createdAt: -1 }),
      Pool.find().select("name conference scoringType participants creatorId createdAt").sort({ createdAt: -1 }),
    ]);

    res.json({
      counts: { users, pools, picks },
      users: userList.map(user => ({
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        favoriteTeams: user.favoriteTeams,
        createdAt: user.createdAt,
      })),
      pools: poolList.map(pool => ({
        id: pool._id,
        name: pool.name,
        conference: pool.conference,
        scoringType: pool.scoringType,
        participants: pool.participants.length,
        createdAt: pool.createdAt,
      })),
    });
  } catch (error) {
    console.error("Load admin overview error", error);
    res.status(500).json({ message: "Failed to load admin dashboard" });
  }
});

router.delete("/users/:id", async (req, res) => {
  try {
    if (req.params.id === req.userId) return res.status(400).json({ message: "You cannot delete your own account from the admin dashboard" });

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role === "admin") return res.status(400).json({ message: "Admin accounts cannot be deleted from the dashboard" });

    const ownedPools = await Pool.find({ creatorId: user._id }).select("_id");
    const ownedPoolIds = ownedPools.map(pool => pool._id);

    await Promise.all([
      Pick.deleteMany({ $or: [{ userId: user._id }, { poolId: { $in: ownedPoolIds } }] }),
      Pool.updateMany({ _id: { $nin: ownedPoolIds } }, { $pull: { participants: user._id } }),
    ]);
    if (ownedPoolIds.length) await Pool.deleteMany({ _id: { $in: ownedPoolIds } });
    await user.deleteOne();

    res.json({ message: "User and associated pool data deleted" });
  } catch (error) {
    console.error("Delete user error", error);
    res.status(500).json({ message: "Failed to delete user" });
  }
});

router.delete("/pools/:id", async (req, res) => {
  try {
    const pool = await Pool.findById(req.params.id);
    if (!pool) return res.status(404).json({ message: "Pool not found" });

    await Promise.all([Pick.deleteMany({ poolId: pool._id }), pool.deleteOne()]);
    res.json({ message: "Pool and its picks deleted" });
  } catch (error) {
    console.error("Delete admin pool error", error);
    res.status(500).json({ message: "Failed to delete pool" });
  }
});

export default router;
