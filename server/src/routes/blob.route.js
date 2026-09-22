const express = require("express");
const { handleUpload } = require("@vercel/blob/client");
const { requireAuth } = require("../middlewares/auth.middleware");

const router = express.Router();

// Gives browsers a short-lived Vercel Blob upload token. The actual file bytes
// go directly from the browser to Blob and never consume a serverless function.
router.post("/client-token", requireAuth, async (req, res, next) => {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return res.status(503).json({ message: "File uploads are not configured" });
    }

    const jsonResponse = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        const safeName = pathname.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-120);
        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ userId: req.user.sub, pathname: safeName }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log("Blob upload completed", { url: blob.url, userId: JSON.parse(tokenPayload).userId });
      },
    });

    return res.status(200).json(jsonResponse);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
