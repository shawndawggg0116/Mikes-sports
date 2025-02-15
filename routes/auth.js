app.post("/register-fcm-token", async (req, res) => {
  const { userId, fcmToken } = req.body;
  await db.collection("users").updateOne(
    { _id: userId },
    { $set: { fcmToken: fcmToken } },
    { upsert: true }
  );
  res.json({ success: true });
});
